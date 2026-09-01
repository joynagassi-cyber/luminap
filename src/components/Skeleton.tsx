export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-surface-active rounded ${className}`}
      style={{ borderRadius: '8px' }}
    />
  );
}
