import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, TrendingUp, TrendingDown, Scale, Search, X } from 'lucide-react';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@/lib/utils';
import { useLocalStore } from '@/store/useLocalStore';
import type { Event, EventStatus } from '@/types';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { PageSkeleton } from '@/components/Skeleton';

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string }> = {
  PLANIFIED: { label: 'Planifié', color: '#2196F3', bg: '#2196F320' },
  ONGOING: { label: 'En cours', color: '#FFB800', bg: '#FFB80020' },
  COMPLETED: { label: 'Terminé', color: '#1DB954', bg: '#1DB95420' },
  CANCELLED: { label: 'Annulé', color: '#E51332', bg: '#E5133220' },
};

function getEventSummary(event: Event, transactions: any[]) {
  const txs = transactions.filter(t => t.eventId === event.id && t.status === 'APPROVED');
  const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense, count: txs.length };
}

export default function Events() {
  const navigate = useNavigate();
  const { events, transactions, isLoading } = useLocalStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'ALL'>('ALL');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopHeader title="Événements" />
        <PageSkeleton />
        <BottomNav />
      </div>
    );
  }

  const filtered = events.filter(e => {
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Événements" rightAction={
        <button onClick={() => navigate('/event/new')} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B00' }}>
          <Plus className="w-4 h-4 text-white" />
        </button>
      } />
      <div className="max-w-lg mx-auto px-5 pb-24">

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un événement..."
            className="w-full pl-10 pr-10 py-2.5 rounded-full text-sm text-text-primary outline-none"
            style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
              <X className="w-3 h-3 text-text-tertiary" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {(['ALL', 'PLANIFIED', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const).map((s) => {
            const cfg = s === 'ALL' ? { label: 'Tous', color: '#FF6B00', bg: '#FF6B0020' } : STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s as EventStatus | 'ALL')}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
                style={{ backgroundColor: statusFilter === s ? cfg.color + '30' : '#212121', color: statusFilter === s ? cfg.color : '#808080', border: statusFilter === s ? `1px solid ${cfg.color}40` : '1px solid #282828' }}
              >
                {s === 'ALL' ? 'Tous' : cfg.label}
              </button>
            );
          })}
        </div>

        {/* Event List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
              <p className="text-text-tertiary text-sm mb-2">Aucun événement</p>
              <p className="text-text-tertiary text-xs mb-4">Créez votre premier événement</p>
              <button onClick={() => navigate('/event/new')} className="px-5 py-2.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
                <Plus className="w-4 h-4 inline mr-1" />Créer un événement
              </button>
            </div>
          ) : (
            filtered.map((event) => {
              const summary = getEventSummary(event, transactions);
              const cfg = STATUS_CONFIG[event.status];
              return (
                <button
                  key={event.id}
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="w-full text-left rounded-xl p-4 transition-all active:scale-95"
                  style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.color + '20' }}>
                        <Calendar className="w-5 h-5" style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <p className="text-text-primary font-semibold text-base">{event.name}</p>
                        <p className="text-text-tertiary text-xs">{formatDateRange(event.startDate, event.endDate)}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-text-tertiary text-xs mb-1">{event.budget > 0 ? 'Budget' : 'Recettes'}</p>
                      <p className="text-text-primary text-sm font-bold tabular-nums">{event.budget > 0 ? formatCurrencyCompact(event.budget) : formatCurrencyCompact(summary.income)}</p>
                    </div>
                    <div>
                      <p className="text-text-tertiary text-xs mb-1">Dépenses</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: '#E51332' }}>{formatCurrencyCompact(summary.expense)}</p>
                    </div>
                    <div>
                      <p className="text-text-tertiary text-xs mb-1">Solde</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: summary.balance >= 0 ? '#1DB954' : '#E51332' }}>{summary.balance >= 0 ? '+' : ''}{formatCurrencyCompact(summary.balance)}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t" style={{ borderColor: '#282828' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: summary.balance >= 0 ? '#1DB954' : '#E51332' }} />
                        <span className="text-text-tertiary text-xs">Solde</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums" style={{ color: summary.balance >= 0 ? '#1DB954' : '#E51332' }}>
                        {summary.balance >= 0 ? '+' : ''}{formatCurrencyCompact(summary.balance)}
                      </span>
                    </div>
                    {event.budget > 0 && (
                      <div className="mt-2 h-1.5 rounded-full" style={{ backgroundColor: '#282828' }}>
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (summary.expense / event.budget) * 100)}%`,
                            backgroundColor: summary.expense > event.budget ? '#E51332' : '#FF6B00',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function formatDateRange(start: string, end: string | null) {
  if (end) {
    const s = formatDate(start);
    const e = formatDate(end);
    return `${s} – ${e}`;
  }
  return formatDate(start);
}
