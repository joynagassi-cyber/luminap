import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCentsToFCFA, formatDate } from '@/lib/utils';
import { PlusCircle, Users, Search, Archive, RefreshCw, UserPlus, UserMinus } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import type { Member } from '@/types';

export default function Members() {
  const navigate = useNavigate();
  const { members, createMember, archiveMember, restoreMember, user } = useLocalStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const filteredMembers = members.filter(m => {
    const q = searchQuery.toLowerCase();
    return !q || m.firstName.toLowerCase().includes(q) || m.lastName.toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
  });

  const activeMembers = filteredMembers.filter(m => m.status === 'ACTIVE');
  const archivedMembers = filteredMembers.filter(m => m.status === 'ARCHIVED');

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    await createMember({
      orgId: 'org-1',
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

  const handleArchive = async (member: Member) => {
    await archiveMember(member.id, 'Archivé via la gestion des membres', user.id);
  };

  const handleRestore = async (member: Member) => {
    await restoreMember(member.id, '', user.id);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Membres" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-text-primary font-bold text-xl">Membres</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
            style={{ backgroundColor: '#FF6B00', color: '#fff' }}
          >
            <PlusCircle className="w-4 h-4" /> {showForm ? 'Annuler' : 'Ajouter'}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un membre..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-text-primary text-sm outline-none"
            style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
          />
        </div>

        {/* Create form */}
        {showForm && (
          <div className="rounded-xl p-4 mb-4 space-y-3" style={{ backgroundColor: '#212121' }}>
            <div>
              <label className="text-text-tertiary text-xs mb-1.5 block">Prénom *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
              />
            </div>
            <div>
              <label className="text-text-tertiary text-xs mb-1.5 block">Nom *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
                className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
              />
            </div>
            <div>
              <label className="text-text-tertiary text-xs mb-1.5 block">Téléphone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 6XX XXX XXX"
                className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
              />
            </div>
            <div>
              <label className="text-text-tertiary text-xs mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!firstName.trim() || !lastName.trim()}
              className="w-full py-3 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: '#FF6B00' }}
            >
              Créer le membre
            </button>
          </div>
        )}

        {/* Active members */}
        {activeMembers.length > 0 && (
          <div className="mb-5">
            <p className="text-text-tertiary text-xs font-medium mb-2">Actifs ({activeMembers.length})</p>
            <div className="space-y-2">
              {activeMembers.map((member) => (
                <div key={member.id} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: '#212121' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                    <span className="text-text-primary text-sm font-bold">{member.firstName.charAt(0)}{member.lastName.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-semibold">{member.firstName} {member.lastName}</p>
                    <p className="text-text-tertiary text-xs">{member.phone || member.email || '—'}</p>
                  </div>
                  <button
                    onClick={() => handleArchive(member)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#E5133220' }}
                  >
                    <Archive className="w-4 h-4 text-[#E51332]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Archived members */}
        {archivedMembers.length > 0 && (
          <div>
            <p className="text-text-tertiary text-xs font-medium mb-2">Archivés ({archivedMembers.length})</p>
            <div className="space-y-2">
              {archivedMembers.map((member) => (
                <div key={member.id} className="rounded-xl p-4 flex items-center gap-3 opacity-60" style={{ backgroundColor: '#212121' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#80808020' }}>
                    <span className="text-text-tertiary text-sm font-bold">{member.firstName.charAt(0)}{member.lastName.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-tertiary text-sm font-semibold">{member.firstName} {member.lastName}</p>
                    <p className="text-text-tertiary text-xs">{member.archiveReason || 'Archivé'}</p>
                  </div>
                  <button
                    onClick={() => handleRestore(member)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#1DB95420' }}
                  >
                    <RefreshCw className="w-4 h-4 text-[#1DB954]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredMembers.length === 0 && !showForm && (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Users className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-50" />
            <p className="text-text-tertiary text-sm">Aucun membre</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm font-medium" style={{ color: '#FF6B00' }}>
              Ajouter un membre
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
