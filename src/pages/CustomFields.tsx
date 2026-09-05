import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2, Edit3 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { customFieldRepo, customFieldValueRepo } from '@/lib/customFields';
import { generateId } from '@/lib/utils';
import type { CustomFieldDefinition } from '@/types';

const ENTITY_TYPES = ['Transaction', 'Event', 'Group', 'Member', 'Account', 'Category'];
const FIELD_TYPES: { value: CustomFieldDefinition['type']; label: string }[] = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Sélection' },
  { value: 'boolean', label: 'Vrai/Faux' },
];

export default function CustomFields() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [entityType, setEntityType] = useState('Transaction');
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomFieldDefinition['type']>('text');
  const [options, setOptions] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    customFieldRepo.list().then(setFields);
  }, []);

  const handleCreate = async () => {
    if (!label.trim() || !key.trim()) { setError('Label et clé requis'); return; }
    const def = await customFieldRepo.create({
      orgId: 'org-1',
      entityType,
      key: key.trim().toLowerCase().replace(/\s+/g, '_'),
      label: label.trim(),
      type,
      options: type === 'select' ? options.split('\n').filter(Boolean) : undefined,
      order: fields.length,
    });
    setFields(prev => [...prev, def]);
    setShowCreate(false);
    setLabel('');
    setKey('');
    setOptions('');
    setError('');
  };

  const handleDelete = async (id: string) => {
    await customFieldRepo.delete(id);
    setFields(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Champs personnalisés" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-text-primary font-bold text-xl">Champs personnalisés</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)' }}
          >
            <Plus className="w-4 h-4" /> Créer
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-sm">Aucun champ personnalisé</p>
            <p className="text-text-tertiary text-xs mt-1">Ajoutez des champs pour enrichir vos entités</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map(field => (
              <div key={field.id} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: '#212121' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-text-primary text-sm font-semibold">{field.label}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>
                      {field.entityType}
                    </span>
                  </div>
                  <p className="text-text-tertiary text-xs">Clé: {field.key} · {FIELD_TYPES.find(t => t.value === field.type)?.label}</p>
                </div>
                <button onClick={() => handleDelete(field.id)} style={{ color: '#E51332' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-lg rounded-t-2xl p-5 pb-8" style={{ backgroundColor: '#181818' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-text-primary font-bold text-lg">Nouveau champ</h2>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-text-tertiary text-xs mb-1.5 block">Entité</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none"
                  style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                >
                  {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-text-tertiary text-xs mb-1.5 block">Label *</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Montant estimé"
                  className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                  style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                />
              </div>
              <div>
                <label className="text-text-tertiary text-xs mb-1.5 block">Clé *</label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value.replace(/\s+/g, '_').toLowerCase())}
                  placeholder="montant_estime"
                  className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                  style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                />
              </div>
              <div>
                <label className="text-text-tertiary text-xs mb-1.5 block">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {FIELD_TYPES.map(ft => (
                    <button
                      key={ft.value}
                      onClick={() => setType(ft.value)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium"
                      style={type === ft.value ? { backgroundColor: '#FF6B00', color: '#fff' } : { backgroundColor: '#212121', color: '#808080', border: '1px solid #282828' }}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>
              {type === 'select' && (
                <div>
                  <label className="text-text-tertiary text-xs mb-1.5 block">Options (une par ligne)</label>
                  <textarea
                    value={options}
                    onChange={(e) => setOptions(e.target.value)}
                    placeholder="Option 1\nOption 2"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none resize-none"
                    style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                  />
                </div>
              )}
            </div>

            {error && <p className="text-xs mb-3" style={{ color: '#E51332' }}>{error}</p>}
            <button onClick={handleCreate} className="w-full py-3.5 rounded-full font-semibold text-white mb-3" style={{ backgroundColor: '#FF6B00' }}>
              Créer le champ
            </button>
            <button onClick={() => setShowCreate(false)} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary" style={{ backgroundColor: '#212121' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
