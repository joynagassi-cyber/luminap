import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCentsToFCFA, getPeriodRange, formatDate } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Calendar, TrendingUp, Wallet, PlusCircle, Bell, Sparkles, ArrowUp, ArrowDown, Home, Landmark, Users, CalendarPlus, Archive, BarChart3 } from 'lucide-react';
import TransactionCard from '@/components/TransactionCard';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import LuminaLogo from '@/components/LuminaLogo';
import { PageSkeleton, ListSkeleton } from '@/components/Skeleton';
import type { Account, Caisse } from '@/types';
import { getRoleLabel } from '@/store/useLocalStore';
import { getAccountBalance } from '@/lib/account';

function CaisseCard({ account, transactions, navigate }: { account: Account; transactions: any[]; navigate: ReturnType<typeof useNavigate> }) {
  const caisse = useLocalStore.getState().getCaisseForDisplay(account.id);
  const color = caisse?.color || '#FF6B00';
  const approvedTxs = transactions.filter(t => t.sourceCaisseId === account.id && t.status === 'APPROVED');
  const income = approvedTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expense = approvedTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const pending = transactions.filter(t => t.sourceCaisseId === account.id && t.status === 'PENDING');
  const pendingAmount = pending.reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0);

  return (
    <button
      onClick={() => navigate('/finance', { state: { caisseId: account.id } })}
      className="w-full text-left rounded-xl p-4 transition-all active:scale-95"
      style={{ backgroundColor: '#1e1e1e', border: `1px solid ${color}30` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
            <span className="text-sm font-bold" style={{ color }}>{account.name.charAt(0)}</span>
          </div>
          <div>
            <p className="text-text-primary text-sm font-semibold">{account.name}</p>
            <p className="text-text-tertiary text-xs">{account.ownerType === 'ORGANIZATION' ? 'Église' : 'Groupe'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-text-primary font-bold text-lg" style={{ color: balance >= 0 ? '#1DB954' : '#E51332' }}>
            {balance >= 0 ? '' : '-'}{formatCentsToFCFA(Math.abs(balance))}
          </p>
          <p className="text-text-tertiary text-xs">FCFA</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-tertiary">Entrées: <span style={{ color: '#1DB954' }}>+{formatCentsToFCFA(income)}</span></span>
        <span className="text-text-tertiary">Sorties: <span style={{ color: '#E51332' }}>-{formatCentsToFCFA(expense)}</span></span>
      </div>
      {pendingAmount !== 0 && (
        <div className="mt-2 text-xs" style={{ color: '#FFB800' }}>
          {pendingAmount > 0 ? '+' : '-'}{formatCentsToFCFA(Math.abs(pendingAmount))} en attente
        </div>
      )}
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { transactions, categories, orgUnits, caisses, accounts, events, isLoading, user, appConfig, notifications } = useLocalStore();
  const churchName = appConfig.churchName || user.org.name;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }, []);

  const { start, end } = getPeriodRange('mois');
  const mainAccount = accounts.find(a => a.ownerType === 'ORGANIZATION');
  const groupAccounts = accounts.filter(a => a.ownerType === 'GROUP' && a.status === 'ACTIVE');
  const mainTxs = transactions.filter(t => t.sourceCaisseId === 'main');

  const approvedTransactions = mainTxs.filter(
    t => t.status === 'APPROVED' && t.date >= start && t.date <= end
  );
  const totalIncome = approvedTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = approvedTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  const recentTransactions = mainTxs
    .filter(t => t.status === 'APPROVED' || t.status === 'PENDING')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const pendingCount = mainTxs.filter(t => t.status === 'PENDING').length;
  const draftCount = mainTxs.filter(t => t.status === 'DRAFT').length;

  // Upcoming events (PLANIFIED or ONGOING, sorted by date)
  const upcomingEvents = events
    .filter(e => e.status === 'PLANIFIED' || e.status === 'ONGOING')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  // Unread notifications count
  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopHeader title="Lumina" />
        <PageSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Lumina" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">

        {/* Church name + Notifications */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {appConfig.churchLogoUrl ? (
              <img src={appConfig.churchLogoUrl} alt="Logo" className="w-10 h-10 rounded-xl" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
            )}
            <div>
              <p className="text-text-primary font-semibold text-sm">{churchName}</p>
              <p className="text-text-tertiary text-xs">{getRoleLabel(user.role)}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#212121' }}
          >
            <Bell className="w-5 h-5 text-text-secondary" />
            {unreadNotifCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: '#E51332', color: '#fff' }}
              >
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </button>
        </div>

        {/* Main Caisse Hero Card */}
        <div
          className="rounded-2xl p-5 mb-6 cursor-pointer transition-all active:scale-98"
          style={{
            background: 'linear-gradient(135deg, #FF6B0020 0%, #FF6B0010 100%)',
            border: '1px solid #FF6B0030',
          }}
          onClick={() => navigate('/finance')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <LuminaLogo size={40} />
              <div>
                <p className="text-text-primary font-bold text-base">
                  {greeting} <Sparkles className="w-5 h-5 inline" style={{ color: '#FF6B00' }} />
                </p>
                <p className="text-text-tertiary text-xs mt-0.5">Caisse principale</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-text-tertiary text-xs">Solde total</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black tabular-nums" style={{ color: netResult >= 0 ? '#1DB954' : '#E51332' }}>
                  {netResult >= 0 ? '' : '-'}{formatCentsToFCFA(Math.abs(netResult))}
                </span>
                <span className="text-text-tertiary text-xs">F</span>
              </div>
            </div>
          </div>

          <div className="h-px mb-4" style={{ backgroundColor: '#282828' }} />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1DB95420' }}>
                <ArrowUpRight className="w-5 h-5" style={{ color: '#1DB954' }} />
              </div>
              <div>
                <p className="text-text-tertiary text-xs">Entrées du mois</p>
                <p className="text-sm font-semibold tabular-nums" style={{ color: '#1DB954' }}>
                  +{formatCentsToFCFA(totalIncome)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E5133220' }}>
                <ArrowDownRight className="w-5 h-5" style={{ color: '#E51332' }} />
              </div>
              <div className="text-right">
                <p className="text-text-tertiary text-xs">Sorties du mois</p>
                <p className="text-sm font-semibold tabular-nums" style={{ color: '#E51332' }}>
                  -{formatCentsToFCFA(totalExpense)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        {(pendingCount > 0 || draftCount > 0 || upcomingEvents.length > 0 || groupAccounts.length > 0) && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {pendingCount > 0 && (
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#1e1e1e' }}>
                <p className="text-text-tertiary text-xs mb-1">En attente</p>
                <p className="text-yellow-500 font-bold text-xl">{pendingCount}</p>
              </div>
            )}
            {upcomingEvents.length > 0 && (
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#1e1e1e' }}>
                <p className="text-text-tertiary text-xs mb-1">Événements</p>
                <p className="text-purple-500 font-bold text-xl">{upcomingEvents.length}</p>
              </div>
            )}
            {groupAccounts.length > 0 && (
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#1e1e1e' }}>
                <p className="text-text-tertiary text-xs mb-1">Groupes</p>
                <p className="text-blue-500 font-bold text-xl">{groupAccounts.length}</p>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">Événements à venir</p>
              </div>
              <button onClick={() => navigate('/events')} className="text-xs font-medium" style={{ color: '#FF6B00' }}>
                Voir tout →
              </button>
            </div>
            <div className="space-y-2">
              {upcomingEvents.map((event) => {
                const budgetSpent = (event.budgetItems || []).reduce((s, i) => s + i.spent, 0);
                const overBudget = event.budget > 0 && budgetSpent > event.budget;
                const EVENT_COLORS: Record<string, string> = {
                  PLANIFIED: '#3B82F6',
                  ONGOING: '#1DB954',
                  COMPLETED: '#808080',
                  CANCELLED: '#E51332',
                };
                const color = EVENT_COLORS[event.status] || '#808080';
                return (
                  <button
                    key={event.id}
                    onClick={() => navigate(`/event/${event.id}`)}
                    className="w-full text-left rounded-xl p-4 transition-all active:scale-95"
                    style={{ backgroundColor: '#1e1e1e', border: `1px solid ${overBudget ? '#E5133240' : '#282828'}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
                        <Calendar className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-semibold truncate">{event.name}</p>
                        <p className="text-text-tertiary text-xs mt-0.5">
                          {event.startDate === event.endDate ? formatDate(event.startDate) : `${formatDate(event.startDate)} → ${formatDate(event.endDate!)}`}
                        </p>
                        {event.budget > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (budgetSpent / event.budget) * 100)}%`, backgroundColor: overBudget ? '#E51332' : '#FF6B00' }} />
                            </div>
                            <span className={`text-xs ${overBudget ? 'text-[#E51332]' : 'text-text-tertiary'}`}>
                              {formatCentsToFCFA(budgetSpent)}/{formatCentsToFCFA(event.budget)}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: color + '20', color }}>
                        {event.status === 'PLANIFIED' ? 'Planifié' : event.status === 'ONGOING' ? 'En cours' : ''}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Caisses Grid */}
        {groupAccounts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">Caisses des groupes</p>
              <button onClick={() => navigate('/versement')} className="text-xs font-medium" style={{ color: '#FF6B00' }}>
                Verser →
              </button>
            </div>
            <div className="space-y-2">
              {groupAccounts.map((account) => (
                <CaisseCard key={account.id} account={account} transactions={transactions} navigate={navigate} />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="mb-6">
          <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Actions rapides</p>
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/transaction/new', { state: { type: 'INCOME' } })}
              className="flex flex-col items-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-left"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid #282828' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1DB95420' }}>
                <ArrowUpRight className="w-5 h-5" style={{ color: '#1DB954' }} />
              </div>
              <span className="text-text-primary text-xs font-medium text-center">Entrée</span>
            </button>
            <button
              onClick={() => navigate('/transaction/new', { state: { type: 'EXPENSE' } })}
              className="flex flex-col items-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-left"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid #282828' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E5133220' }}>
                <ArrowDownRight className="w-5 h-5" style={{ color: '#E51332' }} />
              </div>
              <span className="text-text-primary text-xs font-medium text-center">Sortie</span>
            </button>
            <button
              onClick={() => navigate('/versement')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-left"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid #282828' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#FF6B00' }} />
              </div>
              <span className="text-text-primary text-xs font-medium text-center">Versement</span>
            </button>
            <button
              onClick={() => navigate('/events')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-left"
              style={{ backgroundColor: '#1e1e1e', border: '1px solid #282828' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#8B5CF620' }}>
                <Calendar className="w-5 h-5" style={{ color: '#8B5CF6' }} />
              </div>
              <span className="text-text-primary text-xs font-medium text-center">Événement</span>
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-text-primary font-semibold text-base">Derniers mouvements</p>
          <button onClick={() => navigate('/finance')} className="text-sm font-medium" style={{ color: '#FF6B00' }}>Tout voir</button>
        </div>
        <div className="space-y-2 pb-4">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#1e1e1e', border: '1px solid #282828' }}>
              <PlusCircle className="w-8 h-8 mx-auto mb-3 text-text-tertiary" />
              <p className="text-text-tertiary text-sm">Aucune transaction</p>
              <button onClick={() => navigate('/transaction/new')} className="mt-3 text-sm font-medium" style={{ color: '#FF6B00' }}>
                Créer une transaction
              </button>
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} onPress={(id) => navigate(`/transaction/${id}`)} />
            ))
          )}
        </div>
      </div>

      {/* FAB — Quick transaction */}
      <button
        onClick={() => navigate('/transaction/new')}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)', boxShadow: '0 4px 16px rgba(255,107,0,0.4)' }}
      >
        <PlusCircle className="w-7 h-7 text-white" />
      </button>

      <BottomNav />
    </div>
  );
}
