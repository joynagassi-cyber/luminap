import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate, exportToCSV, getPeriodRange } from '@/lib/utils';
import { useLocalStore } from '@/store/useLocalStore';
import { Download } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import type { PeriodType } from '@/lib/utils';

export default function Balance() {
  const navigate = useNavigate();
  const { transactions, categories, orgUnits } = useLocalStore();
  const [period, setPeriod] = useState<PeriodType>('mois');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const defaultRange = getPeriodRange(period);
  if (!startDate) setStartDate(defaultRange.start);
  if (!endDate) setEndDate(defaultRange.end);

  const periodTransactions = transactions.filter(
    t => t.date >= startDate && t.date <= endDate
  );

  const totalIncome = periodTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = periodTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  const byCategory = new Map<string, { income: number; expense: number }>();
  for (const t of periodTransactions) {
    const existing = byCategory.get(t.categoryId) || { income: 0, expense: 0 };
    if (t.type === 'INCOME') existing.income += t.amount;
    else existing.expense += t.amount;
    byCategory.set(t.categoryId, existing);
  }

  const byOrgUnit = new Map<string, { income: number; expense: number }>();
  for (const t of periodTransactions) {
    if (t.orgUnitId) {
      const existing = byOrgUnit.get(t.orgUnitId) || { income: 0, expense: 0 };
      if (t.type === 'INCOME') existing.income += t.amount;
      else existing.expense += t.amount;
      byOrgUnit.set(t.orgUnitId, existing);
    }
  }

  const handleExport = () => {
    exportToCSV(periodTransactions, `bilan-${startDate}-${endDate}`);
  };

  const handlePeriodChange = (p: PeriodType) => {
    setPeriod(p);
    const range = getPeriodRange(p);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-text-primary">Bilan financier</h1>
          <button onClick={handleExport} className="flex items-center gap-1 px-3 py-2 rounded-full text-sm" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>
            <Download className="w-4 h-4" />Exporter CSV
          </button>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-5">
          {(['mois', 'trimestre', 'annee'] as PeriodType[]).map((p) => (
            <button key={p} onClick={() => handlePeriodChange(p)} className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all" style={{ backgroundColor: period === p ? '#FF6B00' : '#212121', color: period === p ? '#FFFFFF' : '#808080' }}>
              {p === 'mois' ? 'Mois' : p === 'trimestre' ? 'Trimestre' : 'Année'}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1">
            <label className="block text-text-tertiary text-xs mb-1.5">Du</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm text-text-primary outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>
          <div className="flex-1">
            <label className="block text-text-tertiary text-xs mb-1.5">Au</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm text-text-primary outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>
        </div>

        {/* Stat Cards */}
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
            <p className="text-text-tertiary text-xs mb-1">Résultat</p>
            <p className="text-base font-bold tabular-nums" style={{ color: netResult >= 0 ? '#1DB954' : '#E51332' }}>{formatCurrency(Math.abs(netResult))}</p>
          </div>
        </div>

        {/* By Category */}
        <div className="mb-5">
          <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Par catégorie</p>
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#212121' }}>
            <div className="flex items-center px-4 py-3 text-xs text-text-tertiary border-b" style={{ borderBottomColor: '#282828' }}>
              <span className="flex-1">Libellé</span>
              <span className="w-24 text-right">Entrées</span>
              <span className="w-24 text-right">Net</span>
            </div>
            {Array.from(byCategory.entries()).map(([id, v]) => {
              const cat = categories.find(c => c.id === id);
              return (
                <div key={id} className="flex items-center px-4 py-3 text-sm border-b last:border-0" style={{ borderBottomColor: '#282828' }}>
                  <span className="flex-1 text-text-primary">{cat?.labelFr || id}</span>
                  <span className="w-24 text-right tabular-nums" style={{ color: '#1DB954' }}>{formatCurrency(v.income)}</span>
                  <span className="w-24 text-right tabular-nums font-medium" style={{ color: v.income - v.expense >= 0 ? '#1DB954' : '#E51332' }}>{v.income - v.expense >= 0 ? '+' : ''}{formatCurrency(v.income - v.expense)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Org Unit */}
        {byOrgUnit.size > 0 && (
          <div className="mb-5">
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Par groupe</p>
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#212121' }}>
              <div className="flex items-center px-4 py-3 text-xs text-text-tertiary border-b" style={{ borderBottomColor: '#282828' }}>
                <span className="flex-1">Nom</span>
                <span className="w-24 text-right">Entrées</span>
                <span className="w-24 text-right">Net</span>
                </div>
                {Array.from(byOrgUnit.entries()).map(([id, v]) => {
                const unit = orgUnits.find(o => o.id === id);
                return (
                  <button key={id} onClick={() => navigate('/finance')} className="flex items-center px-4 py-3 text-sm border-b last:border-0 w-full text-left" style={{ borderBottomColor: '#282828' }}>
                    <span className="flex-1 text-text-primary">{unit?.name || id}</span>
                    <span className="w-24 text-right tabular-nums" style={{ color: '#1DB954' }}>{formatCurrency(v.income)}</span>
                    <span className="w-24 text-right tabular-nums font-medium" style={{ color: v.income - v.expense >= 0 ? '#1DB954' : '#E51332' }}>{v.income - v.expense >= 0 ? '+' : ''}{formatCurrency(v.income - v.expense)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mb-6 pb-20">
          <button onClick={handleExport} className="flex-1 py-3 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>Exporter CSV</button>
          <button onClick={() => navigate('/finance')} className="flex-1 py-3 rounded-full text-sm font-semibold" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>Grand livre</button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
