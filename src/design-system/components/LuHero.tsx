/**
 * LuHero — composite P3 (spec §7 motif 1, §6 « LuHero »).
 *
 *  - `tinted`   : zone haute en --lu-accent-soft, carte blanche (surface)
 *                 qui remonte avec coins hauts 28 ;
 *  - `solid`    : aplat --lu-hero-bg, coins bas 32, textes --lu-hero-fg ;
 *                 avatar 40 + salutation à gauche, cloche circulaire à
 *                 droite, montant display, badge delta translucide,
 *                 bloc imbriqué rayon 24 en overlay 10 % ;
 *  - `dark-orb` : carte --lu-orb-bg rayon 24 padding 20, phrase 18/600
 *                 avec valeur en --lu-accent-vivid, orbe radiale 96 px à
 *                 droite + halo flou 24, chip verre « Insight », bouton
 *                 blanc pill « Voir détails ↗ ».
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRight, Bell } from "lucide-react";
import { LuAmount } from "./LuAmount";
import { LuBadge } from "./LuBadge";

export type LuHeroVariant = "tinted" | "solid" | "dark-orb";

export interface LuHeroProps {
  variant?: LuHeroVariant;
  /** Ligne d'accroche (ex. « Bonjour, Aïcha »). */
  greeting?: string;
  avatar?: ReactNode;
  onBell?: () => void;
  /** Libellé au-dessus du montant (ex. « Solde total »). */
  label: string;
  /** Montant en unités majeures (LuAmount formate en fr-FR / XOF). */
  amount: number;
  /** Badge delta affiché à côté du montant (ex. « +12 % »). */
  delta?: { positive: boolean; children: ReactNode };
  /** Bouton « Voir détails » (dark-orb). */
  actionLabel?: string;
  onAction?: () => void;
  /** Bloc imbriqué (solid) ou contenu remonté (tinted). */
  children?: ReactNode;
}

export function LuHero({
  variant = "solid",
  greeting,
  avatar,
  onBell,
  label,
  amount,
  delta,
  actionLabel = "Voir détails",
  onAction,
  children,
}: LuHeroProps) {
  if (variant === "dark-orb") {
    return (
      <section
        data-testid="lu-hero"
        data-variant="dark-orb"
        className="relative w-full overflow-hidden p-5"
        style={{ background: "var(--lu-orb-bg)", borderRadius: "var(--lu-radius-lg)", color: "var(--lu-on-orb)" }}
      >
        {/* Orbe radiale 96 px à droite + halo flou 24 */}
        <div
          aria-hidden
          className="absolute right-5 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full"
          style={{
            background: "var(--lu-orb-glow)",
            filter: "blur(24px)",
          }}
        />
        <span
          className="inline-flex h-6 items-center rounded-[var(--lu-radius-pill)] px-2 text-xs font-semibold"
          style={{
            background: "var(--lu-glass-bg)",
            border: "1px solid var(--lu-glass-border)",
            color: "var(--lu-on-orb)",
            backdropFilter: "blur(var(--lu-glass-blur))",
          }}
        >
          Insight
        </span>
        <p className="mt-3 max-w-[70%] text-lg font-semibold leading-7">
          {label}{" "}
          <span style={{ color: "var(--lu-accent-vivid)" }}>
            <LuAmount amount={amount} size="title" className="font-bold" />
          </span>{" "}
          ce mois-ci.
        </p>
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-9 items-center gap-1 rounded-[var(--lu-radius-pill)] px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2"
          style={{ background: "var(--lu-on-orb)", color: "var(--lu-orb-bg)", outlineColor: "var(--lu-focus-ring)" }}
        >
          {actionLabel}
          <ArrowUpRight size={16} aria-hidden />
        </button>
        {children}
      </section>
    );
  }

  const solid = variant === "solid";
  const fg = "var(--lu-hero-fg)";
  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {avatar ?? (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
            style={{ background: solid ? "var(--lu-overlay-ink)" : "var(--lu-surface-2)", color: solid ? fg : "var(--lu-fg)" }}
          >
            {(greeting ?? "?").trim().charAt(0).toUpperCase()}
          </span>
        )}
        {greeting && (
          <span className="text-[15px] font-semibold" style={{ color: solid ? fg : "var(--lu-fg)" }}>
            {greeting}
          </span>
        )}
      </div>
      {onBell && (
        <button
          type="button"
          aria-label="Notifications"
          onClick={onBell}
          className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2"
          style={{
            border: `1px solid ${solid ? "var(--lu-on-accent)" : "var(--lu-border-strong)"}`,
            color: solid ? fg : "var(--lu-fg)",
            outlineColor: "var(--lu-focus-ring)",
          }}
        >
          <Bell size={18} aria-hidden />
        </button>
      )}
    </div>
  );

  if (!solid) {
    // tinted : zone accent-soft en haut, carte surface qui remonte (coins hauts 28).
    return (
      <section data-testid="lu-hero" data-variant="tinted" className="w-full" style={{ background: "var(--lu-accent-soft)" }}>
        <div className="px-4 pb-6 pt-4">{header}</div>
        <div
          className="px-5 pb-5 pt-4"
          style={{ background: "var(--lu-surface)", borderRadius: "var(--lu-radius-xl) var(--lu-radius-xl) 0 0" }}
        >
          <p className="text-sm" style={{ color: "var(--lu-fg-muted)" }}>{label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <LuAmount amount={amount} size="display" />
            {delta && (
              <LuBadge variant="soft-accent">
                {delta.positive ? "▲" : "▼"} {delta.children}
              </LuBadge>
            )}
          </div>
          {children}
        </div>
      </section>
    );
  }

  // solid : aplat accent, coins bas 32.
  const heroStyle: CSSProperties = {
    background: "var(--lu-hero-bg)",
    borderRadius: `0 0 var(--lu-radius-2xl) var(--lu-radius-2xl)`,
    color: fg,
  };
  return (
    <section data-testid="lu-hero" data-variant="solid" className="w-full px-5 pb-6 pt-4" style={heroStyle}>
      {header}
      <p className="mt-4 text-sm" style={{ color: fg }}>{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <LuAmount amount={amount} size="display" style={{ color: fg }} />
        {delta && (
          <LuBadge variant="on-hero">
            {delta.positive ? "▲" : "▼"} {delta.children}
          </LuBadge>
        )}
      </div>
      {children && (
        <div className="mt-4 p-4" style={{ background: "var(--lu-overlay-ink)", borderRadius: "var(--lu-radius-lg)" }}>
          {children}
        </div>
      )}
    </section>
  );
}

export default LuHero;
