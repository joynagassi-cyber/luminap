import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getTodayStr } from '@/lib/utils';
import { useSupabaseStore, canActOnTransaction } from '@/store/useSupabaseStore';
import ConfirmModal from '@/components/ConfirmModal';
import type { TransactionType } from '@/types';
import type { Transaction } from '@/types';

export default function TransactionEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { transactions, categories, orgUnits, updateTransaction, user } = useSupabaseStore();

  const transaction = transactions.find(t => t.id === id);
  const [type, setType] = useState<TransactionType>(transaction?.type || 'INCOME');
  const [amount, setAmount] = useState(transaction ? (transaction.amount / 100).toString() : '');
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '');
  const [date, setDate] = useState(transaction?.date || getTodayStr());
  const [orgUnitId, setOrgUnitId] = useState(transaction?.orgUnitId || '');
  const [description, setDescription] = useState(transaction?.description || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  if (!transaction) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-text-tertiary mb-4">Transaction introuvable</p>
          <button onClick={() => navigate('/finance')} className="px-5 py-3 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  const canEdit = canActOnTransaction(transaction, 'edit', user);
  if (!canEdit) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-5 py-12">
        <div className="text-center">
          <p className="text-text-tertiary mb-4">Vous n'avez pas les droits nécessaires pour modifier cette transaction.</p>
          <button onClick={() => navigate(`/transaction/${id}`)} className="px-5 py-3 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
            Retour au détail
          </button>
        </div>
      </div>
    );
  }

  const filteredCategories = categories.filter(c => c.type === type);
  const isExpense = type === 'EXPENSE';

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
  };

  const handleSave = () => {
    if (!amount || parseFloat(amount) <= 0) {
      showError('Veuillez entrer un montant valide');
      return;
    }
    if (!categoryId) {
      showError('Veuillez sélectionner une catégorie');
      return;
    }
    updateTransaction(id!, {
      type,
      amount: Math.round(parseFloat(amount) * 100),
      description: description.trim(),
      date,
      categoryId,
      orgUnitId: orgUnitId || null,
    });
    navigate(`/transaction/${id}`);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-4 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Modifier la transaction</h1>
        </div>

        <div className="flex gap-3 mb-5">
          <button onClick={() => { setType('INCOME'); setCategoryId(''); }} className="flex-1 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: type === 'INCOME' ? '#1DB954' : '#212121', color: type === 'INCOME' ? '#FFFFFF' : '#808080' }}>Entrée</button>
          <button onClick={() => { setType('EXPENSE'); setCategoryId(''); }} className="flex-1 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: type === 'EXPENSE' ? '#E51332' : '#212121', color: type === 'EXPENSE' ? '#FFFFFF' : '#808080' }}>Sortie</button>
        </div>

        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Montant (FCFA)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full px-4 py-4 rounded-lg text-3xl font-black text-center tabular-nums outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828', color: isExpense ? '#E51332' : '#1DB954' }} min="0" />
        </div>

        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={getTodayStr()} className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
        </div>

        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Catégorie</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none appearance-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <option value="">Sélectionner</option>
            {filteredCategories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.labelFr}</option>))}
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Groupe (optionnel)</label>
          <select value={orgUnitId} onChange={(e) => setOrgUnitId(e.target.value)} className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none appearance-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <option value="">Aucun</option>
            {orgUnits.map((unit) => (<option key={unit.id} value={unit.id}>{unit.name}</option>))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-text-secondary text-sm font-medium mb-2">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none resize-none" style={{ backgroundColor: '#212121', border: '1px solid #282828', minHeight: '80px' }} rows={3} />
        </div>

        <div className="flex gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="flex-1 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>Annuler</button>
          <button onClick={handleSave} className="flex-1 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>Enregistrer</button>
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
