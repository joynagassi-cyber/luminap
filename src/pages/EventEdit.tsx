import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowLeft, Calendar, Plus, X } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { generateId } from '@/lib/utils';
import type { Event, Category } from '@/types';

export default function EventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, categories, updateEvent, isLoading } = useLocalStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const event = events.find(e => e.id === id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<Event['status']>('PLANIFIED');
  const [budget, setBudget] = useState('');
  const [newBudgetLabel, setNewBudgetLabel] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [newBudgetFundedBy, setNewBudgetFundedBy] = useState('main');
  const [newBudgetCategoryId, setNewBudgetCategoryId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!event || isLoading) return;
    setName(event.name);
    setDescription(event.description || '');
    setStartDate(event.startDate);
    setEndDate(event.endDate || '');
    setStatus(event.status);
    setBudget(String(Math.round(event.budget / 100)));
    setLoading(false);
  }, [event, isLoading]);

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-text-tertiary">Chargement...</p>
      </div>
    );
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Le nom est requis';
    if (!startDate) errors.startDate = 'La date de début est requise';
    if (endDate && endDate < startDate) errors.endDate = 'La date de fin doit être après le début';
    const budgetNum = parseFloat(budget);
    if (budgetNum < 0) errors.budget = 'Le budget doit être positif';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setError('');
    setSubmitting(true);

    try {
      await updateEvent(id!, {
        name: name.trim(),
        description: description.trim(),
        startDate,
        endDate: endDate || null,
        status,
        budget: Math.round(parseFloat(budget) * 100),
      });
      navigate(`/event/${id}`);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBudgetItem = async () => {
    if (!newBudgetLabel.trim() || !newBudgetAmount) return;
    const amountCents = Math.round(parseFloat(newBudgetAmount) * 100);
    const newItem = {
      id: generateId(),
      label: newBudgetLabel.trim(),
      allocated: amountCents,
      spent: 0,
      fundedBy: newBudgetFundedBy,
      categoryId: newBudgetCategoryId || null,
      isCustom: true,
    };

    const updatedItems = [...event.budgetItems, newItem];
    const newBudget = event.budget + amountCents;
    await updateEvent(id!, { budgetItems: updatedItems, budget: newBudget });
    setNewBudgetLabel('');
    setNewBudgetAmount('');
    setNewBudgetCategoryId('');
  };

  const handleRemoveBudgetItem = async (itemId: string) => {
    const item = event.budgetItems.find(i => i.id === itemId);
    if (!item) return;
    const updatedItems = event.budgetItems.filter(i => i.id !== itemId);
    await updateEvent(id!, { budgetItems: updatedItems, budget: event.budget - item.allocated });
  };

  return (
    <div className="h-screen bg-canvas flex flex-col overflow-hidden">
      <TopHeader title="Modifier l'événement" />
      <div className="flex-1 overflow-y-auto px-5 pt-16 pb-44">
        <button onClick={() => navigate(`/event/${id}`)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>{error}</div>
        )}

        <h1 className="text-text-primary font-bold text-xl mb-5">Modifier l'événement</h1>

        <div className="space-y-4">
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none ${fieldErrors.name ? 'border-[#E51332]' : ''}`}
              style={{ backgroundColor: '#212121', border: `1px solid ${fieldErrors.name ? '#E51332' : '#282828'}` }}
            />
            {fieldErrors.name && <p className="text-[#E51332] text-xs mt-1">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none resize-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Event['status'])}
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            >
              <option value="PLANIFIED">Planifié</option>
              <option value="ONGOING">En cours</option>
              <option value="COMPLETED">Terminé</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Date de début *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none ${fieldErrors.startDate ? 'border-[#E51332]' : ''}`}
              style={{ backgroundColor: '#212121', border: `1px solid ${fieldErrors.startDate ? '#E51332' : '#282828'}` }}
            />
            {fieldErrors.startDate && <p className="text-[#E51332] text-xs mt-1">{fieldErrors.startDate}</p>}
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Date de fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none ${fieldErrors.endDate ? 'border-[#E51332]' : ''}`}
              style={{ backgroundColor: '#212121', border: `1px solid ${fieldErrors.endDate ? '#E51332' : '#282828'}` }}
            />
            {fieldErrors.endDate && <p className="text-[#E51332] text-xs mt-1">{fieldErrors.endDate}</p>}
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Budget (FCFA)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0"
              className={`w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none ${fieldErrors.budget ? 'border-[#E51332]' : ''}`}
              style={{ backgroundColor: '#212121', border: `1px solid ${fieldErrors.budget ? '#E51332' : '#282828'}` }}
            />
            {fieldErrors.budget && <p className="text-[#E51332] text-xs mt-1">{fieldErrors.budget}</p>}
          </div>

          {/* Budget Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-primary font-semibold text-sm">Postes budgétaires</p>
            </div>
            {event.budgetItems.length === 0 ? (
              <p className="text-text-tertiary text-xs">Aucun poste ajouté</p>
            ) : (
              <div className="space-y-2 mb-3">
                {event.budgetItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#212121' }}>
                    <div>
                      <p className="text-text-primary text-sm font-medium">{item.label}</p>
                      <p className="text-text-tertiary text-xs">{item.allocated > 0 ? `${Math.round(item.allocated / 100)} FCFA` : 'Non alloué'}</p>
                    </div>
                    <button onClick={() => handleRemoveBudgetItem(item.id)} style={{ color: '#E51332' }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add budget item form */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
              <p className="text-text-tertiary text-xs font-medium mb-3">Ajouter un poste</p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newBudgetLabel}
                  onChange={(e) => setNewBudgetLabel(e.target.value)}
                  placeholder="Label (ex: Location son)"
                  className="w-full px-4 py-2.5 rounded-lg text-text-primary text-sm outline-none"
                  style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newBudgetAmount}
                    onChange={(e) => setNewBudgetAmount(e.target.value)}
                    placeholder="Montant (FCFA)"
                    className="flex-1 px-4 py-2.5 rounded-lg text-text-primary text-sm outline-none"
                    style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
                  />
                  <select
                    value={newBudgetFundedBy}
                    onChange={(e) => setNewBudgetFundedBy(e.target.value)}
                    className="px-3 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: '#181818', border: '1px solid #282828', color: '#B3B3B3' }}
                  >
                    <option value="main">Caisse principale</option>
                  </select>
                </div>
                <button
                  onClick={handleAddBudgetItem}
                  className="w-full py-2.5 rounded-full text-sm font-medium flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#FF6B00', color: '#fff' }}
                >
                  <Plus className="w-4 h-4" /> Ajouter le poste
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={submitting}
          className="w-full py-3.5 rounded-full font-semibold text-white mt-5 transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: '#FF6B00' }}
        >
          {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
