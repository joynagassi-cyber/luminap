import { ArrowUpRight, ArrowDownRight, Wallet, Users, Calendar } from 'lucide-react';
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
  const category = transaction.category;
  const orgUnit = transaction.orgUnit;
  const event = transaction.event;

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
          <p className="text-text-primary text-sm font-semibold truncate">{transaction.description || category?.labelFr || 'Transaction'}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-text-tertiary text-xs">{formatDate(transaction.date)}</span>
            {category && (
              <>
                <span className="text-text-tertiary text-xs">·</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B0015', color: '#FF6B00' }}>{category.labelFr}</span>
              </>
            )}
            {orgUnit && (
              <>
                <span className="text-text-tertiary text-xs">·</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#3B82F615', color: '#3B82F6' }}>
                  <Users className="w-3 h-3" /> {orgUnit.name}
                </span>
              </>
            )}
            {event && (
              <>
                <span className="text-text-tertiary text-xs">·</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#8B5CF615', color: '#8B5CF6' }}>
                  <Calendar className="w-3 h-3" /> {event.name}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-sm ${isIncome ? 'text-income' : 'text-expense'}`}>
            {isIncome ? '+' : '-'}{formatCurrencyCompact(transaction.amount)}
          </p>
          <p className="text-text-tertiary text-xs">FCFA</p>
          <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: getStatusColor(transaction.status) + '20', color: getStatusColor(transaction.status) }}>
            {getStatusLabel(transaction.status)}
          </div>
        </div>
      </div>
    </button>
  );
}
