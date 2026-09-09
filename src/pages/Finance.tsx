import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { useAccounts, useCaisses } from '@/lib/dataLayer';
import { resource } from '@/capabilities/resource';
import type { Transaction } from '@/types';
import { formatCentsToFCFA } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Filter, Plus, Search, X, Calendar, TrendingUp, Wallet } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import TransactionCard from '@/components/TransactionCard';
import { PageSkeleton } from '@/components/Skeleton';
import { IonPage, IonHeader, IonContent, IonTitle, IonToolbar } from '@ionic/react';

export default function Finance() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedCaisse = location.state?.caisseId;

  const { categories, isLoading } = useLocalStore();
  const { data: accounts } = useAccounts();
  const { data: caisses } = useCaisses();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Load transactions via Resource capability
  useEffect(() => {
    resource.list<Transaction>('Transaction', {
      filter: [],
      sortBy: 'date',
      sortOrder: 'desc',
    }).then(({ items }) => {
      setTransactions(items as any);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

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

  if (isLoading || loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Finance</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="bg-canvas">
          <div className="min-h-screen bg-canvas">
            <TopHeader title="Finance" />
            <PageSkeleton />
            <BottomNav />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Finance</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Finance" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl p-4" style={{ backgroundColor: '#1DB95420' }}>
                <p className="text-text-tertiary text-xs">Revenus</p>
                <p className="text-text-primary font-bold text-lg mt-1">{formatCentsToFCFA(totalIncome)}</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#E5133220' }}>
                <p className="text-text-tertiary text-xs">Dépenses</p>
                <p className="text-text-primary font-bold text-lg mt-1">{formatCentsToFCFA(totalExpense)}</p>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  aria-label="Rechercher une transaction"
                  style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
                />
              </div>
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="px-4 rounded-xl flex items-center gap-2"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                aria-label="Filtres"
                aria-expanded={filterOpen}
              >
                <Filter className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            {/* Filter Panel */}
            {filterOpen && (
              <div className="rounded-xl p-4 mb-4 space-y-3" style={{ backgroundColor: '#1e1e1e' }}>
                <div className="flex items-center justify-between">
                  <p className="text-text-primary text-sm font-medium">Filtres</p>
                  <button onClick={() => setFilterOpen(false)} style={{ color: '#B3B3B3' }} aria-label="Fermer les filtres">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Type Filter */}
                <div>
                  <p className="text-text-tertiary text-xs mb-2">Type</p>
                  <div className="flex gap-2">
                    {['ALL', 'INCOME', 'EXPENSE'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelectedType(f)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: selectedType === f ? '#FF6B00' : '#212121',
                          color: selectedType === f ? '#fff' : '#B3B3B3'
                        }}
                      >
                        {f === 'ALL' ? 'Tout' : f === 'INCOME' ? 'Revenu' : 'Dépense'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <p className="text-text-tertiary text-xs mb-2">Statut</p>
                  <div className="flex gap-2">
                    {['ALL', 'APPROVED', 'PENDING', 'DRAFT'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelectedStatus(f)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: selectedStatus === f ? '#3B82F6' : '#212121',
                          color: selectedStatus === f ? '#fff' : '#B3B3B3'
                        }}
                      >
                        {f === 'ALL' ? 'Tout' : f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caisse Filter */}
                <div>
                  <p className="text-text-tertiary text-xs mb-2">Caisse</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedCaisse('ALL')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: selectedCaisse === 'ALL' ? '#FF6B00' : '#212121',
                        color: selectedCaisse === 'ALL' ? '#fff' : '#B3B3B3'
                      }}
                    >
                      Toutes
                    </button>
                    {caisses.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCaisse(c.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: selectedCaisse === c.id ? '#FF6B00' : '#212121',
                          color: selectedCaisse === c.id ? '#fff' : '#B3B3B3'
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <p className="text-text-tertiary text-xs mb-2">Période</p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                      className="px-3 py-2 rounded-lg text-xs"
                      style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
                    />
                    <span className="text-text-tertiary text-xs self-center">→</span>
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                     
className="
                      style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
                    />
                  </div>
                </div>
              </div>
            )}

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
                aria-label="Nouvelle entrée"
              >
                <ArrowUpRight className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => handleAddTransaction('EXPENSE')}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                style={{ backgroundColor: '#E51332' }}
                aria-label="Nouvelle dépense"
              >
                <ArrowDownRight className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
