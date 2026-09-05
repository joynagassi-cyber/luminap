import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowLeft, Wallet, Calendar } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { generateId } from '@/lib/utils';

export default function TransactionNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { categories, orgUnits, caisses, accounts, events, addTransaction } = useLocalStore();
  const preselectedCaisse = (location.state as any)?.caisseId || '';
  const preselectedType = (location.state as any)?.type || '';
  const preselectedEvent = (location.state as any)?.eventId || '';

  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(preselectedType as any || 'INCOME');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [orgUnitId, setOrgUnitId] = useState('');
  const [sourceCaisseId, setSourceCaisseId] = useState(preselectedCaisse || 'main');
  const [source, setSource] = useState<'CAISSE' | 'COTISATION' | 'PERSONNE' | 'AUTRE'>('CAISSE');
  const [personName, setPersonName] = useState('');
  const [eventId, setEventId] = useState(preselectedEvent);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const filteredCategories = categories.filter(c => c.type === type);

  // When org unit changes, auto-set source caisse
  const handleOrgUnitChange = (ouId: string) => {
    setOrgUnitId(ouId);
    if (ouId) {
      const account = accounts.find(a => a.id === ouId);
      if (account) setSourceCaisseId(account.id);
    } else {
      setSourceCaisseId('main');
    }
  };

  const handleSubmit = async () => {
    if (!amount || !description || !categoryId) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setError('');
    const sessionId = localStorage.getItem('lumina-session') || 'local-user';
    const isExpense = type === 'EXPENSE';

    await addTransaction({
      orgId: 'org-1',
      type,
      amount: Math.round(parseFloat(amount) * 100),
      description,
      date,
      status: isExpense ? 'PENDING' : 'DRAFT',
      categoryId,
      orgUnitId: orgUnitId || null,
      sourceCaisseId: sourceCaisseId || 'main',
      eventId: eventId || null,
      source: source || 'CAISSE',
      personName: source === 'PERSONNE' ? personName || null : null,
      compensatesFor: null,
      comment: comment || null,
      createdById: sessionId,
      approvedById: null,
      approvedAt: null,
      versementId: null,
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Nouvelle transaction" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>{error}</div>
        )}

        <h1 className="text-text-primary font-bold text-xl mb-5">Nouvelle transaction</h1>

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
            <label className="text-text-tertiary text-xs mb-1.5 block">Montant (FCFA) *</label>
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
            <label className="text-text-tertiary text-xs mb-1.5 block">Description *</label>
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
            <label className="text-text-tertiary text-xs mb-1.5 block">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Catégorie *</label>
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

          {/* Source selector */}
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Source</label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { id: 'CAISSE' as const, label: 'Caisse' },
                { id: 'COTISATION' as const, label: 'Cotisation' },
                { id: 'PERSONNE' as const, label: 'Personne' },
                { id: 'AUTRE' as const, label: 'Autre' },
              ]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSource(id)}
                  className="py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={source === id ? { backgroundColor: '#FF6B0020', color: '#FF6B00', border: '1px solid #FF6B00' } : { backgroundColor: '#212121', color: '#808080', border: '1px solid #282828' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Person name (only for PERSONNE source) */}
          {source === 'PERSONNE' && (
            <div>
              <label className="text-text-tertiary text-xs mb-1.5 block">Nom de la personne</label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Ex: Jean Mbarga"
                className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              />
            </div>
          )}

          {/* Group selector */}
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Groupe</label>
            <select
              value={orgUnitId}
              onChange={(e) => handleOrgUnitChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            >
              <option value="">— Principal —</option>
              {orgUnits.map((ou) => (
                <option key={ou.id} value={ou.id}>{ou.name}</option>
              ))}
            </select>
          </div>

          {/* Event selector */}
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Événement (optionnel)</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            >
              <option value="">— Aucun —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>

          {/* Comment */}
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Commentaire (optionnel)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Notes..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none resize-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
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
