import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resource } from '@/capabilities/resource';
import { lifecycle } from '@/capabilities/lifecycle';
import type { Group, Member, Event } from '@/types';
import { Users, Search, Archive, RefreshCw, ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { FullPageSkeleton } from '@/components/Skeleton';

export default function Archives() {
  const navigate = useNavigate();

  const [archivedGroups, setArchivedGroups] = useState<Group[]>([]);
  const [archivedMembers, setArchivedMembers] = useState<Member[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Load archived entities via Resource capability
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [groups, members, events] = await Promise.all([
          resource.listArchived<Group>('Group'),
          resource.listArchived<Member>('Member'),
          resource.listArchived<Event>('Event'),
        ]);
        if (!cancelled) {
          setArchivedGroups(groups.items);
          setArchivedMembers(members.items);
          setArchivedEvents(events.items);
        }
      } catch (e) {
        console.error('[Archives] Failed to load archived entities:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'group' | 'member' | 'event'>('all');

  const allArchived = [
    ...archivedGroups.map((g: any) => ({ type: 'group' as const, id: g.id, name: g.name, reason: g.archive_reason || g.archiveReason, archivedAt: g.archived_at || g.archivedAt, archivedBy: g.archived_by || g.archivedBy })),
    ...archivedMembers.map((m: any) => ({ type: 'member' as const, id: m.id, name: `${m.first_name || m.firstName} ${m.last_name || m.lastName}`, reason: m.archive_reason || m.archiveReason, archivedAt: m.archived_at || m.archivedAt, archivedBy: m.archived_by || m.archivedBy })),
    ...archivedEvents.map((e: any) => ({ type: 'event' as const, id: e.id, name: e.name, reason: 'Événement annulé', archivedAt: e.updated_at || e.updatedAt, archivedBy: null })),
  ];

  const filtered = allArchived.filter((item: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || item.name.toLowerCase().includes(q);
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleRestore = async (type: 'group' | 'member' | 'event', id: string) => {
    const entityType = type === 'event' ? 'Event' : type.charAt(0).toUpperCase() + type.slice(1);
    await lifecycle.restore(entityType as any, id, '', 'local-user');
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Archives" />
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <FullPageSkeleton />
        </div>
      ) : (
      <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
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
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide">
          {[
            { id: 'all' as const, label: 'Tout' },
            { id: 'group' as const, label: 'Groupes' },
            { id: 'member' as const, label: 'Membres' },
            { id: 'event' as const, label: 'Événements' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilterType(id)}
              className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{ backgroundColor: filterType === id ? '#FF6B00' : '#212121', color: filterType === id ? '#fff' : '#B3B3B3' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Archived items */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#1e1e1e' }}>
              <Archive className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
              <p className="text-text-tertiary text-sm">Aucun élément archivé</p>
              <p className="text-text-tertiary text-xs mt-1">Les éléments archivés apparaîtront ici</p>
            </div>
          ) : (
            filtered.map((item: any) => (
              <div
                key={item.id}
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#282828' }}>
                  {item.type === 'group' && <Users className="w-5 h-5 text-text-tertiary" />}
                  {item.type === 'member' && <Users className="w-5 h-5 text-text-tertiary" />}
                  {item.type === 'event' && <Archive className="w-5 h-5 text-text-tertiary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-secondary text-sm font-medium truncate">{item.name}</p>
                  <p className="text-text-tertiary text-xs mt-0.5">{item.reason}</p>
                  {item.archivedAt && (
                    <p className="text-text-tertiary text-xs mt-0.5">Archivé le {new Date(item.archivedAt).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRestore(item.type as any, item.id)}
                  className="p-2 rounded-full active:scale-95 transition-transform"
                  style={{ backgroundColor: '#1DB95420' }}
                >
                  <RefreshCw className="w-4 h-4" style={{ color: '#1DB954' }} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      )}
      <BottomNav />
    </div>
  );
}
