import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { formatCurrency, getPeriodRange } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, BarChart3, BookOpen } from 'lucide-react';
import TransactionCard from '@/components/TransactionCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactions, user } = useStore();

  const { start, end } = getPeriodRange('mois');
  const approvedTransactions = transactions.filter(t => t.status === 'APPROVED' && t.date >= start && t.date <= end);
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-text-tertiary text-sm">Bonjour,</p>
            <h1 className="text-xl font-bold text-text-primary">
              {user?.firstName || 'Utilisateur'}
            </h1>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}
          >
            {user?.firstName?.[0] || 'U'}
          </div>
        </div>

        {/* Hero Balance Card */}
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#181818' }}>
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
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#181818' }}>
            <p className="text-text-tertiary text-xs mb-1">Entrées</p>
            <p className="text-base font-bold tabular-nums" style={{ color: '#1DB954' }}>{formatCurrency(totalIncome)}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#181818' }}>
            <p className="text-text-tertiary text-xs mb-1">Sorties</p>
            <p className="text-base font-bold tabular-nums" style={{ color: '#E51332' }}>{formatCurrency(totalExpense)}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#181818' }}>
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
        <p className="text-text-primary font-semibold text-base mb-3">Raccourcis</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => navigate('/transaction/new')} className="flex flex-col items-center gap-2 p-4 rounded-lg active:scale-95 transition-transform" style={{ backgroundColor: '#181818' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1DB95420' }}>
              <ArrowUpRight className="w-5 h-5" style={{ color: '#1DB954' }} />
            </div>
            <span className="text-text-primary text-sm font-medium">Nouvelle entrée</span>
          </button>
          <button onClick={() => navigate('/transaction/new')} className="flex flex-col items-center gap-2 p-4 rounded-lg active:scale-95 transition-transform" style={{ backgroundColor: '#181818' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
              <ArrowDownRight className="w-5 h-5" style={{ color: '#E51332' }} />
            </div>
            <span className="text-text-primary text-sm font-medium">Nouvelle sortie</span>
          </button>
          <button onClick={() => navigate('/balance')} className="flex flex-col items-center gap-2 p-4 rounded-lg active:scale-95 transition-transform" style={{ backgroundColor: '#181818' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
              <BarChart3 className="w-5 h-5" style={{ color: '#FF6B00' }} />
            </div>
            <span className="text-text-primary text-sm font-medium">Bilan financier</span>
          </button>
          <button onClick={() => navigate('/finance')} className="flex flex-col items-center gap-2 p-4 rounded-lg active:scale-95 transition-transform" style={{ backgroundColor: '#181818' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
              <BookOpen className="w-5 h-5" style={{ color: '#FF6B00' }} />
            </div>
            <span className="text-text-primary text-sm font-medium">Grand livre</span>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-text-primary font-semibold text-base">Derniers mouvements</p>
          <button onClick={() => navigate('/finance')} className="text-sm" style={{ color: '#FF6B00' }}>Voir tout</button>
        </div>
        <div className="space-y-2 mb-6 pb-20">
          {recentTransactions.length === 0 ? (
            <p className="text-text-tertiary text-sm text-center py-8">Aucune transaction</p>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} onPress={(id) => navigate(`/transaction/${id}`)} />
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around" style={{ backgroundColor: '#181818', borderTop: '1px solid #282828', minHeight: '64px', zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { path: '/', label: 'Accueil', icon: '🏠' },
          { path: '/finance', label: 'Finance', icon: '📊' },
          { path: '/transaction/new', label: 'Ajouter', icon: '➕' },
          { path: '/groups', label: 'Groupes', icon: '👥' },
          { path: '/settings', label: 'Réglages', icon: '⚙️' },
        ].map((tab) => (
          <button key={tab.path} onClick={() => navigate(tab.path)} className="flex flex-col items-center justify-center gap-1 px-4" style={{ minHeight: '44px' }}>
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs font-medium" style={{ color: location.pathname === tab.path ? '#FF6B00' : '#808080' }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
