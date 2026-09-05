import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact } from '@/lib/utils';
import { ArrowLeft, Check, AlertCircle, Wallet, RefreshCw } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function Versement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { caisses, accounts, transactions, createVersement } = useLocalStore();
  const [selectedCaisse, setSelectedCaisse] = useState<string>((location.state as any)?.caisseId || '');
  const [amount, setAmount] = useState<string>((location.state as any)?.defaultAmount ? String(Math.round((location.state as any).defaultAmount / 100)) : '');
  const [comment, setComment] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const groupAccounts = accounts.filter(a => a.ownerType === 'GROUP' && a.status === 'ACTIVE');
  const selected = groupAccounts.find(a => a.id === selectedCaisse);

  // Re-calculate balance fresh each time
  const approvedTxs = transactions.filter(t => t.sourceCaisseId === selectedCaisse && t.status === 'APPROVED');
  const balance = approvedTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) - approvedTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balanceFCFA = Math.round(balance / 100);

  const maxAmount = Math.max(0, balanceFCFA);
  const amountNum = Math.round(parseFloat(amount || '0'));
  const isValid = amountNum > 0 && amountNum <= maxAmount;

  const handleConfirm = async () => {
    if (!isValid || !selectedCaisse) return;
    setIsLoading(true);
    try {
      await createVersement({
        sourceCaisseId: selectedCaisse,
        amount: amountNum * 100,
        comment: comment.trim() || undefined,
      });
      navigate('/');
    } catch (e) {
      console.error('[Versement] failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Versement" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <h1 className="text-text-primary font-bold text-xl mb-6">Verser à la caisse principale</h1>

        {showConfirm ? (
          <div className="space-y-4">
            <div className="rounded-xl p-5" style={{ backgroundColor: '#212121' }}>
              <p className="text-text-tertiary text-xs font-medium mb-3 text-center uppercase tracking-wider">Aperçu du versement</p>
              
              {/* Source side */}
              <div className="flex items-center gap-3 p-3 rounded-xl mb-3" style={{ backgroundColor: '#E5133210', border: '1px solid #E5133230' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E5133220' }}>
                  <ArrowLeft className="w-4 h-4" style={{ color: '#E51332', transform: 'rotate(90deg)' }} />
                </div>
                <div className="flex-1">
                  <p className="text-text-primary text-sm font-medium">{selected?.name}</p>
                  <p className="text-text-tertiary text-xs">Débit — Solde après: {formatCurrencyCompact((maxAmount - amountNum) * 100)} FCFA</p>
                </div>
                <span className="text-[#E51332] font-bold text-sm">-{formatCurrencyCompact(amountNum * 100)} F</span>
              </div>

              {/* Arrow */}
              <div className="flex justify-center my-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
                  <RefreshCw className="w-4 h-4" style={{ color: '#FF6B00' }} />
                </div>
              </div>

              {/* Target side */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#1DB95410', border: '1px solid #1DB95430' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1DB95420' }}>
                  <Check className="w-4 h-4" style={{ color: '#1DB954' }} />
                </div>
                <div className="flex-1">
                  <p className="text-text-primary text-sm font-medium">Caisse principale</p>
                  <p className="text-text-tertiary text-xs">Crédit</p>
                </div>
                <span className="text-[#1DB954] font-bold text-sm">+{formatCurrencyCompact(amountNum * 100)} F</span>
              </div>

              {comment && <p className="text-text-tertiary text-xs mt-3 text-center italic">"{comment}"</p>}
            </div>
            <button onClick={handleConfirm} disabled={isLoading} className="w-full py-4 rounded-full font-semibold text-white transition-all active:scale-95 disabled:opacity-40" style={{ backgroundColor: '#FF6B00' }}>
              {isLoading ? 'Traitement...' : 'Confirmer le versement'}
            </button>
            <button onClick={() => setShowConfirm(false)} className="w-full py-3 rounded-full font-medium text-sm" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>
              Annuler
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Caisse selector */}
            <div>
              <label className="text-text-tertiary text-xs mb-2 block">Groupe (caisse source)</label>
              <div className="space-y-2">
                {groupAccounts.map((a) => {
                    const caisse = useLocalStore.getState().getCaisseForDisplay(a.id);
                    const color = caisse?.color || '#FF6B00';
                    const txs = transactions.filter(t => t.sourceCaisseId === a.id && t.status === 'APPROVED');
                    const bal = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) - txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
                    return (
                      <button key={a.id} onClick={() => { setSelectedCaisse(a.id); setAmount(''); }} className="w-full text-left rounded-xl p-4 flex items-center gap-3 transition-all" style={selectedCaisse === a.id ? { backgroundColor: color + '20', border: `1px solid ${color}` } : { backgroundColor: '#212121', border: '1px solid #282828' }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                          <Wallet className="w-5 h-5" style={{ color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-text-primary text-sm font-semibold">{a.name}</p>
                          <p className="text-text-tertiary text-xs">Solde: {formatCurrencyCompact(bal)} FCFA</p>
                        </div>
                        {selectedCaisse === a.id && <Check className="w-5 h-5" style={{ color }} />}
                      </button>
                    );
                  })}
              </div>
            </div>

            {selected && (
              <>
                {/* Amount */}
                <div>
                  <label className="text-text-tertiary text-xs mb-2 block">Montant à verser (FCFA)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full px-4 py-3.5 rounded-xl text-text-primary text-lg font-bold outline-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
                  <div className="flex justify-between mt-2">
                    <span className="text-text-tertiary text-xs">Solde disponible: <span style={{ color: '#1DB954' }}>{formatCurrencyCompact(maxAmount * 100)} FCFA</span></span>
                    <button onClick={() => setAmount(String(maxAmount))} className="text-xs font-medium" style={{ color: '#FF6B00' }}>Tout verser</button>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="text-text-tertiary text-xs mb-2 block">Commentaire (optionnel)</label>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Note..." rows={2} className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none resize-none" style={{ backgroundColor: '#212121', border: '1px solid #282828' }} />
                </div>

                {!isValid && amountNum > 0 && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#E51332' }}>
                    <AlertCircle className="w-4 h-4" /> Montant supérieur au solde disponible
                  </div>
                )}

                <button onClick={() => setShowConfirm(true)} disabled={!isValid} className="w-full py-4 rounded-full font-semibold text-white transition-all active:scale-95 disabled:opacity-40" style={{ backgroundColor: '#FF6B00' }}>
                  Aperçu du versement
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
