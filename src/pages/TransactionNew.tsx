import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Plus } from 'lucide-react';
import { getTodayStr } from '@/lib/utils';
import { useLocalStore } from '@/store/useLocalStore';
import ConfirmModal from '@/components/ConfirmModal';
import type { TransactionType, Category } from '@/types';
import TopHeader from '@/components/TopHeader';

// Category creation/edit modal
function CategoryModal({
  open,
  onClose,
  onSave,
  editCat,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (cat: { key: string; labelFr: string; type: 'INCOME' | 'EXPENSE' }) => void;
  editCat?: Category | null;
}) {
  const [key, setKey] = useState(editCat?.key ?? '');
  const [labelFr, setLabelFr] = useState(editCat?.labelFr ?? '');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(editCat?.type ?? 'INCOME');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSave = () => {
    if (!key.trim()) { setError('La clé est requise'); return; }
    if (!labelFr.trim()) { setError('Le libellé est requis'); return; }
    onSave({ key: key.trim(), labelFr: labelFr.trim(), type });
    setKey('');
    setLabelFr('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 pb-8"
        style={{ backgroundColor: '#181818', borderTop: '1px solid #282828' }}
      >
        <h2 className="text-lg font-bold text-text-primary mb-5">
          {editCat ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        </h2>

        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setType('INCOME')}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all"
                style={{ backgroundColor: type === 'INCOME' ? '#1DB954' : '#212121', color: type === 'INCOME' ? '#FFFFFF' : '#808080' }}
              >
                Entrée
              </button>
              <button
                onClick={() => setType('EXPENSE')}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all"
                style={{ backgroundColor: type === 'EXPENSE' ? '#E51332' : '#212121', color: type === 'EXPENSE' ? '#FFFFFF' : '#808080' }}
              >
                Sortie
              </button>
            </div>
          </div>

          {/* Key */}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">Clé (identifiant)</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="ex: impot_formation"
              className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>

          {/* Label */}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">Libellé (français)</label>
            <input
              type="text"
              value={labelFr}
              onChange={(e) => setLabelFr(e.target.value)}
              placeholder="ex: Impôt de formation"
              className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#E51332' }}>{error}</p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#212121', color: '#B3B3B3' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}
          >
            {editCat ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTransaction, categories, orgUnits, events, addCategory } = useLocalStore();

  const initState = location.state as { compensateFor?: string; orgUnitId?: string; eventId?: string } | null;

  const [type, setType] = useState<TransactionType>('INCOME');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(getTodayStr());
  const [orgUnitId, setOrgUnitId] = useState(initState?.orgUnitId || '');
  const [eventId, setEventId] = useState(initState?.eventId || '');
  const [source, setSource] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const filteredCategories = categories.filter(c => c.type === type);
  const isExpense = type === 'EXPENSE';

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
  };

  const handleSubmit = (status: 'DRAFT' | 'PENDING') => {
    if (!amount || parseFloat(amount) <= 0) {
      showError('Veuillez entrer un montant valide');
      return;
    }
    if (!categoryId) {
      showError('Veuillez sélectionner une catégorie');
      return;
    }
    if (!description.trim()) {
      showError('Veuillez entrer une description');
      return;
    }
    if (description.length > 500) {
      showError('La description ne doit pas dépasser 500 caractères');
      return;
    }

    addTransaction({
      type,
      amount: parseFloat(amount) * 100,
      description: description.trim(),
      date,
      status,
      categoryId,
      orgUnitId: orgUnitId || undefined,
      eventId: eventId || undefined,
      source: source || undefined,
    });

    navigate('/finance');
  };

  const handleAddCategory = (cat: { key: string; labelFr: string; type: 'INCOME' | 'EXPENSE' }) => {
    addCategory(cat);
    // Auto-select the newly created category
    setTimeout(() => {
      const allCats = useLocalStore.getState().categories;
      const newCat = allCats.find(c => c.key === cat.key);
      if (newCat) setCategoryId(newCat.id);
    }, 100);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setShowCatModal(true);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader
        title={initState?.compensateFor ? 'Créer une correction' : 'Nouvelle transaction'}
        showBack
      />
      <div className="max-w-lg mx-auto px-5 pb-24">

        {initState?.compensateFor && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4" style={{ backgroundColor: '#FF6B0020' }}>
            <Clock className="w-4 h-4" style={{ color: '#FF6B00' }} />
            <p className="text-sm" style={{ color: '#FF8533' }}>
              Cette transaction corrigera une transaction approuvée existante.
            </p>
          </div>
        )}

        {/* Type Selector */}
        <div className="flex gap-3 mb-5">
          <button onClick={() => { setType('INCOME'); setCategoryId(''); }} className="flex-1 py-3.5 rounded-full text-sm font-semibold transition-all" style={{ backgroundColor: type === 'INCOME' ? '#1DB954' : '#212121', color: type === 'INCOME' ? '#FFFFFF' : '#808080' }}>Entrée</button>
          <button onClick={() => { setType('EXPENSE'); setCategoryId(''); }} className="flex-1 py-3.5 rounded-full text-sm font-semibold transition-all" style={{ backgroundColor: type === 'EXPENSE' ? '#E51332' : '#212121', color: type === 'EXPENSE' ? '#FFFFFF' : '#808080' }}>Sortie</button>
        </div>

        {/* Amount */}
        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Montant (FCFA)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full px-4 py-4 rounded-lg text-3xl font-black text-center tabular-nums outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828', color: isExpense ? '#E51332' : '#1DB954' }} min="0" />
        </div>

        {/* Date */}
        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={getTodayStr()} className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
        </div>

        {/* Category with + button */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-text-secondary text-sm font-medium">Catégorie</label>
            <button
              onClick={() => { setEditingCat(null); setShowCatModal(true); }}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full"
              style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}
            >
              <Plus className="w-3 h-3" />Ajouter
            </button>
          </div>
          <div className="relative">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none appearance-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <option value="">Sélectionner une catégorie</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.labelFr}{cat.isCustom ? ' (custom)' : ''}</option>
              ))}
            </select>
          </div>
          {filteredCategories.some(c => c.isCustom) && (
            <p className="text-text-tertiary text-xs mt-1">Les catégories custom sont marquées.</p>
          )}
        </div>

        {/* Group */}
        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Groupe (optionnel)</label>
          <select value={orgUnitId} onChange={(e) => setOrgUnitId(e.target.value)} className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none appearance-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <option value="">Aucun groupe</option>
            {orgUnits.map((unit) => (<option key={unit.id} value={unit.id}>{unit.name}</option>))}
          </select>
        </div>

        {/* Event */}
        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Événement (optionnel)</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none appearance-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <option value="">Aucun événement</option>
            {events.map((evt) => (<option key={evt.id} value={evt.id}>{evt.name}</option>))}
          </select>
        </div>

        {/* Fund Source */}
        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Origine des fonds (optionnel)</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'CAISSE', label: 'Caisse église', color: '#FF6B00' },
              { value: 'COTISATION', label: 'Cotisation', color: '#2196F3' },
              { value: 'PERSONNE', label: 'Personne', color: '#E91E63' },
              { value: 'AUTRE', label: 'Autre', color: '#808080' },
            ] as const).map((s) => (
              <button
                key={s.value}
                onClick={() => setSource(source === s.value ? '' : s.value)}
                className="py-2.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: source === s.value ? s.color + '20' : '#212121',
                  border: source === s.value ? `2px solid ${s.color}` : '1px solid #282828',
                  color: source === s.value ? s.color : '#808080',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-text-secondary text-sm font-medium mb-2">
            Description <span className="text-text-tertiary">({description.length}/500)</span>
          </label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez la transaction..." maxLength={500} className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none resize-none" style={{ backgroundColor: '#212121', border: '1px solid #282828', minHeight: '80px' }} rows={3} />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mb-6">
          <button onClick={() => handleSubmit('DRAFT')} className="flex-1 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>Enregistrer</button>
          <button onClick={() => handleSubmit('PENDING')} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
            <CheckCircle className="w-4 h-4" />Soumettre
          </button>
        </div>
      </div>

      {/* Error Modal */}
      <ConfirmModal
        open={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onConfirm={() => setShowErrorModal(false)}
        title="Erreur"
        description={errorMsg}
        confirmLabel="Compris"
        confirmVariant="primary"
      />

      {/* Category Modal */}
      <CategoryModal
        open={showCatModal}
        onClose={() => setShowCatModal(false)}
        onSave={handleAddCategory}
        editCat={editingCat}
      />
    </div>
  );
}
