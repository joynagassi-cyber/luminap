import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCentsToFCFA, formatDate } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, Tag, CheckCircle, Play, Flag, Trash2, AlertCircle, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { FullPageSkeleton } from '@/components/Skeleton';
import type { EventStatus } from '@/types';

type Tab = 'overview' | 'budget' | 'transactions';

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string; icon: any }> = {
  PLANIFIED: { label: 'Planifié', color: '#3B82F6', bg: '#3B82F620', icon: Calendar },
  ONGOING: { label: 'En cours', color: '#1DB954', bg: '#1DB95420', icon: Play },
  COMPLETED: { label: 'Terminé', color: '#808080', bg: '#80808020', icon: CheckCircle },
  CANCELLED: { label: 'Annulé', color: '#E51332', bg: '#E5133220', icon: Flag },
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, updateEventStatus, deleteEvent, transactions, caisses, addTransaction, updateEvent } = useLocalStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showDelete, setShowDelete] = useState(false);
  const [success, setSuccess] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedBudgetItemId, setSelectedBudgetItemId] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseError, setExpenseError] = useState('');

  const event = events.find(e => e.id === id);

  if (!event) return <FullPageSkeleton />;

  const config = STATUS_CONFIG[event.status];
  const budgetSpent = event.budgetItems.reduce((s, i) => s + i.spent, 0);
  const eventTxs = transactions.filter(t => t.eventId === event.id && t.status === 'APPROVED');

  const handleStatusChange = (newStatus: EventStatus) => {
    updateEventStatus(id!, newStatus);
    setSuccess(`Statut changé : ${STATUS_CONFIG[newStatus].label}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = () => {
    deleteEvent(id!);
    navigate('/events');
  };

  const handleAddExpense = async () => {
    if (!expenseAmount || !expenseDescription || !selectedBudgetItemId) {
      setExpenseError('Veuillez remplir tous les champs');
      return;
    }

    const budgetItem = event.budgetItems.find(i => i.id === selectedBudgetItemId);
    if (!budgetItem) return;

    const amountFCFA = parseFloat(expenseAmount);
    if (isNaN(amountFCFA) || amountFCFA <= 0) {
      setExpenseError('Montant invalide');
      return;
    }

    const amountCents = Math.round(amountFCFA * 100);
    const now = new Date().toISOString();
    const sessionId = localStorage.getItem('lumina-session') || 'local-user';

    // Determine source caisse from budget item's fundedBy
    const sourceCaisseId = budgetItem.fundedBy === 'main' ? 'main' : budgetItem.fundedBy;

    // Find category
    const categoryId = budgetItem.categoryId || 'cat-frais-fonc';

    const newTx = {
      orgId: 'org-1',
      type: 'EXPENSE' as const,
      amount: amountCents,
      description: `${event.name} — ${expenseDescription}`,
      date: now.split('T')[0],
      status: 'PENDING' as const,
      createdAt: now,
      updatedAt: now,
      createdById: sessionId,
      approvedById: null,
      approvedAt: null,
      categoryId,
      orgUnitId: null,
      eventId: event.id,
      source: 'CAISSE' as const,
      personName: null,
      compensatesFor: null,
      comment: `Dépense événement: ${expenseDescription}`,
      version: 1,
      sourceCaisseId,
      versementId: null,
    };

    // Update budget item spent
    const updatedItems = event.budgetItems.map(item =>
      item.id === selectedBudgetItemId
        ? { ...item, spent: item.spent + amountCents }
        : item
    );
    const newTotalSpent = updatedItems.reduce((s, i) => s + i.spent, 0);

    await addTransaction(newTx);
    await updateEvent(event.id, { budgetItems: updatedItems, budget: event.budget });

    setSuccess(`Dépense de ${amountFCFA.toLocaleString('fr-FR')} FCFA enregistrée`);
    setTimeout(() => setSuccess(''), 3000);
    setShowAddExpense(false);
    setExpenseAmount('');
    setExpenseDescription('');
    setSelectedBudgetItemId(null);
  };

  const remaining = event.budget - budgetSpent;
  const progressPct = event.budget > 0 ? Math.min(100, Math.round((budgetSpent / event.budget) * 100)) : 0;

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <TopHeader title={event.name} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-16">
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
          {event.description && <p className="text-text-tertiary text-sm mb-4">{event.description}</p>}

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
            <p className="text-text-primary font-bold text-sm">{formatCentsToFCFA(event.budget)} <span className="text-text-tertiary text-xs font-normal">F</span></p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs mb-1">Dépensé</p>
            <p className="font-bold text-sm" style={{ color: budgetSpent > event.budget ? '#E51332' : '#FFB800' }}>
              {formatCentsToFCFA(budgetSpent)} <span className="text-text-tertiary text-xs font-normal">F</span>
            </p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs mb-1">Reste</p>
            <p className="font-bold text-sm" style={{ color: remaining >= 0 ? '#1DB954' : '#E51332' }}>
              {formatCentsToFCFA(Math.max(0, remaining))} <span className="text-text-tertiary text-xs font-normal">F</span>
            </p>
          </div>
        </div>

        {/* Budget progress */}
        {event.budget > 0 && (
          <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#212121' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-tertiary text-xs">Progression budgétaire</span>
              <span className="text-text-secondary text-xs">{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: budgetSpent > event.budget ? '#E51332' : '#FF6B00' }} />
            </div>
            {budgetSpent > event.budget && (
              <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: '#E51332' }}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Budget dépassé de {formatCentsToFCFA(budgetSpent - event.budget)} FCFA</span>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-5 overflow-x-auto" style={{ backgroundColor: '#212121' }}>
          {([
            { id: 'overview' as Tab, label: 'Aperçu' },
            { id: 'budget' as Tab, label: 'Budget' },
            { id: 'transactions' as Tab, label: 'Transactions' },
          ]).map(({ id: tabId, label }) => (
            <button key={tabId} onClick={() => setActiveTab(tabId)} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === tabId ? 'font-semibold' : 'text-text-tertiary'}`} style={activeTab === tabId ? { backgroundColor: '#FF6B00', color: '#fff' } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('budget')}
                className="p-4 rounded-xl text-left transition-all active:scale-95"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#FF6B0020' }}>
                  <Tag className="w-5 h-5" style={{ color: '#FF6B00' }} />
                </div>
                <p className="text-text-primary text-sm font-semibold">Gérer le budget</p>
                <p className="text-text-tertiary text-xs mt-1">{event.budgetItems.length} postes</p>
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className="p-4 rounded-xl text-left transition-all active:scale-95"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#1DB95420' }}>
                  <ArrowDown className="w-5 h-5" style={{ color: '#1DB954' }} />
                </div>
                <p className="text-text-primary text-sm font-semibold">Transactions</p>
                <p className="text-text-tertiary text-xs mt-1">{eventTxs.length} liée{eventTxs.length > 1 ? 's' : ''}</p>
              </button>
            </div>

            {event.budgetItems.length > 0 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
                <p className="text-text-tertiary text-xs font-medium mb-3">Répartition du budget</p>
                <div className="space-y-2">
                  {event.budgetItems.slice(0, 3).map(item => {
                    const pct = item.allocated > 0 ? Math.min(100, Math.round((item.spent / item.allocated) * 100)) : 0;
                    return (
                      <div key={item.id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-secondary truncate">{item.label}</span>
                          <span className="text-text-tertiary">{formatCentsToFCFA(item.spent)}/{formatCentsToFCFA(item.allocated)} F</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#E51332' : '#FF6B00' }} />
                        </div>
                      </div>
                    );
                  })}
                  {event.budgetItems.length > 3 && (
                    <p className="text-text-tertiary text-xs text-center mt-2">+ {event.budgetItems.length - 3} autres postes</p>
                  )}
                </div>
              </div>
            )}

            {eventTxs.length > 0 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-text-tertiary text-xs font-medium">Dernières transactions</p>
                  <button onClick={() => setActiveTab('transactions')} className="text-xs" style={{ color: '#FF6B00' }}>Tout voir</button>
                </div>
                {eventTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3).map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: '#282828' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tx.type === 'INCOME' ? '#1DB95420' : '#E5133220' }}>
                      {tx.type === 'INCOME'
                        ? <ArrowUp className="w-4 h-4" style={{ color: '#1DB954' }} />
                        : <ArrowDown className="w-4 h-4" style={{ color: '#E51332' }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-text-tertiary text-xs">{formatDate(tx.date)}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: tx.type === 'INCOME' ? '#1DB954' : '#E51332' }}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCentsToFCFA(tx.amount)} F
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Budget */}
        {activeTab === 'budget' && (
          <div className="space-y-3">
            {event.budgetItems.length === 0 ? (
              <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#212121' }}>
                <Tag className="w-8 h-8 mx-auto mb-3 text-text-tertiary opacity-40" />
                <p className="text-text-tertiary text-sm">Aucun poste budgétaire</p>
                <p className="text-text-tertiary text-xs mt-1">Ajoutez des postes depuis la création de l'événement</p>
              </div>
            ) : (
              event.budgetItems.map(item => {
                const pct = item.allocated > 0 ? Math.min(100, Math.round((item.spent / item.allocated) * 100)) : 0;
                const isExceeded = item.spent > item.allocated;
                const remainingItem = item.allocated - item.spent;
                const sourceCaisse = item.fundedBy === 'main'
                  ? caisses.find(c => c.id === 'main')
                  : caisses.find(c => c.id === item.fundedBy);

                return (
                  <div key={item.id} className="rounded-xl p-4" style={{ backgroundColor: '#212121', border: isExceeded ? '1px solid #E5133240' : '1px solid #282828' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium">{item.label}</p>
                        <p className="text-text-tertiary text-xs mt-0.5">
                          {sourceCaisse?.name || 'Caisse principale'}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-text-primary text-sm font-bold">{formatCentsToFCFA(item.allocated)} F</p>
                        <p className={`text-xs ${isExceeded ? 'text-[#E51332]' : 'text-text-tertiary'}`}>
                          {formatCentsToFCFA(item.spent)} F dépensé
                        </p>
                      </div>
                    </div>

                    <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#282828' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: isExceeded ? '#E51332' : pct >= 75 ? '#FFB800' : '#1DB954' }} />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-tertiary">Reste: <span style={{ color: remainingItem >= 0 ? '#1DB954' : '#E51332' }}>{formatCentsToFCFA(Math.max(0, remainingItem))} F</span></span>
                      <button
                        onClick={() => {
                          setSelectedBudgetItemId(item.id);
                          setShowAddExpense(true);
                          setExpenseError('');
                        }}
                        className="px-3 py-1.5 rounded-lg font-medium"
                        style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}
                      >
                        <Plus className="w-3 h-3 inline mr-1" /> Dépenser
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab: Transactions */}
        {activeTab === 'transactions' && (
          <div className="space-y-2">
            <button
              onClick={() => navigate('/transaction/new', { state: { eventId: event.id } })}
              className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 mb-3 transition-all active:scale-95"
              style={{ backgroundColor: '#212121', border: '1px dashed #FF6B0040', color: '#FF6B00' }}
            >
              <Plus className="w-4 h-4" /> Ajouter une transaction
            </button>
            {eventTxs.length === 0 ? (
              <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#212121' }}>
                <p className="text-text-tertiary text-sm">Aucune transaction liée</p>
                <p className="text-text-tertiary text-xs mt-1">Les dépenses seront enregistrées ici</p>
              </div>
            ) : (
              eventTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => {
                const caisse = caisses.find(c => c.id === tx.sourceCaisseId);
                return (
                  <div key={tx.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#212121' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tx.type === 'INCOME' ? '#1DB95420' : '#E5133220' }}>
                      {tx.type === 'INCOME'
                        ? <ArrowUp className="w-4 h-4" style={{ color: '#1DB954' }} />
                        : <ArrowDown className="w-4 h-4" style={{ color: '#E51332' }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-text-tertiary text-xs">
                        {caisse?.name || 'Caisse principale'} · {tx.category?.labelFr || tx.categoryId}
                      </p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: tx.type === 'INCOME' ? '#1DB954' : '#E51332' }}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCentsToFCFA(tx.amount)} F
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Delete button */}
        <button onClick={() => setShowDelete(true)} className="w-full py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2 mt-5 mb-4" style={{ backgroundColor: '#212121', color: '#E51332' }}>
          <Trash2 className="w-4 h-4" /> Supprimer l'événement
        </button>
      </div>

      <BottomNav />

      {/* Add Expense Modal - Fixed positioning */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAddExpense(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl" style={{ backgroundColor: '#181818' }}>
            <div className="p-5">
              <h3 className="text-text-primary font-bold text-lg mb-4">Dépenser depuis le budget</h3>

              {expenseError && (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>{expenseError}</div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-text-tertiary text-xs mb-1.5 block">Poste budgétaire</label>
                  <select
                    value={selectedBudgetItemId || ''}
                    onChange={(e) => setSelectedBudgetItemId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                    style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                  >
                    <option value="">Sélectionner un poste...</option>
                    {event.budgetItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.label} — Reste: {formatCentsToFCFA(item.allocated - item.spent)} F
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-text-tertiary text-xs mb-1.5 block">Montant (FCFA)</label>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                    style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                  />
                  {selectedBudgetItemId && (() => {
                    const item = event.budgetItems.find(i => i.id === selectedBudgetItemId);
                    if (!item) return null;
                    const remaining = item.allocated - item.spent;
                    const entered = parseFloat(expenseAmount) || 0;
                    const overBudget = entered > (remaining / 100);
                    return (
                      <p className={`text-xs mt-1 ${overBudget ? 'text-[#E51332]' : 'text-text-tertiary'}`}>
                        Reste disponible: {formatCentsToFCFA(remaining)} F{overBudget && ' ⚠️ Montant insuffisant'}
                      </p>
                    );
                  })()}
                </div>

                <div>
                  <label className="text-text-tertiary text-xs mb-1.5 block">Description</label>
                  <input
                    type="text"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="Ex: Achat de chaises"
                    className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                    style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 py-3 rounded-full font-medium text-sm"
                  style={{ backgroundColor: '#212121', color: '#B3B3B3' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddExpense}
                  className="flex-1 py-3 rounded-full font-semibold text-white transition-all active:scale-95"
                  style={{ backgroundColor: '#FF6B00' }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
