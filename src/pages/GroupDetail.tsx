import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, TrendingUp, TrendingDown, Scale, Wallet } from 'lucide-react';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@/lib/utils';
import { useLocalStore } from '@/store/useLocalStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { PageSkeleton } from '@/components/Skeleton';

function formatDateRange(start: string, end: string | null) {
  if (end) {
    const s = format(new Date(start), 'd MMM yyyy', { locale: fr });
    const e = format(new Date(end), 'd MMM yyyy', { locale: fr });
    return `${s} – ${e}`;
  }
  return format(new Date(start), 'd MMM yyyy', { locale: fr });
}

export default function GroupDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { orgUnits, transactions, categories, events, isLoading } = useLocalStore();

  const orgUnit = orgUnits.find(o => o.id === id);
  const groupTransactions = transactions.filter(t => t.orgUnitId === id);

  const totalIncome = groupTransactions.filter(t => t.type === 'INCOME' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const totalExpense = groupTransactions.filter(t => t.type === 'EXPENSE' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const pendingIncome = groupTransactions.filter(t => t.type === 'INCOME' && t.status === 'PENDING').reduce((s, t) => s + t.amount, 0);
  const pendingExpense = groupTransactions.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING').reduce((s, t) => s + t.amount, 0);

  const byCategory = new Map<string, { income: number; expense: number }>();
  for (const t of groupTransactions.filter(x => x.status === 'APPROVED')) {
    const existing = byCategory.get(t.categoryId) || { income: 0, expense: 0 };
    if (t.type === 'INCOME') existing.income += t.amount;
    else existing.expense += t.amount;
    byCategory.set(t.categoryId, existing);
  }

  const recentTransactions = groupTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  if (isLoading || !orgUnit) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopHeader title="Groupe" showBack />
        <PageSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title={orgUnit.name} showBack />
      <div className="max-w-lg mx-auto px-5 pb-24">

        {/* Hero Card */}
        <div className="rounded-xl p-5 mb-5 text-center" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
              <Building2 className="w-5 h-5" style={{ color: '#FF6B00' }} />
            </div>
            <span className="text-text-tertiary text-sm capitalize">{orgUnit.type}</span>
          </div>
          <p className="text-text-tertiary text-sm mb-1">Solde du groupe</p>
          <p className="text-3xl font-black tabular-nums mb-1" style={{ color: balance >= 0 ? '#1DB954' : '#E51332' }}>
            {balance >= 0 ? '' : '-'}{formatCurrencyCompact(Math.abs(balance))} <span className="text-sm font-medium text-text-tertiary">FCFA</span>
          </p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#1DB954' }} />
              <span className="text-text-tertiary text-sm">+{formatCurrencyCompact(totalIncome)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E51332' }} />
              <span className="text-text-tertiary text-sm">-{formatCurrencyCompact(totalExpense)}</span>
            </div>
          </div>
        </div>

        {/* Pending */}
        {(pendingIncome > 0 || pendingExpense > 0) && (
          <div className="flex gap-2 mb-5">
            {pendingIncome > 0 && (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: '#FFB80020', color: '#FFB800' }}>
                {pendingIncome > 0 ? `${formatCurrencyCompact(pendingIncome)} en attente (entrées)` : ''}
              </span>
            )}
            {pendingExpense > 0 && (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: '#80808020', color: '#808080' }}>
                {pendingExpense > 0 ? `${formatCurrencyCompact(pendingExpense)} en attente (sorties)` : ''}
              </span>
            )}
          </div>
        )}

        {/* By Category */}
        {byCategory.size > 0 && (
          <div className="mb-5">
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Par catégorie</p>
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <div className="flex items-center px-4 py-3 text-xs text-text-tertiary border-b" style={{ borderBottomColor: '#282828' }}>
                <span className="flex-1">Libellé</span>
                <span className="w-24 text-right">Entrées</span>
                <span className="w-24 text-right">Net</span>
              </div>
              {Array.from(byCategory.entries()).map(([catId, v]) => {
                const cat = categories.find(c => c.id === catId);
                return (
                  <div key={catId} className="flex items-center px-4 py-3 text-sm border-b last:border-0" style={{ borderBottomColor: '#282828' }}>
                    <span className="flex-1 text-text-primary">{cat?.labelFr || catId}</span>
                    <span className="w-24 text-right tabular-nums" style={{ color: '#1DB954' }}>{formatCurrencyCompact(v.income)}</span>
                    <span className="w-24 text-right tabular-nums font-medium" style={{ color: v.income - v.expense >= 0 ? '#1DB954' : '#E51332' }}>
                      {v.income - v.expense >= 0 ? '+' : ''}{formatCurrencyCompact(v.income - v.expense)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">Derniers mouvements</p>
            <button onClick={() => navigate('/finance')} className="text-xs font-medium" style={{ color: '#FF6B00' }}>Tout voir</button>
          </div>
          <div className="space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 rounded-lg" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                <Wallet className="w-8 h-8 mx-auto mb-3 text-text-tertiary" />
                <p className="text-text-tertiary text-sm">Aucune transaction</p>
              </div>
            ) : (
              recentTransactions.map((tx) => {
                const isIncome = tx.type === 'INCOME';
                return (
                  <button
                    key={tx.id}
                    onClick={() => navigate(`/transaction/${tx.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left"
                    style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isIncome ? '#1DB95420' : '#E5133220' }}>
                      {isIncome
                        ? <TrendingUp className="w-4 h-4" style={{ color: '#1DB954' }} />
                        : <TrendingDown className="w-4 h-4" style={{ color: '#E51332' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-text-tertiary text-xs">{tx.category?.labelFr} · {formatDate(tx.date)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold tabular-nums" style={{ color: isIncome ? '#1DB954' : '#E51332' }}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => navigate('/transaction/new', { state: { orgUnitId: id } })}
            className="flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#1DB954', color: '#FFFFFF' }}
          >
            <TrendingUp className="w-4 h-4" />Entrée
          </button>
          <button
            onClick={() => navigate('/transaction/new', { state: { orgUnitId: id } })}
            className="flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#E51332', color: '#FFFFFF' }}
          >
            <TrendingDown className="w-4 h-4" />Sortie
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
