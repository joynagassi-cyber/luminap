import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowLeft, Clock, CheckCircle, XCircle, Trash2, Edit2, FileText, Users, Shield, ChevronRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { formatDateTime, formatDate } from '@/lib/utils';

const ACTION_META: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  CREATE: { icon: CheckCircle, color: '#1DB954', label: 'Créé' },
  UPDATE: { icon: Edit2, color: '#3B82F6', label: 'Modifié' },
  DELETE: { icon: Trash2, color: '#E51332', label: 'Supprimé' },
  APPROVE: { icon: CheckCircle, color: '#1DB954', label: 'Approuvé' },
  REJECT: { icon: XCircle, color: '#E51332', label: 'Rejeté' },
  ARCHIVE: { icon: FileText, color: '#808080', label: 'Archivé' },
  RESTORE: { icon: CheckCircle, color: '#1DB954', label: 'Rétabli' },
  REVISE: { icon: Edit2, color: '#FFB800', label: 'Révisé' },
  CANCEL: { icon: XCircle, color: '#E51332', label: 'Annulé' },
};

const ENTITY_LABELS: Record<string, string> = {
  Transaction: 'Transaction',
  Event: 'Événement',
  Group: 'Groupe',
  Member: 'Membre',
  FormDefinition: 'Formulaire',
  FormSubmission: 'Formulaire',
  CustomFieldDefinition: 'Champ personnalisé',
  EventBudget: 'Budget',
  BudgetLine: 'Poste budgétaire',
  GroupMembership: 'Adhésion',
  Versement: 'Versement',
  Account: 'Compte',
};

const FILTERS = ['Tout', 'Transaction', 'Groupe', 'Membre', 'Événement', 'Budget', 'Formulaire'];

export default function TracePage() {
  const navigate = useNavigate();
  const { auditEntries, transactions, orgUnits, events, members, isLoading } = useLocalStore();
  const [filter, setFilter] = useState('Tout');
  const [search, setSearch] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <TopHeader title="Trace" />
        <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#181818' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#282828]" />
                  <div className="flex-1">
                    <div className="h-3 bg-[#282828] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[#282828] rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const entityMap: Record<string, { label: string; type: string }> = {
    Transaction: { label: 'Transaction', type: 'Transaction' },
    Event: { label: 'Événement', type: 'Événement' },
    Group: { label: 'Groupe', type: 'Groupe' },
    Member: { label: 'Membre', type: 'Membre' },
    FormDefinition: { label: 'Formulaire', type: 'Formulaire' },
    FormSubmission: { label: 'Formulaire', type: 'Formulaire' },
    CustomFieldDefinition: { label: 'Champ', type: 'Formulaire' },
    EventBudget: { label: 'Budget', type: 'Budget' },
    BudgetLine: { label: 'Poste budgétaire', type: 'Budget' },
    GroupMembership: { label: 'Adhésion', type: 'Groupe' },
    Versement: { label: 'Versement', type: 'Transaction' },
    Account: { label: 'Compte', type: 'Groupe' },
  };

  const filtered = auditEntries
    .filter(a => {
      if (filter === 'Tout') return true;
      const entityType = entityMap[a.entityType]?.type || a.entityType;
      return entityType === filter;
    })
    .filter(a => {
      if (!search) return true;
      const entityLabel = ENTITY_LABELS[a.entityType] || a.entityType;
      return entityLabel.toLowerCase().includes(search.toLowerCase()) ||
             a.action.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-[#121212]">
      <TopHeader title="Trace" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <h1 className="text-text-primary font-bold text-xl mb-1">Trace d'activité</h1>
        <p className="text-text-tertiary text-sm mb-5">Journal complet de toutes les actions</p>

        {/* Search */}
        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une action..."
            className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
            style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={filter === f ? { backgroundColor: '#FF6B00', color: '#fff' } : { backgroundColor: '#181818', color: '#808080', border: '1px solid #282828' }}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#181818' }}>
            <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: '#535353' }} />
            <p className="text-text-tertiary text-sm">Aucune trace enregistrée</p>
            <p className="text-text-tertiary text-xs mt-1">Les actions apparaîtront ici après leur réalisation</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const meta = ACTION_META[entry.action] || { icon: Clock, color: '#808080', label: entry.action };
              const entityLabel = ENTITY_LABELS[entry.entityType] || entry.entityType;
              return (
                <div
                  key={entry.id}
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ backgroundColor: '#181818' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${meta.color}20` }}
                  >
                    <meta.icon className="w-4 h-4" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-text-primary text-sm font-semibold">{meta.label}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#282828', color: '#808080' }}>
                        {entityLabel}
                      </span>
                    </div>
                    <p className="text-text-tertiary text-xs mt-0.5 truncate">
                      {entry.entityId ? `ID: ${entry.entityId.substring(0, 8)}` : ''}
                      {entry.comment ? ` — ${entry.comment}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-text-tertiary text-xs">{formatDate(entry.createdAt)}</p>
                    {entry.actorRoleAtTime && (
                      <p className="text-text-tertiary text-xs mt-0.5">{entry.actorRoleAtTime.replace(/_/g, ' ').toLowerCase()}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-text-tertiary text-xs text-center mt-6">{filtered.length} action{filtered.length !== 1 ? 's' : ''}</p>
      </div>
      <BottomNav />
    </div>
  );
}
