import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowUpRight, ArrowDownRight, X, Wallet, User } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function TransactionEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transactions, categories, orgUnits, caisses, events, updateTransaction } = useLocalStore();
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [orgUnitId, setOrgUnitId] = useState('');
  const [sourceCaisseId, setSourceCaisseId] = useState('main');
  const [source, setSource] = useState<'CAISSE' | 'COTISATION' | 'PERSONNE' | 'AUTRE'>('CAISSE');
  const [personName, setPersonName] = useState('');
  const [eventId, setEventId] = useState('');
  const [compensatesFor, setCompensatesFor] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      setType(tx.type);
      setAmount(Math.round(tx.amount / 100).toString());
      setDescription(tx.description);
      setDate(tx.date.split('T')[0]);
      setCategoryId(tx.categoryId);
      setOrgUnitId(tx.orgUnitId || '');
      setSourceCaisseId(tx.sourceCaisseId || 'main');
      setSource(tx.source || 'CAISSE');
      setPersonName(tx.personName || '');
      setEventId(tx.eventId || '');
      setCompensatesFor(tx.compensatesFor || '');
      setComment(tx.comment || '');
    }
  }, [id, transactions]);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleOrgUnitChange = (ouId: string) => {
    setOrgUnitId(ouId);
    if (ouId) {
      const caisse = caisses.find(c => c.id === ouId);
      if (caisse) setSourceCaisseId(caisse.id);
    } else {
      setSourceCaisseId('main');
    }
  };

  const handleSubmit = async () => {
    if (!amount || !description || !categoryId) return;
    await updateTransaction(id!, {
      type,
      amount: Math.round(parseFloat(amount) * 100),
      description,
      date,
      categoryId,
      orgUnitId: orgUnitId || null,
      sourceCaisseId,
      source,
      personName: source === 'PERSONNE' ? personName || null : null,
      eventId: eventId || null,
      compensatesFor: compensatesFor || null,
      comment: comment || null,
    });
    navigate(`/transaction/${id}`);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Modifier" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm">
            <ArrowUpRight className="w-4 h-4 rotate-180" /> Retour
          </button>
          <h1 className="text-text-primary font-bold text-lg">Modifier</h1>
          <div className="w-16" />
        </div>

        <div className="space-y-4">
          <div className="flex rounded-xl p-1" style={{ backgroundColor: '#212121' }}>
            <button onClick={() => setType('INCOME')} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all" style={type === 'INCOME' ? { backgroundColor: '#1DB954', color: '#fff' } : { color: '#808080' }}>Entrée</button>
            <button onClick={() => setType('EXPENSE')} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all" style={type === 'EXPENSE' ? { backgroundColor: '#E51332', color: '#fff' } : { color: '#808080' }}>Sortie</button>
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Montant (FCFA)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full px-4 py-3.5 rounded-xl text-text-primary text-lg font-bold outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Dîme du dimanche" className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Catégorie</label>
            <div className="grid grid-cols-3 gap-2">
              {filteredCategories.map((cat) => (
                <button key={cat.id} onClick={() => setCategoryId(cat.id)} className="py-2 px-2 rounded-lg text-xs font-medium transition-all text-center" style={categoryId === cat.id ? { backgroundColor: type === 'INCOME' ? '#1DB95420' : '#E5133220', color: type === 'INCOME' ? '#1DB954' : '#E51332', border: '1px solid' } : { backgroundColor: '#212121', color: '#808080', border: '1px solid #282828' }}>
                  {cat.labelFr}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Source</label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { id: 'CAISSE' as const, label: 'Caisse' },
                { id: 'COTISATION' as const, label: 'Cotisation' },
                { id: 'PERSONNE' as const, label: 'Personne' },
                { id: 'AUTRE' as const, label: 'Autre' },
              ]).map(({ id, label }) => (
                <button key={id} onClick={() => setSource(id)} className="py-2.5 rounded-xl text-xs font-medium transition-all" style={source === id ? { backgroundColor: '#FF6B0020', color: '#FF6B00', border: '1px solid #FF6B00' } : { backgroundColor: '#212121', color: '#808080', border: '1px solid #282828' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {source === 'PERSONNE' && (
            <div>
              <label className="text-text-tertiary text-xs mb-2 block">Nom de la personne</label>
              <input type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Ex: Jean Mbarga" className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
            </div>
          )}

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Groupe</label>
            <select value={orgUnitId} onChange={(e) => handleOrgUnitChange(e.target.value)} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <option value="">— Principal —</option>
              {orgUnits.map((ou) => (<option key={ou.id} value={ou.id}>{ou.name}</option>))}
            </select>
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Caisse source</label>
            <select value={sourceCaisseId} onChange={(e) => setSourceCaisseId(e.target.value)} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              {caisses.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Événement (optionnel)</label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <option value="">— Aucun —</option>
              {events.map((ev) => (<option key={ev.id} value={ev.id}>{ev.name}</option>))}
            </select>
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Compense une transaction (optionnel)</label>
            <input type="text" value={compensatesFor} onChange={(e) => setCompensatesFor(e.target.value)} placeholder="Référence ou description" className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-2 block">Commentaire</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optionnel..." rows={2} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none resize-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
          </div>
        </div>

        <button onClick={handleSubmit} className="w-full mt-6 py-4 rounded-full font-semibold text-white transition-all active:scale-95" style={{ backgroundColor: type === 'INCOME' ? '#1DB954' : '#E51332' }}>
          Enregistrer
        </button>
        <button onClick={() => navigate(-1)} className="w-full mt-3 py-3 rounded-full font-medium text-text-tertiary text-sm" style={{ backgroundColor: '#212121' }}>
          Annuler
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
