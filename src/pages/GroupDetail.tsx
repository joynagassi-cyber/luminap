import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Check, Edit3, Trash2, Users, Clock, ArrowUp, ArrowDown, RefreshCw, ArrowRightLeft, Plus, UserPlus, UserMinus, Archive } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import TransactionCard from '@/components/TransactionCard';
import { FullPageSkeleton, ListSkeleton } from '@/components/Skeleton';
import type { Transaction, Account, Member, GroupMembership } from '@/types';

type Tab = 'transactions' | 'membres' | 'historique' | 'parametres';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgUnits, accounts, transactions, members, memberships, createGroup, updateGroup, deleteGroup, archiveGroup, isLoading, createNotification, addMemberToGroup, removeMemberFromGroup } = useLocalStore();
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const orgUnit = orgUnits.find(o => o.id === id);
  const account = accounts.find(a => a.id === id) as Account | undefined;
  const caisseDisplay = account ? useLocalStore.getState().getCaisseForDisplay(account.id) : null;

  const groupMemberships = memberships.filter(m => m.groupId === id);
  const groupMemberIds = groupMemberships.map(m => m.memberId);
  const groupMembers = members.filter(m => groupMemberIds.includes(m.id) && m.status !== 'ARCHIVED');

  if (isLoading || !orgUnit || !account) return <FullPageSkeleton />;

  const color = caisseDisplay?.color || '#FF6B00';
  const txs = transactions.filter(t => t.sourceCaisseId === account.id);
  const approvedTxs = txs.filter(t => t.status === 'APPROVED');
  const income = approvedTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expense = approvedTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const pendingCount = txs.filter(t => t.status === 'PENDING').length;
  const pendingAmount = txs.filter(t => t.status === 'PENDING').reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0);

  // Versement history: transactions that have a versementId and come from this group
  const versementTxs = txs.filter(t => t.versementId !== null);
  const versements: Record<string, { amount: number; date: string; tx: Transaction }> = {};
  for (const tx of versementTxs) {
    if (!versements[tx.versementId!]) {
      versements[tx.versementId!] = { amount: tx.amount, date: tx.date, tx };
    }
  }
  const versementList = Object.values(versements)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Timeline actions for enriched history
  const timelineEvents: Array<{ date: string; label: string; type: 'info' | 'success' | 'warning' }> = [
    { date: account.createdAt, label: 'Caisse créée', type: 'info' },
  ];

  const handleVersement = () => {
    navigate('/versement', { state: { caisseId: account.id, defaultAmount: balance } });
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

  const handleArchive = async () => {
    try {
      await archiveGroup(id!, 'Archive manuelle', 'local-user');
      navigate('/groups');
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'archivage');
    }
  };

  const handleAddMember = async () => {
    if (!selectedMemberId) return;
    const existing = groupMemberships.find(m => m.memberId === selectedMemberId);
    if (existing) {
      setError('Ce membre est déjà dans le groupe');
      return;
    }
    await addMemberToGroup({
      memberId: selectedMemberId,
      groupId: id!,
      roleInGroup: 'MEMBRE',
      joinedAt: new Date().toISOString(),
      leftAt: null,
    });
    setShowAddMember(false);
    setSelectedMemberId('');
    setSuccess('Membre ajouté');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRemoveMember = async (membershipId: string) => {
    await removeMemberFromGroup(membershipId);
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
        <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: '#212121', border: `1px solid ${color}30` }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
              <Wallet className="w-6 h-6" style={{ color }} />
            </div>
            <div className="flex-1">
              <p className="text-text-primary font-bold text-lg">{account.name}</p>
              <p className="text-text-tertiary text-xs">{orgUnit.description || caisseDisplay?.description || ''}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: color + '15', color }}>Caisse</span>
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
            onClick={() => navigate('/transaction/new', { state: { caisseId: account.id, type: 'INCOME' } })}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ backgroundColor: '#1DB95420', color: '#1DB954', border: '1px solid #1DB95440' }}
          >
            <ArrowUp className="w-4 h-4" /> Entrée
          </button>
          <button
            onClick={() => navigate('/transaction/new', { state: { caisseId: account.id, type: 'EXPENSE' } })}
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
        <div className="flex rounded-xl p-1 mb-5 overflow-x-auto" style={{ backgroundColor: '#212121' }}>
          {([
            { id: 'transactions' as Tab, label: 'Transactions', icon: Wallet },
            { id: 'membres' as Tab, label: 'Membres', icon: Users },
            { id: 'historique' as Tab, label: 'Historique', icon: Clock },
            { id: 'parametres' as Tab, label: 'Paramètres', icon: Edit3 },
          ]).map(({ id: tabId, label, icon: TabIcon }) => (
            <button key={tabId} onClick={() => setActiveTab(tabId)} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap" style={activeTab === tabId ? { backgroundColor: '#FF6B00', color: '#fff' } : { color: '#808080' }}>
              <TabIcon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'transactions' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-primary font-semibold text-sm">Transactions récentes</p>
              <button onClick={() => navigate('/finance', { state: { caisseId: account.id } })} className="text-xs font-medium" style={{ color: '#FF6B00' }}>Tout voir</button>
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

        {activeTab === 'membres' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-primary font-semibold text-sm">Membres du groupe</p>
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}
              >
                <UserPlus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            {groupMembers.length === 0 ? (
              <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#212121' }}>
                <Users className="w-8 h-8 mx-auto mb-3 text-text-tertiary opacity-40" />
                <p className="text-text-tertiary text-sm">Aucun membre</p>
                <p className="text-text-tertiary text-xs mt-1">Ajoutez des membres à ce groupe</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groupMembers.map((member) => {
                  const membership = groupMemberships.find(m => m.memberId === member.id);
                  return (
                    <div key={member.id} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: '#212121' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                        <span className="text-sm font-bold" style={{ color: '#FF6B00' }}>{member.firstName.charAt(0)}{member.lastName.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-semibold">{member.firstName} {member.lastName}</p>
                        <p className="text-text-tertiary text-xs">{member.phone || member.email || 'Pas de contact'}</p>
                      </div>
                      {membership && (
                        <button
                          onClick={() => handleRemoveMember(membership.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: '#E5133220' }}
                        >
                          <UserMinus className="w-4 h-4" style={{ color: '#E51332' }} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'historique' && (
          <div className="space-y-3">
            {/* Versement history */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft className="w-4 h-4" style={{ color: '#FF6B00' }} />
                <p className="text-text-primary font-semibold text-sm">Versements</p>
                {versementList.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>{versementList.length}</span>
                )}
              </div>
              {versementList.length === 0 ? (
                <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#212121' }}>
                  <ArrowRightLeft className="w-6 h-6 mx-auto mb-2 text-text-tertiary opacity-40" />
                  <p className="text-text-tertiary text-sm">Aucun versement effectué</p>
                  <p className="text-text-tertiary text-xs mt-1">Les versements apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {versementList.map((v, idx) => (
                    <div key={idx} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#212121' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                        <ArrowRightLeft className="w-4 h-4" style={{ color: '#FF6B00' }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-text-primary text-sm font-medium">Versement vers caisse principale</p>
                        <p className="text-text-tertiary text-xs">{formatDate(v.date)}</p>
                      </div>
                      <span className="text-sm font-bold text-[#E51332]">-{formatCurrencyCompact(v.amount)} F</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Group timeline */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4" style={{ color: '#808080' }} />
                <p className="text-text-primary font-semibold text-sm">Timeline du groupe</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
                <div className="space-y-4">
                  {timelineEvents.map((evt, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: evt.type === 'info' ? '#FF6B00' : evt.type === 'success' ? '#1DB954' : '#808080' }} />
                      <div>
                        <p className="text-text-primary text-xs font-medium">{evt.label}</p>
                        <p className="text-text-tertiary text-xs">{formatDate(evt.date)}</p>
                      </div>
                    </div>
                  ))}
                  {/* Add transaction events */}
                  {approvedTxs
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((tx) => (
                      <div key={tx.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: tx.type === 'INCOME' ? '#1DB954' : '#E51332' }} />
                        <div>
                          <p className="text-text-primary text-xs font-medium">{tx.type === 'INCOME' ? 'Entrée' : 'Sortie'}: {tx.description}</p>
                          <p className="text-text-tertiary text-xs">{formatDate(tx.date)} · {formatCurrencyCompact(tx.amount)} FCFA</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
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

            <button onClick={() => setShowArchive(true)} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#80808020' }}>
                <Archive className="w-5 h-5" style={{ color: '#808080' }} />
              </div>
              <span className="text-text-primary text-sm font-medium">Archiver le groupe</span>
            </button>

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

      {/* Archive Confirmation */}
      {showArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" onClick={() => setShowArchive(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-sm rounded-2xl p-5 text-center" style={{ backgroundColor: '#181818' }} onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#80808020' }}>
              <Archive className="w-6 h-6 text-text-tertiary" />
            </div>
            <h3 className="text-text-primary font-bold text-lg mb-2">Archiver {orgUnit.name} ?</h3>
            <p className="text-text-tertiary text-sm mb-1">Le groupe sera archivée mais pas supprimée.</p>
            <p className="text-text-tertiary text-xs mb-4">Vous pourrez le restaurer plus tard.</p>
            <button onClick={handleArchive} className="w-full py-3.5 rounded-full font-semibold text-white mb-3" style={{ backgroundColor: '#808080' }}>Archiver</button>
            <button onClick={() => setShowArchive(false)} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary" style={{ backgroundColor: '#212121' }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowAddMember(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-lg rounded-t-2xl p-5 pb-8" style={{ backgroundColor: '#181818' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-text-primary font-bold text-lg">Ajouter un membre</h2>
              <button onClick={() => setShowAddMember(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
                <span className="text-text-tertiary text-sm"><UserMinus className="w-4 h-4" /></span>
              </button>
            </div>
            <div className="space-y-3">
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              >
                <option value="">Sélectionner un membre...</option>
                {members.filter(m => m.status === 'ACTIVE' && !groupMemberIds.includes(m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                ))}
              </select>
              {error && <p className="text-xs" style={{ color: '#E51332' }}>{error}</p>}
              <button onClick={handleAddMember} disabled={!selectedMemberId} className="w-full py-3.5 rounded-full font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#FF6B00' }}>
                Ajouter au groupe
              </button>
              <button onClick={() => { setShowAddMember(false); setError(''); setSelectedMemberId(''); }} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary" style={{ backgroundColor: '#212121' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" onClick={() => setShowDelete(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-sm rounded-2xl p-5 text-center" style={{ backgroundColor: '#181818' }} onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#E5133220' }}>
              <Trash2 className="w-6 h-6 text-[#E51332]" />
            </div>
            <h3 className="text-text-primary font-bold text-lg mb-2">Supprimer {orgUnit.name} ?</h3>
            <p className="text-text-tertiary text-sm mb-1">Cette action est irréversible.</p>
            <p className="text-text-tertiary text-xs mb-4">La caisse et toutes les transactions associées seront supprimées.</p>
            <button onClick={handleDelete} className="w-full py-3.5 rounded-full font-semibold text-white mb-3" style={{ backgroundColor: '#E51332' }}>Supprimer</button>
            <button onClick={() => setShowDelete(false)} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary" style={{ backgroundColor: '#212121' }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
