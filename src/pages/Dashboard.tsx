import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseStore } from '@/store/useSupabaseStore';
import { formatCurrency, getPeriodRange } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, BarChart3, BookOpen, PlusCircle, ChevronDown } from 'lucide-react';
import TransactionCard from '@/components/TransactionCard';
import BottomNav from '@/components/BottomNav';
import BottomDrawer from '@/components/BottomDrawer';

export default function Dashboard() {
  const navigate = useNavigate();
  const { transactions, user } = useSupabaseStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { start, end } = getPeriodRange('mois');
  const approvedTransactions = transactions.filter(
    t => t.status === 'APPROVED' && t.date >= start && t.date <= end
  );
  const totalIncome = approvedTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = approvedTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  const recentTransactions = transactions
    .filter(t => t.status === 'APPROVED' || t.status === 'PENDING')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const pendingCount = transactions.filter(t => t.status === 'PENDING').length;
  const draftCount = transactions.filter(t => t.status === 'DRAFT').length;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
        {/* Header with Logo */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="Lumina" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <p className="text-text-tertiary text-xs">Lumina</p>
              <h1 className="text-sm font-bold text-text-primary">
                {user?.firstName || 'Utilisateur'}
              </h1>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#212121' }}
          >
            <ChevronDown className="w-5 h-5 text-text-secondary rotate-90" />
          </button>
        </div>

        {/* Hero Balance Card */}
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#212121' }}>
          <p className="text-text-tertiary text-sm mb-1">Solde du mois</p>
          <div className="flex items-baseline gap-2">
            <span
              className="text-4xl font-black tabular-nums"
              style={{ color: netResult >= 0 ? '#1DB954' : '#E51332' }}
            >
              {netResult >= 0 ? '' : '-'}{formatCurrency(Math.abs(netResult))}
            </span>
            <span className="text-text-tertiary text-sm">FCFA</span>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#1DB954' }} />
              <span className="text-text-tertiary text-sm">+{formatCurrency(totalIncome)} entrées</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E51332' }} />
              <span className="text-text-tertiary text-sm">-{formatCurrency(totalExpense)} sorties</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs mb-1">Entrées</p>
            <p className="text-base font-bold tabular-nums" style={{ color: '#1DB954' }}>{formatCurrency(totalIncome)}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs mb-1">Sorties</p>
            <p className="text-base font-bold tabular-nums" style={{ color: '#E51332' }}>{formatCurrency(totalExpense)}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs mb-1">Net</p>
            <p className="text-base font-bold tabular-nums" style={{ color: netResult >= 0 ? '#1DB954' : '#E51332' }}>{formatCurrency(Math.abs(netResult))}</p>
          </div>
        </div>

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
            <button onClick={() => navigate('/transaction/new')} className="flex items-center gap-3 p-4 rounded-lg active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1DB95420' }}>
                <ArrowUpRight className="w-5 h-5" style={{ color: '#1DB954' }} />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">Nouvelle entrée</p>
                <p className="text-text-tertiary text-xs mt-0.5">Ajouter un revenu</p>
              </div>
            </button>
            <button onClick={() => navigate('/transaction/new')} className="flex items-center gap-3 p-4 rounded-lg active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E5133220' }}>
                <ArrowDownRight className="w-5 h-5" style={{ color: '#E51332' }} />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">Nouvelle sortie</p>
                <p className="text-text-tertiary text-xs mt-0.5">Ajouter une dépense</p>
              </div>
            </button>
            <button onClick={() => navigate('/history')} className="flex items-center gap-3 p-4 rounded-lg active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                <BarChart3 className="w-5 h-5" style={{ color: '#FF6B00' }} />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">Historique</p>
                <p className="text-text-tertiary text-xs mt-0.5">Courbes & graphiques</p>
              </div>
            </button>
            <button onClick={() => navigate('/finance')} className="flex items-center gap-3 p-4 rounded-lg active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                <BookOpen className="w-5 h-5" style={{ color: '#FF6B00' }} />
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
        <div className="space-y-2 mb-6 pb-20">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-10 rounded-lg" style={{ backgroundColor: '#212121' }}>
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
