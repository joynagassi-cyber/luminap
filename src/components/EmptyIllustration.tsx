interface Props {
  size?: number;
  className?: string;
}

/**
 * Illustration « état vide » — petit format, plate et statique, dans le même
 * langage visuel que `SplashIllustration` : fond transparent + couleurs via
 * tokens sémantiques (se fond au thème sombre ET clair), aucun dégradé ni
 * animation (respecte `prefers-reduced-motion` par construction).
 *
 * Motif : une carte avec un mini graphique en barres + une pièce (finance)
 * et un trait de titre — évoque « rien à afficher pour l'instant ».
 *
 * Décorative (aria-hidden) : le titre texte de `EmptyState` porte le sens.
 */
export default function EmptyIllustration({ size = 120, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={(size * 80) / 100}
      viewBox="0 0 100 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Sol (repère neutre) */}
      <rect x="10" y="72" width="80" height="3" rx="1.5" fill="var(--surface-hover)" />

      {/* Carte vide */}
      <rect x="14" y="14" width="72" height="54" rx="10" fill="var(--surface-hover)" />

      {/* Trait de titre */}
      <rect
        x="24"
        y="24"
        width="34"
        height="5"
        rx="2.5"
        fill="var(--text-tertiary)"
        opacity="0.55"
      />

      {/* Mini graphique en barres */}
      <rect x="24" y="48" width="10" height="12" rx="2" fill="var(--surface-active)" />
      <rect x="38" y="40" width="10" height="20" rx="2" fill="var(--text-tertiary)" />
      <rect x="52" y="32" width="10" height="28" rx="2" fill="var(--accent-primary)" />

      {/* Pièce (montant) */}
      <circle cx="76" cy="34" r="13" fill="var(--accent-primary)" opacity="0.16" />
      <circle cx="76" cy="34" r="8.5" fill="var(--accent-primary)" />
      <rect x="73" y="30" width="6" height="8" rx="1.5" fill="var(--surface-hover)" />
    </svg>
  );
}
