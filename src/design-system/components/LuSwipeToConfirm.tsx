/**
 * LuSwipeToConfirm — composite P3 (spec §6).
 *
 * Piste pill h 56 (surface-inverse), pouce circulaire 48 (accent) avec
 * chevron, libellé centré, double chevron à droite. Valide à 85 % de la
 * course (pointer events), retour élastique sinon. Alternative
 * accessible : Entrée/Espace ou double-tap sur le pouce (role=button).
 *
 * Usage Lumina : actions irréversibles ou engageantes.
 * 100 % jetons --lu-* (ratchet lint).
 */
import { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

export interface LuSwipeToConfirmProps {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}

const CONFIRM_RATIO = 0.85;

export function LuSwipeToConfirm({ label, onConfirm, disabled }: LuSwipeToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const dragging = useRef(false);

  const maxDx = () => (trackRef.current ? trackRef.current.offsetWidth - 56 : 0);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || confirmed) return;
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || disabled || confirmed) return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDx(Math.min(Math.max(e.clientX - rect.left - 24, 0), maxDx()));
  };
  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (maxDx() > 0 && dx >= maxDx() * CONFIRM_RATIO) {
      setConfirmed(true);
      onConfirm();
    }
    setDx(0);
  };

  return (
    <div
      ref={trackRef}
      data-testid="lu-swipe"
      className="relative flex h-14 w-full select-none items-center overflow-hidden rounded-[var(--lu-radius-pill)]"
      style={{ background: "var(--lu-surface-inverse)", opacity: disabled ? 0.4 : 1 }}
    >
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold"
        style={{ color: "var(--lu-fg-inverse)" }}
      >
        {confirmed ? "Confirmé ✓" : label}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 flex"
        style={{ color: "var(--lu-fg-inverse)", opacity: 0.5 }}
      >
        <ChevronRight size={16} />
        <ChevronRight size={16} className="-ml-2.5" />
      </span>
      <div
        role="button"
        tabIndex={disabled || confirmed ? -1 : 0}
        aria-label={`${label} — Entrée pour confirmer`}
        data-testid="lu-swipe-thumb"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !confirmed) {
            e.preventDefault();
            setConfirmed(true);
            onConfirm();
          }
        }}
        className="absolute left-1 top-1 flex h-12 w-12 cursor-grab items-center justify-center rounded-full shadow-md active:cursor-grabbing focus-visible:outline focus-visible:outline-2"
        style={{
          background: "var(--lu-accent)",
          color: "var(--lu-on-accent)",
          transform: `translateX(${dx}px)`,
          transition: dragging.current ? "none" : "transform 200ms var(--lu-ease)",
          outlineColor: "var(--lu-focus-ring)",
        }}
      >
        <ChevronRight size={20} aria-hidden />
      </div>
    </div>
  );
}

export default LuSwipeToConfirm;
