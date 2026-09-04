export default function LogoSpinner({ size = 80 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* L-shaped spinner with rotation */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animation: 'spin 1.2s linear infinite' }}
        >
          <defs>
            <linearGradient id="spinnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF8533" />
              <stop offset="100%" stopColor="#FF6B00" />
            </linearGradient>
          </defs>
          {/* Main L shape with gradient */}
          <rect x="10" y="6" width="14" height="52" rx="4" fill="url(#spinnerGrad)" opacity="0.9" />
          <rect x="10" y="46" width="52" height="14" rx="4" fill="url(#spinnerGrad)" opacity="0.9" />
          {/* Highlight */}
          <rect x="12" y="8" width="10" height="24" rx="3" fill="rgba(255,255,255,0.4)" />
          <rect x="12" y="48" width="24" height="10" rx="3" fill="rgba(255,255,255,0.4)" />
          {/* Pulsing dot at tip */}
          <circle cx="58" cy="10" r="4" fill="#FFB800">
            <animate attributeName="r" values="3;6;3" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </svg>
        {/* Background glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,107,0,0.15) 0%, transparent 70%)',
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
          }}
        />
      </div>
      <p className="text-text-tertiary text-sm" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
        Chargement…
      </p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.1; }
          100% { transform: scale(1); opacity: 0.3; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
