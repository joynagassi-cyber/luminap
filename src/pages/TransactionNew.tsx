import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function TransactionNew() {
  const navigate = useNavigate();
  const { categories, orgUnits, caisses, addTransaction } = useLocalStore();
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [orgUnitId, setOrgUnitId] = useState('');
  const [sourceCaisseId, setSourceCaisseId] = useState('main');

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = async () => {
    if (!amount || !description || !categoryId) return;
    await addTransaction({
      orgId: 'org-1',
      type,
      amount: Math.round(parseFloat(amount) * 100),
      description,
      date,
      status: 'DRAFT',
      categoryId,
      orgUnitId: orgUnitId || null,
      sourceCaisseId,
      eventId: null,
      source: null,
      personName: null,
      compensatesFor: null,
      comment: null,
      createdById: 'local-user',
      approvedById: null,
      approvedAt: null,
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Nouvelle transaction" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
            <ArrowDownRight className="w-4 h-4 text-text-primary rotate-90" />
          </button>
          <h1 className="text-text-primary font-bold text-lg">Nouvelle transaction</h1>
        </div>

        {/* Type toggle */}
        <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: '#212121' }}>
          <button onClick={() => setType('INCOME')} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all" style={type === 'INCOME' ? { backgroundColor: '#1DB954', color: '#fff' } : { color: '#808080' }}>
            Entrée
          </button>
          <button onClick={() => setType('EXPENSE')} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all" style={type === 'EXPENSE' ? { backgroundColor: '#E51332', color: '#fff' } : { color: '#808080' }}>
            Sortie
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Montant (FCFA)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3.5 rounded-xl text-text-primary text-lg font-bold outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Dîme du dimanche"
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Catégorie</label>
            <div className="grid grid-cols-3 gap-2">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className="py-2 px-2 rounded-lg text-xs font-medium transition-all text-center"
                  style={categoryId === cat.id
                    ? { backgroundColor: type === 'INCOME' ? '#1DB95420' : '#E5133220', color: type === 'INCOME' ? '#1DB954' : '#E51332', border: '1px solid' }
                    : { backgroundColor: '#212121', color: '#808080', border: '1px solid #282828' }
                  }
                >
                  {cat.labelFr}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Groupe</label>
            <select
              value={orgUnitId}
              onChange={(e) => { setOrgUnitId(e.target.value); setSourceCaisseId(e.target.value || 'main'); }}
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            >
              <option value="">— Principal —</option>
              {orgUnits.map((ou) => (
                <option key={ou.id} value={ou.id}>{ou.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Caisse source</label>
            <select
              value={sourceCaisseId}
              onChange={(e) => setSourceCaisseId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            >
              {caisses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full mt-6 py-4 rounded-full font-semibold text-white transition-all active:scale-95"
          style={{ backgroundColor: type === 'INCOME' ? '#1DB954' : '#E51332' }}
        >
          {type === 'INCOME' ? 'Enregistrer l\'entrée' : 'Enregistrer la sortie'}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full mt-3 py-3 rounded-full font-medium text-text-tertiary text-sm transition-all"
          style={{ backgroundColor: '#212121' }}
        >
          Annuler
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
