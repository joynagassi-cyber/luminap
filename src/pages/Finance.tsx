import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, exportToCSV } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Download, Plus } from 'lucide-react';
import TransactionCard from '@/components/TransactionCard';
import EmptyState from '@/components/EmptyState';
import BottomNav from '@/components/BottomNav';
import type { TransactionStatus } from '@/types';

type StatusFilter = 'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE';

export default function Finance() {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactions } = useStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const filtered = transactions
    .filter(t => statusFilter === 'ALL' || t.status === statusFilter)
    .filter(t => typeFilter === 'ALL' || t.type === typeFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleExport = () => {
    exportToCSV(filtered, 'grand-livre');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-text-primary">Grand livre</h1>
          <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-1 px-3 py-2 rounded-full text-sm" style={{ backgroundColor: '#181818', color: '#B3B3B3' }}>
              <Download className="w-4 h-4" />Exporter
            </button>
            <button onClick={() => navigate('/transaction/new')} className="flex items-center gap-1 px-3 py-2 rounded-full text-sm" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
              <Plus className="w-4 h-4" />Nouvelle
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <span className="text-text-tertiary text-xs flex-shrink-0">État :</span>
            {(['ALL', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] as StatusFilter[]).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className="px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all" style={{ backgroundColor: statusFilter === s ? '#FF6B00' : '#181818', color: statusFilter === s ? '#FFFFFF' : '#808080' }}>
                {s === 'ALL' ? 'Tous' : getStatusLabel(s)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <span className="text-text-tertiary text-xs flex-shrink-0">Type:</span>
            {(['ALL', 'INCOME', 'EXPENSE'] as TypeFilter[]).map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)} className="px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all" style={{ backgroundColor: typeFilter === t ? '#FF6B00' : '#181818', color: typeFilter === t ? '#FFFFFF' : '#808080' }}>
                {t === 'ALL' ? 'Tous' : t === 'INCOME' ? 'Entrée' : 'Sortie'}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-2 mb-6 pb-20">
          {filtered.length === 0 ? (
            <EmptyState
              title="Aucune transaction"
              description="Commencez par créer votre première transaction financière."
              actionLabel="Créer une transaction"
              onAction={() => navigate('/transaction/new')}
            />
          ) : (
            filtered.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} onPress={(id) => navigate(`/transaction/${id}`)} />
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
