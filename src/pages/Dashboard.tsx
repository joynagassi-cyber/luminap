import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore, getRoleLabel } from '@/store/useLocalStore';
import { formatCurrencyCompact, getPeriodRange } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, BarChart3, BookOpen, PlusCircle, Calendar, TrendingUp, Wallet, Sparkles } from 'lucide-react';
import TransactionCard from '@/components/TransactionCard';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import BottomDrawer from '@/components/BottomDrawer';
import { PageSkeleton, CardSkeleton } from '@/components/Skeleton';
import type { Caisse } from '@/types';

function CaisseCard({ caisse, transactions, navigate }: { caisse: Caisse; transactions: any[]; navigate: ReturnType<typeof useNavigate> }) {
  const approvedTxs = transactions.filter(t => t.sourceCaisseId === caisse.id && t.status === 'APPROVED');
  const income = approvedTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expense = approvedTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const pending = transactions.filter(t => t.sourceCaisseId === caisse.id && t.status === 'PENDING');
  const pendingAmount = pending.reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0);

  return (
    <button
      onClick={() => navigate('/finance', { state: { caisseId: caisse.id } })}
      className="w-full text-left rounded-xl p-4 transition-all active:scale-95"
      style={{ backgroundColor: '#212121', border: `1px solid ${caisse.color}30` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: caisse.color + '20' }}
        >
          <Wallet className="w-5 h-5" style={{ color: caisse.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-semibold truncate">{caisse.name}</p>
          <p className="text-text-tertiary text-xs">{caisse.type === 'MAIN' ? 'Église' : 'Groupe'}</p>
        </div>
        {caisse.type === 'GROUP' && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: caisse.color + '15', color: caisse.color }}>
            Caisse
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-black tabular-nums" style={{ color: balance >= 0 ? '#1DB954' : '#E51332' }}>
          {balance >= 0 ? '' : '-'}{formatCurrencyCompact(Math.abs(balance))}
        </span>
        <span className="text-text-tertiary text-xs">FCFA</span>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-text-tertiary">Entrées: <span style={{ color: '#1DB954' }}>+{formatCurrencyCompact(income)}</span></span>
        <span className="text-text-tertiary">Sorties: <span style={{ color: '#E51332' }}>-{formatCurrencyCompact(expense)}</span></span>
      </div>
      {pendingAmount !== 0 && (
        <div className="mt-2 text-xs" style={{ color: '#FFB800' }}>
          {pendingAmount > 0 ? '+' : '-'}{formatCurrencyCompact(Math.abs(pendingAmount))} en attente
        </div>
      )}
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { transactions, categories, orgUnits, caisses, isLoading, user } = useLocalStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }, []);

  const { start, end } = getPeriodRange('mois');
  const mainCaisse = caisses.find(c => c.id === 'main');
  const groupCaisses = caisses.filter(c => c.type === 'GROUP');
  const mainTxs = transactions.filter(t => t.sourceCaisseId === 'main');

  const approvedTransactions = mainTxs.filter(
    t => t.status === 'APPROVED' && t.date >= start && t.date <= end
  );
  const totalIncome = approvedTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = approvedTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  // Recent main caisse transactions
  const recentTransactions = mainTxs
    .filter(t => t.status === 'APPROVED' || t.status === 'PENDING')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const pendingCount = mainTxs.filter(t => t.status === 'PENDING').length;
  const draftCount = mainTxs.filter(t => t.status === 'DRAFT').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopHeader title="Lumina" />
        <PageSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Lumina" />
      <div className="max-w-lg mx-auto px-5 pb-24">

        {/* Main Caisse Hero */}
        {mainCaisse && (
          <div
            className="rounded-2xl p-5 mb-5 cursor-pointer active:scale-98 transition-transform"
            style={{
              backgroundColor: '#212121',
              border: '1px solid #FF6B0040',
              background: 'linear-gradient(135deg, #212121 0%, #1a1a1a 100%)',
            }}
            onClick={() => navigate('/finance')}
          >
            {/* Top row: greeting + role */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
                  <Sparkles className="w-5 h-5" style={{ color: '#FF6B00' }} />
                </div>
                <div>
                  <p className="text-text-primary font-bold text-base">{greeting} 👋</p>
                  <p className="text-text-tertiary text-xs mt-0.5">
                    {user.role ? getRoleLabel(user.role) : 'Trésorier'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-text-tertiary text-xs">Caisse principale</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black tabular-nums" style={{ color: netResult >= 0 ? '#1DB954' : '#E51332' }}>
                    {netResult >= 0 ? '' : '-'}{formatCurrencyCompact(Math.abs(netResult))}
                  </span>
                  <span className="text-text-tertiary text-xs">FCFA</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px mb-4" style={{ backgroundColor: '#282828' }} />

            {/* Stats row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1DB95420' }}>
                  <ArrowUpRight className="w-4 h-4" style={{ color: '#1DB954' }} />
                </div>
                <div>
                  <p className="text-text-tertiary text-xs">Entrées</p>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: '#1DB954' }}>
                    +{formatCurrencyCompact(totalIncome)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
                  <ArrowDownRight className="w-4 h-4" style={{ color: '#E51332' }} />
                </div>
                <div className="text-right">
                  <p className="text-text-tertiary text-xs">Sorties</p>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: '#E51332' }}>
                    -{formatCurrencyCompact(totalExpense)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Caisses Grid */}
        {groupCaisses.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">Caisses des groupes</p>
              <button onClick={() => navigate('/versement')} className="text-xs font-medium" style={{ color: '#FF6B00' }}>
                Verser →
              </button>
            </div>
            <div className="space-y-2">
              {groupCaisses.map((caisse) => (
                <CaisseCard key={caisse.id} caisse={caisse} transactions={transactions} navigate={navigate} />
              ))}
            </div>
          </div>
        )}

        {/* Pending/Draft badges */}
        {(pendingCount > 0 || draftCount > 0) && (
          <div className="flex gap-2 mb-5">
            {pendingCount > 0 && (
              <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: '#FFB80020', color: '#FFB800' }}>
                {pendingCount} en attente
              </span>
            )}
            {draftCount > 0 && (
              <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: '#80808020', color: '#808080' }}>
                {draftCount} brouillon
              </span>
            )}
          </div>
        )}

        {/* Shortcuts */}
        <div className="mb-5">
          <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Actions rapides</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/transaction/new')} className="flex items-center gap-3 p-4 rounded-lg active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1DB95420' }}>
                <ArrowUpRight className="w-5 h-5" style={{ color: '#1DB954' }} />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">Nouvelle entrée</p>
                <p className="text-text-tertiary text-xs mt-0.5">Ajouter un revenu</p>
              </div>
            </button>
            <button onClick={() => navigate('/transaction/new')} className="flex items-center gap-3 p-4 rounded-lg active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E5133220' }}>
                <ArrowDownRight className="w-5 h-5" style={{ color: '#E51332' }} />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">Nouvelle sortie</p>
                <p className="text-text-tertiary text-xs mt-0.5">Ajouter une dépense</p>
              </div>
            </button>
            <button onClick={() => navigate('/versement')} className="flex items-center gap-3 p-4 rounded-lg active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#FF6B00' }} />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">Versement</p>
                <p className="text-text-tertiary text-xs mt-0.5">Vérser vers la caisse</p>
              </div>
            </button>
            <button onClick={() => navigate('/events')} className="flex items-center gap-3 p-4 rounded-lg active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                <Calendar className="w-5 h-5" style={{ color: '#FF6B00' }} />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">Événements</p>
                <p className="text-text-tertiary text-xs mt-0.5">Planifier & suivre</p>
              </div>
            </button>
            <button onClick={() => navigate('/finance')} className="flex items-center gap-3 p-4 rounded-lg active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1DB95420' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#1DB954' }} />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">Grand livre</p>
                <p className="text-text-tertiary text-xs mt-0.5">Toutes les transactions</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-text-primary font-semibold text-base">Derniers mouvements</p>
          <button onClick={() => navigate('/finance')} className="text-sm font-medium" style={{ color: '#FF6B00' }}>Tout voir</button>
        </div>
        <div className="space-y-2 pb-4">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-10 rounded-lg" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <PlusCircle className="w-8 h-8 mx-auto mb-3 text-text-tertiary" />
              <p className="text-text-tertiary text-sm">Aucune transaction</p>
              <button onClick={() => navigate('/transaction/new')} className="mt-3 text-sm font-medium" style={{ color: '#FF6B00' }}>
                Créer une transaction
              </button>
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} onPress={(id) => navigate(`/transaction/${id}`)} />
            ))
          )}
        </div>
      </div>

      <BottomNav />
      <BottomDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
