import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, X, Check } from 'lucide-react';
import { useLocalStore } from '@/store/useLocalStore';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import * as db from '@/lib/db';

const GROUP_TYPES = [
  { value: 'diacre', label: 'Diacres', color: '#1DB954' },
  { value: 'jeunesse', label: 'Jeunesse', color: '#2196F3' },
  { value: 'dames', label: 'Dames', color: '#E91E63' },
  { value: 'messieurs', label: 'Messieurs', color: '#FFB800' },
  { value: 'chorale', label: 'Chorale', color: '#FF6B00' },
  { value: 'autre', label: 'Autre', color: '#808080' },
];

interface GroupForm {
  name: string;
  type: string;
}

export default function Groups() {
  const navigate = useNavigate();
  const { orgUnits, refreshData } = useLocalStore();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<GroupForm>({ name: '', type: 'diacre' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Le nom du groupe est requis');
      return;
    }
    if (form.name.length > 50) {
      setError('Le nom ne doit pas dépasser 50 caractères');
      return;
    }
    setCreating(true);
    setError('');

    const id = `ou-${Date.now()}`;
    const orgUnit = {
      id,
      name: form.name.trim(),
      type: form.type,
      orgId: 'org-1',
      syncStatus: 'pending' as const,
    };

    await db.putOrgUnit(orgUnit);
    await db.enqueueSync('insert', 'org_units', orgUnit);
    await refreshData();
    setShowCreate(false);
    setForm({ name: '', type: 'diacre' });
    setCreating(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le groupe "${name}" ? Les transactions associées ne seront pas supprimées.`)) return;
    await db.deleteTransaction(id);
    await db.enqueueSync('delete', 'org_units', { id });
    await refreshData();
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Groupes" showBack />
      <div className="max-w-lg mx-auto px-5 pb-24">

        {/* Create button */}
        <button
          onClick={() => setShowCreate(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 mb-5 rounded-full text-sm font-semibold transition-all active:scale-95"
          style={{ backgroundColor: '#212121', border: '1px dashed #282828', color: '#FF6B00' }}
        >
          <Plus className="w-4 h-4" />Créer un groupe
        </button>

        {orgUnits.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
            <p className="text-text-tertiary text-sm mb-3">Aucun groupe créé</p>
            <p className="text-text-tertiary text-xs">Créez votre premier groupe pour organiser vos finances</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {orgUnits.map((unit) => {
              const groupType = GROUP_TYPES.find(g => g.value === unit.type) || GROUP_TYPES[5];
              return (
                <div
                  key={unit.id}
                  className="flex items-center gap-3 p-4 rounded-lg"
                  style={{ backgroundColor: '#212121' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: groupType.color + '20' }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: groupType.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-semibold text-base truncate">{unit.name}</p>
                    <p className="text-text-tertiary text-sm capitalize">{unit.type}</p>
                  </div>
                  <button
                    onClick={() => navigate('/finance')}
                    className="p-2 rounded-full hover:bg-surface-active transition-colors"
                    style={{ color: '#808080' }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(unit.id, unit.name)}
                    className="p-2 rounded-full hover:bg-red-900/20 transition-colors"
                    style={{ color: '#E51332' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div
            className="relative w-full rounded-t-2xl p-6 pb-8"
            style={{ backgroundColor: '#181818' }}
          >
            <div className="w-12 h-1 rounded-full bg-surface-active mx-auto mb-5" />
            <h2 className="text-lg font-bold text-text-primary text-center mb-6">Créer un groupe</h2>

            <div className="space-y-4">
              {/* Name input */}
              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">Nom du groupe</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setError(''); }}
                  placeholder="ex: Groupe de prière"
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none"
                  style={{ backgroundColor: '#121212', border: error ? '1px solid #E51332' : '1px solid #282828' }}
                  autoFocus
                />
                {error && <p className="text-xs mt-1" style={{ color: '#E51332' }}>{error}</p>}
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {GROUP_TYPES.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setForm(f => ({ ...f, type: g.value }))}
                      className="py-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: form.type === g.value ? g.color + '30' : '#212121',
                        border: form.type === g.value ? `2px solid ${g.color}` : '1px solid #282828',
                        color: form.type === g.value ? g.color : '#808080',
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreate(false); setError(''); }}
                className="flex-1 py-3.5 rounded-full text-sm font-semibold"
                style={{ backgroundColor: '#212121', color: '#B3B3B3' }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-3.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}
              >
                {creating ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Check className="w-4 h-4" />Créer</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
