import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { ArrowLeft, Wallet, TrendingUp, Check } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import TransactionCard from '@/components/TransactionCard';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgUnits, caisses, transactions } = useLocalStore();

  const orgUnit = orgUnits.find(o => o.id === id);
  const caisse = caisses.find(c => c.id === id);
  if (!orgUnit || !caisse) return null;

  const txs = transactions.filter(t => t.sourceCaisseId === caisse.id);
  const approvedTxs = txs.filter(t => t.status === 'APPROVED');
  const income = approvedTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expense = approvedTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const pendingCount = txs.filter(t => t.status === 'PENDING').length;

  const handleVersement = () => {
    navigate('/versement', { state: { caisseId: caisse.id, defaultAmount: balance } });
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title={orgUnit.name} />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate('/groups')} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Hero Card */}
        <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: '#212121', border: `1px solid ${caisse.color}30` }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: caisse.color + '20' }}>
              <Wallet className="w-6 h-6" style={{ color: caisse.color }} />
            </div>
            <div className="flex-1">
              <p className="text-text-primary font-bold text-lg">{caisse.name}</p>
              <p className="text-text-tertiary text-xs">{caisse.description}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: caisse.color + '15', color: caisse.color }}>Caisse</span>
          </div>

          <div className="h-px mb-4" style={{ backgroundColor: '#282828' }} />

          <div className="text-center mb-4">
            <p className="text-text-tertiary text-xs mb-1">Solde actuel</p>
            <p className="text-3xl font-black" style={{ color: balance >= 0 ? '#1DB954' : '#E51332' }}>
              {balance >= 0 ? '' : '-'}{formatCurrencyCompact(Math.abs(balance))}
              <span className="text-text-tertiary text-base font-medium ml-1">FCFA</span>
            </p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1DB95420' }}>
                <TrendingUp className="w-3 h-3" style={{ color: '#1DB954' }} />
              </div>
              <span className="text-text-tertiary">Entrées: <span style={{ color: '#1DB954' }}>+{formatCurrencyCompact(income)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
                <TrendingUp className="w-3 h-3 rotate-180" style={{ color: '#E51332' }} />
              </div>
              <span className="text-text-tertiary">Sorties: <span style={{ color: '#E51332' }}>-{formatCurrencyCompact(expense)}</span></span>
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="mt-3 text-xs text-center" style={{ color: '#FFB800' }}>
              {pendingCount} transaction{pendingCount > 1 ? 's' : ''} en attente
            </div>
          )}
        </div>

        {/* Versement button */}
        {balance > 0 && (
          <button
            onClick={handleVersement}
            className="w-full py-3.5 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 mb-6 transition-all active:scale-95"
            style={{ backgroundColor: '#FF6B00' }}
          >
            <Check className="w-4 h-4" /> Verser {formatCurrencyCompact(balance)} FCFA à la caisse principale
          </button>
        )}

        {/* Recent transactions */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-text-primary font-semibold text-base">Transactions récentes</p>
          <button onClick={() => navigate('/finance', { state: { caisseId: caisse.id } })} className="text-sm font-medium" style={{ color: '#FF6B00' }}>Tout voir</button>
        </div>
        <div className="space-y-2">
          {txs.filter(t => t.status === 'APPROVED' || t.status === 'PENDING')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} onPress={(id) => navigate(`/transaction/${id}`)} />
            ))
          }
          {txs.length === 0 && (
            <div className="text-center py-8 rounded-xl" style={{ backgroundColor: '#212121' }}>
              <p className="text-text-tertiary text-sm">Aucune transaction</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
