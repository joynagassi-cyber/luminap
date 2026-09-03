interface LuminaLogoProps {
  size?: number;
  className?: string;
}

export default function LuminaLogo({ size = 40, className = '' }: LuminaLogoProps) {
  return (
    <img
      src="/assets/logo-lumina.png"
      alt="Lumina"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
