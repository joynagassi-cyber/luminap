import LuminaLogo from './LuminaLogo';

export default function LogoSpinner({ size = 80 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            backgroundColor: '#FF6B00',
            opacity: 0.2,
          }}
        />
        <div
          className="relative w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            animation: 'spin 2s linear infinite',
            background: 'conic-gradient(from 0deg, #FF6B00 0%, transparent 50%, #FF6B00 100%)',
            mask: 'radial-gradient(circle, transparent 40%, black 41%)',
            WebkitMask: 'radial-gradient(circle, transparent 40%, black 41%)',
          }}
        >
          <LuminaLogo size={size * 0.55} />
        </div>
      </div>
      <p className="text-text-tertiary text-sm">Chargement…</p>
    </div>
  );
}
