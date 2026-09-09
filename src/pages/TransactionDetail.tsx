import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { useTransactions, useCategories, useOrgUnits, useEvents } from '@/lib/dataLayer';
import { formatCurrencyCompact, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';
import { ArrowLeft, Check, X, Edit2, Trash2, AlertCircle, RotateCcw } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { security } from '@/capabilities/security';
import { IonPage, IonHeader, IonContent, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/react';

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transactions: idbTxs, approveTransaction, deleteTransaction, user, events: idbEvents, orgUnits: idbOrgUnits, categories: idbCategories } = useLocalStore();

  // PowerSync with fallback
  const { data: psTransactions } = useTransactions();
  const { data: psEvents } = useEvents();
  const { data: psOrgUnits } = useOrgUnits();
  const { data: psCategories } = useCategories();

  const transactions = psTransactions ?? idbTxs;
  const events = psEvents ?? idbEvents;
  const orgUnits = psOrgUnits ?? idbOrgUnits;
  const categories = psCategories ?? idbCategories;

  const [showActions, setShowActions] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseReason, setReverseReason] = useState('');

  const tx = transactions.find((t: any) => t.id === id);
  if (!tx) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/" />
            </IonButtons>
            <IonTitle>Transaction</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="bg-canvas">
          <div className="min-h-screen bg-canvas flex items-center justify-center">
            <p className="text-text-tertiary">Transaction introuvable</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const isIncome = tx.type === 'INCOME';
  const category = tx.category || categories.find((c: any) => c.id === tx.category_id || c.id === tx.categoryId);
  const orgUnit = tx.orgUnit || orgUnits.find((o: any) => o.id === tx.org_unit_id || o.id === tx.orgUnitId);
  const event = tx.event || events.find((e: any) => e.id === tx.event_id || e.id === tx.eventId);

  const handleApprove = async () => {
    if (!security.hasPermission(user.role, 'transaction:approve')) {
      return;
    }
    await approveTransaction(tx.id, user.id);
    navigate(-1);
  };

  const handleRejectConfirm = async () => {
    if (!security.hasPermission(user.role, 'transaction:approve')) {
      return;
    }
    if (!rejectComment.trim()) return;
    await useLocalStore.getState().updateTransaction(tx.id, { status: 'REJECTED', comment: rejectComment.trim() });
    setShowRejectModal(false);
    setRejectComment('');
    navigate(-1);
  };

  const handleDelete = async () => {
    if (!security.hasPermission(user.role, 'transaction:delete')) {
      return;
    }
    await deleteTransaction(tx.id);
    navigate(-1);
  };

  const handleReverse = async () => {
    if (!reverseReason.trim()) return;
    if (!security.hasPermission(user.role, 'transaction:approve')) {
      return;
    }
    await useLocalStore.getState().reverseTransaction(tx.id, reverseReason.trim());
    setShowReverseModal(false);
    setReverseReason('');
    navigate(-1);
  };

  // Find reversal transaction if exists
  const reversal = tx.reversalOfId
    ? transactions.find((t: any) => t.reversal_of_id === tx.id || t.reversalOfId === tx.id)
    : null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Transaction</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Transaction" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </button>

        {/* Amount */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: isIncome ? '#1DB95420' : '#E5133220' }}>
            {isIncome
              ? <Check className="w-8 h-8" style={{ color: '#1DB954' }} />
              : <X className="w-8 h-8" style={{ color: '#E51332' }} />
            }
          </div>
          <p className={`text-4xl font-black tabular-nums ${isIncome ? 'text-income' : 'text-expense'}`}>
            {isIncome ? '+' : '-'}{formatCurrencyCompact(tx.amount)} F
          </p>
          <p className="text-text-tertiary text-sm mt-2">{formatDate(tx.date)}</p>
        </div>

        {/* Description */}
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#212121' }}>
          <p className="text-text-primary font-medium text-base">{tx.description}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {category && (
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>
                {category.label_fr || category.label}
              </span>
            )}
            {orgUnit && (
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: '#3B82F620', color: '#3B82F6' }}>
                {orgUnit.name}
              </span>
            )}
            {event && (
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: '#8B5CF620', color: '#8B5CF6' }}>
                {event.name}
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: getStatusColor(tx.status) + '20', color: getStatusColor(tx.status) }}>
              {getStatusLabel(tx.status)}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#212121' }}>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-tertiary text-sm">Type</span>
              <span className="text-text-primary text-sm font-medium">{tx.type === 'INCOME' ? 'Entrée' : 'Sortie'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary text-sm">Caisse</span>
              <span className="text-text-primary text-sm font-medium">{tx.source_caisse_id || tx.sourceCaisseId || 'Principale'}</span>
            </div>
            {tx.comment && (
              <div className="flex justify-between">
                <span className="text-text-tertiary text-sm">Commentaire</span>
                <span className="text-text-primary text-sm font-medium text-right max-w-[60%]">{tx.comment}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-tertiary text-sm">Créé le</span>
              <span className="text-text-primary text-sm font-medium">{formatDate(tx.created_at || tx.createdAt)}</span>
            </div>
            {tx.approved_at && (
              <div className="flex justify-between">
                <span className="text-text-tertiary text-sm">Approuvé le</span>
                <span className="text-text-primary text-sm font-medium">{formatDate(tx.approved_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 mb-6">
          {tx.status === 'PENDING' && (
            <>
              {security.hasRole(user.role, 'transaction', 'approve') && (
                <button
                  onClick={handleApprove}
                  className="w-full py-4 rounded-full font-semibold text-white text-sm transition-all active:scale-95"
                  style={{ backgroundColor: '#1DB954' }}
                >
                  Approuver
                </button>
              )}
              {security.hasRole(user.role, 'transaction', 'reject') && (
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95"
                  style={{ backgroundColor: '#212121', color: '#E51332', border: '1px solid #E5133230' }}
                >
                  Rejeter
                </button>
              )}
            </>
          )}
          {tx.status === 'APPROVED' && (
            <button
              onClick={() => setShowReverseModal(true)}
              className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95"
              style={{ backgroundColor: '#212121', color: '#FFB800', border: '1px solid #FFB80030' }}
            >
              Contre-transagir
            </button>
          )}
          {(tx.status === 'DRAFT' || tx.status === 'PENDING') && (
            <button
              onClick={() => navigate(`/transaction/edit/${id}`)}
              className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95"
              style={{ backgroundColor: '#212121', color: '#3B82F6', border: '1px solid #3B82F630' }}
            >
              Modifier
            </button>
          )}
          {(tx.status === 'DRAFT' || tx.status === 'PENDING') && security.hasRole(user.role, 'transaction', 'delete') && (
            <button
              onClick={handleDelete}
              className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95"
              style={{ backgroundColor: '#212121', color: '#E51332', border: '1px solid #E5133230' }}
            >
              Supprimer
            </button>
          )}
        </div>

        {/* Reversal */}
        {reversal && (
          <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#212121', border: '1px solid #FFB80030' }}>
            <p className="text-text-tertiary text-xs mb-2">Contre-transaction</p>
            <p className="text-text-primary text-sm font-medium">{reversal.description}</p>
            <p className="text-text-tertiary text-xs mt-1">{formatDate(reversal.date)}</p>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: '#1e1e1e' }}>
              <h3 className="text-text-primary font-semibold text-lg mb-4">Rejeter la transaction</h3>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Raison du rejet (optionnel)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4 resize-none"
                style={{ backgroundColor: '#282828', color: '#fff', border: '1px solid #383838' }}
              />
              <div className="flex gap-2">
                <button onClick={handleRejectConfirm} className="flex-1 py-3 rounded-full font-semibold text-white text-sm" style={{ backgroundColor: '#E51332' }}>
                  Rejeter
                </button>
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-3 rounded-full font-medium text-sm" style={{ backgroundColor: '#282828' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reverse Modal */}
        {showReverseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: '#1e1e1e' }}>
              <h3 className="text-text-primary font-semibold text-lg mb-4">Contre-transagir</h3>
              <p className="text-text-tertiary text-sm mb-4">Raison de la contre-transaction</p>
              <textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="Ex: Erreur de montant"
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4 resize-none"
                style={{ backgroundColor: '#282828', color: '#fff', border: '1px solid #383838' }}
              />
              <div className="flex gap-2">
                <button onClick={handleReverse} className="flex-1 py-3 rounded-full font-semibold text-white text-sm" style={{ backgroundColor: '#FFB800' }}>
                  Confirmer
                </button>
                <button onClick={() => setShowReverseModal(false)} className="px-4 py-3 rounded-full font-medium text-sm" style={{ backgroundColor: '#282828' }}>
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
