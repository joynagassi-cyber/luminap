import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Check, Edit3, Trash2, X, Users, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import TransactionCard from '@/components/TransactionCard';
import { FullPageSkeleton, ListSkeleton } from '@/components/Skeleton';

type Tab = 'transactions' | 'historique' | 'parametres';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgUnits, caisses, transactions, createGroup, updateGroup, deleteGroup, isLoading } = useLocalStore();
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const orgUnit = orgUnits.find(o => o.id === id);
  const caisse = caisses.find(c => c.id === id);

  if (isLoading || !orgUnit || !caisse) return <FullPageSkeleton />;

  const txs = transactions.filter(t => t.sourceCaisseId === caisse.id);
  const approvedTxs = txs.filter(t => t.status === 'APPROVED');
  const income = approvedTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expense = approvedTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const pendingCount = txs.filter(t => t.status === 'PENDING').length;
  const pendingAmount = txs.filter(t => t.status === 'PENDING').reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0);

  const handleVersement = () => {
    navigate('/versement', { state: { caisseId: caisse.id, defaultAmount: balance } });
  };

  const handleUpdate = async () => {
    if (!editName.trim()) { setError('Le nom est requis'); return; }
    await updateGroup(id!, { name: editName.trim(), description: editDesc.trim() });
    setShowEdit(false);
    setSuccess('Groupe modifié');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async () => {
    try {
      await deleteGroup(id!);
      navigate('/groups');
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title={orgUnit.name} />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate('/groups')} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Success/Error */}
        {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>{error}</div>}
        {success && <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#1DB95420', color: '#1DB954' }}>{success}</div>}

        {/* Hero Card */}
        <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: '#212121', border: `1px solid ${caisse.color}30` }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: caisse.color + '20' }}>
              <Wallet className="w-6 h-6" style={{ color: caisse.color }} />
            </div>
            <div className="flex-1">
              <p className="text-text-primary font-bold text-lg">{caisse.name}</p>
              <p className="text-text-tertiary text-xs">{caisse.description}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: caisse.color + '15', color: caisse.color }}>Caisse</span>
          </div>

          <div className="h-px mb-4" style={{ backgroundColor: '#282828' }} />

          <div className="text-center mb-4">
            <p className="text-text-tertiary text-xs mb-1">Solde actuel</p>
            <p className="text-3xl font-black" style={{ color: balance >= 0 ? '#1DB954' : '#E51332' }}>
              {balance >= 0 ? '' : '-'}{formatCurrencyCompact(Math.abs(balance))}
              <span className="text-text-tertiary text-base font-medium ml-1">FCFA</span>
            </p>
            {pendingAmount !== 0 && (
              <p className="text-xs mt-1" style={{ color: '#FFB800' }}>
                {pendingAmount > 0 ? '+' : ''}{formatCurrencyCompact(Math.abs(pendingAmount))} FCFA en attente
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1DB95420' }}>
                <TrendingUp className="w-3 h-3" style={{ color: '#1DB954' }} />
              </div>
              <span className="text-text-tertiary">Entrées: <span style={{ color: '#1DB954' }}>+{formatCurrencyCompact(income)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
                <TrendingDown className="w-3 h-3 rotate-180" style={{ color: '#E51332' }} />
              </div>
              <span className="text-text-tertiary">Sorties: <span style={{ color: '#E51332' }}>-{formatCurrencyCompact(expense)}</span></span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => navigate('/transaction/new', { state: { caisseId: caisse.id, type: 'INCOME' } })}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ backgroundColor: '#1DB95420', color: '#1DB954', border: '1px solid #1DB95440' }}
          >
            <ArrowUp className="w-4 h-4" /> Entrée
          </button>
          <button
            onClick={() => navigate('/transaction/new', { state: { caisseId: caisse.id, type: 'EXPENSE' } })}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ backgroundColor: '#E5133220', color: '#E51332', border: '1px solid #E5133240' }}
          >
            <ArrowDown className="w-4 h-4" /> Sortie
          </button>
          {balance > 0 && (
            <button
              onClick={handleVersement}
              className="px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)', color: '#fff' }}
            >
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: '#212121' }}>
          {([
            { id: 'transactions' as Tab, label: 'Transactions', icon: Wallet },
            { id: 'historique' as Tab, label: 'Historique', icon: Clock },
            { id: 'parametres' as Tab, label: 'Paramètres', icon: Edit3 },
          ]).map(({ id: tabId, label, icon: TabIcon }) => (
            <button key={tabId} onClick={() => setActiveTab(tabId)} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5" style={activeTab === tabId ? { backgroundColor: '#FF6B00', color: '#fff' } : { color: '#808080' }}>
              <TabIcon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'transactions' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-primary font-semibold text-sm">Transactions récentes</p>
              <button onClick={() => navigate('/finance', { state: { caisseId: caisse.id } })} className="text-xs font-medium" style={{ color: '#FF6B00' }}>Tout voir</button>
            </div>
            <div className="space-y-2">
              {txs.filter(t => t.status === 'APPROVED' || t.status === 'PENDING')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((tx) => (
                  <TransactionCard key={tx.id} transaction={tx} onPress={(id) => navigate(`/transaction/${id}`)} />
                ))}
              {txs.length === 0 && (
                <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#212121' }}>
                  <Wallet className="w-8 h-8 mx-auto mb-3 text-text-tertiary opacity-40" />
                  <p className="text-text-tertiary text-sm">Aucune transaction</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'historique' && (
          <div className="space-y-2">
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#212121' }}>
              <Users className="w-6 h-6 mx-auto mb-2 text-text-tertiary opacity-40" />
              <p className="text-text-tertiary text-sm">Historique du groupe</p>
              <p className="text-text-tertiary text-xs mt-1">Créé le {formatDate(caisse.createdAt)}</p>
            </div>
          </div>
        )}

        {activeTab === 'parametres' && (
          <div className="space-y-3">
            {showEdit ? (
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#212121' }}>
                <div>
                  <label className="text-text-tertiary text-xs mb-1.5 block">Nom</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-text-primary text-sm outline-none" style={{ backgroundColor: '#181818', border: '1px solid #282828' }} />
                </div>
                <div>
                  <label className="text-text-tertiary text-xs mb-1.5 block">Description</label>
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="w-full px-4 py-2.5 rounded-xl text-text-primary text-sm outline-none resize-none" style={{ backgroundColor: '#181818', border: '1px solid #282828' }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleUpdate} className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: '#FF6B00' }}>Sauvegarder</button>
                  <button onClick={() => setShowEdit(false)} className="flex-1 py-2.5 rounded-full text-sm font-medium" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>Annuler</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowEdit(true); setEditName(orgUnit.name); setEditDesc(orgUnit.description); }} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
                  <Edit3 className="w-5 h-5" style={{ color: '#FF6B00' }} />
                </div>
                <span className="text-text-primary text-sm font-medium">Modifier le groupe</span>
              </button>
            )}

            <button onClick={() => setShowDelete(true)} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
                <Trash2 className="w-5 h-5" style={{ color: '#E51332' }} />
              </div>
              <span className="text-[#E51332] text-sm font-medium">Supprimer le groupe</span>
            </button>
          </div>
        )}
      </div>
      <BottomNav />

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" onClick={() => setShowDelete(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-sm rounded-2xl p-5 text-center" style={{ backgroundColor: '#181818' }} onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#E5133220' }}>
              <Trash2 className="w-6 h-6 text-[#E51332]" />
            </div>
            <h3 className="text-text-primary font-bold text-lg mb-2">Supprimer {orgUnit.name} ?</h3>
            <p className="text-text-tertiary text-sm mb-6">Cette action est irréversible. La caisse et toutes les données associées seront supprimées.</p>
            <button onClick={handleDelete} className="w-full py-3.5 rounded-full font-semibold text-white mb-3" style={{ backgroundColor: '#E51332' }}>Supprimer</button>
            <button onClick={() => setShowDelete(false)} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary" style={{ backgroundColor: '#212121' }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
