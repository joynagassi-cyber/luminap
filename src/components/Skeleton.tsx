export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ backgroundColor: '#282828', borderRadius: '8px' }}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#212121' }}>
      <Skeleton className="h-4 w-1/2 mb-3" />
      <Skeleton className="h-7 w-2/3" />
    </div>
  );
}
