import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowLeft, Plus, X, Tag } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { generateId } from '@/lib/utils';
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

function fmt(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString('fr-FR');
}

export default function EventNew() {
  const navigate = useNavigate();
  const { addEvent, orgUnits, caisses } = useLocalStore;
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
      shoppingItems: [],
    });
    navigate('/events');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Nouvel événement" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>{error}</div>}
        <h1 className="text-text-primary font-bold text-xl mb-5">Nouvel événement</h1>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Fête des tabernacles"
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none resize-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-text-tertiary text-xs mb-1.5 block">Date début *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              />
            </div>
            <div>
              <label className="text-text-tertiary text-xs mb-1.5 block">Date fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              />
            </div>
          </div>
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Statut initial</label>
            <div className="flex gap-2">
              {(['PLANIFIED', 'ONGOING'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={status === s ? { backgroundColor: '#FF6B00', color: '#fff' } : { backgroundColor: '#212121', color: '#808080', border: '1px solid #282828' }}
                >
                  {s === 'PLANIFIED' ? 'Planifié' : 'En cours'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Budget Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" style={{ color: '#FF6B00' }} />
              <span className="text-text-primary font-semibold text-sm">Budget</span>
              {budgetItems.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>
                  {fmt(totalBudget)} F
                </span>
              )}
            </div>
            <button onClick={() => setShowBudget(!showBudget)} className="text-xs font-medium" style={{ color: '#FF6B00' }}>
              {showBudget ? 'Masquer' : 'Gérer'}
            </button>
          </div>

          {showBudget && (
            <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              {/* Default budget items */}
              <p className="text-text-tertiary text-xs font-medium mb-3">Postes prédéfinis</p>
              <div className="space-y-2 mb-4">
                {DEFAULT_BUDGET_ITEMS.map(item => {
                  const existing = budgetItems.find(b => b.label === item.label);
                  return (
                    <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: '#181818' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium">{item.label}</p>
                        {existing && (
                          <p className="text-text-tertiary text-xs">{fmt(existing.allocated)} FCFA · {existing.fundedBy === 'main' ? 'Caisse principale' : existing.fundedBy}</p>
                        )}
                      </div>
                      {existing ? (
                        <button onClick={() => handleRemoveBudget(existing.id)} className="w-6 h-6 rounded-full flex items-center justify-center ml-2" style={{ backgroundColor: '#E5133220' }}>
                          <X className="w-3 h-3 text-[#E51332]" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddDefaultBudget(item)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}
                        >
                          <Plus className="w-3 h-3 inline mr-1" /> Ajouter
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="h-px mb-3" style={{ backgroundColor: '#282828' }} />

              {/* Custom budget item */}
              <p className="text-text-tertiary text-xs font-medium mb-3">Poste personnalisé</p>
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  value={newBudgetLabel}
                  onChange={(e) => setNewBudgetLabel(e.target.value)}
                  placeholder="Nom du poste"
                  className="w-full px-3 py-2 rounded-lg text-text-primary text-sm outline-none"
                  style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newBudgetAmount}
                    onChange={(e) => setNewBudgetAmount(e.target.value)}
                    placeholder="Montant (FCFA)"
                    className="flex-1 px-3 py-2 rounded-lg text-text-primary text-sm outline-none"
                    style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
                  />
                  <select
                    value={newBudgetFundedBy}
                    onChange={(e) => setNewBudgetFundedBy(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: '#181818', color: '#B3B3B3', border: '1px solid #282828' }}
                  >
                    <option value="main">Caisse principale</option>
                    {caisses.filter(c => c.type === 'GROUP').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAddBudget}
                  className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}
                >
                  <Plus className="w-4 h-4" /> Ajouter au budget
                </button>
              </div>

              {/* Budget summary */}
              {budgetItems.length > 0 && (
                <div className="space-y-1 mt-3">
                  {budgetItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: '#181818' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-xs font-medium truncate">{item.label}</p>
                        <p className="text-text-tertiary text-xs">{item.fundedBy === 'main' ? 'Caisse princ.' : item.fundedBy}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary text-xs font-bold">{fmt(item.allocated)} F</span>
                        <button onClick={() => handleRemoveBudget(item.id)} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
                          <X className="w-3 h-3 text-[#E51332]" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: '1px solid #282828' }}>
                    <span className="text-text-secondary text-xs font-medium">Total budget</span>
                    <span className="text-text-primary text-sm font-bold">{fmt(totalBudget)} FCFA</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-full font-semibold text-white transition-all active:scale-95 mb-3"
          style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)' }}
        >
          Créer l'événement
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary"
          style={{ backgroundColor: '#212121' }}
        >
          Annuler
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
