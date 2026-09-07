import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { useTransactions, useAccounts, useCaisses } from '@/lib/dataLayer';
import { formatCentsToFCFA, getPeriodRange, formatDate } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Filter, Plus, Search, X, Calendar, TrendingUp, Wallet } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import TransactionCard from '@/components/TransactionCard';
import { PageSkeleton } from '@/components/Skeleton';
import type { Transaction } from '@/types';

export default function Finance() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedCaisse = location.state?.caisseId;

  const { transactions: idbTxs, categories, isLoading } = useLocalStore();
  const { data: psTransactions } = useTransactions();
  const { data: accounts } = useAccounts();
  const { data: caisses } = useCaisses();

  // Merge: prefer PowerSync, fallback to IndexedDB
  const transactions = psTransactions ?? idbTxs;

  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCaisse, setSelectedCaisse] = useState<string>(preselectedCaisse || 'ALL');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx: any) => {
      if (searchTerm && !tx.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (selectedType !== 'ALL' && tx.type !== selectedType) return false;
      if (selectedStatus !== 'ALL' && tx.status !== selectedStatus) return false;
      if (selectedCaisse !== 'ALL' && tx.sourceCaisseId !== selectedCaisse) return false;
      if (dateRange.from && tx.date < dateRange.from) return false;
      if (dateRange.to && tx.date > dateRange.to) return false;
      return true;
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedType, selectedStatus, selectedCaisse, dateRange]);

  const totalIncome = filteredTransactions.filter((t: any) => t.type === 'INCOME' && t.status === 'APPROVED').reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter((t: any) => t.type === 'EXPENSE' && t.status === 'APPROVED').reduce((s: number, t: any) => s + t.amount, 0);

  const handleAddTransaction = (type: 'INCOME' | 'EXPENSE') => {
    navigate('/transaction/new', { state: { type } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopHeader title="Finance" />
        <PageSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Finance" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-16">

        {/* Summary Card */}
        <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-text-tertiary text-xs">Solde total</p>
              <p className="text-text-primary font-black text-2xl" style={{ color: (totalIncome - totalExpense) >= 0 ? '#1DB954' : '#E51332' }}>
                {(totalIncome - totalExpense) >= 0 ? '' : '-'}{formatCentsToFCFA(Math.abs(totalIncome - totalExpense))} F
              </p>
            </div>
            <div className="text-right">
              <p className="text-text-tertiary text-xs">Entrées</p>
              <p className="text-[#1DB954] font-bold">+{formatCentsToFCFA(totalIncome)}</p>
              <p className="text-text-tertiary text-xs mt-1">Sorties</p>
              <p className="text-[#E51332] font-bold">-{formatCentsToFCFA(totalExpense)}</p>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { label: 'Toutes', value: 'ALL' },
              { label: 'Revenu', value: 'INCOME' },
              { label: 'Dépense', value: 'EXPENSE' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setSelectedType(f.value)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: selectedType === f.value ? '#FF6B00' : '#181818',
                  color: selectedType === f.value ? '#fff' : '#B3B3B3'
                }}
              >
                {f.label}
              </button>
            ))}
            {[
              { label: 'Tout', value: 'ALL' },
              { label: 'Approuvé', value: 'APPROVED' },
              { label: 'En attente', value: 'PENDING' },
              { label: 'Brouillon', value: 'DRAFT' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setSelectedStatus(f.value)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: selectedStatus === f.value ? '#3B82F6' : '#181818',
                  color: selectedStatus === f.value ? '#fff' : '#B3B3B3'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
            />
          </div>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="px-4 rounded-xl flex items-center gap-2"
            style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
          >
            <Filter className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Transactions List */}
        <div className="space-y-2 mb-6">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#1e1e1e' }}>
              <p className="text-text-tertiary text-sm">Aucune transaction trouvée</p>
            </div>
          ) : (
            filteredTransactions.map((tx: any) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onPress={(id) => navigate(`/transaction/${id}`)}
              />
            ))
          )}
        </div>

        {/* FAB */}
        <div className="fixed bottom-24 right-5 flex flex-col gap-3">
          <button
            onClick={() => handleAddTransaction('INCOME')}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: '#1DB954' }}
          >
            <ArrowUpRight className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => handleAddTransaction('EXPENSE')}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: '#E51332' }}
          >
            <ArrowDownRight className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
