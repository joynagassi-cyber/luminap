export default function LuminaLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer glow */}
      <defs>
        <linearGradient id="luminaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF8533" />
          <stop offset="50%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#CC5500" />
        </linearGradient>
        <filter id="luminaGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* L shape - main beam */}
      <rect x="12" y="8" width="12" height="48" rx="3" fill="url(#luminaGrad)" filter="url(#luminaGlow)" />
      {/* L shape - cross beam */}
      <rect x="12" y="44" width="44" height="12" rx="3" fill="url(#luminaGrad)" filter="url(#luminaGlow)" />
      {/* Highlight accent */}
      <rect x="14" y="10" width="8" height="20" rx="2" fill="rgba(255,255,255,0.3)" />
      <rect x="14" y="46" width="20" height="8" rx="2" fill="rgba(255,255,255,0.3)" />
      {/* Light rays */}
      <circle cx="48" cy="12" r="4" fill="#FFB800" opacity="0.8" />
      <circle cx="54" cy="18" r="2" fill="#FFB800" opacity="0.5" />
    </svg>
  );
}
