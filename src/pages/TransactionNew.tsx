import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { getTodayStr } from '@/lib/utils';
import { useLocalStore } from '@/store/useLocalStore';
import ConfirmModal from '@/components/ConfirmModal';
import type { TransactionType } from '@/types';

export default function TransactionNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTransaction, categories, orgUnits } = useLocalStore();

  const initState = location.state as { compensateFor?: string } | null;

  const [type, setType] = useState<TransactionType>('INCOME');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(getTodayStr());
  const [orgUnitId, setOrgUnitId] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

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
    });

    navigate('/finance');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">
            {initState?.compensateFor ? 'Créer une correction' : 'Nouvelle transaction'}
          </h1>
        </div>

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

        {/* Category */}
        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Catégorie</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none appearance-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <option value="">Sélectionner une catégorie</option>
            {filteredCategories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.labelFr}</option>))}
          </select>
        </div>

        {/* Group */}
        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Groupe (optionnel)</label>
          <select value={orgUnitId} onChange={(e) => setOrgUnitId(e.target.value)} className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none appearance-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <option value="">Aucun groupe</option>
            {orgUnits.map((unit) => (<option key={unit.id} value={unit.id}>{unit.name}</option>))}
          </select>
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
    </div>
  );
}
