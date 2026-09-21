import {
  Check,
  Plus,
  ArrowRightLeft,
  MoreVertical,
  Settings,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect, useMemo } from "react";
import { tint } from "@/lib/utils";
import {
  useFeatureConfig,
  featuresForNav,
  FEATURES,
  DEFAULT_NAV_TABS,
  type FeatureDef,
} from "@/lib/features";

/**
 * Barre de navigation basse — HTML natif.
 *
 * Historiquement construite sur IonTabBar/IonTabButton/IonButton
 * (custom elements Ionic) : avec React 19, les enfants React de ces
 * éléments pouvaient ne pas être rendus dans le light DOM (barre vide,
 * boutons sans icône) selon l'ordre de définition des custom elements.
 * On passe donc à des <button> natifs : rendu déterministe, mêmes styles
 * et mêmes sémantiques ARIA (tablist / tab / switch-free toggles).
 */
export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Les emplacements de la barre et le contenu du menu « Plus » sont
  // configurables par l'utilisateur (Settings → Features & navigation).
  const { navTabs, visible } = useFeatureConfig();
  const navFeatures = useMemo(() => featuresForNav(navTabs), [navTabs]);
  // Réglage persisté corrompu / obsolète (0 onglet résolvable) : on retombe
  // sur la liste valide par défaut plutôt que d'afficher une barre vide.
  const activeNavFeatures =
    navFeatures.length > 0 ? navFeatures : featuresForNav(DEFAULT_NAV_TABS);
  const activeNavIds = useMemo(
    () => activeNavFeatures.map((f) => f.id),
    [activeNavFeatures],
  );
  // Le menu « Plus » liste TOUS les features visibles — y compris celles déjà
  // épinglées dans la barre (marquées « Dans la barre ») — pour qu'aucune
  // feature ne soit jamais inaccessible depuis la navigation basse.
  const moreFeatures = useMemo(
    () => FEATURES.filter((f) => visible[f.id] ?? true),
    [visible],
  );

  // Le FAB est un bouton de la barre : sa destination doit être DÉTERMINISTE.
  // Chaque contexte ci-dessous mène à EXACTEMENT une page claire, et le FAB
  // est masqué (null) sur les pages qui exposent déjà leurs propres actions
  // claires — un FAB no-op ou ambigu n'y est jamais affiché.
  //
  //   /finance            → masqué  (boutons « Nouvelle entrée/dépense » de la page)
  //   /transaction/*      → masqué  (Approuver / Modifier / Sauvegarder de la page)
  //   /event/new          → masqué  (le formulaire « nouveau culte » se soumet sur la page)
  //   /event/:id          → « Nouveau »   → /event/new
  //   /groups/:id         → « Verser »    → /versement
  //   par défaut          → « Transaction »→ /transaction/new
  const fabAction = useMemo(() => {
    const path = location.pathname;

    if (path === "/finance" || path.startsWith("/transaction/")) {
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

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
  const go = (feature: FeatureDef) => {
    const target =
      typeof feature?.route === "string" && feature.route.startsWith("/")
        ? feature.route
        : "/dashboard";
    navigate(target);
    setShowMore(false);
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
            boxShadow: `0 4px 16px ${tint(fabAction.color, 38)}`,
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

          {/* Bouton « Plus » — accès à toutes les features (barre + menu) */}
          <div className="relative flex-1 min-w-0" ref={moreRef}>
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              aria-label={showMore ? "Fermer le menu" : "Plus d'options"}
              aria-expanded={showMore}
              style={tabStyle(showMore)}
              className="w-full flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-xl overflow-hidden transition-[transform,background-color,color,opacity]"
            >
              <MoreVertical
                className="w-5 h-5 flex-shrink-0"
                style={{
                  color: showMore ? "var(--accent-primary)" : "var(--text-secondary)",
                }}
              />
              <span
                className="text-xs font-medium"
                style={{
                  color: showMore ? "var(--accent-primary)" : "var(--text-secondary)",
                }}
              >
                Plus
              </span>
            </button>

            {/* Menu « Plus » — liste toutes les features visibles ; celles
                déjà épinglées dans la barre sont marquées « Dans la barre ».
                La liste peut être longue → scroll vertical borné. */}
            {showMore && (
              <div
                data-testid="more-menu"
                className="absolute bottom-12 right-0 w-56 rounded-2xl overflow-hidden z-50"
                style={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-pop)",
                  maxHeight: "45vh",
                  overflowY: "auto",
                }}
              >
                <div className="p-2">
                  {moreFeatures.length === 0 ? (
                    /* Le menu ne doit jamais rester « mort » : on renvoie
                       vers la section « Features & navigation » de
                       Paramètres pour réactiver des features. */
                    <button
                      type="button"
                      onClick={() => {
                        setShowMore(false);
                        navigate("/settings");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-[transform,background-color,color,opacity] active:scale-95"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                      }}
                      aria-label="Gérer les features dans Paramètres"
                    >
                      <Settings className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-sm font-medium">
                        Aucune feature activée — gérer
                      </span>
                    </button>
                  ) : (
                    moreFeatures.map((f) => {
                      const Icon = f.icon;
                      const pinned = activeNavIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => go(f)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-[transform,background-color,color,opacity] active:scale-95"
                          style={{
                            background: pinned
                              ? "color-mix(in srgb, var(--accent-primary) 8%, transparent)"
                              : "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: pinned ? "var(--accent-primary)" : "var(--text-secondary)",
                          }}
                          aria-label={
                            pinned ? `${f.label} (déjà dans la barre)` : f.label
                          }
                        >
                          <Icon
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: pinned ? "var(--accent-primary)" : "var(--text-secondary)" }}
                          />
                          <span
                            className="text-sm font-medium flex-1 truncate"
                          >
                            {f.label}
                          </span>
                          {pinned && (
                            <span
                              className="flex items-center gap-1 text-[10px] font-medium flex-shrink-0"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              <Check className="w-3 h-3" />
                              Dans la barre
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
