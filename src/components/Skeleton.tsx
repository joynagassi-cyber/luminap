import { ShimmerCard, ShimmerList, ShimmerStatCard } from "./Shimmer";

// ── Refondus sur la primitive Shimmer (tokens Lumina, radius 4px). ─────────
// Les exports restent stables (les pages importent ces noms) mais le
// rendu passe désormais par le balayage shimmer + `prefers-reduced-motion`.

/** 3 cartes empilées. */
export function PageSkeleton() {
  return (
    <div className="p-5 space-y-3" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <ShimmerCard key={i} minHeight={88} />
      ))}
    </div>
  );
}

/** Une seule carte. */
export function CardSkeleton() {
  return (
    <div className="p-4" aria-busy="true">
      <ShimmerCard minHeight={88} />
    </div>
  );
}

/** Liste de N cartes. */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="p-4" aria-busy="true">
      <ShimmerList count={count} />
    </div>
  );
}

/** Carte statistique. */
export function StatCardSkeleton() {
  return (
    <div className="p-4" aria-busy="true">
      <ShimmerStatCard />
    </div>
  );
}

/** Skeleton plein page (liste de blocs). */
export function FullPageSkeleton() {
  return (
    <div
      className="max-w-lg mx-auto px-5 pb-24 pt-16"
      aria-busy="true"
      style={{ display: "grid", gap: 16 }}
    >
      <ShimmerList count={4} minHeight={64} />
    </div>
  );
}
