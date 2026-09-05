import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowLeft, TrendingUp, BarChart3, PieChart, Calendar, Users, Building2, Activity, ChevronRight, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { formatCentsToFCFA, formatDate } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart, Line,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

type TabKey = 'overview' | 'monthly' | 'caisse' | 'group' | 'event' | 'category';

const TABS: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
  { key: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
  { key: 'monthly', label: 'Mensuel', icon: Calendar },
  { key: 'caisse', label: 'Par caisse', icon: Building2 },
  { key: 'group', label: 'Par groupe', icon: Users },
  { key: 'event', label: 'Par événement', icon: Activity },
  { key: 'category', label: 'Par catégorie', icon: PieChart },
];

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const COLORS = {
  income: '#1DB954',
  expense: '#E51332',
  pending: '#FFB800',
  accent: '#FF6B00',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  teal: '#14B8A6',
  pink: '#EC4899',
  grid: '#282828',
  text: '#808080',
};

function formatTooltipValue(value: number) {
  return formatCentsToFCFA(value);
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 shadow-2xl" style={{ backgroundColor: '#1E1E1E', border: '1px solid #282828' }}>
      <p className="text-text-tertiary text-xs mb-2 font-medium">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between gap-6 min-w-[140px]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-text-secondary text-xs">{entry.name}</span>
          </div>
          <span className="text-text-primary text-xs font-bold tabular-nums">{formatTooltipValue(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { transactions, accounts, orgUnits, events, categories, auditEntries, isLoading } = useLocalStore();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [period, setPeriod] = useState<'all' | 'month' | 'year'>('all');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <TopHeader title="Historique" />
        <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#181818' }}>
                <div className="h-4 bg-[#282828] rounded w-1/3 mb-3" />
                <div className="h-20 bg-[#282828] rounded" />
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  const getPeriodFilter = () => {
    if (period === 'month') return (t: any) => t.date >= monthStart.split('T')[0];
    if (period === 'year') return (t: any) => t.date >= yearStart.split('T')[0];
    return () => true;
  };

  const approved = transactions
    .filter(t => t.status === 'APPROVED' && getPeriodFilter()(t))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalIncome = approved.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = approved.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  // Monthly aggregated data for charts
  const monthlyData: Record<string, { month: string; label: string; income: number; expense: number; net: number; cumulative: number }> = {};
  let runningBalance = 0;
  for (const tx of approved) {
    const m = tx.date.substring(0, 7);
    if (!monthlyData[m]) monthlyData[m] = { month: m, label: `${MONTHS_FR[parseInt(m.split('-')[1]) - 1]} ${m.split('-')[0]}`, income: 0, expense: 0, net: 0, cumulative: 0 };
    if (tx.type === 'INCOME') monthlyData[m].income += tx.amount;
    else monthlyData[m].expense += tx.amount;
  }
  const monthlyEntries = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  monthlyEntries.forEach(m => {
    m.net = m.income - m.expense;
    runningBalance += m.net;
    m.cumulative = runningBalance;
  });

  // Cumulative balance data
  const cumulativeData = monthlyEntries.map(m => ({
    month: m.label,
    balance: m.cumulative,
    income: m.income,
    expense: m.expense,
  }));

  // By caisse
  const caisseData = accounts
    .filter(a => a.status === 'ACTIVE')
    .map(account => {
      const txs = approved.filter(t => t.sourceCaisseId === account.id);
      const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      return { ...account, income, expense, balance: income - expense };
    })
    .filter(c => c.income > 0 || c.expense > 0)
    .sort((a, b) => b.balance - a.balance);

  // By group
  const groupData = orgUnits
    .filter(o => o.type === 'groupe' && o.isActive !== false)
    .map(org => {
      const txs = approved.filter(t => t.orgUnitId === org.id);
      const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      return { ...org, income, expense, balance: income - expense };
    })
    .filter(g => g.income > 0 || g.expense > 0)
    .sort((a, b) => b.balance - a.balance);

  // By event
  const eventData = events
    .filter(e => e.status === 'COMPLETED' || e.status === 'ONGOING' || e.status === 'CANCELLED')
    .map(event => {
      const txs = approved.filter(t => t.eventId === event.id);
      const spent = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      return { ...event, income, spent };
    })
    .filter(e => e.spent > 0 || e.income > 0)
    .sort((a, b) => b.spent - a.spent);

  // By category
  const categoryData = categories
    .map(cat => {
      const txs = approved.filter(t => t.categoryId === cat.id);
      const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      return { ...cat, income, expense, total: income + expense };
    })
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  // Category donut data
  const categoryDonutData = categoryData.map(c => ({
    name: c.labelFr,
    value: c.total,
    income: c.income,
    expense: c.expense,
    color: c.type === 'INCOME' ? COLORS.income : COLORS.expense,
  }));

  // Audit stats
  const recentActions = auditEntries
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const actionsThisMonth = auditEntries.filter(a => {
    const d = new Date(a.createdAt);
    return d >= new Date(now.getFullYear(), now.getMonth(), 1);
  }).length;

  const totalTransactions = approved.length;
  const avgTransaction = totalTransactions > 0 ? Math.round((totalIncome + totalExpense) / totalTransactions) : 0;

  return (
    <div className="min-h-screen bg-[#121212]">
      <TopHeader title="Historique" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="flex items-end justify-between mb-1">
          <div>
            <h1 className="text-text-primary font-bold text-xl">Historique</h1>
            <p className="text-text-tertiary text-sm mt-0.5">Analyses et statistiques financières</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: '#FF6B0015', border: '1px solid #FF6B0030' }}>
            <Activity className="w-3 h-3" style={{ color: COLORS.accent }} />
            <span style={{ color: COLORS.accent }}>{actionsThisMonth}</span>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-2 mb-5">
          {(['all', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-4 py-2 rounded-full text-xs font-medium transition-all"
              style={period === p ? { backgroundColor: '#FF6B00', color: '#fff' } : { backgroundColor: '#181818', color: '#808080', border: '1px solid #282828' }}
            >
              {p === 'all' ? 'Tout' : p === 'month' ? 'Ce mois' : 'Cette année'}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl p-3.5 text-center" style={{ backgroundColor: '#181818', border: '1px solid #1DB95420' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#1DB95415' }}>
              <ArrowUpRight className="w-4 h-4" style={{ color: COLORS.income }} />
            </div>
            <p className="text-text-tertiary text-xs mb-0.5">Revenus</p>
            <p style={{ color: COLORS.income }} className="font-bold text-sm">{formatCentsToFCFA(totalIncome)}</p>
          </div>
          <div className="rounded-xl p-3.5 text-center" style={{ backgroundColor: '#181818', border: '1px solid #E5133220' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#E5133215' }}>
              <ArrowDownRight className="w-4 h-4" style={{ color: COLORS.expense }} />
            </div>
            <p className="text-text-tertiary text-xs mb-0.5">Dépenses</p>
            <p style={{ color: COLORS.expense }} className="font-bold text-sm">{formatCentsToFCFA(totalExpense)}</p>
          </div>
          <div className="rounded-xl p-3.5 text-center" style={{ backgroundColor: '#181818', border: '1px solid #FF6B0020' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#FF6B0015' }}>
              <Wallet className="w-4 h-4" style={{ color: COLORS.accent }} />
            </div>
            <p className="text-text-tertiary text-xs mb-0.5">Balance</p>
            <p style={{ color: netResult >= 0 ? COLORS.income : COLORS.expense }} className="font-bold text-sm">
              {netResult >= 0 ? '+' : ''}{formatCentsToFCFA(netResult)}
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
          <div className="flex-shrink-0 px-4 py-2.5 rounded-xl text-center" style={{ backgroundColor: '#181818' }}>
            <p className="text-text-tertiary text-xs">Transactions</p>
            <p className="text-text-primary font-bold text-sm">{totalTransactions}</p>
          </div>
          <div className="flex-shrink-0 px-4 py-2.5 rounded-xl text-center" style={{ backgroundColor: '#181818' }}>
            <p className="text-text-tertiary text-xs">Moyenne</p>
            <p className="text-text-primary font-bold text-sm">{formatCentsToFCFA(avgTransaction)}</p>
          </div>
          <div className="flex-shrink-0 px-4 py-2.5 rounded-xl text-center" style={{ backgroundColor: '#181818' }}>
            <p className="text-text-tertiary text-xs">Mois actifs</p>
            <p className="text-text-primary font-bold text-sm">{monthlyEntries.length}</p>
          </div>
          <div className="flex-shrink-0 px-4 py-2.5 rounded-xl text-center" style={{ backgroundColor: '#181818' }}>
            <p className="text-text-tertiary text-xs">Taux épargne</p>
            <p className="text-text-primary font-bold text-sm">
              {totalIncome > 0 ? Math.round((netResult / totalIncome) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={activeTab === key ? { backgroundColor: '#FF6B00', color: '#fff' } : { backgroundColor: '#181818', color: '#808080', border: '1px solid #282828' }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Bézier Area Chart — Income vs Expense */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: COLORS.income }} />
                  <span className="text-text-primary font-semibold text-sm">Revenus vs Dépenses</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.income }} />
                    <span className="text-text-tertiary text-xs">Revenus</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.expense }} />
                    <span className="text-text-tertiary text-xs">Dépenses</span>
                  </div>
                </div>
              </div>
              {monthlyEntries.length === 0 ? (
                <p className="text-text-tertiary text-xs text-center py-8">Aucune donnée disponible</p>
              ) : (
                <ChartContainer
                  config={{
                    income: { label: 'Revenus', color: COLORS.income },
                    expense: { label: 'Dépenses', color: COLORS.expense },
                  }}
                  className="h-48"
                >
                  <AreaChart data={monthlyEntries} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.income} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.income} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.expense} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.expense} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: COLORS.text, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: COLORS.text, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCentsToFCFA(v)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="bezier"
                      dataKey="income"
                      name="Revenus"
                      stroke={COLORS.income}
                      strokeWidth={2}
                      fill="url(#gradIncome)"
                      dot={{ fill: COLORS.income, r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: COLORS.income, strokeWidth: 0 }}
                    />
                    <Area
                      type="bezier"
                      dataKey="expense"
                      name="Dépenses"
                      stroke={COLORS.expense}
                      strokeWidth={2}
                      fill="url(#gradExpense)"
                      dot={{ fill: COLORS.expense, r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: COLORS.expense, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </div>

            {/* Cumulative Balance — Bézier Line */}
            {monthlyEntries.length > 0 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4" style={{ color: COLORS.accent }} />
                  <span className="text-text-primary font-semibold text-sm">Solde cumulé</span>
                </div>
                <ChartContainer
                  config={{
                    balance: { label: 'Solde', color: netResult >= 0 ? COLORS.income : COLORS.expense },
                  }}
                  className="h-40"
                >
                  <ComposedChart data={cumulativeData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: COLORS.text, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: COLORS.text, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCentsToFCFA(v)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="bezier"
                      dataKey="balance"
                      name="Solde"
                      stroke={netResult >= 0 ? COLORS.income : COLORS.expense}
                      strokeWidth={2}
                      dot={{ fill: netResult >= 0 ? COLORS.income : COLORS.expense, r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ChartContainer>
              </div>
            )}

            {/* Category distribution — Donut */}
            {categoryData.length > 0 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="w-4 h-4" style={{ color: COLORS.purple }} />
                  <span className="text-text-primary font-semibold text-sm">Répartition par catégorie</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-40">
                    <ChartContainer
                      config={categoryDonutData.reduce<any>((acc, d) => {
                        acc[d.name] = { label: d.name, color: d.color };
                        return acc;
                      }, {})}
                      className="h-full"
                    >
                      <RePieChart>
                        <Pie
                          data={categoryDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryDonutData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={_entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </RePieChart>
                    </ChartContainer>
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-[100px]">
                    {categoryDonutData.slice(0, 5).map((cat) => (
                      <div key={cat.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-text-tertiary text-xs truncate">{cat.name}</span>
                        <span className="text-text-primary text-xs font-medium ml-auto">{formatCentsToFCFA(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent actions */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: COLORS.accent }} />
                  <span className="text-text-primary font-semibold text-sm">Activité récente</span>
                </div>
                <button onClick={() => navigate('/trace')} className="text-xs text-text-tertiary flex items-center gap-1">
                  Voir tout <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {recentActions.length === 0 ? (
                <p className="text-text-tertiary text-xs text-center py-4">Aucune action récente</p>
              ) : (
                <div className="space-y-2">
                  {recentActions.map(a => (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#282828' }}>
                        <span className="text-xs font-bold" style={{ color: COLORS.accent }}>{a.action[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-xs font-medium truncate">{a.entityType} — {a.action}</p>
                        <p className="text-text-tertiary text-xs">{formatDate(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MONTHLY TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'monthly' && (
          <div className="space-y-4">
            {/* Monthly Bar Chart */}
            {monthlyEntries.length > 0 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4" style={{ color: COLORS.blue }} />
                  <span className="text-text-primary font-semibold text-sm">Tendance mensuelle</span>
                </div>
                <ChartContainer
                  config={{
                    income: { label: 'Revenus', color: COLORS.income },
                    expense: { label: 'Dépenses', color: COLORS.expense },
                  }}
                  className="h-52"
                >
                  <BarChart data={monthlyEntries} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: COLORS.text, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: COLORS.text, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCentsToFCFA(v)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="income" name="Revenus" radius={[4, 4, 0, 0]} fill={COLORS.income} />
                    <Bar dataKey="expense" name="Dépenses" radius={[4, 4, 0, 0]} fill={COLORS.expense} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}

            {/* Monthly detail list */}
            {monthlyEntries.length === 0 ? (
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#181818' }}>
                <p className="text-text-tertiary text-xs">Aucune donnée mensuelle</p>
              </div>
            ) : (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4" style={{ color: COLORS.blue }} />
                  <span className="text-text-primary font-semibold text-sm">Détail mensuel</span>
                </div>
                <div className="space-y-4">
                  {monthlyEntries.slice().reverse().map((m) => {
                    const total = m.income + m.expense;
                    const incomePct = total > 0 ? (m.income / total) * 100 : 50;
                    return (
                      <div key={m.month}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-text-primary text-sm font-medium">{m.label}</span>
                          <div className="flex items-center gap-3">
                            <span style={{ color: COLORS.income }} className="text-xs">+{formatCentsToFCFA(m.income)}</span>
                            <span style={{ color: COLORS.expense }} className="text-xs">-{formatCentsToFCFA(m.expense)}</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden flex" style={{ backgroundColor: '#282828' }}>
                          {m.income > 0 && (
                            <div
                              className="transition-all duration-500"
                              style={{ width: `${incomePct}%`, backgroundColor: COLORS.income }}
                            />
                          )}
                          {m.expense > 0 && (
                            <div
                              className="transition-all duration-500 ml-auto"
                              style={{ width: `${100 - incomePct}%`, backgroundColor: COLORS.expense }}
                            />
                          )}
                        </div>
                        <div className="flex justify-end mt-1">
                          <span style={{ color: m.net >= 0 ? COLORS.income : COLORS.expense }} className="text-xs font-semibold">
                            {m.net >= 0 ? '+' : '-'}{formatCentsToFCFA(Math.abs(m.net))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAISSE TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'caisse' && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4" style={{ color: COLORS.accent }} />
              <span className="text-text-primary font-semibold text-sm">Par caisse</span>
            </div>
            {caisseData.length === 0 ? (
              <p className="text-text-tertiary text-xs text-center py-8">Aucune transaction par caisse</p>
            ) : (
              <div className="space-y-3">
                {caisseData.map((c) => {
                  const total = c.income + c.expense;
                  const color = useLocalStore.getState().getCaisseForDisplay(c.id)?.color || COLORS.accent;
                  return (
                    <div key={c.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-text-primary text-sm font-medium">{c.name}</span>
                        </div>
                        <span style={{ color: c.balance >= 0 ? COLORS.income : COLORS.expense }} className="font-bold text-sm">
                          {c.balance >= 0 ? '+' : '-'}{formatCentsToFCFA(Math.abs(c.balance))}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden flex" style={{ backgroundColor: '#282828' }}>
                        {c.income > 0 && (
                          <div className="transition-all" style={{ width: `${(c.income / total) * 100}%`, backgroundColor: COLORS.income }} />
                        )}
                        {c.expense > 0 && (
                          <div className="transition-all ml-auto" style={{ width: `${(c.expense / total) * 100}%`, backgroundColor: COLORS.expense }} />
                        )}
                      </div>
                      <div className="flex justify-between text-xs text-text-tertiary">
                        <span style={{ color: COLORS.income }}>+{formatCentsToFCFA(c.income)}</span>
                        <span style={{ color: COLORS.expense }}>-{formatCentsToFCFA(c.expense)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* GROUP TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'group' && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" style={{ color: COLORS.purple }} />
              <span className="text-text-primary font-semibold text-sm">Par groupe</span>
            </div>
            {groupData.length === 0 ? (
              <p className="text-text-tertiary text-xs text-center py-8">Aucune transaction par groupe</p>
            ) : (
              <div className="space-y-3">
                {groupData.map((g) => (
                  <div key={g.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-text-primary text-sm font-medium">{g.name}</span>
                      <span style={{ color: g.balance >= 0 ? COLORS.income : COLORS.expense }} className="font-bold text-sm">
                        {g.balance >= 0 ? '+' : '-'}{formatCentsToFCFA(Math.abs(g.balance))}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs text-text-tertiary">
                      <span style={{ color: COLORS.income }}>+{formatCentsToFCFA(g.income)}</span>
                      <span style={{ color: COLORS.expense }}>-{formatCentsToFCFA(g.expense)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* EVENT TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'event' && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" style={{ color: COLORS.blue }} />
              <span className="text-text-primary font-semibold text-sm">Par événement</span>
            </div>
            {eventData.length === 0 ? (
              <p className="text-text-tertiary text-xs text-center py-8">Aucun événement avec transactions</p>
            ) : (
              <div className="space-y-3">
                {eventData.map((e) => {
                  const STATUS_COLORS: Record<string, string> = {
                    PLANIFIED: COLORS.blue,
                    ONGOING: COLORS.income,
                    COMPLETED: COLORS.text,
                    CANCELLED: COLORS.expense,
                  };
                  const color = STATUS_COLORS[e.status] || COLORS.text;
                  const statusLabel = e.status === 'PLANIFIED' ? 'Planifié' : e.status === 'ONGOING' ? 'En cours' : e.status === 'COMPLETED' ? 'Terminé' : 'Annulé';
                  return (
                    <button
                      key={e.id}
                      onClick={() => navigate(`/event/${e.id}`)}
                      className="w-full text-left rounded-xl p-3.5 transition-all active:scale-98"
                      style={{ backgroundColor: '#1E1E1E', border: '1px solid #282828' }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
                          <Calendar className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm font-semibold truncate">{e.name}</p>
                          <p className="text-text-tertiary text-xs">{formatDate(e.startDate)}{e.endDate ? ` → ${formatDate(e.endDate)}` : ''}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + '20', color }}>
                          {statusLabel}
                        </span>
                      </div>
                      {e.budget > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-text-tertiary">
                            <span>Dépensé</span>
                            <span>{formatCentsToFCFA(e.spent)} / {formatCentsToFCFA(e.budget)}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (e.spent / e.budget) * 100)}%`,
                                backgroundColor: e.spent > e.budget ? COLORS.expense : COLORS.accent,
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between text-xs mt-2 text-text-tertiary">
                        <span style={{ color: COLORS.income }}>+{formatCentsToFCFA(e.income)}</span>
                        <span style={{ color: COLORS.expense }}>-{formatCentsToFCFA(e.spent)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CATEGORY TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'category' && (
          <div className="space-y-4">
            {categoryData.length === 0 ? (
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#181818' }}>
                <p className="text-text-tertiary text-xs">Aucune transaction par catégorie</p>
              </div>
            ) : (
              <>
                {/* Category breakdown chart */}
                <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart className="w-4 h-4" style={{ color: COLORS.purple }} />
                    <span className="text-text-primary font-semibold text-sm">Distribution des montants</span>
                  </div>
                  <ChartContainer
                    config={categoryDonutData.reduce<any>((acc, d) => {
                      acc[d.name] = { label: d.name, color: d.color };
                      return acc;
                    }, {})}
                    className="h-48"
                  >
                    <RePieChart>
                      <Pie
                        data={categoryDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryDonutData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={_entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </RePieChart>
                  </ChartContainer>
                </div>

                {/* Category list */}
                <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4" style={{ color: COLORS.teal }} />
                    <span className="text-text-primary font-semibold text-sm">Détail par catégorie</span>
                  </div>
                  <div className="space-y-3">
                    {categoryData.map((c) => {
                      const total = totalIncome + totalExpense;
                      const pct = total > 0 ? (c.total / total) * 100 : 0;
                      return (
                        <div key={c.id} className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.type === 'INCOME' ? COLORS.income : COLORS.expense }} />
                              <span className="text-text-primary text-sm font-medium">{c.labelFr}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-text-tertiary text-xs">{formatCentsToFCFA(c.total)}</span>
                              <span className="text-text-tertiary text-xs">{pct.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: c.type === 'INCOME' ? COLORS.income : COLORS.expense,
                                minWidth: c.total > 0 ? '4px' : 0,
                              }}
                            />
                          </div>
                          {(c.income > 0 || c.expense > 0) && (
                            <div className="flex gap-3 text-xs text-text-tertiary">
                              {c.income > 0 && <span style={{ color: COLORS.income }}>+{formatCentsToFCFA(c.income)}</span>}
                              {c.expense > 0 && <span style={{ color: COLORS.expense }}>-{formatCentsToFCFA(c.expense)}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
