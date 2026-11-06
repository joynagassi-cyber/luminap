/**
 * LuFab — composite P3 (spec §6 « LuFab »).
 *
 * 56 px, cercle ou carré rayon 16 selon `shape` (ThemeSpec.fab), fond
 * accent, icône plus, `--lu-shadow-lg`. Positionné au-dessus de la tab
 * bar (+16) : `fixed bottom-[calc(80px+env(safe-area-inset-bottom))]`
 * par défaut, centré à droite.
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ReactNode } from "react";
import { Plus } from "lucide-react";

export interface LuFabProps {
  onClick: () => void;
  "aria-label"?: string;
  icon?: ReactNode;
  /** Cercle (défaut) ou carré rayon 16 — ThemeSpec.fab. */
  shape?: "circle" | "square";
}

export function LuFab({ onClick, "aria-label": ariaLabel = "Ajouter", icon, shape = "circle" }: LuFabProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      data-testid="lu-fab"
      className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center text-[var(--lu-on-accent)] shadow-lg transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: "var(--lu-accent)",
        borderRadius: shape === "circle" ? "var(--lu-radius-pill)" : "var(--lu-radius-md)",
        boxShadow: "var(--lu-shadow-lg)",
        outlineColor: "var(--lu-focus-ring)",
      }}
    >
      {icon ?? <Plus size={24} aria-hidden />}
    </button>
  );
}

export default LuFab;
