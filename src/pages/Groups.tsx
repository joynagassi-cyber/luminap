import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { useGroups, useOrgUnits } from '@/lib/dataLayer';
import { resource } from '@/capabilities/resource';
import type { OrgUnit } from '@/types';
import { Users, Plus, X, Palette, Edit3, Trash2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { FullPageSkeleton } from '@/components/Skeleton';
import { getRoleLabel } from '@/lib/utils';
import { security } from '@/capabilities/security';
import { IonPage, IonHeader, IonContent, IonTitle, IonToolbar } from '@ionic/react';

const COLOR_PALETTE = ['#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#EF4444', '#22C55E', '#6366F1', '#F97316', '#06B6D4'];
const GROUP_TYPES = ['groupe', 'commission', 'comité', 'diaconie', 'service'];

export default function Groups() {
  const navigate = useNavigate();
  const { orgUnits: idbOrgUnits, caisses, accounts, createGroup, updateGroup, deleteGroup, isLoading, appConfig, user } = useLocalStore();

  // PowerSync with fallback
  const { data: psGroups } = useGroups();
  const { data: psOrgUnits } = useOrgUnits();

  const [activeGroups, setActiveGroups] = useState<OrgUnit[]>([]);

  // Load active groups via Resource capability as primary source
  useEffect(() => {
    resource.list<OrgUnit>('Role', {
      filter: [{ field: 'is_active', op: 'eq', value: 1 }],
      sortBy: 'name',
      sortOrder: 'asc',
    })
      .then(({ items }) => {
        // resource returns camelCase (isActive), normalize to match OrgUnit type
        const normalized = (items as any[]).map((g: any) => ({
          id: g.id,
          name: g.name,
          type: g.type,
          description: g.description || '',
          orgId: g.org_id || g.orgId || '',
          isActive: g.is_active ?? g.isActive ?? true,
        }));
        setActiveGroups(normalized);
      })
      .catch(() => {
        // Fall through to fallback
      });
  }, []);

  const orgUnits = activeGroups.length > 0 ? activeGroups : psOrgUnits ?? idbOrgUnits;

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
    if (!security.hasPermission(user.role, 'group:create')) {
      setError('Permission insuffisante pour créer un groupe');
      return;
    }
    if (!createName.trim()) { setError('Le nom est requis'); return; }
    setError('');
    try {
      await createGroup({ name: createName.trim(), type: createType, description: createDesc.trim(), color: createColor });
      setCreateName(''); setCreateType('groupe'); setCreateDesc(''); setCreateColor(COLOR_PALETTE[0]);
      setShowCreate(false);
      setSuccess('Groupe créé avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError("Nous n'avons pas pu créer ce groupe. Veuillez vérifier les informations puis réessayer.");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!security.hasPermission(user.role, 'group:update')) {
      setError('Permission insuffisante pour modifier ce groupe');
      return;
    }
    if (!editName.trim()) { setError('Le nom est requis'); return; }
    setError('');
    await updateGroup(id, { name: editName.trim(), description: editDesc.trim() });
    setShowEdit(null);
    setSuccess('Groupe modifié');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!security.hasPermission(user.role, 'group:delete')) {
      setError('Permission insuffisante pour supprimer ce groupe');
      return;
    }
    setError('');
    try {
      await deleteGroup(id);
      setShowDelete(null);
      setSuccess('Groupe supprimé');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError("Nous n'avons pas pu supprimer ce groupe. Veuillez réessayer.");
    }
  };

  if (isLoading) return <FullPageSkeleton />;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Groupes</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
    <div className="min-h-screen bg-canvas flex flex-col">
      <TopHeader title="Groupes" />
      <div className="flex-1 overflow-y-auto px-5 pt-16 pb-32 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-text-primary font-bold text-xl">Groupes</h1>
            <p className="text-text-tertiary text-xs mt-0.5">{orgUnits.length} groupe{orgUnits.length !== 1 ? 's' : ''}</p>
          </div>
          {security.hasPermission(user.role, 'group:create') && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' }}
            >
              <Plus className="w-4 h-4" /> Créer
            </button>
          )}
        </div>

        {/* Success/Error messages */}
        {success && (
          <div className="mb-4 p-3 rounded-xl text-sm text-center" style={{ backgroundColor: '#1DB95420', color: '#1DB954' }}>
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm text-center" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>
            {error}
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="mb-5 p-4 rounded-xl" style={{ backgroundColor: '#212121', border: '1px solid #FF6B0030' }}>
            <h3 className="text-text-primary font-semibold text-sm mb-4">Nouveau groupe</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nom du groupe"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: '#181818', color: '#fff', border: '1px solid #282828' }}
              />
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: '#181818', color: '#fff', border: '1px solid #282828' }}
              >
                {GROUP_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <textarea
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Description (optionnel)"
                rows={2}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ backgroundColor: '#181818', color: '#fff', border: '1px solid #282828' }}
              />
              <div className="flex gap-2">
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    onClick={() => setCreateColor(color)}
                    className="w-8 h-8 rounded-full transition-all active:scale-95"
                    style={{ backgroundColor: color, border: createColor === color ? '2px solid #fff' : '2px solid transparent' }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 py-3 rounded-full font-semibold text-white text-sm" style={{ backgroundColor: '#FF6B00' }}>
                  Créer
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-3 rounded-full font-medium text-sm" style={{ backgroundColor: '#282828' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Groups list */}
        <div className="space-y-2 mb-6">
          {orgUnits.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#1e1e1e' }}>
              <Users className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
              <p className="text-text-tertiary text-sm">Aucun groupe</p>
              <p className="text-text-tertiary text-xs mt-1">Créez votre premier groupe</p>
            </div>
          ) : (
            orgUnits.map((orgUnit: any) => (
              <div
                key={orgUnit.id}
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                  <Users className="w-5 h-5" style={{ color: '#FF6B00' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-semibold truncate">{orgUnit.name}</p>
                  <p className="text-text-tertiary text-xs">{orgUnit.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  {security.hasPermission(user.role, 'group:update') && (
                    <button
                      onClick={() => { setShowEdit(orgUnit.id); setEditName(orgUnit.name); setEditDesc(orgUnit.description || ''); }}
                      className="p-2 rounded-full active:scale-95 transition-transform"
                      style={{ backgroundColor: '#3B82F620' }}
                    >
                      <Edit3 className="w-4 h-4" style={{ color: '#3B82F6' }} />
                    </button>
                  )}
                  {security.hasPermission(user.role, 'group:delete') && (
                    <button
                      onClick={() => setShowDelete(orgUnit.id)}
                      className="p-2 rounded-full active:scale-95 transition-transform"
                      style={{ backgroundColor: '#E5133220' }}
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#E51332' }} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit modal */}
        {showEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: '#1e1e1e' }}>
              <h3 className="text-text-primary font-semibold text-lg mb-4">Modifier le groupe</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: '#282828', color: '#fff', border: '1px solid #383838' }}
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  style={{ backgroundColor: '#282828', color: '#fff', border: '1px solid #383838' }}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => handleUpdate(showEdit)} className="flex-1 py-3 rounded-full font-semibold text-white text-sm" style={{ backgroundColor: '#FF6B00' }}>
                  Sauvegarder
                </button>
                <button onClick={() => setShowEdit(null)} className="px-4 py-3 rounded-full font-medium text-sm" style={{ backgroundColor: '#282828' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {showDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="w-full max-w-sm rounded-2xl p-5 text-center" style={{ backgroundColor: '#1e1e1e' }}>
              <Trash2 className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
              <h3 className="text-text-primary font-semibold text-lg mb-2">Supprimer ce groupe ?</h3>
              <p className="text-text-tertiary text-sm mb-5">Cette action est irréversible.</p>
              <div className="flex gap-2">
                <button onClick={() => handleDelete(showDelete)} className="flex-1 py-3 rounded-full font-semibold text-white text-sm" style={{ backgroundColor: '#E51332' }}>
                  Supprimer
                </button>
                <button onClick={() => setShowDelete(null)} className="px-4 py-3 rounded-full font-medium text-sm" style={{ backgroundColor: '#282828' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
      </IonContent>
    </IonPage>
  );
}
