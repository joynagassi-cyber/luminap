import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Scale, Plus, X, Edit3, Check, Play, CheckCircle, Pause, Trash2 } from 'lucide-react';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@/lib/utils';
import { useLocalStore } from '@/store/useLocalStore';
import type { Event, FundSource, EventStatus } from '@/types';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { PageSkeleton } from '@/components/Skeleton';
import ConfirmModal from '@/components/ConfirmModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const FUND_SOURCES: { value: FundSource; label: string; color: string }[] = [
  { value: 'CAISSE', label: 'Caisse église', color: '#FF6B00' },
  { value: 'COTISATION', label: 'Cotisation', color: '#2196F3' },
  { value: 'PERSONNE', label: 'Personne', color: '#E91E63' },
  { value: 'AUTRE', label: 'Autre', color: '#808080' },
];

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string }> = {
  PLANIFIED: { label: 'Planifié', color: '#2196F3', bg: '#2196F320' },
  ONGOING: { label: 'En cours', color: '#FFB800', bg: '#FFB80020' },
  COMPLETED: { label: 'Terminé', color: '#1DB954', bg: '#1DB95420' },
  CANCELLED: { label: 'Annulé', color: '#E51332', bg: '#E5133220' },
};

const STATUS_FLOW: Record<EventStatus, EventStatus | null> = {
  PLANIFIED: 'ONGOING',
  ONGOING: 'COMPLETED',
  COMPLETED: null,
  CANCELLED: null,
};

function formatDateRange(start: string, end: string | null) {
  if (end) {
    const s = format(new Date(start), 'd MMM yyyy', { locale: fr });
    const e = format(new Date(end), 'd MMM yyyy', { locale: fr });
    return `${s} – ${e}`;
  }
  return format(new Date(start), 'd MMM yyyy', { locale: fr });
}

function getSourceLabel(source: FundSource | null) {
  if (!source) return '—';
  const found = FUND_SOURCES.find(s => s.value === source);
  return found?.label || source;
}

function getSourceColor(source: FundSource | null) {
  if (!source) return '#808080';
  const found = FUND_SOURCES.find(s => s.value === source);
  return found?.color || '#808080';
}

export default function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { events, transactions, categories, updateEvent, deleteEvent } = useLocalStore();

  const event = events.find(e => e.id === id);
  const eventTxs = transactions.filter(t => t.eventId === id);

  const approvedTxs = eventTxs.filter(t => t.status === 'APPROVED');
  const totalIncome = approvedTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = approvedTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const budgetUsedPercent = event ? Math.min(100, (totalExpense / event.budget) * 100) : 0;
  const budgetOver = event ? totalExpense > event.budget : false;

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
  };

  if (!event || !id) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-text-tertiary mb-4">Événement introuvable</p>
          <button onClick={() => navigate('/events')} className="px-5 py-3 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
            Retour aux événements
          </button>
        </div>
      </div>
    );
  }

  const handleEditBudget = async () => {
    const val = parseFloat(budgetInput);
    if (!budgetInput || val <= 0) { showError('Budget invalide'); return; }
    await updateEvent(event.id, { budget: Math.round(val * 100) });
    setEditingBudget(false);
  };

  const handleDelete = () => {
    if (!confirm(`Supprimer "${event.name}" ?`)) return;
    deleteEvent(event.id);
    navigate('/events');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title={event.name} showBack />
      <div className="max-w-lg mx-auto px-5 pb-24">

        {/* Status + Date */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: STATUS_CONFIG[event.status]?.bg || '#282828', color: STATUS_CONFIG[event.status]?.color || '#808080' }}>
            {STATUS_CONFIG[event.status]?.label || event.status}
          </span>
          <span className="text-text-tertiary text-xs">{formatDateRange(event.startDate, event.endDate)}</span>
        </div>

        {/* Budget Card */}
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-tertiary text-sm">Budget</p>
            <button onClick={() => { setEditingBudget(true); setBudgetInput((event.budget / 100).toString()); }} className="p-1 rounded-full hover:bg-surface-active transition-colors" style={{ color: '#808080' }}>
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {editingBudget ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-text-primary text-sm outline-none text-right tabular-nums"
                style={{ backgroundColor: '#121212', border: '1px solid #282828' }}
                autoFocus
              />
              <button onClick={handleEditBudget} className="p-2 rounded-full" style={{ backgroundColor: '#1DB954', color: '#FFFFFF' }}>
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingBudget(false)} className="p-2 rounded-full" style={{ backgroundColor: '#282828', color: '#808080' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-2xl font-black tabular-nums" style={{ color: '#FF6B00' }}>
              {formatCurrency(event.budget)} <span className="text-sm font-medium text-text-tertiary">FCFA</span>
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-text-tertiary mb-1.5">
              <span>Dépensé</span>
              <span>{budgetUsedPercent.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: '#282828' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${budgetUsedPercent}%`,
                  backgroundColor: budgetOver ? '#E51332' : '#FF6B00',
                }}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: '#1DB954' }} />
            <p className="text-text-tertiary text-xs mb-1">Recettes</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: '#1DB954' }}>{formatCurrencyCompact(totalIncome)}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <TrendingDown className="w-4 h-4 mx-auto mb-1" style={{ color: '#E51332' }} />
            <p className="text-text-tertiary text-xs mb-1">Dépenses</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: '#E51332' }}>{formatCurrencyCompact(totalExpense)}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <Scale className="w-4 h-4 mx-auto mb-1" style={{ color: balance >= 0 ? '#1DB954' : '#E51332' }} />
            <p className="text-text-tertiary text-xs mb-1">Solde</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: balance >= 0 ? '#1DB954' : '#E51332' }}>
              {balance >= 0 ? '+' : ''}{formatCurrencyCompact(Math.abs(balance))}
            </p>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="mb-5 p-4 rounded-lg" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">Description</p>
            <p className="text-text-secondary text-sm leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* Transactions */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">Mouvements</p>
            <button onClick={() => navigate('/finance')} className="text-xs font-medium" style={{ color: '#FF6B00' }}>Tout voir</button>
          </div>
          <div className="space-y-2">
            {approvedTxs.length === 0 ? (
              <div className="text-center py-8 rounded-lg" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                <p className="text-text-tertiary text-sm">Aucun mouvement</p>
              </div>
            ) : (
              approvedTxs
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((tx) => {
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
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-text-tertiary text-xs">{tx.category?.labelFr}</span>
                          <span className="text-text-tertiary text-xs">·</span>
                          <span className="text-text-tertiary text-xs">{formatDate(tx.date)}</span>
                          {tx.source && (
                            <>
                              <span className="text-text-tertiary text-xs">·</span>
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: getSourceColor(tx.source) + '20', color: getSourceColor(tx.source) }}>
                                {getSourceLabel(tx.source)}
                              </span>
                              {tx.source === 'PERSONNE' && tx.personName && (
                                <>
                                  <span className="text-text-tertiary text-xs">·</span>
                                  <span className="text-text-secondary text-xs italic">{tx.personName}</span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: isIncome ? '#1DB954' : '#E51332' }}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </button>
                  );
                })
            )}
          </div>
        </div>

        {/* ─── Lifecycle Management ─────────────────────────────────── */}
        <div className="mb-5">
          <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Statut de l'événement</p>
          <div className="flex gap-2 flex-wrap">
            {(['PLANIFIED', 'ONGOING', 'COMPLETED', 'CANCELLED'] as EventStatus[]).map((status) => {
              const cfg = STATUS_CONFIG[status];
              const isActive = event.status === status;
              const canTransition = STATUS_FLOW[event.status] === status;
              const isPast = ['COMPLETED', 'CANCELLED'].includes(status) && status !== event.status;
              return (
                <button
                  key={status}
                  onClick={() => canTransition && updateEvent(event.id, { status })}
                  disabled={!canTransition}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${canTransition ? 'hover:scale-105 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                  style={{
                    backgroundColor: isActive ? cfg.color : '#282828',
                    color: isActive ? '#FFFFFF' : cfg.color,
                    border: isActive ? `1px solid ${cfg.color}` : `1px solid ${cfg.color}30`,
                  }}
                >
                  {status === 'PLANIFIED' && <Calendar className="w-3.5 h-3.5" />}
                  {status === 'ONGOING' && <Play className="w-3.5 h-3.5" />}
                  {status === 'COMPLETED' && <CheckCircle className="w-3.5 h-3.5" />}
                  {status === 'CANCELLED' && <Pause className="w-3.5 h-3.5" />}
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Financial Actions ────────────────────────────────────── */}
        <div className="flex gap-3 mb-6 pb-6">
          <button
            onClick={() => navigate('/transaction/new', { state: { eventId: event.id } })}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#1DB954', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4" />Entrée
          </button>
          <button
            onClick={() => navigate('/transaction/new', { state: { eventId: event.id } })}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#E51332', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4" />Sortie
          </button>
        </div>

        {/* Delete button */}
        <div className="text-center pb-6">
          <button onClick={() => setShowDeleteModal(true)} className="inline-flex items-center gap-2 text-xs text-text-tertiary hover:text-red-500 transition-colors px-4 py-2 rounded-lg" style={{ border: '1px solid #282828', backgroundColor: '#212121' }}>
            <Trash2 className="w-3.5 h-3.5" />Supprimer l'événement
          </button>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Supprimer l'événement"
        description={`Supprimer "${event.name}" ? Les transactions associées ne seront pas supprimées.`}
        confirmLabel="Supprimer"
        confirmVariant="danger"
        requiredText="SUPPRIMER"
      />

      <ConfirmModal
        open={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onConfirm={() => setShowErrorModal(false)}
        title="Erreur"
        description={errorMsg}
        confirmLabel="Compris"
        confirmVariant="primary"
      />

      <BottomNav />
    </div>
  );
}
