import type { Transaction } from '@/integrations/supabase/client';
import { getStatusColor, getStatusLabel } from '@/lib/utils';

interface StatusBadgeProps {
  status: TransactionStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  const sizeClasses = size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses}`}
      style={{ backgroundColor: color + '20', color }}
    >
      {label}
    </span>
  );
}
