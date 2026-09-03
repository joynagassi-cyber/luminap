import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingDown, TrendingUp, ChevronRight, CheckCircle } from 'lucide-react';
import { formatCurrencyCompact } from '@/lib/utils';
import { useLocalStore } from '@/store/useLocalStore';
import type { Caisse } from '@/types';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { PageSkeleton } from '@/components/Skeleton';
import ConfirmModal from '@/components/ConfirmModal';

export default function Versement() {
  const navigate = useNavigate();
  const { caisses, transactions, versement, isLoading } = useLocalStore();
  const [selectedCaisse, setSelectedCaisse] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastVersementAmount, setLastVersementAmount] = useState(0);

  const groupCaisses = caisses.filter(c => c.type === 'GROUP');

  const getCaisseBalance = (caisse: Caisse) => {
    const txs = transactions.filter(t => t.sourceCaisseId === caisse.id && t.status === 'APPROVED');
    const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return income - expense;
  };

  const handleVersement = async (caisseId: string, amount: number) => {
    if (isProcessing || amount <= 0) return;
    setIsProcessing(true);
    try {
      await versement(caisseId, amount, `Versement automatique`);
      setLastVersementAmount(amount);
      setShowSuccessModal(true);
    } catch (err) {
      setErrorMsg(String(err));
      setShowErrorModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopHeader title="Versement" showBack />
        <PageSkeleton />
        <BottomNav />
      </div>
    );
  }

  const selectedCaisseData = caisses.find(c => c.id === selectedCaisse);
  const selectedBalance = selectedCaisseData ? getCaisseBalance(selectedCaisseData) : 0;
  const versementAmount = customAmount ? parseFloat(customAmount) * 100 : selectedBalance;

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Versement" showBack />
      <div className="max-w-lg mx-auto px-5 pb-24">

        <p className="text-text-tertiary text-sm mb-5">
          Transférez les fonds des caisses de groupe vers la caisse principale de l'église.
        </p>

        {/* Caisse Selection */}
        <div className="mb-5">
          <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Sélectionnez un groupe</p>
          <div className="space-y-2">
            {groupCaisses.map((caisse) => {
              const balance = getCaisseBalance(caisse);
              const isSelected = selectedCaisse === caisse.id;
              return (
                <button
                  key={caisse.id}
                  onClick={() => { setSelectedCaisse(caisse.id); setCustomAmount(''); }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all active:scale-98"
                  style={{
                    backgroundColor: isSelected ? caisse.color + '15' : '#212121',
                    border: isSelected ? `2px solid ${caisse.color}60` : '1px solid #282828',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: caisse.color + '20' }}
                  >
                    <Wallet className="w-5 h-5" style={{ color: caisse.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-semibold text-sm">{caisse.name}</p>
                    <p className="text-text-tertiary text-xs mt-0.5">Solde disponible</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold tabular-nums" style={{ color: balance >= 0 ? '#1DB954' : '#E51332' }}>
                      {balance >= 0 ? '+' : '-'}{formatCurrencyCompact(Math.abs(balance))}
                    </p>
                    <p className="text-text-tertiary text-xs">FCFA</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Versement Options */}
        {selectedCaisseData && (
          <div className="mb-6 pb-6" style={{ borderTop: '1px solid #282828' }}>
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Montant à verser</p>

            {/* Balance display */}
            <div className="flex items-center justify-between p-4 rounded-xl mb-3" style={{ backgroundColor: '#212121', border: `1px solid ${selectedCaisseData.color}30` }}>
              <div>
                <p className="text-text-tertiary text-xs">Solde {selectedCaisseData.name}</p>
                <p className="text-xl font-black tabular-nums" style={{ color: selectedBalance >= 0 ? '#1DB954' : '#E51332' }}>
                  {selectedBalance >= 0 ? '' : '-'}{formatCurrencyCompact(Math.abs(selectedBalance))} <span className="text-sm font-medium text-text-tertiary">FCFA</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedCaisseData.color + '20' }}>
                <TrendingUp className="w-5 h-5" style={{ color: selectedCaisseData.color }} />
              </div>
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { setCustomAmount(''); setSelectedCaisse(selectedCaisse!); }}
                className={`flex-1 py-2.5 rounded-full text-xs font-semibold transition-all ${selectedBalance > 0 ? 'active:scale-95' : ''}`}
                style={{
                  backgroundColor: !customAmount ? selectedCaisseData.color : '#212121',
                  color: !customAmount ? '#FFFFFF' : '#808080',
                  border: !customAmount ? `1px solid ${selectedCaisseData.color}` : '1px solid #282828',
                }}
              >
                Tout verser ({formatCurrencyCompact(selectedBalance)} FCFA)
              </button>
            </div>

            {/* Custom amount */}
            <div className="mb-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">FCFA</span>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Montant personnalisé"
                  className="w-full pl-16 pr-4 py-3 rounded-full text-text-primary text-sm outline-none"
                  style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                  min="0"
                  max={selectedBalance / 100}
                />
              </div>
              {customAmount && parseFloat(customAmount) > selectedBalance / 100 && (
                <p className="text-xs mt-1" style={{ color: '#E51332' }}>
                  Le montant ne peut pas dépasser le solde ({formatCurrencyCompact(selectedBalance)} FCFA)
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Récapitulatif</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary flex items-center gap-2">
                    <TrendingDown className="w-3.5 h-3.5" style={{ color: '#E51332' }} />
                    {selectedCaisseData.name}
                  </span>
                  <span className="font-bold" style={{ color: '#E51332' }}>
                    -{formatCurrencyCompact(versementAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: '#1DB954' }} />
                    Caisse principale
                  </span>
                  <span className="font-bold" style={{ color: '#1DB954' }}>
                    +{formatCurrencyCompact(versementAmount)}
                  </span>
                </div>
                <div className="border-t pt-2" style={{ borderColor: '#282828' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-text-tertiary text-xs">Solde après versement</span>
                    <span className="text-sm font-bold" style={{ color: selectedBalance - versementAmount >= 0 ? '#1DB954' : '#E51332' }}>
                      {(selectedBalance - versementAmount) >= 0 ? '' : '-'}{formatCurrencyCompact(Math.abs(selectedBalance - versementAmount))} FCFA
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Versement button */}
            <button
              onClick={() => handleVersement(selectedCaisse!, versementAmount)}
              disabled={versementAmount <= 0 || isProcessing}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: versementAmount > 0 ? '#FF6B00' : '#282828', color: versementAmount > 0 ? '#FFFFFF' : '#808080' }}
            >
              {isProcessing ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /></>
              ) : (
                <><CheckCircle className="w-4 h-4" />Verser {formatCurrencyCompact(versementAmount)} FCFA vers la caisse principale</>
              )}
            </button>
          </div>
        )}

        {!selectedCaisse && (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-text-tertiary" />
            <p className="text-text-tertiary text-sm">Sélectionnez un groupe pour effectuer un versement</p>
          </div>
        )}
      </div>

      <ConfirmModal
        open={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onConfirm={() => setShowErrorModal(false)}
        title="Erreur"
        description={errorMsg}
        confirmLabel="Compris"
        confirmVariant="primary"
      />

      <ConfirmModal
        open={showSuccessModal}
        onClose={() => { setShowSuccessModal(false); navigate(-1); }}
        onConfirm={() => { setShowSuccessModal(false); navigate(-1); }}
        title="Versement effectué !"
        description={`${formatCurrencyCompact(lastVersementAmount || versementAmount)} FCFA ont été transférés de ${selectedCaisseData?.name || 'ce groupe'} vers la Caisse principale.`}
        confirmLabel="Parfait"
        confirmVariant="primary"
      />

      <BottomNav />
    </div>
  );
}
