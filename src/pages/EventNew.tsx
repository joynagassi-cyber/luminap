import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, DollarSign, FileText } from 'lucide-react';
import { getTodayStr } from '@/lib/utils';
import { useLocalStore } from '@/store/useLocalStore';
import ConfirmModal from '@/components/ConfirmModal';
import TopHeader from '@/components/TopHeader';

export default function EventNew() {
  const navigate = useNavigate();
  const { addEvent } = useLocalStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { showError('Le nom de l\'événement est requis'); return; }
    if (!budget || parseFloat(budget) <= 0) { showError('Veuillez entrer un budget valide'); return; }

    await addEvent({
      name: name.trim(),
      description: description.trim(),
      startDate,
      endDate: endDate || undefined,
      budget: parseFloat(budget) * 100,
    });
    navigate('/events');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Nouvel événement" showBack />
      <div className="max-w-lg mx-auto px-5 pb-24">

        {/* Name */}
        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Nom de l'événement *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Convention 2026"
            className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none"
            style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="mb-5">
          <label className="block text-text-secondary text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description de l'événement..."
            className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none resize-none"
            style={{ backgroundColor: '#212121', border: '1px solid #282828', minHeight: '80px' }}
            rows={3}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">Date début *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">Date fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>
        </div>

        {/* Budget */}
        <div className="mb-6">
          <label className="block text-text-secondary text-sm font-medium mb-2">Budget prévisionnel (FCFA) *</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-3 rounded-lg text-2xl font-bold text-center tabular-nums outline-none"
            style={{ backgroundColor: '#212121', border: '1px solid #282828', color: '#FF6B00' }}
            min="0"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-full font-semibold text-base text-white transition-all active:scale-95"
          style={{ backgroundColor: '#FF6B00' }}
        >
          <Calendar className="w-5 h-5" />Créer l'événement
        </button>
      </div>

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
