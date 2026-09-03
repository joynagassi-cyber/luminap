import type { Transaction } from '@/types';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: (id: string) => void;
}

export default function TransactionCard({ transaction, onPress }: TransactionCardProps) {
  const isIncome = transaction.type === 'INCOME';
  const statusColor = getStatusColor(transaction.status);

  return (
    <button
      onClick={() => onPress?.(transaction.id)}
      className="w-full flex items-center gap-3 p-4 bg-surface hover:bg-surface-hover rounded-lg transition-colors active:bg-surface-active text-left touch-manipulation"
      style={{ minHeight: '56px' }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: isIncome ? '#1DB95420' : '#E5133220' }}
      >
        {isIncome ? (
          <ArrowUpRight className="w-5 h-5" style={{ color: '#1DB954' }} />
        ) : (
          <ArrowDownRight className="w-5 h-5" style={{ color: '#E51332' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-text-primary font-semibold text-base truncate">
          {transaction.description || 'Sans description'}
        </p>
        <p className="text-text-tertiary text-sm mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span>{transaction.category?.labelFr}</span>
          <span>·</span>
          <span>{formatDate(transaction.date)}</span>
          {transaction.sourceCaisseId && transaction.sourceCaisseId !== 'main' && (
            <>
              <span>·</span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#282828', color: '#B3B3B3' }}>
                Caisse
              </span>
            </>
          )}
          {transaction.versementId && (
            <>
              <span>·</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>
                Versement
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span
          className="font-bold text-base tabular-nums"
          style={{ color: isIncome ? '#1DB954' : '#E51332' }}
        >
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
        </span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: statusColor + '20', color: statusColor }}
        >
          {getStatusLabel(transaction.status)}
        </span>
      </div>
    </button>
  );
}
