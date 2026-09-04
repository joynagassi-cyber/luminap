import { generateId } from '@/lib/utils';

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#282828]" />
            <div className="flex-1">
              <div className="h-4 bg-[#282828] rounded w-2/3 mb-2" />
              <div className="h-3 bg-[#282828] rounded w-1/2" />
            </div>
          </div>
          <div className="h-7 bg-[#282828] rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#212121' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[#282828]" />
        <div className="flex-1">
          <div className="h-4 bg-[#282828] rounded w-2/3 mb-2" />
          <div className="h-3 bg-[#282828] rounded w-1/2" />
        </div>
      </div>
      <div className="h-7 bg-[#282828] rounded w-1/2" />
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#282828]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[#282828] rounded w-3/4" />
              <div className="h-3 bg-[#282828] rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl p-4 animate-pulse text-center" style={{ backgroundColor: '#212121' }}>
      <div className="w-8 h-8 rounded-full bg-[#282828] mx-auto mb-2" />
      <div className="h-3 bg-[#282828] rounded w-1/2 mx-auto mb-1" />
      <div className="h-5 bg-[#282828] rounded w-3/4 mx-auto" />
    </div>
  );
}

export function FullPageSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-5 pb-24 pt-16 space-y-4">
      <div className="h-8 bg-[#282828] rounded w-1/3 animate-pulse" />
      <div className="h-32 bg-[#212121] rounded-xl animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-[#212121] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
