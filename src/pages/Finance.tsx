import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, getPeriodRange, formatDate } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3, Download, X, FileText, ClipboardList, Search, CheckSquare, Square, Filter, Check } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import TransactionCard from '@/components/TransactionCard';
import { exportPDF, exportExcel, exportCSV } from '@/lib/export';
import { PageSkeleton, CardSkeleton, StatCardSkeleton } from '@/components/Skeleton';

type ExportFormat = 'pdf' | 'excel' | 'csv';

export default function Finance() {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactions, categories, caisses, isLoading, appConfig } = useLocalStore();
  const [period, setPeriod] = useState<'mois' | 'annee'>('mois');
  const [selectedCaisse, setSelectedCaisse] = useState<string>('main');
  const [showExport, setShowExport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pre-select caisse from navigation state
  const locationCaisse = (location.state as any)?.caisseId;
  if (locationCaisse && selectedCaisse !== locationCaisse) {
    // Use effect would be better but useState initial is fine
  }

  const { start, end } = getPeriodRange(period);

  // Filter transactions
  const filteredTxs = transactions.filter(t => {
    if (t.sourceCaisseId !== selectedCaisse) return false;
    if (t.date < start || t.date > end) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    if (categoryFilter && t.categoryId !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (t.description || '').toLowerCase().includes(q) ||
        (t.category?.labelFr || '').toLowerCase().includes(q) ||
        (t.orgUnit?.name || '').toLowerCase().includes(q) ||
        formatCurrencyCompact(t.amount).toLowerCase().includes(q) ||
        formatDate(t.date).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const approved = filteredTxs.filter(t => t.status === 'APPROVED');
  const pending = filteredTxs.filter(t => t.status === 'PENDING');

  const totalIncome = approved.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = approved.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  const byCategory = categories.map(cat => {
    const catTxs = approved.filter(t => t.categoryId === cat.id);
    const income = catTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = catTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { categoryId: cat.id, labelFr: cat.labelFr, income, expense, net: income - expense };
  }).filter(c => c.income > 0 || c.expense > 0);

  const maxVal = Math.max(...byCategory.map(c => Math.max(c.income, c.expense)), 1);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedIds(pending.map(t => t.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    await useLocalStore.getState().batchApproveTransactions(selectedIds);
    setSelectedIds([]);
  };

  const handleExport = (format: ExportFormat) => {
    exportPDF({
      churchName: appConfig.churchName,
      churchLogoUrl: appConfig.churchLogoUrl,
      transactions: approved,
      caisses,
      title: `Bilan financier — ${period === 'mois' ? 'Ce mois' : 'Cette année'}`,
      period: `${start} → ${end}`,
    });
    setShowExport(false);
  };

  const handleExportExcel = () => {
    exportExcel({
      churchName: appConfig.churchName,
      churchLogoUrl: appConfig.churchLogoUrl,
      transactions: approved,
      caisses,
      title: `Bilan financier — ${period === 'mois' ? 'Ce mois' : 'Cette année'}`,
    });
    setShowExport(false);
  };

  const handleExportCSV = () => {
    exportCSV({
      churchName: appConfig.churchName,
      churchLogoUrl: appConfig.churchLogoUrl,
      transactions: approved,
      caisses,
      title: `Bilan financier — ${period === 'mois' ? 'Ce mois' : 'Cette année'}`,
    });
    setShowExport(false);
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Finances" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <h1 className="text-text-primary font-bold text-xl mb-5">Grand livre</h1>

        {/* Period toggle */}
        <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: '#212121' }}>
          <button onClick={() => setPeriod('mois')} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all" style={period === 'mois' ? { backgroundColor: '#FF6B00', color: '#fff' } : { color: '#808080' }}>Mois</button>
          <button onClick={() => setPeriod('annee')} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all" style={period === 'annee' ? { backgroundColor: '#FF6B00', color: '#fff' } : { color: '#808080' }}>Année</button>
        </div>

        {/* Caisse selector */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {caisses.map((c) => (
            <button key={c.id} onClick={() => { setSelectedCaisse(c.id); setStatusFilter(''); setCategoryFilter(''); setSearchQuery(''); setSelectedIds([]); }} className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all" style={selectedCaisse === c.id ? { backgroundColor: c.color, color: '#fff' } : { backgroundColor: '#212121', color: '#808080', border: '1px solid #282828' }}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par description, catégorie, groupe..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-text-primary text-sm outline-none"
            style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
          />
        </div>

        {/* Filter toggle + batch actions */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: showFilters ? '#FF6B0020' : '#212121', color: showFilters ? '#FF6B00' : '#808080', border: '1px solid #282828' }}>
            <Filter className="w-3.5 h-3.5" /> Filtres
          </button>
          {selectedIds.length > 0 && (
            <>
              <span className="text-xs text-text-tertiary">{selectedIds.length} sélectionné(s)</span>
              <button onClick={selectAll} className="text-xs font-medium" style={{ color: '#FF6B00' }}>Tout</button>
              <button onClick={clearSelection} className="text-xs" style={{ color: '#808080' }}>Effacer</button>
              <button onClick={handleBatchApprove} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#1DB954', color: '#fff' }}>
                <CheckSquare className="w-3.5 h-3.5" /> Approuver tout ({selectedIds.length})
              </button>
            </>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="rounded-xl p-4 mb-4 space-y-3" style={{ backgroundColor: '#212121' }}>
            <div>
              <label className="text-text-tertiary text-xs mb-1.5 block">Statut</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: '', label: 'Tous' },
                  { value: 'PENDING', label: 'En attente' },
                  { value: 'APPROVED', label: 'Approuvé' },
                  { value: 'DRAFT', label: 'Brouillon' },
                  { value: 'REJECTED', label: 'Rejeté' },
                ].map(f => (
                  <button key={f.value} onClick={() => setStatusFilter(f.value)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={statusFilter === f.value ? { backgroundColor: '#FF6B00', color: '#fff' } : { backgroundColor: '#282828', color: '#808080' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-text-tertiary text-xs mb-1.5 block">Catégorie</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full px-3 py-2 rounded-xl text-text-primary text-sm outline-none appearance-none" style={{ backgroundColor: '#181818', border: '1px solid #282828' }}>
                <option value="">Toutes les catégories</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.labelFr}</option>)}
              </select>
            </div>
          </div>
        )}

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

        {/* Pending batch action bar */}
        {pending.length > 0 && selectedIds.length === 0 && !showFilters && (
          <div className="flex items-center justify-between rounded-xl p-3 mb-4" style={{ backgroundColor: '#FFB80015', border: '1px solid #FFB80030' }}>
            <span className="text-xs font-medium" style={{ color: '#FFB800' }}>{pending.length} transaction{pending.length > 1 ? 's' : ''} en attente</span>
            <button onClick={selectAll} className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: '#FFB800', color: '#000' }}>
              Tout approuver
            </button>
          </div>
        )}

        {/* By category */}
        {byCategory.length > 0 && (
          <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#212121' }}>
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
        )}

        {/* Transactions */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-text-primary font-semibold text-sm">Transactions</p>
          <span className="text-xs text-text-tertiary">{approved.length + pending.length} transaction{approved.length + pending.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="space-y-2 mb-5">
          {filteredTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
            <div key={tx.id} className="relative">
              {tx.status === 'PENDING' && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(tx.id); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded flex items-center justify-center transition-all"
                  style={selectedIds.includes(tx.id) ? { backgroundColor: '#FF6B00' } : { backgroundColor: 'rgba(33,33,33,0.8)' }}
                >
                  {selectedIds.includes(tx.id) ? <Check className="w-3 h-3 text-white" /> : <Square className="w-3 h-3 text-text-tertiary" />}
                </button>
              )}
              <div className={tx.status === 'PENDING' ? 'pl-7' : ''}>
                <TransactionCard transaction={tx} onPress={(id) => navigate(`/transaction/${id}`)} />
              </div>
            </div>
          ))}
          {filteredTxs.length === 0 && (
            <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#212121' }}>
              <BarChart3 className="w-8 h-8 mx-auto mb-3 text-text-tertiary opacity-40" />
              <p className="text-text-tertiary text-sm">Aucune transaction</p>
            </div>
          )}
        </div>

        {/* Export button */}
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
                  <span className="text-text-tertiary text-sm"><X className="w-4 h-4" /></span>
                </button>
              </div>
              {appConfig.churchName && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ backgroundColor: '#212121' }}>
                  {appConfig.churchLogoUrl && <img src={appConfig.churchLogoUrl} alt="" className="w-6 h-6 rounded" />}
                  <span className="text-text-tertiary text-xs">{appConfig.churchName}</span>
                </div>
              )}
              <div className="space-y-3">
                <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
                    <FileText className="text-lg" style={{ color: '#E51332' }} />
                  </div>
                  <div className="text-left">
                    <p className="text-text-primary text-sm font-semibold">PDF</p>
                    <p className="text-text-tertiary text-xs">Document professionnel avec en-tête</p>
                  </div>
                </button>
                <button onClick={handleExportExcel} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1DB95420' }}>
                    <BarChart3 className="text-lg" style={{ color: '#1DB954' }} />
                  </div>
                  <div className="text-left">
                    <p className="text-text-primary text-sm font-semibold">Excel</p>
                    <p className="text-text-tertiary text-xs">Feuilles multiples (résumé, transactions, groupes)</p>
                  </div>
                </button>
                <button onClick={handleExportCSV} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3B82F620' }}>
                    <ClipboardList className="text-lg" style={{ color: '#3B82F6' }} />
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
