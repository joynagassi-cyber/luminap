import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';
import { ArrowLeft, Check, X, Edit2, Trash2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transactions, approveTransaction, deleteTransaction, user } = useLocalStore();
  const [showActions, setShowActions] = useState(false);

  const tx = transactions.find(t => t.id === id);
  if (!tx) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-text-tertiary">Transaction introuvable</p>
      </div>
    );
  }

  const isIncome = tx.type === 'INCOME';
  const category = tx.category || { labelFr: tx.categoryId };
  const orgUnit = tx.orgUnit;

  const handleApprove = async () => {
    await approveTransaction(tx.id, user.id);
    navigate(-1);
  };

  const handleReject = async () => {
    await useLocalStore.getState().updateTransaction(tx.id, { status: 'REJECTED' });
    navigate(-1);
  };

  const handleDelete = async () => {
    await deleteTransaction(tx.id);
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Transaction" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>

        {/* Amount */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: isIncome ? '#1DB95420' : '#E5133220' }}>
            <span className="text-3xl">{isIncome ? '↑' : '↓'}</span>
          </div>
          <p className="text-4xl font-black" style={{ color: isIncome ? '#1DB954' : '#E51332' }}>
            {isIncome ? '+' : '-'}{formatCurrencyCompact(tx.amount)}
          </p>
          <p className="text-text-tertiary text-sm mt-1">FCFA</p>
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: getStatusColor(tx.status) + '20', color: getStatusColor(tx.status) }}>
            {getStatusLabel(tx.status)}
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl p-4 space-y-4 mb-6" style={{ backgroundColor: '#212121' }}>
          <div className="flex justify-between">
            <span className="text-text-tertiary text-sm">Description</span>
            <span className="text-text-primary text-sm font-medium">{tx.description || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary text-sm">Catégorie</span>
            <span className="text-text-primary text-sm font-medium">{category.labelFr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary text-sm">Date</span>
            <span className="text-text-primary text-sm font-medium">{formatDate(tx.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary text-sm">Groupe</span>
            <span className="text-text-primary text-sm font-medium">{orgUnit?.name || 'Principal'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary text-sm">Caisse</span>
            <span className="text-text-primary text-sm font-medium">{tx.sourceCaisseId || 'Principal'}</span>
          </div>
          {tx.comment && (
            <div className="flex justify-between">
              <span className="text-text-tertiary text-sm">Commentaire</span>
              <span className="text-text-primary text-sm font-medium">{tx.comment}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {(tx.status === 'DRAFT' || tx.status === 'REJECTED') && (
          <div className="space-y-2 mb-6">
            <button onClick={() => navigate(`/transaction/${id}/edit`)} className="w-full py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>
              <Edit2 className="w-4 h-4" /> Modifier
            </button>
            <button onClick={handleDelete} className="w-full py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          </div>
        )}

        {tx.status === 'PENDING' && (
          <div className="space-y-2 mb-6">
            <button onClick={handleApprove} className="w-full py-3.5 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2" style={{ backgroundColor: '#1DB954' }}>
              <Check className="w-4 h-4" /> Approuver
            </button>
            <button onClick={handleReject} className="w-full py-3.5 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2" style={{ backgroundColor: '#E51332' }}>
              <X className="w-4 h-4" /> Rejeter
            </button>
          </div>
        )}

        {tx.status === 'APPROVED' && (
          <div className="text-center py-6 rounded-xl" style={{ backgroundColor: '#1DB95415', border: '1px solid #1DB95430' }}>
            <Check className="w-8 h-8 mx-auto mb-2 text-income" />
            <p className="text-income font-medium text-sm">Transaction approuvée</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
