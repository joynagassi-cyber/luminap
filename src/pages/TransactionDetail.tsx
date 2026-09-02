import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Edit3, Clock } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { useLocalStore, canActOnTransaction } from '@/store/useLocalStore';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import BottomNav from '@/components/BottomNav';

export default function TransactionDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { transactions, approveTransaction, rejectTransaction, deleteTransaction, user } = useLocalStore();
  const [showRejectComment, setShowRejectComment] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  const transaction = transactions.find(t => t.id === id);

  if (!transaction) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-text-tertiary mb-4">Transaction introuvable</p>
          <button onClick={() => navigate('/finance')} className="px-5 py-3 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
            Retour au grand livre
          </button>
        </div>
      </div>
    );
  }

  const isIncome = transaction.type === 'INCOME';
  const statusColor = getStatusColor(transaction.status);
  const canApprove = canActOnTransaction(transaction, 'approve', user);
  const canReject = canActOnTransaction(transaction, 'reject', user);
  const canEdit = canActOnTransaction(transaction, 'edit', user);
  const canDelete = canActOnTransaction(transaction, 'delete', user);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
  };

  const handleApprove = () => {
    approveTransaction(transaction.id, user?.id || '');
    navigate('/finance');
  };

  const handleReject = () => {
    if (!rejectComment.trim()) {
      showError('Veuillez fournir un motif de rejet');
      return;
    }
    rejectTransaction(transaction.id, rejectComment);
    navigate('/finance');
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    deleteTransaction(transaction.id);
    navigate('/finance');
  };

  const handleEdit = () => {
    navigate(`/transaction/${transaction.id}/edit`);
  };

  const handleCreateCorrection = () => {
    navigate('/transaction/new', { state: { compensateFor: transaction.id } });
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Transaction</h1>
          <div className="ml-auto">
            <StatusBadge status={transaction.status} size="md" />
          </div>
        </div>

        {/* Hero Card */}
        <div className="rounded-xl p-5 mb-5 text-center" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-sm font-medium px-3 py-1 rounded-full" style={{ backgroundColor: isIncome ? '#1DB95420' : '#E5133220', color: isIncome ? '#1DB954' : '#E51332' }}>
              {isIncome ? 'Entrée' : 'Sortie'}
            </span>
            {transaction.orgUnit && (
              <span className="text-sm text-text-tertiary">{transaction.orgUnit.name}</span>
            )}
          </div>
          <p className="text-3xl font-black tabular-nums mb-1" style={{ color: isIncome ? '#1DB954' : '#E51332' }}>
            {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
          </p>
          <p className="text-text-tertiary text-sm">FCFA</p>
          <p className="text-text-tertiary text-xs mt-2">{formatDate(transaction.date)}</p>
        </div>

        {/* Details */}
        <div className="mb-5">
          <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Détails</p>
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#212121' }}>
            {[
              { label: 'Description', value: transaction.description || '—' },
              { label: 'Catégorie', value: transaction.category?.labelFr || '—' },
              { label: 'Date', value: formatDate(transaction.date) },
              { label: 'Créée le', value: formatDate(transaction.createdAt) },
              { label: 'Créée par', value: transaction.creator?.firstName || '—' },
              ...(transaction.approvedAt ? [
                { label: 'Approuvée le', value: transaction.approvedAt ? formatDate(transaction.approvedAt) : '—' },
                { label: 'Approuvée par', value: transaction.approver?.firstName || '—' },
              ] : []),
              ...(transaction.comment ? [{ label: 'Commentaire', value: transaction.comment }] : []),
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-0" style={{ borderBottomColor: '#282828' }}>
                <span className="text-text-tertiary text-sm">{row.label}</span>
                <span className="text-text-primary text-sm font-medium max-w-48 text-right truncate">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mb-5">
          <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Actions</p>
          <div className="space-y-2">
            {transaction.status === 'DRAFT' && canEdit && (
              <>
                <button onClick={handleEdit} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>
                  <Edit3 className="w-4 h-4" />Modifier
                </button>
                <button onClick={() => { useLocalStore.getState().updateTransaction(transaction.id, { status: 'PENDING' }); navigate('/finance'); }} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FFB800', color: '#121212' }}>
                  <Clock className="w-4 h-4" />Soumettre pour approbation
                </button>
              </>
            )}

            {transaction.status === 'PENDING' && canApprove && (
              <button onClick={handleApprove} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#1DB954', color: '#FFFFFF' }}>
                <Check className="w-4 h-4" />Approuver
              </button>
            )}
            {transaction.status === 'PENDING' && canReject && (
              <button onClick={() => setShowRejectComment(true)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#E51332', color: '#FFFFFF' }}>
                <X className="w-4 h-4" />Rejeter
              </button>
            )}

            {transaction.status === 'APPROVED' && (
              <button onClick={handleCreateCorrection} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>
                <Edit3 className="w-4 h-4" />Corriger (contre-transactions)
              </button>
            )}

            {transaction.status === 'REJECTED' && canEdit && (
              <button onClick={handleEdit} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>
                <Edit3 className="w-4 h-4" />Réviser
              </button>
            )}
            {transaction.status === 'REJECTED' && canDelete && (
              <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>
                <X className="w-4 h-4" />Supprimer
              </button>
            )}
          </div>
        </div>

        {/* Audit Section */}
        <div className="mb-6 pb-6">
          <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Journal d'audit</p>
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#212121' }}>
            {[
              { action: 'CRÉÉE', time: transaction.createdAt, user: user?.firstName || '—' },
              ...(transaction.status === 'PENDING' ? [{ action: 'SOUMISE', time: transaction.updatedAt, user: user?.firstName || '—' }] : []),
              ...(transaction.approvedAt ? [{ action: 'APPROUVÉE', time: transaction.approvedAt, user: user?.firstName || '—' }] : []),
              ...(transaction.status === 'REJECTED' && transaction.comment ? [{ action: 'REJETÉE', time: transaction.updatedAt, user: 'Admin', comment: transaction.comment }] : []),
            ].map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderBottomColor: '#282828' }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF6B00' }} />
                <div className="flex-1">
                  <p className="text-text-primary text-sm font-medium">{entry.action}</p>
                  <p className="text-text-tertiary text-xs">{entry.user} · {formatDate(entry.time)}</p>
                  {entry.comment && <p className="text-text-tertiary text-xs mt-1">{entry.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectComment && (
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowRejectComment(false)} />
            <div className="relative w-full rounded-t-2xl p-6 pb-8" style={{ backgroundColor: '#212121' }}>
              <div className="w-12 h-1 rounded-full bg-surface-active mx-auto mb-4" />
              <h3 className="text-lg font-bold text-text-primary mb-4">Motif du rejet</h3>
              <textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Veuillez décrire le motif du rejet..." className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none resize-none mb-4" style={{ backgroundColor: '#121212', minHeight: '100px' }} rows={3} />
              <div className="flex gap-3">
                <button onClick={() => setShowRejectComment(false)} className="flex-1 py-3 rounded-full text-sm font-semibold" style={{ backgroundColor: '#282828', color: '#B3B3B3' }}>Annuler</button>
                <button onClick={handleReject} className="flex-1 py-3 rounded-full text-sm font-semibold" style={{ backgroundColor: '#E51332', color: '#FFFFFF' }}>Confirmer le rejet</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title="Supprimer la transaction"
          description="Cette action est irréversible. La transaction sera supprimée définitivement."
          confirmLabel="Supprimer"
          confirmVariant="danger"
          requiredText="SUPPRIMER"
        />
      </div>

      <BottomNav />

      {/* Error Modal */}
      <ConfirmModal
        open={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onConfirm={() => setShowErrorModal(false)}
        title="Erreur"
        description={errorMsg}
        confirmLabel="Compris"
        confirmVariant="primary"
      />
    </div>
  );
}
