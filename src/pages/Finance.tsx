import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, X, TrendingUp, TrendingDown,
  BarChart3, PieChart, ArrowDownLeft, ArrowUpRight, Calendar,
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import type { Transaction } from '@/types';
import BottomNav from '@/components/BottomNav';
import type { PeriodType } from '@/lib/utils';

type StatusFilter = 'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE';

interface FilteredTransaction extends Transaction {
  _dateStr: string;
}

export default function Finance() {
  const navigate = useNavigate();
  const { transactions, categories } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [categoryId, setCategoryId] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [period, setPeriod] = useState<PeriodType>('mois');

  // Build filtered list
  const filtered = transactions
    .filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (categoryId !== 'ALL' && t.categoryId !== categoryId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          t.description.toLowerCase().includes(q) ||
          t.category?.labelFr.toLowerCase().includes(q) ||
          formatCurrency(t.amount).includes(q) ||
          (t.creator?.firstName || '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Chart data for period
  const chartData = getChartData(transactions, period, categories);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Grand livre</h1>
            <p className="text-text-tertiary text-xs mt-0.5">{filtered.length} transaction{filtered.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1 px-3 py-2 rounded-full text-sm"
              style={{ backgroundColor: '#181818', color: '#B3B3B3' }}
            >
              <BarChart3 className="w-4 h-4" />Historique
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une transaction..."
            className="w-full pl-10 pr-10 py-2.5 rounded-full text-sm text-text-primary outline-none"
            style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#282828' }}
            >
              <X className="w-3 h-3 text-text-tertiary" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 mb-3 text-sm font-medium"
          style={{ color: showFilters ? '#FF6B00' : '#808080' }}
        >
          <Filter className="w-4 h-4" />
          Filtres
          {showFilters && <X className="w-3 h-3" />}
        </button>

        {/* Filter Panels */}
        {showFilters && (
          <div className="space-y-3 mb-5 p-4 rounded-xl" style={{ backgroundColor: '#181818' }}>
            {/* Status */}
            <div>
              <p className="text-text-tertiary text-xs mb-2">État</p>
              <div className="flex flex-wrap gap-2">
                {(['ALL', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      backgroundColor: statusFilter === s ? '#FF6B00' : '#282828',
                      color: statusFilter === s ? '#FFFFFF' : '#808080',
                    }}
                  >
                    {s === 'ALL' ? 'Tous' : getStatusLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <p className="text-text-tertiary text-xs mb-2">Type</p>
              <div className="flex gap-2">
                {(['ALL', 'INCOME', 'EXPENSE'] as TypeFilter[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className="flex-1 py-2 rounded-full text-xs font-medium transition-all"
                    style={{
                      backgroundColor: typeFilter === t ? '#FF6B00' : '#282828',
                      color: typeFilter === t ? '#FFFFFF' : '#808080',
                    }}
                  >
                    {t === 'ALL' ? 'Tous' : t === 'INCOME' ? 'Entrée' : 'Sortie'}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <p className="text-text-tertiary text-xs mb-2">Catégorie</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryId('ALL')}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: categoryId === 'ALL' ? '#FF6B00' : '#282828',
                    color: categoryId === 'ALL' ? '#FFFFFF' : '#808080',
                  }}
                >
                  Toutes
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: categoryId === cat.id ? '#FF6B00' : '#282828',
                      color: categoryId === cat.id ? '#FFFFFF' : '#808080',
                    }}
                  >
                    {cat.labelFr}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <ArrowUpRight className="w-3 h-3" style={{ color: '#1DB954' }} />
              <p className="text-text-tertiary text-xs">Entrées</p>
            </div>
            <p className="text-base font-bold tabular-nums" style={{ color: '#1DB954' }}>
              {formatCurrency(filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0))}
            </p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <ArrowDownLeft className="w-3 h-3" style={{ color: '#E51332' }} />
              <p className="text-text-tertiary text-xs">Sorties</p>
            </div>
            <p className="text-base font-bold tabular-nums" style={{ color: '#E51332' }}>
              {formatCurrency(filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0))}
            </p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3" style={{ color: '#FF6B00' }} />
              <p className="text-text-tertiary text-xs">Net</p>
            </div>
            <p className="text-base font-bold tabular-nums" style={{ color: '#FF6B00' }}>
              {formatCurrency(
                filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) -
                filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
              )}
            </p>
          </div>
        </div>

        {/* Period Selector for Charts */}
        <div className="flex gap-2 mb-4">
          {(['mois', 'trimestre', 'annee'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="flex-1 py-2 rounded-full text-xs font-medium transition-all"
              style={{ backgroundColor: period === p ? '#FF6B00' : '#181818', color: period === p ? '#FFFFFF' : '#808080' }}
            >
              {p === 'mois' ? 'Mois' : p === 'trimestre' ? 'Trimestre' : 'Année'}
            </button>
          ))}
        </div>

        {/* Mini Chart */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#181818' }}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4" style={{ color: '#FF6B00' }} />
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">Aperçu</p>
          </div>
          <ChartPreview data={chartData} period={period} />
        </div>

        {/* Transactions List */}
        <div className="space-y-2 mb-6 pb-20">
          {filtered.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#181818' }}>
              <Search className="w-8 h-8 mx-auto mb-3 text-text-tertiary" />
              <p className="text-text-tertiary text-sm">Aucun résultat</p>
              <p className="text-text-tertiary text-xs mt-1">Essayez de modifier vos filtres</p>
            </div>
          ) : (
            filtered.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} onClick={() => navigate(`/transaction/${tx.id}`)} />
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function TransactionRow({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const isIncome = tx.type === 'INCOME';
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-xl text-left active:scale-95 transition-transform"
      style={{ backgroundColor: '#181818' }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: isIncome ? '#1DB95420' : '#E5133220' }}
      >
        {isIncome ? (
          <ArrowUpRight className="w-5 h-5" style={{ color: '#1DB954' }} />
        ) : (
          <ArrowDownLeft className="w-5 h-5" style={{ color: '#E51332' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">{tx.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-text-tertiary text-xs">{tx.category?.labelFr}</span>
          <span className="text-text-tertiary text-xs">·</span>
          <span className="text-text-tertiary text-xs">{formatDate(tx.date)}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold tabular-nums" style={{ color: isIncome ? '#1DB954' : '#E51332' }}>
          {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
        </p>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: getStatusColor(tx.status) + '20', color: getStatusColor(tx.status) }}
        >
          {tx.status === 'PENDING' ? 'En attente' : tx.status === 'APPROVED' ? 'Approuvé' : tx.status}
        </span>
      </div>
    </button>
  );
}

function ChartPreview({ data, period }: { data: { label: string; income: number; expense: number }[]; period: PeriodType }) {
  if (data.length === 0) {
    return <p className="text-text-tertiary text-xs text-center py-4">Aucune donnée</p>;
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="flex items-end gap-0.5 w-full h-20">
            <div
              className="flex-1 rounded-t"
              style={{
                backgroundColor: '#1DB954',
                height: `${(d.income / maxVal) * 100}%`,
                minHeight: d.income > 0 ? '2px' : '0',
              }}
            />
            <div
              className="flex-1 rounded-t"
              style={{
                backgroundColor: '#E51332',
                height: `${(d.expense / maxVal) * 100}%`,
                minHeight: d.expense > 0 ? '2px' : '0',
              }}
            />
          </div>
          <span className="text-text-tertiary text-xs" style={{ fontSize: '9px' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function getChartData(transactions: Transaction[], period: PeriodType, categories: { id: string; labelFr: string; type: string }[]) {
  const now = new Date();
  const data: { label: string; income: number; expense: number }[] = [];

  if (period === 'mois') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('fr-FR', { month: 'short' });
      const start = d.toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const filtered = transactions.filter(t => t.date >= start && t.date <= end && t.status === 'APPROVED');
      data.push({
        label,
        income: filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
        expense: filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
      });
    }
  } else if (period === 'trimestre') {
    for (let i = 3; i >= 0; i--) {
      const q = Math.floor(now.getMonth() / 3) - i;
      const year = q < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const quarter = ((q % 4) + 4) % 4;
      const start = new Date(year, quarter * 3, 1).toISOString().split('T')[0];
      const end = new Date(year, quarter * 3 + 3, 0).toISOString().split('T')[0];
      const label = `T${quarter + 1}`;
      const filtered = transactions.filter(t => t.date >= start && t.date <= end && t.status === 'APPROVED');
      data.push({
        label,
        income: filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
        expense: filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
      });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      const filtered = transactions.filter(t => t.date.startsWith(String(year)) && t.status === 'APPROVED');
      data.push({
        label: String(year),
        income: filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
        expense: filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
      });
    }
  }

  return data;
}
