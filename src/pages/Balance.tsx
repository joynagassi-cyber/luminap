import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, getPeriodRange } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3, Download } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { exportPDF, exportExcel, exportCSV } from '@/lib/export';

export default function Balance() {
  const navigate = useNavigate();
  const { transactions, categories, caisses, appConfig, isLoading } = useLocalStore();
  const [period, setPeriod] = useState<'mois' | 'annee'>('mois');
  const [selectedCaisse, setSelectedCaisse] = useState<string>('main');
  const [showExport, setShowExport] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopHeader title="Bilan" />
        <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: '#212121' }} />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

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
                  <span className="text-text-primary font-medium">{cat.label}</span>
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

        <button onClick={() => setShowExport(true)} className="w-full py-3.5 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)' }}>
          <Download className="w-4 h-4" /> Exporter le rapport
        </button>

        {/* Export modal */}
        {showExport && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowExport(false)}>
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative w-full max-w-lg rounded-t-2xl p-5 pb-8" style={{ backgroundColor: '#181818' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-text-primary font-bold text-lg">Exporter le rapport</h2>
                <button onClick={() => setShowExport(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
                  <span className="text-text-tertiary text-sm">✕</span>
                </button>
              </div>
              {appConfig.churchName && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ backgroundColor: '#212121' }}>
                  {appConfig.churchLogoUrl && <img src={appConfig.churchLogoUrl} alt="" className="w-6 h-6 rounded" />}
                  <span className="text-text-tertiary text-xs">{appConfig.churchName}</span>
                </div>
              )}
              <div className="space-y-3">
                <button onClick={() => {
                  exportPDF({ churchName: appConfig.churchName, churchLogoUrl: appConfig.churchLogoUrl, transactions: approved, caisses, title: `Bilan financier — ${period === 'mois' ? 'Ce mois' : 'Cette année'}` });
                  setShowExport(false);
                }} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
                    <span className="text-lg">📄</span>
                  </div>
                  <div className="text-left">
                    <p className="text-text-primary text-sm font-semibold">PDF</p>
                    <p className="text-text-tertiary text-xs">Document professionnel avec en-tête</p>
                  </div>
                </button>
                <button onClick={() => {
                  exportExcel({ churchName: appConfig.churchName, churchLogoUrl: appConfig.churchLogoUrl, transactions: approved, caisses, title: `Bilan financier — ${period === 'mois' ? 'Ce mois' : 'Cette année'}` });
                  setShowExport(false);
                }} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1DB95420' }}>
                    <span className="text-lg">📊</span>
                  </div>
                  <div className="text-left">
                    <p className="text-text-primary text-sm font-semibold">Excel</p>
                    <p className="text-text-tertiary text-xs">Feuilles multiples (résumé, transactions, groupes)</p>
                  </div>
                </button>
                <button onClick={() => {
                  exportCSV({ churchName: appConfig.churchName, churchLogoUrl: appConfig.churchLogoUrl, transactions: approved, caisses, title: `Bilan financier — ${period === 'mois' ? 'Ce mois' : 'Cette année'}` });
                  setShowExport(false);
                }} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3B82F620' }}>
                    <span className="text-lg">📋</span>
                  </div>
                  <div className="text-left">
                    <p className="text-text-primary text-sm font-semibold">CSV</p>
                    <p className="text-text-tertiary text-xs">Compatible avec tous les tableurs</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
