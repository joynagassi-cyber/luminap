import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function EventNew() {
  const navigate = useNavigate();
  const { addEvent } = useLocalStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await addEvent({
      orgId: 'org-1',
      name,
      description,
      startDate,
      endDate: endDate || null,
      status: 'PLANIFIED',
      budget: Math.round(parseFloat(budget || '0') * 100),
    });
    navigate('/events');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Nouvel événement" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <h1 className="text-text-primary font-bold text-xl mb-6">Nouvel événement</h1>

        <div className="space-y-4">
          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Nom</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Fête des tabernacles" className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>
          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optionnel..." rows={3} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none resize-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>
          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Date début</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>
          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Date fin (optionnel)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>
          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Budget (FCFA)</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>
        </div>

        <button onClick={handleSubmit} className="w-full mt-6 py-4 rounded-full font-semibold text-white transition-all active:scale-95" style={{ backgroundColor: '#FF6B00' }}>
          Créer l'événement
        </button>
        <button onClick={() => navigate(-1)} className="w-full mt-3 py-3 rounded-full font-medium text-text-tertiary text-sm" style={{ backgroundColor: '#212121' }}>
          Annuler
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
