import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, ArrowDownLeft, ArrowUpRight,
  BarChart3, PieChart, Download, ArrowLeft,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { formatCurrency, formatDate, getPeriodRange } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import BottomNav from '@/components/BottomNav';
import BottomDrawer from '@/components/BottomDrawer';
import type { Transaction } from '@/types';
import type { PeriodType } from '@/lib/utils';

const COLORS = ['#FF6B00', '#1DB954', '#E51332', '#FFB800', '#808080', '#2196F3', '#9C27B0'];

export default function History() {
  const navigate = useNavigate();
  const { transactions, categories, orgUnits } = useStore();
  const [period, setPeriod] = useState<PeriodType>('mois');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const defaultRange = getPeriodRange(period);
  if (!startDate) setStartDate(defaultRange.start);
  if (!endDate) setEndDate(defaultRange.end);

  const handlePeriodChange = (p: PeriodType) => {
    setPeriod(p);
    const range = getPeriodRange(p);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const approved = transactions.filter(t => t.status === 'APPROVED' && t.date >= startDate && t.date <= endDate);

  // Chart data
  const lineData = getLineChartData(approved, period);
  const barData = getBarChartData(approved, period);
  const pieData = getPieData(approved);
  const orgPieData = getOrgPieData(approved);

  const totalIncome = approved.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = approved.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#181818' }}>
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Historique</h1>
              <p className="text-text-tertiary text-xs">{approved.length} transaction{approved.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="px-3 py-2 rounded-full text-sm"
            style={{ backgroundColor: '#181818', color: '#B3B3B3' }}
          >
            Plus
          </button>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-4">
          {(['mois', 'trimestre', 'annee'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className="flex-1 py-2.5 rounded-full text-xs font-medium transition-all"
              style={{ backgroundColor: period === p ? '#FF6B00' : '#181818', color: period === p ? '#FFFFFF' : '#808080' }}
            >
              {p === 'mois' ? 'Mois' : p === 'trimestre' ? 'Trimestre' : 'Année'}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1">
            <label className="block text-text-tertiary text-xs mb-1.5">Du</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm text-text-primary outline-none"
              style={{ backgroundColor: '#181818', border: '1px solid #282828' }} />
          </div>
          <div className="flex-1">
            <label className="block text-text-tertiary text-xs mb-1.5">Au</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm text-text-primary outline-none"
              style={{ backgroundColor: '#181818', border: '1px solid #282828' }} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center justify-center gap-1 mb-2">
              <ArrowUpRight className="w-4 h-4" style={{ color: '#1DB954' }} />
              <p className="text-text-tertiary text-xs">Entrées</p>
            </div>
            <p className="text-lg font-black tabular-nums" style={{ color: '#1DB954' }}>{formatCurrency(totalIncome)}</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center justify-center gap-1 mb-2">
              <ArrowDownLeft className="w-4 h-4" style={{ color: '#E51332' }} />
              <p className="text-text-tertiary text-xs">Sorties</p>
            </div>
            <p className="text-lg font-black tabular-nums" style={{ color: '#E51332' }}>{formatCurrency(totalExpense)}</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center justify-center gap-1 mb-2">
              <TrendingUp className="w-4 h-4" style={{ color: '#FF6B00' }} />
              <p className="text-text-tertiary text-xs">Résultat</p>
            </div>
            <p className="text-lg font-black tabular-nums" style={{ color: netResult >= 0 ? '#1DB954' : '#E51332' }}>
              {netResult >= 0 ? '' : '-'}{formatCurrency(Math.abs(netResult))}
            </p>
          </div>
        </div>

        {/* Bezier Curve Chart */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#181818' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: '#FF6B00' }} />
            <p className="text-text-primary text-sm font-semibold">Évolution du solde</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={lineData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1DB954" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#1DB954" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E51332" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#E51332" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
              <XAxis dataKey="label" tick={{ fill: '#808080', fontSize: 11 }} />
              <YAxis tick={{ fill: '#808080', fontSize: 10 }} tickFormatter={(v) => `${(v/10000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', borderRadius: '8px' }}
                labelStyle={{ color: '#B3B3B3' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Area type="monotone" dataKey="income" name="Entrées" stroke="#1DB954" fill="url(#colorIncome)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" name="Sorties" stroke="#E51332" fill="url(#colorExpense)" strokeWidth={2} />
              <Area type="monotone" dataKey="net" name="Solde" stroke="#FF6B00" fill="none" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#181818' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" style={{ color: '#FF6B00' }} />
            <p className="text-text-primary text-sm font-semibold">Revenus vs Dépenses</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
              <XAxis dataKey="label" tick={{ fill: '#808080', fontSize: 11 }} />
              <YAxis tick={{ fill: '#808080', fontSize: 10 }} tickFormatter={(v) => `${(v/10000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', borderRadius: '8px' }}
                labelStyle={{ color: '#B3B3B3' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Bar dataKey="income" name="Entrées" fill="#1DB954" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Sorties" fill="#E51332" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Charts Row */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* By Category */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="w-4 h-4" style={{ color: '#FF6B00' }} />
              <p className="text-text-primary text-xs font-semibold">Par catégorie</p>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="55%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-1 mt-2">
              {pieData.slice(0, 4).map((d, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-text-tertiary text-xs truncate max-w-20">{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Org Unit */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4" style={{ color: '#FF6B00' }} />
              <p className="text-text-primary text-xs font-semibold">Par groupe</p>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <RePieChart>
                <Pie
                  data={orgPieData}
                  cx="50%"
                  cy="55%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {orgPieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-1 mt-2">
              {orgPieData.slice(0, 4).map((d, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                  <span className="text-text-tertiary text-xs truncate max-w-20">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Line Chart — Bezier style */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#181818' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: '#FF6B00' }} />
            <p className="text-text-primary text-sm font-semibold">Tendance du solde (Bezier)</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
              <XAxis dataKey="label" tick={{ fill: '#808080', fontSize: 11 }} />
              <YAxis tick={{ fill: '#808080', fontSize: 10 }} tickFormatter={(v) => `${(v/10000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', borderRadius: '8px' }}
                labelStyle={{ color: '#B3B3B3' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Solde"
                stroke="#FF6B00"
                strokeWidth={3}
                dot={{ fill: '#FF6B00', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="income"
                name="Entrées"
                stroke="#1DB954"
                strokeWidth={2}
                dot={{ fill: '#1DB954', r: 3 }}
                strokeDasharray="5 3"
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="Sorties"
                stroke="#E51332"
                strokeWidth={2}
                dot={{ fill: '#E51332', r: 3 }}
                strokeDasharray="5 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6 pb-20">
          <button className="flex-1 py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
            style={{ backgroundColor: '#181818', color: '#B3B3B3' }}>
            <Download className="w-4 h-4" />Exporter
          </button>
          <button onClick={() => navigate('/finance')} className="flex-1 py-3 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
            Grand livre
          </button>
        </div>
      </div>

      <BottomNav />
      <BottomDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function getLineChartData(transactions: Transaction[], period: PeriodType) {
  const now = new Date();
  const data: { label: string; income: number; expense: number; net: number }[] = [];
  let cumulative = 0;

  if (period === 'mois') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('fr-FR', { month: 'short' });
      const start = d.toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const filtered = transactions.filter(t => t.date >= start && t.date <= end);
      const inc = filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const exp = filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      cumulative += inc - exp;
      data.push({ label, income: inc, expense: exp, net: cumulative });
    }
  } else if (period === 'trimestre') {
    for (let i = 3; i >= 0; i--) {
      const q = Math.floor(now.getMonth() / 3) - i;
      const year = q < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const quarter = ((q % 4) + 4) % 4;
      const start = new Date(year, quarter * 3, 1).toISOString().split('T')[0];
      const end = new Date(year, quarter * 3 + 3, 0).toISOString().split('T')[0];
      const label = `T${quarter + 1}`;
      const filtered = transactions.filter(t => t.date >= start && t.date <= end);
      const inc = filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const exp = filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      cumulative += inc - exp;
      data.push({ label, income: inc, expense: exp, net: cumulative });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      const filtered = transactions.filter(t => t.date >= start && t.date <= end);
      const inc = filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const exp = filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      cumulative += inc - exp;
      data.push({ label: String(year), income: inc, expense: exp, net: cumulative });
    }
  }

  return data;
}

function getBarChartData(transactions: Transaction[], period: PeriodType) {
  return getLineChartData(transactions, period).map(d => ({ label: d.label, income: d.income, expense: d.expense }));
}

function getPieData(transactions: Transaction[]) {
  const map = new Map<string, number>();
  for (const t of transactions) {
    const existing = map.get(t.categoryId) || 0;
    map.set(t.categoryId, existing + t.amount);
  }
  return Array.from(map.entries())
    .map(([id, value]) => {
      const cat = transactions.find(t => t.categoryId === id)?.category;
      return { name: cat?.labelFr || id, value };
    })
    .sort((a, b) => b.value - a.value);
}

function getOrgPieData(transactions: Transaction[]) {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (!t.orgUnitId) continue;
    const existing = map.get(t.orgUnitId) || 0;
    map.set(t.orgUnitId, existing + t.amount);
  }
  return Array.from(map.entries())
    .map(([id, value]) => {
      const unit = transactions.find(t => t.orgUnitId === id)?.orgUnit;
      return { name: unit?.name || id, value };
    })
    .sort((a, b) => b.value - a.value);
}
