import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { useMembers } from '@/lib/dataLayer';
import { resource } from '@/capabilities/resource';
import { lifecycle } from '@/capabilities/lifecycle';
import { PlusCircle, Users, Search, Archive, RefreshCw, UserPlus, UserMinus } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import type { Member } from '@/types';

export default function MembersPage() {
  const navigate = useNavigate();
  const { members: idbMembers, createMember, user } = useLocalStore();
  const { data: psMembers } = useMembers();

  // Use PowerSync or fallback to local cache
  const members = psMembers ?? idbMembers;

  const [archivedMembers, setArchivedMembers] = useState<Member[]>([]);

  // Load archived members via Resource capability
  useEffect(() => {
    resource.listArchived<Member>('Member').then(({ items }) => setArchivedMembers(items));
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const filteredMembers = useMemo(() => {
    return members.filter((m: any) => {
      const q = searchQuery.toLowerCase();
      const firstName = m.first_name || m.firstName || '';
      const lastName = m.last_name || m.lastName || '';
      const memberEmail = m.email || '';
      return !q || firstName.toLowerCase().includes(q) || lastName.toLowerCase().includes(q) || memberEmail.toLowerCase().includes(q);
    });
  }, [members, searchQuery]);

  const activeMembers = filteredMembers.filter((m: any) => m.status === 'ACTIVE');
  const archivedMembers = filteredMembers.filter((m: any) => m.status === 'ARCHIVED');

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    await createMember({
      orgId: getOrganizationId(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      status: 'ACTIVE',
      joinedAt: new Date().toISOString(),
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
    });
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setShowForm(false);
  };

  const handleArchive = async (member: any) => {
    await lifecycle.archive('Member', member.id, 'Archivé via la gestion des membres', user.id);
    // Refresh archived list
    const { items } = await resource.listArchived<Member>('Member');
    setArchivedMembers(items);
  };

  const handleRestore = async (member: any) => {
    await lifecycle.restore('Member', member.id, 'Rétabli', user.id);
    // Refresh archived list
    const { items } = await resource.listArchived<Member>('Member');
    setArchivedMembers(items);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Membres" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-text-primary font-bold text-xl">Membres</h1>
            <p className="text-text-tertiary text-xs mt-0.5">{activeMembers.length} actif{activeMembers.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' }}
          >
            <PlusCircle className="w-4 h-4" /> Ajouter
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#212121', color: '#fff', border: '1px solid #282828' }}
          />
        </div>

        {/* Create form */}
        {showForm && (
          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#212121', border: '1px solid #FF6B0030' }}>
            <h3 className="text-text-primary font-semibold text-sm mb-3">Nouveau membre</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: '#181818', color: '#fff', border: '1px solid #282828' }}
                />
                <input
                  type="text"
                  placeholder="Nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: '#181818', color: '#fff', border: '1px solid #282828' }}
                />
              </div>
              <input
                type="tel"
                placeholder="Téléphone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: '#181818', color: '#fff', border: '1px solid #282828' }}
              />
              <input
                type="email"
                placeholder="Email (optionnel)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: '#181818', color: '#fff', border: '1px solid #282828' }}
              />
              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 py-3 rounded-full font-semibold text-white text-sm" style={{ backgroundColor: '#FF6B00' }}>
                  Ajouter
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-3 rounded-full font-medium text-sm" style={{ backgroundColor: '#282828' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Members list */}
        <div className="space-y-2 mb-6">
          {activeMembers.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#1e1e1e' }}>
              <Users className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
              <p className="text-text-tertiary text-sm">Aucun membre</p>
              <p className="text-text-tertiary text-xs mt-1">Ajoutez votre premier membre</p>
            </div>
          ) : (
            activeMembers.map((member: any) => (
              <div
                key={member.id}
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                  <span className="text-sm font-bold" style={{ color: '#FF6B00' }}>
                    {(member.first_name || member.firstName)?.charAt(0)}{(member.last_name || member.lastName)?.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-semibold truncate">
                    {member.first_name || member.firstName} {member.last_name || member.lastName}
                  </p>
                  <p className="text-text-tertiary text-xs">{member.phone || 'Pas de téléphone'}</p>
                </div>
                <button
                  onClick={() => handleArchive(member)}
                  className="p-2 rounded-full active:scale-95 transition-transform"
                  style={{ backgroundColor: '#E5133220' }}
                >
                  <Archive className="w-4 h-4" style={{ color: '#E51332' }} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Archived members */}
        {archivedMembers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Archive className="w-4 h-4 text-text-tertiary" />
              <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">Archivés ({archivedMembers.length})</p>
            </div>
            <div className="space-y-2">
              {archivedMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="rounded-xl p-4 flex items-center gap-3 opacity-60"
                  style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#282828' }}>
                    <span className="text-sm font-bold text-text-tertiary">
                      {(member.first_name || member.firstName)?.charAt(0)}{(member.last_name || member.lastName)?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-secondary text-sm font-medium truncate">
                      {member.first_name || member.firstName} {member.last_name || member.lastName}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(member)}
                    className="p-2 rounded-full active:scale-95 transition-transform"
                    style={{ backgroundColor: '#1DB95420' }}
                  >
                    <RefreshCw className="w-4 h-4" style={{ color: '#1DB954' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
