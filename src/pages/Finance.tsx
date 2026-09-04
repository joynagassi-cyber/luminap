import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Filter, Wallet } from 'lucide-react';
import TransactionCard from '@/components/TransactionCard';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import type { Caisse } from '@/types';

export default function Finance() {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactions, categories, orgUnits, caisses } = useLocalStore();
  const [selectedCaisse, setSelectedCaisse] = useState<string>(
    (location.state as any)?.caisseId || 'all'
  );
  const [showFilter, setShowFilter] = useState(false);

  const filteredCaisses = caisses.filter(c => c.type === 'GROUP');

  const filteredTransactions = useMemo(() => {
    let txs = transactions;
    if (selectedCaisse !== 'all') {
      txs = txs.filter(t => t.sourceCaisseId === selectedCaisse);
    }
    return txs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedCaisse]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'INCOME' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'EXPENSE' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Finances" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-text-primary font-bold text-xl">Grand livre</h1>
          <button onClick={() => setShowFilter(!showFilter)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
            <Filter className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {showFilter && (
          <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs font-medium mb-3">Filtrer par caisse</p>
            <div className="space-y-2">
              <button
                onClick={() => { setSelectedCaisse('all'); setShowFilter(false); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all ${selectedCaisse === 'all' ? '' : 'opacity-60'}`}
                style={selectedCaisse === 'all' ? { backgroundColor: '#FF6B0020', color: '#FF6B00' } : { backgroundColor: '#181818', color: '#B3B3B3' }}
              >
                Toutes les caisses
              </button>
              {caisses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCaisse(c.id); setShowFilter(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all ${selectedCaisse === c.id ? '' : 'opacity-60'}`}
                  style={selectedCaisse === c.id ? { backgroundColor: c.color + '20', color: c.color } : { backgroundColor: '#181818', color: '#B3B3B3' }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" style={{ color: '#FF6B00' }} />
              <span className="text-text-secondary text-sm">Solde total</span>
            </div>
            <span className="text-xl font-black" style={{ color: totalIncome - totalExpense >= 0 ? '#1DB954' : '#E51332' }}>
              {totalIncome - totalExpense >= 0 ? '' : '-'}{formatCurrencyCompact(Math.abs(totalIncome - totalExpense))} FCFA
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1DB95420' }}>
                <ArrowUpRight className="w-3 h-3" style={{ color: '#1DB954' }} />
              </div>
              <span className="text-text-secondary">Entrées: <span style={{ color: '#1DB954' }}>+{formatCurrencyCompact(totalIncome)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
                <ArrowDownRight className="w-3 h-3" style={{ color: '#E51332' }} />
              </div>
              <span className="text-text-secondary">Sorties: <span style={{ color: '#E51332' }}>-{formatCurrencyCompact(totalExpense)}</span></span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="space-y-2">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 rounded-xl" style={{ backgroundColor: '#212121' }}>
              <p className="text-text-tertiary text-sm">Aucune transaction</p>
              <button onClick={() => navigate('/transaction/new')} className="mt-3 text-sm font-medium" style={{ color: '#FF6B00' }}>
                Créer une transaction
              </button>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} onPress={(id) => navigate(`/transaction/${id}`)} />
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
