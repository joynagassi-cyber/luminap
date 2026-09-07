import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { useCategories, useCaisses } from '@/lib/dataLayer';
import { ArrowLeft, Plus, X, Tag } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import DatePicker from '@/components/DatePicker';
import { generateId, formatCurrencyCompact } from '@/lib/utils';
import type { BudgetItem } from '@/types';

const DEFAULT_BUDGET_ITEMS = [
  { label: 'Dîme', categoryId: 'cat-dime', allocated: 0 },
  { label: 'Offrande', categoryId: 'cat-offrande', allocated: 0 },
  { label: 'Offrande Mission', categoryId: 'cat-offrande-mission', allocated: 0 },
  { label: 'Salaire Pasteur', categoryId: 'cat-salaire-pasteur', allocated: 0 },
  { label: 'Frais de Fonctionnement', categoryId: 'cat-frais-fonc', allocated: 0 },
  { label: 'Mission', categoryId: 'cat-mission', allocated: 0 },
  { label: 'Entretien', categoryId: 'cat-entretien', allocated: 0 },
  { label: 'Aumône', categoryId: 'cat-aumone', allocated: 0 },
];

export default function EventNew() {
  const navigate = useNavigate();
  const { addEvent, caisses: idbCaisses, accounts } = useLocalStore();

  // PowerSync with fallback
  const { data: psCategories } = useCategories();
  const { data: psCaisses } = useCaisses();

  const categories = psCategories ?? [];
  const caisses = psCaisses ?? idbCaisses;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'PLANIFIED' | 'ONGOING'>('PLANIFIED');
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [showBudget, setShowBudget] = useState(false);
  const [newBudgetLabel, setNewBudgetLabel] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [newBudgetFundedBy, setNewBudgetFundedBy] = useState('main');
  const [error, setError] = useState('');

  const totalBudget = budgetItems.reduce((s, i) => s + i.allocated, 0);

  const handleAddDefaultBudget = (item: typeof DEFAULT_BUDGET_ITEMS[0]) => {
    const existing = budgetItems.find(b => b.label === item.label);
    if (existing) return;
    setBudgetItems(prev => [...prev, {
      id: generateId(),
      label: item.label,
      allocated: 0,
      spent: 0,
      fundedBy: 'main',
      categoryId: item.categoryId,
      isCustom: false,
    }]);
  };

  const handleAddBudget = () => {
    if (!newBudgetLabel.trim() || !newBudgetAmount) return;
    const item: BudgetItem = {
      id: generateId(),
      label: newBudgetLabel.trim(),
      allocated: Math.round(parseFloat(newBudgetAmount) * 100),
      spent: 0,
      fundedBy: newBudgetFundedBy,
      isCustom: true,
    };
    setBudgetItems(prev => [...prev, item]);
    setNewBudgetLabel('');
    setNewBudgetAmount('');
  };

  const handleRemoveBudget = (id: string) => setBudgetItems(prev => prev.filter(i => i.id !== id));

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Le nom est requis'); return; }
    setError('');
    await addEvent({
      orgId: 'org-1',
      name: name.trim(),
      description: description.trim(),
      startDate,
      endDate: endDate || null,
      status,
      budget: totalBudget,
      budgetItems,
    });
    navigate('/events');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Nouvel événement" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm text-center" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>
            {error}
          </div>
        )}

        {/* Name */}
        <div className="mb-5">
          <label className="text-text-tertiary text-xs mb-2 block">Nom de l'événement *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Noël 2026"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          />
        </div>

        {/* Description */}
        <div className="mb-5">
          <label className="text-text-tertiary text-xs mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description de l'événement..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          />
        </div>

        {/* Dates */}
        <div className="mb-5">
          <label className="text-text-tertiary text-xs mb-2 block">Date de début *</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          />
        </div>

        <div className="mb-5">
          <label className="text-text-tertiary text-xs mb-2 block">Date de fin (optionnel)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          />
        </div>

        {/* Status */}
        <div className="mb-5">
          <label className="text-text-tertiary text-xs mb-2 block">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          >
            <option value="PLANIFIED">Planifié</option>
            <option value="ONGOING">En cours</option>
          </select>
        </div>

        {/* Budget */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-text-tertiary text-xs font-medium">Budget</label>
            <button
              onClick={() => setShowBudget(!showBudget)}
              className="text-xs font-medium"
              style={{ color: '#FF6B00' }}
            >
              {showBudget ? 'Masquer' : 'Gérer le budget'}
            </button>
          </div>

          {showBudget && (
            <div className="space-y-3 mb-4">
              {/* Default budget items */}
              <div className="space-y-2">
                {DEFAULT_BUDGET_ITEMS.map((item) => {
                  const existing = budgetItems.find(b => b.label === item.label);
                  if (existing) return null;
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleAddDefaultBudget(item)}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all active:scale-95"
                      style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom budget item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBudgetLabel}
                  onChange={(e) => setNewBudgetLabel(e.target.value)}
                  placeholder="Poste"
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: '#181818', color: '#fff', border: '1px solid #282828' }}
                />
                <input
                  type="number"
                  value={newBudgetAmount}
                  onChange={(e) => setNewBudgetAmount(e.target.value)}
                  placeholder="Montant"
                  className="w-24 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: '#181818', color: '#fff', border: '1px solid #282828' }}
                />
                <button
                  onClick={handleAddBudget}
                  className="px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#FF6B00', color: '#fff' }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Budget items list */}
              {budgetItems.length > 0 && (
                <div className="space-y-2">
                  {budgetItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: '#181818' }}>
                      <div>
                        <p className="text-text-primary text-sm font-medium">{item.label}</p>
                        <p className="text-text-tertiary text-xs">{formatCurrencyCompact(item.allocated)} F</p>
                      </div>
                      <button
                        onClick={() => handleRemoveBudget(item.id)}
                        className="p-1 rounded-full"
                        style={{ backgroundColor: '#E5133220' }}
                      >
                        <X className="w-4 h-4" style={{ color: '#E51332' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Total budget */}
          {budgetItems.length > 0 && (
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#212121', border: '1px solid #FF6B0030' }}>
              <p className="text-text-tertiary text-xs">Budget total</p>
              <p className="text-text-primary font-bold text-lg">{formatCurrencyCompact(totalBudget)} F</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-full font-semibold text-white text-sm transition-all active:scale-95"
          style={{ backgroundColor: '#FF6B00' }}
        >
          Créer l'événement
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
