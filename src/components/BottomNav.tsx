import {
  Plus,
  ArrowRightLeft,
} from "lucide-react";
import { MoreVerticalSwoosh } from "@/components/icons/MoreVerticalSwoosh";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  useFeatureConfig,
  featuresForNav,
  DEFAULT_NAV_TABS,
  ensureNavViewChunk,
  type FeatureDef,
} from "@/lib/features";
import HomeIndicator from "@/components/HomeIndicator";
import FeatureSidebar from "@/components/FeatureSidebar";

/**
 * Barre de navigation basse — HTML natif.
 *
 * Historiquement construite sur IonTabBar/IonTabButton/IonButton
 * (custom elements Ionic) : avec React 19, les enfants React de ces
 * éléments pouvaient ne pas être rendus dans le light DOM (barre vide,
 * boutons sans icône) selon l'ordre de définition des custom elements.
 * On passe donc à des <button> natifs : rendu déterministe, mêmes styles
 * et mêmes sémantiques ARIA (tablist / tab / switch-free toggles).
 *
 * Le bouton « Plus » (glyphe voilier) n'ouvre plus une liste plate : il
 * ouvre le menu latéral `FeatureSidebar` — features classées par catégorie
 * dépliables, avatar + nom en tête, Profil / Paramètres en pied.
 */
export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Les emplacements de la barre sont configurables par l'utilisateur
  // (Settings → Features & navigation).
  const { navTabs } = useFeatureConfig();
  const navFeatures = useMemo(() => featuresForNav(navTabs), [navTabs]);
  // Réglage persisté corrompu / obsolète (0 onglet résolvable) : on retombe
  // sur la liste valide par défaut plutôt que d'afficher une barre vide.
  const activeNavFeatures =
    navFeatures.length > 0 ? navFeatures : featuresForNav(DEFAULT_NAV_TABS);

  // Le FAB est un bouton de la barre : sa destination doit être DÉTERMINISTE.
  // Chaque contexte ci-dessous mène à EXACTEMENT une page claire, et le FAB
  // est masqué (null) sur les pages qui exposent déjà leurs propres actions
  // claires — un FAB no-op ou ambigu n'y est jamais affiché.
  //
  //   /dashboard          → masqué  (les « Actions rapides » du dashboard font
  //                                        le travail d'entrée rapide — le +
  //                                        flottant y est redondant)
  //   /finance            → masqué  (boutons « Nouvelle entrée/dépense » de la page)
  //   /transaction/*      → masqué  (Approuver / Modifier / Sauvegarder de la page)
  //   /event/new          → masqué  (le formulaire « nouveau culte » se soumet sur la page)
  //   /event/:id          → « Nouveau »   → /event/new
  //   /groups/:id         → « Verser »    → /versement
  //   /versement          → par défaut  (la page expose déjà son CTA « Encaisser » inline,
  //                                        le FAB « Transaction » → /transaction/new est
  //                                        une action DIFFÉRENTE, acceptée comme résidu)
  //   par défaut          → « Transaction »→ /transaction/new
  const fabAction = useMemo(() => {
    const path = location.pathname;

    if (path === "/finance" || path.startsWith("/transaction/")) {
      return null;
    }
    // /dashboard : les « Actions rapides » (Entrée / Sortie / Versement /
    // Événement) assurent déjà l'entrée rapide. Le + flottant serait un
    // doublon visuel et « se perd » sur une page hors sujet.
    if (path === "/dashboard") {
      return null;
    }
    if (path === "/event/new" || (path.startsWith("/event/") && path.endsWith("/edit"))) {
      return null;
    }
    if (path.startsWith("/event/")) {
      return {
        icon: Plus,
        label: "Nouveau",
        action: () => navigate("/event/new"),
        color: "var(--data-advance)",
      };
    }
    if (path.startsWith("/groups/")) {
      return {
        icon: ArrowRightLeft,
        label: "Verser",
        action: () => navigate("/versement"),
        color: "var(--accent-primary)",
      };
    }
    return {
      icon: Plus,
      label: "Transaction",
      action: () => navigate("/transaction/new"),
      color: "var(--accent-primary)",
    };
  }, [location.pathname, navigate]);

  // Route la PLUS spécifique (la plus longue) correspondant à la page courante.
  // Seul l'onglet qui pointe dessus est actif : avec l'ancien test « startsWith »,
  // les préfixes imbriqués (/admin vs /admin/federation) allumaient DEUX onglets
  // à la fois (double encadré / « cercles ensemble ») et le box apparaissait
  // sur-large. Ici, l'onglet le plus précis gagne — toujours un seul actif.
  const activeRoute = useMemo(() => {
    const p = location.pathname;
    let best: string | null = null;
    let bestLen = -1;
    for (const f of activeNavFeatures) {
      const r = f.route;
      const matches = p === r || (r !== "/" && p.startsWith(r));
      if (matches && r.length > bestLen) {
        best = r;
        bestLen = r.length;
      }
    }
    return best;
  }, [location.pathname, activeNavFeatures]);

  // Garde déterministe : chaque bouton de feature mène à une page claire.
  // Si la destination n'est pas une route absolue connue (route absente ou
  // corrompue), on retombe sur l'accueil — jamais d'écran mort / 404.
  //
  // await ensureNavViewChunk(feature.id) AVANT navigate() : le chunk du
  // tab de navigation doit être résolu avant le changement de view
  // React Router, sinon le view entrant est le fallback de Suspense et
  // la transition Ionic rejoue avec un DOM différent (écran noir).
  // L'import() est servi instantanément depuis le cache module s'il est
  // déjà chargé — le `await` n'a un coût que sur le tout-premier clic
  // sur ce tab (typique en mobile après l'onboarding).
  const go = async (feature: FeatureDef) => {
    const target =
      typeof feature?.route === "string" && feature.route.startsWith("/")
        ? feature.route
        : "/dashboard";
    if (typeof feature.id === "string" && feature.id.length > 0) {
      await ensureNavViewChunk(feature.id);
    }
    navigate(target);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: active
      ? "color-mix(in srgb, var(--accent-primary) 12%, transparent)"
      : "transparent",
    border: "none",
    cursor: "pointer",
    transition: "background-color 150ms ease-out, color 150ms ease-out",
    color: "inherit",
  });

  return (
    <>
      {/* FAB — Contextual action button (bouton natif). Masqué sur certaines
          pages (ex : /finance, où les boutons de la page font la même chose). */}
      {fabAction && (
        <button
          type="button"
          onClick={fabAction.action}
          style={{
            position: "fixed",
            bottom: 80,
            right: 20,
            zIndex: 40,
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${fabAction.color}, ${fabAction.color})`,
            boxShadow: "var(--shadow-fab)",
            color: "var(--text-primary)",
            padding: 0,
          }}
          aria-label={fabAction.label}
        >
          {fabAction.icon === ArrowRightLeft ? (
            <ArrowRightLeft className="w-7 h-7" />
          ) : (
            <Plus className="w-7 h-7" />
          )}
        </button>
      )}

      {/* Barre d'onglets (nav natif) — emplacements pilotés par le
          réglage utilisateur (Settings → Features & navigation) */}
      <nav
        data-testid="bottom-nav"
        role="navigation"
        aria-label="Navigation principale"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "var(--nav-bg)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid var(--border)",
          padding: "4px 8px 8px",
        }}
      >
        <div
          className="flex items-center gap-1.5 max-w-lg mx-auto"
          role="tablist"
          aria-label="Navigation principale"
        >
          {activeNavFeatures.map((f) => {
            const Icon = f.icon;
            const active = activeRoute === f.route;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={f.label}
                onClick={() => go(f)}
                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-xl overflow-hidden transition-[transform,background-color,color,opacity]"
                style={tabStyle(active)}
              >
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{
                    color: active ? "var(--accent-primary)" : "var(--text-secondary)",
                    opacity: active ? 1 : 0.7,
                  }}
                />
                <span
                  className="text-xs font-medium whitespace-nowrap"
                  style={{
                    color: active ? "var(--accent-primary)" : "var(--text-secondary)",
                  }}
                >
                  {f.label}
                </span>
              </button>
            );
          })}

          {/* Bouton « Plus » (glyphe voilier) — ouvre le menu latéral. */}
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu"
              aria-haspopup="dialog"
              style={tabStyle(sidebarOpen)}
              className="w-full flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-xl overflow-hidden transition-[transform,background-color,color,opacity]"
            >
              <MoreVerticalSwoosh
                className="w-5 h-5 flex-shrink-0"
                style={{
                  color: "var(--text-secondary)",
                }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Menu
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Menu latéral — features par catégorie, avatar + nom, Profil/Param. */}
      <FeatureSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Indicateur d'accueil : pastille blanche au-dessus de la nav qui ouvre
          la modale de raccourcis utiles (fermable en glissant vers le bas). */}
      <HomeIndicator />
    </>
  );
}
