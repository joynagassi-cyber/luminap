import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, getPeriodRange, formatDate } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3, Download } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function Balance() {
  const navigate = useNavigate();
  const { transactions, categories, caisses } = useLocalStore();
  const [period, setPeriod] = useState<'mois' | 'annee'>('mois');
  const [selectedCaisse, setSelectedCaisse] = useState<string>('main');

  const { start, end } = getPeriodRange(period);
  const mainTxs = transactions.filter(t => t.sourceCaisseId === selectedCaisse);
  const approved = mainTxs.filter(t => t.status === 'APPROVED' && t.date >= start && t.date <= end);

  const totalIncome = approved.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = approved.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  const byCategory = categories.map(cat => {
    const catTxs = approved.filter(t => t.categoryId === cat.id);
    const income = catTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = catTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { categoryId: cat.id, label: cat.labelFr, income, expense, net: income - expense };
  }).filter(c => c.income > 0 || c.expense > 0);

  const maxVal = Math.max(...byCategory.map(c => Math.max(c.income, c.expense)), 1);

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Bilan" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <h1 className="text-text-primary font-bold text-xl mb-5">Bilan financier</h1>

        {/* Period toggle */}
        <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: '#212121' }}>
          <button onClick={() => setPeriod('mois')} className="flex-1 py-2 rounded-lg text-sm font-medium transition-all" style={period === 'mois' ? { backgroundColor: '#FF6B00', color: '#fff' } : { color: '#808080' }}>Mois</button>
          <button onClick={() => setPeriod('annee')} className="flex-1 py-2 rounded-lg text-sm font-medium transition-all" style={period === 'annee' ? { backgroundColor: '#FF6B00', color: '#fff' } : { color: '#808080' }}>Année</button>
        </div>

        {/* Caisse selector */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {caisses.map((c) => (
            <button key={c.id} onClick={() => setSelectedCaisse(c.id)} className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all" style={selectedCaisse === c.id ? { backgroundColor: c.color, color: '#fff' } : { backgroundColor: '#212121', color: '#808080' }}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#212121' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#1DB95420' }}>
              <TrendingUp className="w-4 h-4" style={{ color: '#1DB954' }} />
            </div>
            <p className="text-text-tertiary text-xs">Entrées</p>
            <p className="text-income font-bold text-sm mt-1">+{formatCurrencyCompact(totalIncome)}</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#212121' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#E5133220' }}>
              <TrendingDown className="w-4 h-4" style={{ color: '#E51332' }} />
            </div>
            <p className="text-text-tertiary text-xs">Sorties</p>
            <p className="text-expense font-bold text-sm mt-1">-{formatCurrencyCompact(totalExpense)}</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#212121' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#FF6B0020' }}>
              <BarChart3 className="w-4 h-4" style={{ color: '#FF6B00' }} />
            </div>
            <p className="text-text-tertiary text-xs">Résultat</p>
            <p className="font-bold text-sm mt-1" style={{ color: netResult >= 0 ? '#1DB954' : '#E51332' }}>
              {netResult >= 0 ? '+' : '-'}{formatCurrencyCompact(Math.abs(netResult))}
            </p>
          </div>
        </div>

        {/* By category */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#212121' }}>
          <p className="text-text-tertiary text-xs font-medium mb-4">Par catégorie</p>
          <div className="space-y-3">
            {byCategory.map((cat) => (
              <div key={cat.categoryId}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-primary font-medium">{cat.labelFr}</span>
                  <span className="text-text-tertiary">{cat.net >= 0 ? '+' : '-'}{formatCurrencyCompact(Math.abs(cat.net))}</span>
                </div>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
                  {cat.income > 0 && (
                    <div className="rounded-full" style={{ width: `${(cat.income / maxVal) * 50}%`, backgroundColor: '#1DB954' }} />
                  )}
                  {cat.expense > 0 && (
                    <div className="rounded-full ml-auto" style={{ width: `${(cat.expense / maxVal) * 50}%`, backgroundColor: '#E51332' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => navigate(-1)} className="w-full py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>
          <Download className="w-4 h-4" /> Exporter
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
