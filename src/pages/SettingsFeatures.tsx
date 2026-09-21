import {
  Puzzle,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Lock,
  RotateCcw,
} from "lucide-react";
import SettingsShell from "@/components/SettingsShell";
import {
  useFeatureConfig,
  FEATURES,
  featureById,
  MAX_NAV_TABS,
  prefetchNavViews,
} from "@/lib/features";
import { useEffect } from "react";

export default function SettingsFeatures() {
  const {
    navTabs,
    visible: featureVisible,
    addNavTab,
    removeNavTab,
    moveNavTab,
    setFeatureVisible,
    resetFeatures,
  } = useFeatureConfig();

  // Préchauffe les chunks des vues dès qu'un réglage de la nav change.
  useEffect(() => {
    prefetchNavViews(navTabs);
  }, [navTabs]);

  return (
    <SettingsShell
      title="Features & navigation"
      subtitle="Composez la barre de navigation et le menu « Plus »"
    >
      {/* Barre de navigation */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Puzzle className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-semibold text-sm">
            Barre de navigation
          </span>
        </div>
        <p className="text-text-tertiary text-xs mb-3">
          Ajoutez, retirez ou réordonnez les onglets ({navTabs.length}/
          {MAX_NAV_TABS} maximum). Le bouton « Plus » reste toujours disponible.
        </p>

        <div className="space-y-2 mb-4">
          {navTabs.map((id, i) => {
            const f = featureById(id);
            const Icon = f?.icon ?? Puzzle;
            return (
              <div
                key={id}
                data-testid="nav-tab-item"
                className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "var(--accent-primary)" }}
                />
                <span className="text-sm text-text-primary flex-1">
                  {f?.label ?? id}
                </span>
                <button
                  type="button"
                  onClick={() => moveNavTab(i, -1)}
                  disabled={i === 0}
                  className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-95"
                  style={{ border: "1px solid var(--border)" }}
                  aria-label={`Monter ${f?.label ?? "l'onglet"}`}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveNavTab(i, 1)}
                  disabled={i === navTabs.length - 1}
                  className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-95"
                  style={{ border: "1px solid var(--border)" }}
                  aria-label={`Descendre ${f?.label ?? "l'onglet"}`}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeNavTab(id)}
                  disabled={navTabs.length <= 1}
                  className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-95"
                  style={{ border: "1px solid var(--border)" }}
                  aria-label={`Retirer ${f?.label ?? "l'onglet"}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          <div className="flex items-center gap-3">
            <Plus className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent-primary)" }} />
            <select
              id="nav-tab-select"
              data-testid="nav-tab-select"
              value=""
              disabled={navTabs.length >= MAX_NAV_TABS}
              onChange={(e) => {
                if (e.target.value) addNavTab(e.target.value);
              }}
              className="px-3 py-2.5 rounded-xl text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                maxWidth: 190,
              }}
              aria-label="Ajouter une feature à la barre de navigation"
            >
              <option value="">
                {navTabs.length >= MAX_NAV_TABS
                  ? `Maximum ${MAX_NAV_TABS} onglets`
                  : "Choisir…"}
              </option>
              {FEATURES.filter((f) => !navTabs.includes(f.id)).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Features affichées (menu « Plus ») */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-text-primary font-semibold text-sm mb-3">
          Features affichées
        </p>
        <p className="text-text-tertiary text-xs mb-3">
          Non affichées = masquées du menu « Plus ». Une feature épinglée dans
          la barre n'apparaît pas dans cette liste.
        </p>
        <div className="space-y-1 mb-4">
          {FEATURES.filter((f) => f.kind === "feature").map((f) => {
            const Icon = f.icon;
            const pinned = navTabs.includes(f.id);
            const on = pinned || featureVisible[f.id];
            return (
              <button
                key={f.id}
                onClick={() => {
                  if (!pinned) setFeatureVisible(f.id, !featureVisible[f.id]);
                }}
                disabled={pinned}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-transform active:scale-95 disabled:opacity-50 text-left"
                style={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                }}
                role="switch"
                aria-checked={on}
                aria-label={
                  pinned ? `${f.label} (épinglée dans la barre)` : `Afficher ${f.label}`
                }
              >
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{
                    color: on ? "var(--accent-primary)" : "var(--text-tertiary)",
                  }}
                />
                <span
                  className="text-sm flex-1"
                  style={{
                    color: on ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  {f.label}
                </span>
                {pinned ? (
                  <Lock className="w-3.5 h-3.5 text-text-tertiary" />
                ) : (
                  <span
                    className="w-10 h-6 rounded-full relative flex-shrink-0"
                    style={{
                      backgroundColor: on
                        ? "var(--accent-primary)"
                        : "var(--surface-hover)",
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
                      style={{ left: on ? "22px" : "2px" }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={resetFeatures}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium active:scale-95"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
          aria-label="Restaurer les features par défaut"
        >
          <RotateCcw className="w-4 h-4" /> Restaurer les réglages par défaut
        </button>
      </div>
    </SettingsShell>
  );
}
