import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrencyCompact, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';
import type { Transaction } from '@/types';
import { useNavigate } from 'react-router-dom';

export default function TransactionCard({ transaction, onPress }: { transaction: Transaction; onPress?: (id: string) => void }) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (onPress) onPress(transaction.id);
    else navigate(`/transaction/${transaction.id}`);
  };
  const isIncome = transaction.type === 'INCOME';
  return (
    <button onClick={handleClick} className="w-full text-left rounded-xl p-4 transition-all active:scale-95" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isIncome ? '#1DB95420' : '#E5133220' }}>
          {isIncome
            ? <ArrowUpRight className="w-5 h-5" style={{ color: '#1DB954' }} />
            : <ArrowDownRight className="w-5 h-5" style={{ color: '#E51332' }} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-semibold truncate">{transaction.description || transaction.category?.labelFr || 'Transaction'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-text-tertiary text-xs">{formatDate(transaction.date)}</span>
            <span className="text-text-tertiary text-xs">·</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ color: getStatusColor(transaction.status), backgroundColor: getStatusColor(transaction.status) + '20' }}>
              {getStatusLabel(transaction.status)}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-sm ${isIncome ? 'text-income' : 'text-expense'}`}>
            {isIncome ? '+' : '-'}{formatCurrencyCompact(transaction.amount)}
          </p>
          <p className="text-text-tertiary text-xs">FCFA</p>
        </div>
      </div>
    </button>
  );
}
