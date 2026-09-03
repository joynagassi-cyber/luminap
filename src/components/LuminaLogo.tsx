interface LuminaLogoProps {
  size?: number;
  color?: string;
  className?: string;
}

export default function LuminaLogo({ size = 40, color = '#FF6B00', className = '' }: LuminaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="luminaGlow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="luminaBulb" x1="50" y1="15" x2="50" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="45" r="40" fill="url(#luminaGlow)" />
      <path
        d="M50 10 C30 10 18 25 18 42 C18 55 25 62 30 68 L30 75 C30 78 32 80 35 80 L65 80 C68 80 70 78 70 75 L70 68 C75 62 82 55 82 42 C82 25 70 10 50 10 Z"
        fill="url(#luminaBulb)"
        stroke={color}
        strokeWidth="2"
      />
      <path d="M40 65 L45 50 L50 60 L55 50 L60 65" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
      <rect x="35" y="80" width="30" height="8" rx="2" fill={color} opacity="0.7" />
      <rect x="38" y="88" width="24" height="6" rx="2" fill={color} opacity="0.5" />
      <text x="50" y="48" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontSize="22" fontWeight="900" fill="white">L</text>
    </svg>
  );
}
