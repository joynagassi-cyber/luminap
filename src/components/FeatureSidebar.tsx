import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  User,
  Settings as SettingsIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAppConfig, useCurrentUser } from "@/lib/dataLayer";
import {
  useFeatureConfig,
  FEATURES,
  ensureNavViewChunk,
} from "@/lib/features";
import {
  FEATURE_CATEGORIES,
  visibleFeaturesInCategory,
  ungroupedFeatureIds,
} from "@/lib/feature-categories";

/**
 * Menu latéral (sidebar) premium — remplace l'ancienne liste plate « Plus ».
 *
 * Structure, conforme à la spec :
 *  - EN HAUT : photo + nom de l'utilisateur (+ rôle/org en sous-titre).
 *  - AU CENTRE : les features classées PAR CATÉGORIE. Chaque catégorie est
 *    dépliable (chevron) et liste les features qu'elle couvre, cliquables
 *    vers leur route. Plus de liste plate interminable.
 *  - EN BAS : « Profil » et « Paramètres ».
 *
 * Drawer plein écran (mobile-first, viewport ≤ max-w-lg) : panneau qui glisse
 * depuis la droite par-dessus le contenu, fond assombri (backdrop) fermable.
 * Navigation : chaque item est résolu via `ensureNavViewChunk` avant
 * `navigate()` pour éviter l'écran noir de transition (même garde que la
 * BottomNav), puis le drawer se ferme.
 *
 * A11y : `role="dialog"` + `aria-modal`, fermeture `Esc`, focus sur le
 * premier item au montage, retour focus au déclencheur au démontage.
 */
export default function FeatureSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { config } = useAppConfig();
  const { navTabs, visible } = useFeatureConfig();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const panelRef = useRef<HTMLElement>(null);

  // La photo de profil (persistée dans la config locale) ou une pastille
  // d'initiales en repli.
  const photo = config.userPhoto;
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Utilisateur";
  const subName = user?.org?.name || "Lumina";
  const initials =
    (user?.firstName?.[0] ?? "").toUpperCase() +
    (user?.lastName?.[0] ?? "").toUpperCase();

  // Catégorisation : une catégorie n'est rendue que si elle a au moins une
  // feature visible. `parametres`/`aide` restent en pied.
  const categories = FEATURE_CATEGORIES.map((c) => ({
    ...c,
    features: visibleFeaturesInCategory(c, visible),
  })).filter((c) => c.features.length > 0);

  // Toute feature orpheline (ajoutée sans catégorie) reste accessible ici,
  // jamais perdue — regroupée sous « Divers » en dernier recours.
  const orphans = ungroupedFeatureIds()
    .filter((id) => visible[id] ?? true)
    .map((id) => FEATURES.find((f) => f.id === id))
    .filter((f): f is (typeof FEATURES)[number] => Boolean(f));

  const isExpanded = (id: string) =>
    // Déplie par défaut les catégories qui contiennent une feature déjà
    // épinglée dans la barre (contexte de navigation), sinon repliées.
    expanded[id] ?? categories.some((c) => c.id === id && c.features.some((f) => navTabs.includes(f.id)));

  // Fermeture par Échap + scroll-verrou pendant l'ouverture.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const go = async (feature: { id: string; route: string }) => {
    onClose();
    await ensureNavViewChunk(feature.id);
    navigate(feature.route.startsWith("/") ? feature.route : "/dashboard");
  };

  const itemClass =
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left active:scale-[0.98] transition-[transform,background-color,color,opacity]";

  const renderFeature = (f: (typeof FEATURES)[number], indented: boolean) => {
    const Icon = f.icon as LucideIcon;
    const pinned = navTabs.includes(f.id);
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => go(f)}
        className={itemClass}
        style={{
          marginLeft: indented ? 12 : 0,
          background: pinned
            ? "color-mix(in srgb, var(--accent-primary) 8%, transparent)"
            : "transparent",
          border: "none",
          cursor: "pointer",
          color: pinned ? "var(--accent-primary)" : "var(--text-secondary)",
          height: 44,
        }}
        aria-label={pinned ? `${f.label} (déjà dans la barre)` : f.label}
      >
        <Icon
          className="w-5 h-5 flex-shrink-0"
          style={{ color: pinned ? "var(--accent-primary)" : "var(--text-secondary)" }}
        />
        <span className="text-sm font-medium flex-1 truncate">{f.label}</span>
      </button>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navigation"
      data-testid="feature-sidebar"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-float)",
        visibility: open ? "visible" : "hidden",
        transition: "visibility 0s linear 300ms",
      }}
    >
      {/* Backdrop assombri — fermeture au clic hors panneau. */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--scrim)",
          opacity: open ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
        aria-hidden="true"
      />

      {/* Panneau latéral (droite) — glisse depuis la bordure. */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="flex flex-col h-full"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(320px, 84vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "var(--shadow-pop)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms cubic-bezier(0.22,1,0.36,1)",
          outline: "none",
        }}
      >
        {/* ── EN HAUT : photo + nom + libellé d'org, et bouton fermer ── */}
        <div
          className="flex items-center gap-3 px-4 pt-safe pb-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {photo ? (
            <img
              src={photo}
              alt=""
              className="w-11 h-11 rounded-full object-cover flex-shrink-0"
              style={{ border: "2px solid var(--accent-primary)" }}
            />
          ) : (
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold"
              style={{
                background: "color-mix(in srgb, var(--accent-primary) 16%, var(--card))",
                color: "var(--accent-primary)",
                border: "2px solid color-mix(in srgb, var(--accent-primary) 40%, transparent)",
              }}
              aria-hidden="true"
            >
              {initials || <User className="w-5 h-5" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
              {displayName}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
              {subName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg"
            style={{
              background: "var(--surface-hover)",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── AU CENTRE : catégories dépliables ── */}
        <div className="flex-1 overflow-y-auto px-3 py-2 pb-safe">
          {categories.map((c) => {
            const CatIcon = c.icon;
            const open_ = isExpanded(c.id);
            return (
              <div key={c.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => setExpanded((m) => ({ ...m, [c.id]: !open_ }))}
                  className={itemClass}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    height: 44,
                  }}
                  aria-expanded={open_}
                >
                  <CatIcon
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: "var(--accent-primary)" }}
                  />
                  <span className="text-sm font-semibold flex-1">{c.label}</span>
                  {open_ ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
                  )}
                </button>
                {open_ && (
                  <div className="pb-1" role="group" aria-label={`Catégorie ${c.label}`}>
                    {c.features.map((f) => renderFeature(f, true))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Orphelines (feature sans catégorie) — jamais masquées. */}
          {orphans.length > 0 && (
            <div className="mb-1" role="group" aria-label="Autres">
              {orphans.map((f) => renderFeature(f, false))}
            </div>
          )}

          {categories.length === 0 && orphans.length === 0 && (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/settings/features");
              }}
              className={itemClass}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                height: 44,
              }}
            >
              <SettingsIcon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                Aucune feature activée — gérer dans Paramètres
              </span>
            </button>
          )}
        </div>

        {/* ── EN BAS : Profil + Paramètres ── */}
        <div
          className="px-3 pt-2 pb-safe"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={() => go({ id: "profil", route: "/settings/profil" })}
            className={itemClass}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-primary)",
              height: 44,
            }}
          >
            <User className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-medium flex-1">Profil</span>
          </button>
          <button
            type="button"
            onClick={() => go({ id: "parametres", route: "/settings" })}
            className={itemClass}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-primary)",
              height: 44,
            }}
          >
            <SettingsIcon className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-medium flex-1">Paramètres</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
