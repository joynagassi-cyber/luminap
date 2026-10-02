/**
 * MoreVerticalSwoosh — glyphe « Plus » premium.
 *
 * Remplace le style « trois points » (MoreVertical) par une voile asymétrique
 * arrondie : 3 traits verticaux de hauteurs décroissantes (14px, 10px, 7px)
 * alignés en bas — une voile de bateau stylisée, plus premium que 3 pastilles.
 * Les 3 traits restent à la même place (20×20 viewBox, x=5/11/17) pour la
 * reconnaissance de l'icône « menu », mais la silhouette est distinctive.
 *
 * `currentColor` pour la couleur ; `className="w-5 h-5"` (20px) comme les
 * autres icônes de la nav.
 */
export function MoreVerticalSwoosh({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Mât — le trait le plus haut (14px) */}
      <line x1="5" y1="10" x2="5" y2="22" />
      {/* Voile moyenne — 10px */}
      <line x1="11" y1="12" x2="11" y2="22" />
      {/* Piquet court — 7px */}
      <line x1="17" y1="15" x2="17" y2="22" />
    </svg>
  );
}

export default MoreVerticalSwoosh;
