import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, Tag, CheckCircle, Play, Flag, Trash2, ShoppingCart, AlertCircle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { FullPageSkeleton } from '@/components/Skeleton';
import type { EventStatus } from '@/types';

type Tab = 'details' | 'budget' | 'achats' | 'transactions' | 'historique';

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  PLANIFIED: { label: 'Planifié', color: '#3B82F6', bg: '#3B82F620', icon: Calendar },
  ONGOING: { label: 'En cours', color: '#1DB954', bg: '#1DB95420', icon: Play },
  COMPLETED: { label: 'Terminé', color: '#808080', bg: '#80808020', icon: CheckCircle },
  CANCELLED: { label: 'Annulé', color: '#E51332', bg: '#E5133220', icon: Flag },
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, updateEventStatus, deleteEvent, transactions, appConfig } = useLocalStore();
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [showDelete, setShowDelete] = useState(false);
  const [success, setSuccess] = useState('');

  const event = events.find(e => e.id === id);

  if (!event) return <FullPageSkeleton />;

  const config = STATUS_CONFIG[event.status];
  const budgetSpent = event.budgetItems.reduce((s, i) => s + i.spent, 0);
  const shoppingTotal = event.shoppingItems.filter(i => i.status === 'ORDERED' || i.status === 'RECEIVED').reduce((s, i) => s + i.total, 0);
  const eventTxs = transactions.filter(t => t.eventId === event.id);
  const txIncome = eventTxs.filter(t => t.type === 'INCOME' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const txExpense = eventTxs.filter(t => t.type === 'EXPENSE' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);

  const handleStatusChange = (newStatus: EventStatus) => {
    updateEventStatus(id!, newStatus);
    setSuccess(`Statut changé : ${STATUS_CONFIG[newStatus].label}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = () => {
    deleteEvent(id!);
    navigate('/events');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title={event.name} />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {success && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#1DB95420', color: '#1DB954' }}>{success}</div>
        )}

        {/* Status badge + quick actions */}
        <div className="flex items-center justify-between mb-5">
          <span className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full font-medium" style={{ color: config.color, backgroundColor: config.bg }}>
            <config.icon className="w-4 h-4" /> {config.label}
          </span>
          <div className="flex items-center gap-2">
            {event.status === 'PLANIFIED' && (
              <button onClick={() => handleStatusChange('ONGOING')} className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: '#1DB95420', color: '#1DB954' }}>
                <Play className="w-3 h-3" /> Démarrer
              </button>
            )}
            {event.status === 'ONGOING' && (
              <button onClick={() => handleStatusChange('COMPLETED')} className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: '#80808020', color: '#808080' }}>
                <CheckCircle className="w-3 h-3" /> Terminer
              </button>
            )}
            {(event.status === 'PLANIFIED' || event.status === 'ONGOING') && (
              <button onClick={() => handleStatusChange('CANCELLED')} className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>
                <Flag className="w-3 h-3" /> Annuler
              </button>
            )}
          </div>
        </div>

        {/* Hero Card */}
        <div className="rounded-2xl p-5 mb-5 text-center" style={{ backgroundColor: '#212121' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: config.bg }}>
            <config.icon className="w-8 h-8" style={{ color: config.color }} />
          </div>
          <h1 className="text-text-primary font-bold text-xl mb-1">{event.name}</h1>
          <p className="text-text-tertiary text-sm mb-4">{event.description || 'Pas de description'}</p>

          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-tertiary" />
              <span className="text-text-secondary">{formatDate(event.startDate)}</span>
            </div>
            {event.endDate && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-text-secondary">{formatDate(event.endDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs mb-1">Budget</p>
            <p className="text-text-primary font-bold text-sm">{formatCurrencyCompact(event.budget)} <span className="text-text-tertiary text-xs font-normal">F</span></p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs mb-1">Dépensé</p>
            <p className="font-bold text-sm" style={{ color: budgetSpent > event.budget ? '#E51332' : '#FFB800' }}>{formatCurrencyCompact(budgetSpent + shoppingTotal)} <span className="text-text-tertiary text-xs font-normal">F</span></p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs mb-1">Reste</p>
            <p className="font-bold text-sm" style={{ color: event.budget - budgetSpent >= 0 ? '#1DB954' : '#E51332' }}>{formatCurrencyCompact(Math.max(0, event.budget - budgetSpent - shoppingTotal))} <span className="text-text-tertiary text-xs font-normal">F</span></p>
          </div>
        </div>

        {/* Budget progress bar */}
        {event.budget > 0 && (
          <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#212121' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-tertiary text-xs">Progression budgétaire</span>
              <span className="text-text-secondary text-xs">{Math.min(100, Math.round(((budgetSpent + shoppingTotal) / event.budget) * 100))}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ((budgetSpent + shoppingTotal) / event.budget) * 100)}%`, backgroundColor: budgetSpent + shoppingTotal > event.budget ? '#E51332' : '#FF6B00' }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-5 overflow-x-auto" style={{ backgroundColor: '#212121' }}>
          {([
            { id: 'details' as Tab, label: 'Détails' },
            { id: 'budget' as Tab, label: 'Budget' },
            { id: 'achats' as Tab, label: 'Achats' },
            { id: 'transactions' as Tab, label: 'Tx' },
            { id: 'historique' as Tab, label: 'Historique' },
          ]).map(({ id: tabId, label }) => (
            <button key={tabId} onClick={() => setActiveTab(tabId)} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === tabId ? 'font-semibold' : 'text-text-tertiary'}`} style={activeTab === tabId ? { backgroundColor: '#FF6B00', color: '#fff' } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'details' && (
          <div className="space-y-3">
            <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
              <p className="text-text-tertiary text-xs font-medium mb-2">Informations</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Créé le</span>
                  <span className="text-text-primary">{formatDate(event.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Modifié le</span>
                  <span className="text-text-primary">{formatDate(event.updatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Transactions liées</span>
                  <span className="text-text-primary">{eventTxs.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="space-y-2">
            {event.budgetItems.length === 0 ? (
              <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#212121' }}>
                <Tag className="w-8 h-8 mx-auto mb-3 text-text-tertiary opacity-40" />
                <p className="text-text-tertiary text-sm">Aucun poste budgétaire</p>
              </div>
            ) : (
              event.budgetItems.map((item) => {
                const pct = item.allocated > 0 ? Math.min(100, Math.round((item.spent / item.allocated) * 100)) : 0;
                return (
                  <div key={item.id} className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">{item.label}</p>
                        <p className="text-text-tertiary text-xs">{item.fundedBy === 'main' ? 'Caisse principale' : item.fundedBy}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-text-primary text-sm font-bold">{formatCurrencyCompact(item.allocated)} F</p>
                        <p className="text-text-tertiary text-xs">{formatCurrencyCompact(item.spent)} F dépensé</p>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#E51332' : pct >= 75 ? '#FFB800' : '#1DB954' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'achats' && (
          <div className="space-y-2">
            {event.shoppingItems.length === 0 ? (
              <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#212121' }}>
                <ShoppingCart className="w-8 h-8 mx-auto mb-3 text-text-tertiary opacity-40" />
                <p className="text-text-tertiary text-sm">Aucun article</p>
              </div>
            ) : (
              event.shoppingItems.map((item) => (
                <div key={item.id} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: '#212121' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.status === 'RECEIVED' ? '#1DB95420' : item.status === 'ORDERED' ? '#FFB80020' : '#80808020' }}>
                    {item.status === 'RECEIVED' ? <CheckCircle className="w-4 h-4 text-[#1DB954]" /> : item.status === 'ORDERED' ? <AlertCircle className="w-4 h-4 text-[#FFB800]" /> : <ShoppingCart className="w-4 h-4 text-text-tertiary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{item.label}</p>
                    <p className="text-text-tertiary text-xs">{item.quantity} × {formatCurrencyCompact(item.unitPrice)} {item.supplier ? `· ${item.supplier}` : ''}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: item.status === 'RECEIVED' ? '#1DB954' : '#B3B3B3' }}>{formatCurrencyCompact(item.total)} F</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-2">
            {eventTxs.length === 0 ? (
              <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#212121' }}>
                <p className="text-text-tertiary text-sm">Aucune transaction liée</p>
              </div>
            ) : (
              eventTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                <div key={tx.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#212121' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tx.type === 'INCOME' ? '#1DB95420' : '#E5133220' }}>
                    <span className="text-xs font-bold" style={{ color: tx.type === 'INCOME' ? '#1DB954' : '#E51332' }}>{tx.type === 'INCOME' ? '+' : '-'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-text-tertiary text-xs">{formatDate(tx.date)}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: tx.type === 'INCOME' ? '#1DB954' : '#E51332' }}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrencyCompact(tx.amount)} F
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'historique' && (
          <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Clock className="w-8 h-8 mx-auto mb-3 text-text-tertiary opacity-40" />
            <p className="text-text-tertiary text-sm">Aucun historique disponible</p>
          </div>
        )}

        {/* Delete button */}
        <button onClick={() => setShowDelete(true)} className="w-full py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2 mt-5" style={{ backgroundColor: '#212121', color: '#E51332' }}>
          <Trash2 className="w-4 h-4" /> Supprimer l'événement
        </button>
      </div>
      <BottomNav />

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" onClick={() => setShowDelete(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-sm rounded-2xl p-5 text-center" style={{ backgroundColor: '#181818' }} onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#E5133220' }}>
              <Trash2 className="w-6 h-6 text-[#E51332]" />
            </div>
            <h3 className="text-text-primary font-bold text-lg mb-2">Supprimer cet événement ?</h3>
            <p className="text-text-tertiary text-sm mb-6">Cette action est irréversible.</p>
            <button onClick={handleDelete} className="w-full py-3.5 rounded-full font-semibold text-white mb-3" style={{ backgroundColor: '#E51332' }}>Supprimer</button>
            <button onClick={() => setShowDelete(false)} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary" style={{ backgroundColor: '#212121' }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
