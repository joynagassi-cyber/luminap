interface Props {
  size?: number;
  className?: string;
}

/**
 * Illustration plate et statique du splash (phase 2) : « gestion d'une
 * organisation » — un bâtiment (l'organisation), une arborescence d'acteurs
 * (structure) et un mini graphique en barres (finance).
 *
 * - 100 % statique : pas de dégradé, pas de halo, pas d'animation
 *   (respecte prefers-reduced-motion par construction).
 * - Fond transparent + couleurs via variables sémantiques
 *   (var(--accent-primary), var(--text-tertiary), var(--surface-hover)…),
 *   donc elle se fond dans le thème sombre ET le thème clair.
 */
export default function SplashIllustration({ size = 280, className = "" }: Props) {
  return (
    <svg
      data-testid="splash-illustration"
      width={size}
      height={(size * 200) / 280}
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Gestion d'une organisation : bâtiment, structure et finances"
    >
      {/* Sol (repère neutre) */}
      <rect x="16" y="164" width="248" height="4" rx="2" fill="var(--surface-hover)" />

      {/* ── Bâtiment (l'organisation) ─────────────────────────────────── */}
      <g>
        <rect x="36" y="60" width="84" height="104" rx="8" fill="var(--surface-hover)" />
        <rect x="44" y="48" width="68" height="20" rx="6" fill="var(--accent-primary)" />
        {/* Fenêtres */}
        <rect x="52" y="82" width="16" height="16" rx="3" fill="var(--surface-active)" />
        <rect x="76" y="82" width="16" height="16" rx="3" fill="var(--surface-active)" />
        <rect x="52" y="108" width="16" height="16" rx="3" fill="var(--surface-active)" />
        <rect x="76" y="108" width="16" height="16" rx="3" fill="var(--accent-primary)" />
        {/* Porte */}
        <rect x="62" y="132" width="28" height="32" rx="4" fill="var(--accent-primary)" />
      </g>

      {/* ── Arborescence d'organisation (structure) ───────────────────── */}
      <g stroke="var(--text-tertiary)" strokeWidth="2">
        <line x1="176" y1="64" x2="176" y2="88" />
        <line x1="148" y1="88" x2="204" y2="88" />
        <line x1="148" y1="88" x2="148" y2="104" />
        <line x1="204" y1="88" x2="204" y2="104" />
      </g>
      <circle cx="176" cy="52" r="16" fill="var(--accent-primary)" />
      <circle cx="176" cy="52" r="6" fill="var(--surface-hover)" />
      <circle cx="148" cy="116" r="12" fill="var(--surface-active)" />
      <circle cx="204" cy="116" r="12" fill="var(--surface-active)" />

      {/* ── Mini graphique en barres (finance) ────────────────────────── */}
      <g>
        <rect x="232" y="100" width="18" height="64" rx="4" fill="var(--surface-hover)" />
        <rect x="232" y="88" width="18" height="12" rx="4" fill="var(--text-tertiary)" />
        {/* Pièce (montant) */}
        <circle cx="241" cy="56" r="14" fill="var(--accent-primary)" />
        <circle cx="241" cy="56" r="9" fill="var(--surface-hover)" />
        <rect x="237" y="50" width="8" height="12" rx="2" fill="var(--accent-primary)" />
      </g>
    </svg>
  );
}
