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

  const fabAction = useMemo(() => {
    const path = location.pathname;
    // Le FAB est masqué sur la liste des finances : les boutons
    // « Nouvelle entrée » / « Nouvelle dépense » de la page font la même
    // chose — le FAB rouge se superposait à eux.
    if (path === "/finance") {
      return null;
    }
    if (path.startsWith("/transaction/") && !path.endsWith("/edit")) {
      return {
        icon: Check,
        label: "Valider",
        action: () => {},
        color: "#1DB954",
      };
    }
    if (path.startsWith("/event")) {
      return {
        icon: Plus,
        label: "Nouveau",
        action: () => navigate("/event/new"),
        color: "#8B5CF6",
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

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  const go = (feature: FeatureDef) => {
    navigate(feature.route);
    setShowMore(false);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: active
      ? "color-mix(in srgb, var(--accent-primary) 12%, transparent)"
      : "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "10px 12px",
    borderRadius: 12,
    minWidth: 0,
    transition: "all 150ms",
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
            color: "#fff",
            padding: 0,
          }}
          aria-label={fabAction.label}
        >
          {fabAction.icon === Check ? (
            <Check className="w-7 h-7" />
          ) : fabAction.icon === ArrowRightLeft ? (
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
          background: "rgba(18,18,18,0.97)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid #282828",
          padding: "4px 8px 8px",
        }}
      >
        <div
          className="flex items-center justify-around max-w-lg mx-auto"
          role="tablist"
          aria-label="Navigation principale"
        >
          {activeNavFeatures.map((f) => {
            const Icon = f.icon;
            const active = isActive(f.route);
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={f.label}
                onClick={() => go(f)}
                className="flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl transition-all min-w-0"
                style={tabStyle(active)}
              >
                <Icon
                  className="w-5 h-5"
                  style={{
                    color: active ? "var(--accent-primary)" : "#B3B3B3",
                    opacity: active ? 1 : 0.7,
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{
                    color: active ? "var(--accent-primary)" : "#B3B3B3",
                  }}
                >
                  {f.label}
                </span>
              </button>
            );
          })}

          {/* Bouton « Plus » — accès à toutes les features (barre + menu) */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              aria-label={showMore ? "Fermer le menu" : "Plus d'options"}
              aria-expanded={showMore}
              style={tabStyle(showMore)}
              className="flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl transition-all min-w-0"
            >
              <MoreVertical
                className="w-5 h-5"
                style={{
                  color: showMore ? "var(--accent-primary)" : "#B3B3B3",
                }}
              />
              <span
                className="text-xs font-medium"
                style={{
                  color: showMore ? "var(--accent-primary)" : "#B3B3B3",
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
                  backgroundColor: "#181818",
                  border: "1px solid #282828",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
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
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-95"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#B3B3B3",
                      }}
                      aria-label="Gérer les features dans Paramètres"
                    >
                      <Settings className="w-4 h-4 flex-shrink-0" style={{ color: "#808080" }} />
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
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-95"
                          style={{
                            background: pinned
                              ? "color-mix(in srgb, var(--accent-primary) 8%, transparent)"
                              : "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: pinned ? "var(--accent-primary)" : "#B3B3B3",
                          }}
                          aria-label={
                            pinned ? `${f.label} (déjà dans la barre)` : f.label
                          }
                        >
                          <Icon
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: pinned ? "var(--accent-primary)" : "#B3B3B3" }}
                          />
                          <span
                            className="text-sm font-medium flex-1 truncate"
                          >
                            {f.label}
                          </span>
                          {pinned && (
                            <span
                              className="flex items-center gap-1 text-[10px] font-medium flex-shrink-0"
                              style={{ color: "#808080" }}
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
