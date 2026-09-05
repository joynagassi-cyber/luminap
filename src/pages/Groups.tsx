import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { Users, Plus, X, Palette, Edit3, Trash2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { FullPageSkeleton } from '@/components/Skeleton';
import { getRoleLabel } from '@/store/useLocalStore';

const COLOR_PALETTE = ['#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#EF4444', '#22C55E', '#6366F1', '#F97316', '#06B6D4'];
const GROUP_TYPES = ['groupe', 'commission', 'comité', 'diaconie', 'service'];

export default function Groups() {
  const navigate = useNavigate();
  const { orgUnits, caisses, accounts, createGroup, updateGroup, deleteGroup, isLoading, appConfig, user } = useLocalStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState('groupe');
  const [createDesc, setCreateDesc] = useState('');
  const [createColor, setCreateColor] = useState(COLOR_PALETTE[0]);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreate = async () => {
    if (!createName.trim()) { setError('Le nom est requis'); return; }
    setError('');
    try {
      await createGroup({ name: createName.trim(), type: createType, description: createDesc.trim(), color: createColor });
      setCreateName(''); setCreateType('groupe'); setCreateDesc(''); setCreateColor(COLOR_PALETTE[0]);
      setShowCreate(false);
      setSuccess('Groupe créé avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) { setError('Le nom est requis'); return; }
    setError('');
    await updateGroup(id, { name: editName.trim(), description: editDesc.trim() });
    setShowEdit(null);
    setSuccess('Groupe modifié');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      await deleteGroup(id);
      setShowDelete(null);
      setSuccess('Groupe supprimé');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la suppression');
    }
  };

  if (isLoading) return <FullPageSkeleton />;

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Groupes" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-text-primary font-bold text-xl">Groupes</h1>
            <p className="text-text-tertiary text-xs mt-0.5">{orgUnits.length} groupe{orgUnits.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' }}
          >
            <Plus className="w-4 h-4" /> Créer
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#E5133220', color: '#E51332', border: '1px solid #E5133240' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#1DB95420', color: '#1DB954', border: '1px solid #1DB95440' }}>
            {success}
          </div>
        )}

        {/* Groups list */}
        <div className="space-y-3">
          {orgUnits.map((ou) => {
            const account = accounts.find(a => a.id === ou.id);
            const caisse = useLocalStore.getState().getCaisseForDisplay(ou.id);
            const color = caisse?.color || '#808080';
            return (
              <div key={ou.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                <div
                  onClick={() => navigate(`/groups/${ou.id}`)}
                  className="w-full text-left p-4 flex items-center gap-4 transition-all active:scale-98 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
                    <Users className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-semibold">{ou.name}</p>
                    <p className="text-text-tertiary text-xs mt-0.5">{caisse?.description || account?.name || ou.description || 'Pas de description'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '15', color }}>{ou.type}</span>
                      {!ou.isActive && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#80808020', color: '#808080' }}>Inactif</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 px-4 pb-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowEdit(ou.id); setEditName(ou.name); setEditDesc(ou.description); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
                    style={{ backgroundColor: '#282828' }}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-text-tertiary" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDelete(ou.id); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
                    style={{ backgroundColor: '#E5133220' }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#E51332]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {orgUnits.length === 0 && (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Users className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
            <p className="text-text-tertiary text-sm mb-2">Aucun groupe</p>
            <p className="text-text-tertiary text-xs">Créez votre premier groupe organisationnel</p>
          </div>
        )}
      </div>
      <BottomNav />

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-lg rounded-t-2xl p-5 pb-8"
            style={{ backgroundColor: '#181818' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-text-primary font-bold text-lg">Nouveau groupe</h2>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-text-tertiary text-xs mb-2 block">Nom du groupe *</label>
                <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Ex: Jeunesse du secteur" className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
              </div>
              <div>
                <label className="text-text-tertiary text-xs mb-2 block">Type</label>
                <div className="flex flex-wrap gap-2">
                  {GROUP_TYPES.map((t) => (
                    <button key={t} onClick={() => setCreateType(t)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={createType === t ? { backgroundColor: '#FF6B00', color: '#fff' } : { backgroundColor: '#212121', color: '#808080', border: '1px solid #282828' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-text-tertiary text-xs mb-2 block">Description</label>
                <textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Optionnel..." rows={2} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none resize-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
              </div>
              <div>
                <label className="text-text-tertiary text-xs mb-2 block">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
                    <button key={c} onClick={() => setCreateColor(c)} className="w-9 h-9 rounded-full transition-all active:scale-95" style={{ backgroundColor: c, border: createColor === c ? '2px solid #fff' : '2px solid transparent', boxShadow: createColor === c ? `0 0 0 2px ${c}` : 'none' }} />
                  ))}
                </div>
              </div>
              <button onClick={handleCreate} className="w-full py-3.5 rounded-full font-semibold text-white transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)' }}>
                Créer le groupe
              </button>
              <button onClick={() => setShowCreate(false)} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary" style={{ backgroundColor: '#212121' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (() => {
        const ou = orgUnits.find(o => o.id === showEdit);
        if (!ou) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowEdit(null)}>
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative w-full max-w-lg rounded-t-2xl p-5 pb-8" style={{ backgroundColor: '#181818' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-text-primary font-bold text-lg">Modifier le groupe</h2>
                <button onClick={() => setShowEdit(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
                  <X className="w-4 h-4 text-text-tertiary" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-text-tertiary text-xs mb-2 block">Nom *</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
                </div>
                <div>
                  <label className="text-text-tertiary text-xs mb-2 block">Description</label>
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none resize-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
                </div>
                <button onClick={() => handleUpdate(showEdit)} className="w-full py-3.5 rounded-full font-semibold text-white transition-all active:scale-95" style={{ backgroundColor: '#FF6B00' }}>
                  Sauvegarder
                </button>
                <button onClick={() => setShowEdit(null)} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary" style={{ backgroundColor: '#212121' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" onClick={() => setShowDelete(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-sm rounded-2xl p-5 text-center" style={{ backgroundColor: '#181818' }} onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#E5133220' }}>
              <Trash2 className="w-6 h-6 text-[#E51332]" />
            </div>
            <h3 className="text-text-primary font-bold text-lg mb-2">Supprimer ce groupe ?</h3>
            <p className="text-text-tertiary text-sm mb-1">Cette action est irréversible.</p>
            <p className="text-text-tertiary text-xs mb-6">La caisse associée sera également supprimée.</p>
            <button onClick={() => handleDelete(showDelete)} className="w-full py-3.5 rounded-full font-semibold text-white mb-3 transition-all active:scale-95" style={{ backgroundColor: '#E51332' }}>
              Supprimer
            </button>
            <button onClick={() => setShowDelete(null)} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary" style={{ backgroundColor: '#212121' }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
