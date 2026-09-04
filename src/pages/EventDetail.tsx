import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, Tag, CheckCircle, Play, Flag, Trash2, ShoppingCart, AlertCircle, Plus, Wallet, ArrowUp, ArrowDown } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { FullPageSkeleton } from '@/components/Skeleton';
import type { EventStatus, ShoppingItem } from '@/types';

type Tab = 'details' | 'budget' | 'achats' | 'transactions' | 'historique';

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string; icon: any }> = {
  PLANIFIED: { label: 'Planifié', color: '#3B82F6', bg: '#3B82F620', icon: Calendar },
  ONGOING: { label: 'En cours', color: '#1DB954', bg: '#1DB95420', icon: Play },
  COMPLETED: { label: 'Terminé', color: '#808080', bg: '#80808020', icon: CheckCircle },
  CANCELLED: { label: 'Annulé', color: '#E51332', bg: '#E5133220', icon: Flag },
};

const SHOPPING_STATUS_CONFIG = {
  PENDING: { label: 'En attente', color: '#808080', bg: '#80808020', icon: ShoppingCart },
  ORDERED: { label: 'Commandé', color: '#FFB800', bg: '#FFB80020', icon: ArrowUp },
  RECEIVED: { label: 'Reçu', color: '#1DB954', bg: '#1DB95420', icon: CheckCircle },
  CANCELLED: { label: 'Annulé', color: '#E51332', bg: '#E5133220', icon: Flag },
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, updateEventStatus, deleteEvent, transactions, caisses, orgUnits, updateShoppingItemStatus, syncEventBudget, addTransaction, user } = useLocalStore();
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

  // Sync budget from transactions on mount
  useEffect(() => {
    syncEventBudget(event.id);
  }, [event.id]);

  const handleStatusChange = (newStatus: EventStatus) => {
    updateEventStatus(id!, newStatus);
    setSuccess(`Statut changé : ${STATUS_CONFIG[newStatus].label}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = () => {
    deleteEvent(id!);
    navigate('/events');
  };

  const handleCreateTransaction = () => {
    navigate('/transaction/new', { state: { eventId: event.id } });
  };

  const handleShoppingStatus = async (itemId: string, newStatus: ShoppingItem['status']) => {
    await updateShoppingItemStatus(event.id, itemId, newStatus);
    setSuccess('Statut mis à jour');
    setTimeout(() => setSuccess(''), 2000);
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
            <p className="font-bold text-sm" style={{ color: budgetSpent + shoppingTotal > event.budget ? '#E51332' : '#FFB800' }}>
              {formatCurrencyCompact(budgetSpent + shoppingTotal)} <span className="text-text-tertiary text-xs font-normal">F</span>
            </p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs mb-1">Reste</p>
            <p className="font-bold text-sm" style={{ color: event.budget - budgetSpent >= 0 ? '#1DB954' : '#E51332' }}>
              {formatCurrencyCompact(Math.max(0, event.budget - budgetSpent - shoppingTotal))} <span className="text-text-tertiary text-xs font-normal">F</span>
            </p>
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
            {budgetSpent + shoppingTotal > event.budget && (
              <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: '#E51332' }}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Budget dépassé de {formatCurrencyCompact(budgetSpent + shoppingTotal - event.budget)} FCFA</span>
              </div>
            )}
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
                const isExceeded = item.spent > item.allocated;
                return (
                  <div key={item.id} className="rounded-xl p-4" style={{ backgroundColor: '#212121', border: isExceeded ? '1px solid #E5133240' : '1px solid #282828' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">{item.label}</p>
                        <p className="text-text-tertiary text-xs">{item.fundedBy === 'main' ? 'Caisse principale' : item.fundedBy}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-text-primary text-sm font-bold">{formatCurrencyCompact(item.allocated)} F</p>
                        <p className={`text-xs ${isExceeded ? 'text-[#E51332]' : 'text-text-tertiary'}`}>
                          {formatCurrencyCompact(item.spent)} F dépensé
                          {isExceeded && <span className="ml-1">⚠️</span>}
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: isExceeded ? '#E51332' : pct >= 75 ? '#FFB800' : '#1DB954' }} />
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
              event.shoppingItems.map((item) => {
                const statusConfig = SHOPPING_STATUS_CONFIG[item.status];
                return (
                  <div key={item.id} className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: statusConfig.bg }}>
                        <statusConfig.icon className="w-4 h-4" style={{ color: statusConfig.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">{item.label}</p>
                        <p className="text-text-tertiary text-xs">{item.quantity} × {formatCurrencyCompact(item.unitPrice)} {item.supplier ? `· ${item.supplier}` : ''}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: item.status === 'RECEIVED' ? '#1DB954' : '#B3B3B3' }}>{formatCurrencyCompact(item.total)} F</span>
                    </div>
                    {/* Status buttons */}
                    <div className="flex gap-2 mt-3">
                      {item.status !== 'ORDERED' && item.status !== 'RECEIVED' && item.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleShoppingStatus(item.id, 'ORDERED')}
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#FFB80020', color: '#FFB800', border: '1px solid #FFB80040' }}
                        >
                          Commander
                        </button>
                      )}
                      {item.status === 'ORDERED' && (
                        <button
                          onClick={() => handleShoppingStatus(item.id, 'RECEIVED')}
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#1DB95420', color: '#1DB954', border: '1px solid #1DB95440' }}
                        >
                          Reçu ✓
                        </button>
                      )}
                      {item.status !== 'CANCELLED' && item.status !== 'RECEIVED' && (
                        <button
                          onClick={() => handleShoppingStatus(item.id, 'CANCELLED')}
                          className="py-1.5 px-3 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#E5133220', color: '#E51332', border: '1px solid #E5133240' }}
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-2">
            {/* Create transaction button */}
            <button
              onClick={handleCreateTransaction}
              className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 mb-3 transition-all active:scale-95"
              style={{ backgroundColor: '#212121', border: '1px dashed #FF6B0040', color: '#FF6B00' }}
            >
              <Plus className="w-4 h-4" /> Ajouter une dépense
            </button>
            {eventTxs.length === 0 ? (
              <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#212121' }}>
                <p className="text-text-tertiary text-sm">Aucune transaction liée</p>
              </div>
            ) : (
              eventTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                <div key={tx.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#212121' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tx.type === 'INCOME' ? '#1DB95420' : '#E5133220' }}>
                    {tx.type === 'INCOME'
                      ? <ArrowUp className="w-4 h-4" style={{ color: '#1DB954' }} />
                      : <ArrowDown className="w-4 h-4" style={{ color: '#E51332' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-text-tertiary text-xs">{formatDate(tx.date)} · {tx.category?.labelFr || tx.categoryId}</p>
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
          <div className="space-y-2">
            <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
              <p className="text-text-tertiary text-xs font-medium mb-3">Timeline</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#FF6B00' }} />
                  <div>
                    <p className="text-text-primary text-xs font-medium">Événement créé</p>
                    <p className="text-text-tertiary text-xs">{formatDate(event.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#3B82F6' }} />
                  <div>
                    <p className="text-text-primary text-xs font-medium">Statut : Planifié</p>
                    <p className="text-text-tertiary text-xs">{formatDate(event.createdAt)}</p>
                  </div>
                </div>
                {event.status === 'ONGOING' && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#1DB954' }} />
                    <div>
                      <p className="text-text-primary text-xs font-medium">Événement démarré</p>
                      <p className="text-text-tertiary text-xs">{formatDate(event.updatedAt)}</p>
                    </div>
                  </div>
                )}
                {event.status === 'COMPLETED' && (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#1DB954' }} />
                      <div>
                        <p className="text-text-primary text-xs font-medium">Événement démarré</p>
                        <p className="text-text-tertiary text-xs">{formatDate(event.updatedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#808080' }} />
                      <div>
                        <p className="text-text-primary text-xs font-medium">Événement terminé</p>
                        <p className="text-text-tertiary text-xs">{formatDate(event.updatedAt)}</p>
                      </div>
                    </div>
                  </>
                )}
                {event.status === 'CANCELLED' && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#E51332' }} />
                    <div>
                      <p className="text-text-primary text-xs font-medium">Événement annulé</p>
                      <p className="text-text-tertiary text-xs">{formatDate(event.updatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Event transactions in timeline */}
            {eventTxs.length > 0 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
                <p className="text-text-tertiary text-xs font-medium mb-3">Transactions liées</p>
                {eventTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center gap-2 py-2 border-b last:border-0" style={{ borderColor: '#282828' }}>
                    <span className={`text-xs font-bold ${tx.type === 'INCOME' ? 'text-[#1DB954]' : 'text-[#E51332]'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrencyCompact(tx.amount)} F
                    </span>
                    <span className="text-text-tertiary text-xs flex-1 truncate">{tx.description}</span>
                    <span className="text-text-tertiary text-xs">{formatDate(tx.date)}</span>
                  </div>
                ))}
              </div>
            )}
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
            <p className="text-text-tertiary text-sm mb-1">Cette action est irréversible.</p>
            {eventTxs.length > 0 && (
              <p className="text-text-tertiary text-xs mb-4">{eventTxs.length} transaction{eventTxs.length > 1 ? 's' : ''} liée{eventTxs.length > 1 ? 'es' : ''} seront également supprimées.</p>
            )}
            <button onClick={handleDelete} className="w-full py-3.5 rounded-full font-semibold text-white mb-3" style={{ backgroundColor: '#E51332' }}>Supprimer</button>
            <button onClick={() => setShowDelete(false)} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary" style={{ backgroundColor: '#212121' }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
