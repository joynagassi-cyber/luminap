import { Loader2 } from 'lucide-react';

export function PageSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FF6B00' }} />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#212121' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-surface-hover" />
        <div className="flex-1">
          <div className="h-4 bg-surface-hover rounded w-2/3 mb-2" />
          <div className="h-3 bg-surface-hover rounded w-1/2" />
        </div>
      </div>
      <div className="h-7 bg-surface-hover rounded w-1/2" />
    </div>
  );
}
