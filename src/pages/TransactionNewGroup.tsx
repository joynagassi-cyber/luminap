import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { useTransactions, useCategories, useAccounts, useCaisses } from '@/lib/dataLayer';
import { ArrowLeft, Wallet } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import type { Category } from '@/types';

export default function TransactionNewGroup() {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { categories: idbCats, addTransaction, caisses: idbCaisses, accounts: idbAccounts } = useLocalStore();

  // PowerSync with fallback
  const { data: psCategories } = useCategories();
  const { data: psAccounts } = useAccounts();
  const { data: psCaisses } = useCaisses();

  const categories = psCategories ?? idbCats;
  const accounts = psAccounts ?? idbAccounts;
  const caisses = psCaisses ?? idbCaisses;

  const groupAccount = accounts.find((a: any) => a.id === groupId);
  const caisse = caisses.find((c: any) => c.id === groupId);
  const queryType = (location.state as any)?.type || 'INCOME';

  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(queryType as any);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [source, setSource] = useState<'CAISSE' | 'COTISATION' | 'PERSONNE' | 'AUTRE'>('CAISSE');
  const [personName, setPersonName] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const validateAmount = (val: string): string => {
    const num = parseFloat(val);
    if (!val) return '';
    if (isNaN(num) || num <= 0) return 'Le montant doit être supérieur à 0';
    if (num > 999999999) return 'Montant maximum atteint';
    return '';
  };
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  useEffect(() => {
    setFilteredCategories(categories.filter((c: any) => c.type === type));
  }, [type, categories]);

  const handleSubmit = async () => {
    const trimmedAmount = amount.trim();
    const trimmedDesc = description.trim();
    const trimmedCatId = categoryId?.toString().trim();

    if (!trimmedAmount || !trimmedDesc || !trimmedCatId) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setError('');
    setSubmitting(true);
    const sessionId = localStorage.getItem('lumina-session') || 'local-user';
    const isExpense = type === 'EXPENSE';

    await addTransaction({
      orgId: getOrganizationId(),
      type,
      amount: Math.round(parseFloat(amount) * 100),
      description,
      date,
      status: isExpense ? 'PENDING' : 'DRAFT',
      categoryId,
      orgUnitId: null,
      sourceCaisseId: groupId || 'main',
      eventId: null,
      source: source || 'CAISSE',
      personName: source === 'PERSONNE' ? personName || null : null,
      compensatesFor: null,
      comment: comment || null,
      createdById: sessionId,
      approvedById: null,
      approvedAt: null,
      versementId: null,
      reversalOfId: null,
    });
    navigate(`/groups/${groupId}`);
  };

  return (
    <div className="h-screen bg-canvas flex flex-col overflow-hidden">
      <TopHeader title="Nouvelle transaction" />
      <div className="flex-1 overflow-y-auto px-5 pt-16 pb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Group info */}
        {groupAccount && (
          <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs mb-1">Groupe</p>
            <p className="text-text-primary font-semibold">{groupAccount.name}</p>
          </div>
        )}

        {/* Type selector */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setType('INCOME')}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ backgroundColor: type === 'INCOME' ? '#1DB954' : '#212121', color: type === 'INCOME' ? '#fff' : '#B3B3B3' }}
          >
            Entrée
          </button>
          <button
            onClick={() => setType('EXPENSE')}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ backgroundColor: type === 'EXPENSE' ? '#E51332' : '#212121', color: type === 'EXPENSE' ? '#fff' : '#B3B3B3' }}
          >
            Sortie
          </button>
        </div>

        {/* Amount */}
        <div className="mb-5">
          <label className="text-text-tertiary text-xs mb-2 block">Montant (FCFA)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-4 rounded-xl text-2xl font-bold outline-none text-center"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          />
        </div>

        {/* Description */}
        <div className="mb-5">
          <label className="text-text-tertiary text-xs mb-2 block">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Dîme du groupe"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          />
        </div>

        {/* Date */}
        <div className="mb-5">
          <label className="text-text-tertiary text-xs mb-2 block">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          />
        </div>

        {/* Category */}
        <div className="mb-5">
          <label className="text-text-tertiary text-xs mb-2 block">Catégorie</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          >
            <option value="">Sélectionner une catégorie</option>
            {filteredCategories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.label_fr || cat.label}</option>
            ))}
          </select>
        </div>

        {/* Source */}
        <div className="mb-5">
          <label className="text-text-tertiary text-xs mb-2 block">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as any)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          >
            <option value="CAISSE">Caisse</option>
            <option value="COTISATION">Cotisation</option>
            <option value="PERSONNE">Personne</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>

        {/* Person name */}
        {source === 'PERSONNE' && (
          <div className="mb-5">
            <label className="text-text-tertiary text-xs mb-2 block">Nom de la personne</label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Nom de la personne"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
            />
          </div>
        )}

        {/* Comment */}
        <div className="mb-6">
          <label className="text-text-tertiary text-xs mb-2 block">Commentaire (optionnel)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm text-center" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: type === 'INCOME' ? '#1DB954' : '#E51332' }}
        >
          {submitting ? 'Enregistrement...' : 'Enregistrer la transaction'}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
