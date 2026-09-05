import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowLeft, Filter, Clock, User } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';

const ACTION_ICONS: Record<string, typeof Clock> = {
  CREATED: Clock,
  UPDATED: Clock,
  DELETED: Clock,
  APPROVED: Clock,
  REJECTED: Clock,
  STATUS_CHANGED: Clock,
  GROUP_CREATED: User,
  GROUP_UPDATED: User,
  GROUP_DELETED: User,
  EVENT_CREATED: Clock,
  EVENT_UPDATED: Clock,
  EVENT_STATUS_CHANGED: Clock,
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Créé',
  UPDATED: 'Modifié',
  DELETED: 'Supprimé',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  STATUS_CHANGED: 'Statut changé',
  GROUP_CREATED: 'Groupe créé',
  GROUP_UPDATED: 'Groupe modifié',
  GROUP_DELETED: 'Groupe supprimé',
  EVENT_CREATED: 'Événement créé',
  EVENT_UPDATED: 'Événement modifié',
  EVENT_STATUS_CHANGED: 'Événement mis à jour',
};

const FILTERS = ['Tout', 'Transaction', 'Groupe', 'Événement', 'Formulaires', 'Budget'];

export default function History() {
  const navigate = useNavigate();
  const { auditEntries, transactions, orgUnits, events, isLoading } = useLocalStore();
  const [filter, setFilter] = useState('Tout');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopHeader title="Historique" />
        <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#212121' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#282828]" />
                  <div className="flex-1">
                    <div className="h-3 bg-[#282828] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[#282828] rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const filtered = filter === 'Tout'
    ? auditEntries
    : filter === 'Transaction'
      ? auditEntries.filter(a => a.entityType === 'Transaction')
      : filter === 'Groupe'
        ? auditEntries.filter(a => a.entityType === 'Group' || a.entityType === 'GroupMembership' || a.entityType === 'Account')
        : filter === 'Événement'
          ? auditEntries.filter(a => a.entityType === 'Event')
          : filter === 'Formulaires'
            ? auditEntries.filter(a => a.entityType === 'FormDefinition' || a.entityType === 'FormSubmission')
            : filter === 'Budget'
              ? auditEntries.filter(a => a.entityType === 'EventBudget' || a.entityType === 'BudgetLine')
              : auditEntries;

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Historique" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <h1 className="text-text-primary font-bold text-xl mb-4">Historique d'actions</h1>

        {/* Filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all" style={filter === f ? { backgroundColor: '#FF6B00', color: '#fff' } : { backgroundColor: '#212121', color: '#808080', border: '1px solid #282828' }}>
              {f}
            </button>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Clock className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
            <p className="text-text-tertiary text-sm">Aucune action enregistrée</p>
            <p className="text-text-tertiary text-xs mt-1">Les actions apparaîtront ici après la première utilisation</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((entry) => {
              const Icon = ACTION_ICONS[entry.action] || Clock;
              const label = ACTION_LABELS[entry.action] || entry.action;
              return (
                <div key={entry.id} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: '#212121' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                    <Icon className="w-4 h-4" style={{ color: '#FF6B00' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium">{label}</p>
                    <p className="text-text-tertiary text-xs mt-0.5 truncate">
                      {entry.entityType === 'Transaction' ? 'Transaction' : entry.entityType === 'Group' ? 'Groupe' : entry.entityType === 'Event' ? 'Événement' : entry.entityType === 'FormDefinition' ? 'Formulaire' : entry.entityType === 'EventBudget' ? 'Budget' : entry.entityType}
                      {entry.entityId ? ` — ${entry.entityId.substring(0, 8)}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-text-tertiary text-xs">{formatDate(entry.createdAt)}</p>
                    {entry.userId && <p className="text-text-tertiary text-xs">Acteur: {entry.userId}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-text-tertiary text-xs text-center mt-6">{sorted.length} action{sorted.length !== 1 ? 's' : ''}</p>
      </div>
      <BottomNav />
    </div>
  );
}
