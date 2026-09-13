import { type CSSProperties, type ReactNode } from "react";

type Dim = number | string;

/** Convertit un nombre en px ; laisse passer une chaîne telle quelle. */
const px = (v: Dim, fallback = "4px"): string =>
  typeof v === "number" ? `${v}px` : v || fallback;

/**
 * Primitive shimmer block — balayage lumineux (translateX, sans reflow).
 * Le CSS (`.shimmer` dans App.css) gère l'animation et le fallback
 * `prefers-reduced-motion` (bloc statique `--surface-hover`).
 */
export function ShimmerBlock({
  width = "100%",
  height = 16,
  radius = "var(--skeleton-radius)",
  className = "",
  style,
}: {
  width?: Dim;
  height?: Dim;
  radius?: Dim;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`shimmer ${className}`}
      style={{
        width: px(width),
        height: px(height),
        borderRadius: px(radius, "4px"),
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

/** Ligne fine (pastille pill). */
export function ShimmerLine({
  width = "100%",
  height = 12,
  className = "",
  style,
}: {
  width?: Dim;
  height?: Dim;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <ShimmerBlock
      width={width}
      height={height}
      radius={999}
      className={className}
      style={style}
    />
  );
}

/** Pastille ronde (avatar / icône). */
export function ShimmerAvatar({
  size = 40,
  className = "",
}: {
  size?: Dim;
  className?: string;
}) {
  return (
    <ShimmerBlock
      width={size}
      height={size}
      radius="50%"
      className={className}
    />
  );
}

/** Carte avec lignes internes (avatar + lignes). */
export function ShimmerCard({
  rows = 2,
  minHeight,
  children,
  className = "",
}: {
  rows?: number;
  minHeight?: Dim;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`shimmer p-4 ${className}`}
      style={{
        borderRadius: "var(--skeleton-radius)",
        minHeight: minHeight ? px(minHeight) : undefined,
      }}
      aria-hidden="true"
    >
      {children ?? (
        <div className="flex items-center gap-3">
          <ShimmerAvatar size={40} />
          <div className="flex-1 space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
              <ShimmerLine
                key={i}
                width={i === 0 ? "60%" : "40%"}
                height={i === 0 ? 14 : 10}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Liste de lignes shimmer. */
export function ShimmerList({
  count = 5,
  gap = 12,
  minHeight = 56,
}: {
  count?: number;
  gap?: number;
  minHeight?: number;
}) {
  return (
    <div
      style={{ display: "grid", gap: `${gap}px` }}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i} minHeight={minHeight} />
      ))}
    </div>
  );
}

/** Carte stat (icône + valeur + label). */
export function ShimmerStatCard() {
  return (
    <div
      className="shimmer p-4 text-center"
      style={{ borderRadius: "var(--skeleton-radius)" }}
      aria-hidden="true"
    >
      <ShimmerAvatar size={32} className="mx-auto mb-2" />
      <ShimmerLine width="50%" height={10} className="mx-auto mb-2" />
      <ShimmerLine width="70%" height={18} className="mx-auto" />
    </div>
  );
}

/** Hero card — grand chiffre 48px shimmer. */
export function ShimmerHeroCard() {
  return (
    <div
      className="shimmer p-5"
      style={{ borderRadius: "var(--skeleton-radius)" }}
      aria-hidden="true"
    >
      <ShimmerLine width="35%" height={12} className="mb-3" />
      <ShimmerBlock
        width="60%"
        height={48}
        radius={8}
        className="mb-3"
      />
      <ShimmerLine width="80%" height={10} />
    </div>
  );
}
