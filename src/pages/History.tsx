import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, PieChart, Calendar, Users, Building2, Activity, Filter, ChevronRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { formatCentsFull, formatCentsToFCFA, formatDate } from '@/lib/utils';

type TabKey = 'overview' | 'monthly' | 'caisse' | 'group' | 'event' | 'category';

const TABS: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
  { key: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
  { key: 'monthly', label: 'Mensuel', icon: Calendar },
  { key: 'caisse', label: 'Par caisse', icon: Building2 },
  { key: 'group', label: 'Par groupe', icon: Users },
  { key: 'event', label: 'Par événement', icon: Activity },
  { key: 'category', label: 'Par catégorie', icon: PieChart },
];

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

  // Monthly data
  const monthlyData: Record<string, { income: number; expense: number }> = {};
  for (const tx of approved) {
    const m = tx.date.substring(0, 7);
    if (!monthlyData[m]) monthlyData[m] = { income: 0, expense: 0 };
    if (tx.type === 'INCOME') monthlyData[m].income += tx.amount;
    else monthlyData[m].expense += tx.amount;
  }
  const monthlyEntries = Object.entries(monthlyData).sort(([a], [b]) => b.localeCompare(a));
  const maxMonthly = Math.max(...monthlyEntries.map(([, d]) => Math.max(d.income, d.expense)), 1);

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

  // By group (orgUnits that are groups)
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
      const spent = txs.reduce((s, t) => s + t.amount, 0);
      return { ...event, income: txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0), spent };
    })
    .filter(e => e.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  // By category
  const categoryData = categories.map(cat => {
    const txs = approved.filter(t => t.categoryId === cat.id);
    const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { ...cat, income, expense, total: income + expense };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  // Audit stats
  const recentActions = auditEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const actionsThisMonth = auditEntries.filter(a => {
    const d = new Date(a.createdAt);
    return d >= new Date(now.getFullYear(), now.getMonth(), 1);
  }).length;

  return (
    <div className="min-h-screen bg-[#121212]">
      <TopHeader title="Historique" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <h1 className="text-text-primary font-bold text-xl mb-1">Historique</h1>
        <p className="text-text-tertiary text-sm mb-5">Analyses et statistiques financières</p>

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
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#181818' }}>
            <p className="text-text-tertiary text-xs mb-1">Revenus</p>
            <p style={{ color: '#1DB954' }} className="font-bold text-sm">{formatCentsToFCFA(totalIncome)}</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#181818' }}>
            <p className="text-text-tertiary text-xs mb-1">Dépenses</p>
            <p style={{ color: '#E51332' }} className="font-bold text-sm">{formatCentsToFCFA(totalExpense)}</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#181818' }}>
            <p className="text-text-tertiary text-xs mb-1">Balance</p>
            <p style={{ color: (totalIncome - totalExpense) >= 0 ? '#1DB954' : '#E51332' }} className="font-bold text-sm">
              {(totalIncome - totalExpense) >= 0 ? '+' : ''}{formatCentsToFCFA(totalIncome - totalExpense)}
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

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Monthly bar chart */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: '#1DB954' }} />
                <span className="text-text-primary font-semibold text-sm">Tendance mensuelle</span>
              </div>
              {monthlyEntries.length === 0 ? (
                <p className="text-text-tertiary text-xs text-center py-6">Aucune donnée</p>
              ) : (
                <div className="space-y-2">
                  {monthlyEntries.slice(0, 8).map(([month, data]) => {
                    const total = data.income + data.expense;
                    const incomeW = total > 0 ? (data.income / maxMonthly) * 100 : 0;
                    const expenseW = total > 0 ? (data.expense / maxMonthly) * 100 : 0;
                    return (
                      <div key={month}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-tertiary">{month}</span>
                          <span className="font-semibold" style={{ color: data.income - data.expense >= 0 ? '#1DB954' : '#E51332' }}>
                            {(data.income - data.expense) >= 0 ? '+' : '-'}{formatCentsToFCFA(Math.abs(data.income - data.expense))}
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden flex" style={{ backgroundColor: '#282828' }}>
                          {data.income > 0 && (
                            <div
                              className="transition-all"
                              style={{ width: `${incomeW}%`, backgroundColor: '#1DB954', minWidth: data.income > 0 ? '4px' : 0 }}
                            />
                          )}
                          {data.expense > 0 && (
                            <div
                              className="transition-all"
                              style={{ width: `${expenseW}%`, backgroundColor: '#E51332', minWidth: data.expense > 0 ? '4px' : 0 }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent actions */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: '#FF6B00' }} />
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
                        <span className="text-xs font-bold" style={{ color: '#FF6B00' }}>{a.action[0]}</span>
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

        {activeTab === 'monthly' && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4" style={{ color: '#3B82F6' }} />
              <span className="text-text-primary font-semibold text-sm">Détail mensuel</span>
            </div>
            {monthlyEntries.length === 0 ? (
              <p className="text-text-tertiary text-xs text-center py-8">Aucune donnée mensuelle</p>
            ) : (
              <div className="space-y-3">
                {monthlyEntries.slice(0, 12).map(([month, data]) => {
                  const net = data.income - data.expense;
                  return (
                    <div key={month} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-primary font-medium">{month}</span>
                        <span style={{ color: net >= 0 ? '#1DB954' : '#E51332' }} className="font-semibold">
                          {net >= 0 ? '+' : '-'}{formatCentsToFCFA(Math.abs(net))}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-text-tertiary">
                        <span>Revenus: <span style={{ color: '#1DB954' }}>{formatCentsToFCFA(data.income)}</span></span>
                        <span>Dépenses: <span style={{ color: '#E51332' }}>{formatCentsToFCFA(data.expense)}</span></span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden flex" style={{ backgroundColor: '#282828' }}>
                        {data.income > 0 && <div style={{ width: `${(data.income / (data.income + data.expense)) * 100}%`, backgroundColor: '#1DB954' }} />}
                        {data.expense > 0 && <div style={{ width: `${(data.expense / (data.income + data.expense)) * 100}%`, backgroundColor: '#E51332' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'caisse' && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4" style={{ color: '#FF6B00' }} />
              <span className="text-text-primary font-semibold text-sm">Par caisse</span>
            </div>
            {caisseData.length === 0 ? (
              <p className="text-text-tertiary text-xs text-center py-8">Aucune transaction par caisse</p>
            ) : (
              <div className="space-y-3">
                {caisseData.map(c => (
                  <div key={c.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-text-primary text-sm font-medium">{c.name}</span>
                      <span style={{ color: c.balance >= 0 ? '#1DB954' : '#E51332' }} className="font-bold text-sm">
                        {c.balance >= 0 ? '+' : '-'}{formatCentsToFCFA(Math.abs(c.balance))}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs text-text-tertiary">
                      <span style={{ color: '#1DB954' }}>+{formatCentsToFCFA(c.income)}</span>
                      <span style={{ color: '#E51332' }}>-{formatCentsToFCFA(c.expense)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'group' && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" style={{ color: '#8B5CF6' }} />
              <span className="text-text-primary font-semibold text-sm">Par groupe</span>
            </div>
            {groupData.length === 0 ? (
              <p className="text-text-tertiary text-xs text-center py-8">Aucune transaction par groupe</p>
            ) : (
              <div className="space-y-3">
                {groupData.map(g => (
                  <div key={g.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-text-primary text-sm font-medium">{g.name}</span>
                      <span style={{ color: g.balance >= 0 ? '#1DB954' : '#E51332' }} className="font-bold text-sm">
                        {g.balance >= 0 ? '+' : '-'}{formatCentsToFCFA(Math.abs(g.balance))}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs text-text-tertiary">
                      <span style={{ color: '#1DB954' }}>+{formatCentsToFCFA(g.income)}</span>
                      <span style={{ color: '#E51332' }}>-{formatCentsToFCFA(g.expense)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'event' && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" style={{ color: '#3B82F6' }} />
              <span className="text-text-primary font-semibold text-sm">Par événement</span>
            </div>
            {eventData.length === 0 ? (
              <p className="text-text-tertiary text-xs text-center py-8">Aucun événement avec transactions</p>
            ) : (
              <div className="space-y-3">
                {eventData.map(e => (
                  <div key={e.id} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-text-primary text-sm font-medium">{e.name}</span>
                      <span style={{ color: '#FFB800' }} className="font-bold text-sm">{formatCentsToFCFA(e.spent)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-text-tertiary">
                      <span>{formatCentsToFCFA(e.income)} revenus</span>
                      <span>{e.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'category' && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#181818' }}>
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4" style={{ color: '#E51332' }} />
              <span className="text-text-primary font-semibold text-sm">Par catégorie</span>
            </div>
            {categoryData.length === 0 ? (
              <p className="text-text-tertiary text-xs text-center py-8">Aucune transaction par catégorie</p>
            ) : (
              <div className="space-y-3">
                {categoryData.map(c => {
                  const pct = totalExpense > 0 ? (c.expense / totalExpense) * 100 : 0;
                  const totalPct = (totalIncome + totalExpense) > 0 ? (c.total / (totalIncome + totalExpense)) * 100 : 0;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-text-primary text-sm font-medium">{c.labelFr}</span>
                        <span className="text-text-tertiary text-xs">{formatCentsToFCFA(c.total)}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${totalPct}%`,
                            backgroundColor: c.type === 'INCOME' ? '#1DB954' : '#E51332',
                            minWidth: c.total > 0 ? '4px' : 0,
                          }}
                        />
                      </div>
                      <div className="flex gap-2 text-xs text-text-tertiary">
                        {c.income > 0 && <span style={{ color: '#1DB954' }}>+{formatCentsToFCFA(c.income)}</span>}
                        {c.expense > 0 && <span style={{ color: '#E51332' }}>-{formatCentsToFCFA(c.expense)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
