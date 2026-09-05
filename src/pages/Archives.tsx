import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowLeft, RefreshCw, Search, Users, Wallet, Eye, Archive } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import type { Group } from '@/types';

export default function Archives() {
  const navigate = useNavigate();
  const { groups, members, events } = useLocalStore();

  const archivedGroups = groups.filter(g => g.status === 'ARCHIVED');
  const archivedEvents = events.filter(e => e.status === 'CANCELLED');
  const archivedMembers = members.filter(m => m.status === 'ARCHIVED');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'group' | 'member' | 'event'>('all');

  const allArchived = [
    ...archivedGroups.map(g => ({ type: 'group' as const, id: g.id, name: g.name, reason: g.archiveReason, archivedAt: g.archivedAt, archivedBy: g.archivedBy })),
    ...archivedEvents.map(e => ({ type: 'event' as const, id: e.id, name: e.name, reason: 'Événement annulé', archivedAt: e.updatedAt, archivedBy: null })),
    ...archivedMembers.map(m => ({ type: 'member' as const, id: m.id, name: `${m.firstName} ${m.lastName}`, reason: m.archiveReason, archivedAt: m.archivedAt, archivedBy: m.archivedBy })),
  ];

  const filtered = allArchived.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || item.name.toLowerCase().includes(q);
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleRestore = async (type: 'group' | 'member' | 'event', id: string) => {
    if (type === 'group') {
      await useLocalStore.getState().restoreGroup(id, '', 'local-user');
    } else if (type === 'member') {
      await useLocalStore.getState().restoreMember(id, '', 'local-user');
    }
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Archives" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <h1 className="text-text-primary font-bold text-xl mb-5">Archives</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans les archives..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-text-primary text-sm outline-none"
            style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {[
            { id: 'all' as const, label: 'Tout', icon: Eye },
            { id: 'group' as const, label: 'Groupes', icon: Users },
            { id: 'member' as const, label: 'Membres', icon: Users },
            { id: 'event' as const, label: 'Événements', icon: Wallet },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setFilterType(id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={filterType === id ? { backgroundColor: '#FF6B00', color: '#fff' } : { backgroundColor: '#212121', color: '#808080', border: '1px solid #282828' }}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Archived items */}
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-xl p-4 opacity-70" style={{ backgroundColor: '#212121' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: item.type === 'group' ? '#8B5CF620' : item.type === 'member' ? '#14B8A620' : '#3B82F620', color: item.type === 'group' ? '#8B5CF6' : item.type === 'member' ? '#14B8A6' : '#3B82F6' }}>
                      {item.type === 'group' ? 'Groupe' : item.type === 'member' ? 'Membre' : 'Événement'}
                    </span>
                    {item.archivedAt && (
                      <span className="text-text-tertiary text-xs">{new Date(item.archivedAt).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore(item.type, item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: '#1DB95420', color: '#1DB954' }}
                  >
                    <RefreshCw className="w-3 h-3" /> Restaurer
                  </button>
                </div>
                <p className="text-text-primary text-sm font-semibold">{item.name}</p>
                {item.reason && <p className="text-text-tertiary text-xs mt-1">{item.reason}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Archive className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-50" />
            <p className="text-text-tertiary text-sm">Aucune archive</p>
            <p className="text-text-tertiary text-xs mt-1">Les éléments archivés apparaîtront ici</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
