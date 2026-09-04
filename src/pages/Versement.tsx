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
  const { caisses, transactions, addTransaction } = useLocalStore();
  const [selectedCaisse, setSelectedCaisse] = useState<string>((location.state as any)?.caisseId || '');
  const [amount, setAmount] = useState<string>((location.state as any)?.defaultAmount ? String(Math.round((location.state as any).defaultAmount / 100)) : '');
  const [comment, setComment] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewTx, setPreviewTx] = useState<{ source: any; target: any } | null>(null);

  const groupCaisses = caisses.filter(c => c.type === 'GROUP');
  const selected = groupCaisses.find(c => c.id === selectedCaisse);

  // Re-calculate balance fresh each time
  const approvedTxs = transactions.filter(t => t.sourceCaisseId === selectedCaisse && t.status === 'APPROVED');
  const balance = approvedTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) - approvedTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balanceFCFA = Math.round(balance / 100);

  const maxAmount = Math.max(0, balanceFCFA);
  const amountNum = Math.round(parseFloat(amount || '0'));
  const isValid = amountNum > 0 && amountNum <= maxAmount;

  const buildPreview = () => {
    const versementId = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const mainCaisse = caisses.find(c => c.id === 'main');
    if (!mainCaisse) return;
    const amountCents = amountNum * 100;
    const now = new Date().toISOString();
    const sessionId = localStorage.getItem('lumina-session') || 'local-user';

    const sourceTx = {
      id: versementId + '_src',
      orgId: 'org-1' as const,
      type: 'EXPENSE' as const,
      amount: amountCents,
      description: `Versement vers caisse principale`,
      date: now.split('T')[0],
      status: 'APPROVED' as const,
      createdAt: now,
      updatedAt: now,
      createdById: sessionId,
      approvedById: sessionId,
      approvedAt: now,
      categoryId: 'cat-dime',
      orgUnitId: selectedCaisse,
      eventId: null,
      source: 'CAISSE' as const,
      personName: null,
      compensatesFor: null,
      comment: `Versement ${amountNum} FCFA → Caisse principale`,
      version: 1,
      sourceCaisseId: selectedCaisse,
      versementId,
    };

    const targetTx = {
      id: versementId + '_tgt',
      orgId: 'org-1' as const,
      type: 'INCOME' as const,
      amount: amountCents,
      description: `Versement de ${selected?.name || 'groupe'}`,
      date: now.split('T')[0],
      status: 'APPROVED' as const,
      createdAt: now,
      updatedAt: now,
      createdById: sessionId,
      approvedById: sessionId,
      approvedAt: now,
      categoryId: 'cat-dime',
      orgUnitId: null,
      eventId: null,
      source: 'CAISSE' as const,
      personName: null,
      compensatesFor: null,
      comment: `Versement ${amountNum} FCFA de ${selected?.name || 'groupe'} → Caisse principale`,
      version: 1,
      sourceCaisseId: 'main',
      versementId,
    };

    setPreviewTx({ source: sourceTx, target: targetTx });
  };

  const handleConfirm = async () => {
    if (!isValid || !selectedCaisse || !previewTx) return;
    await addTransaction(previewTx.source);
    await addTransaction(previewTx.target);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Versement" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <h1 className="text-text-primary font-bold text-xl mb-6">Verser à la caisse principale</h1>

        {showConfirm && previewTx ? (
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
                  <p className="text-text-tertiary text-xs">Débit — Solde après: {formatCurrencyCompact(maxAmount - amountNum)} FCFA</p>
                </div>
                <span className="text-[#E51332] font-bold text-sm">-{formatCurrencyCompact(amountNum)} F</span>
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
                <span className="text-[#1DB954] font-bold text-sm">+{formatCurrencyCompact(amountNum)} F</span>
              </div>

              {comment && <p className="text-text-tertiary text-xs mt-3 text-center italic">"{comment}"</p>}
            </div>
            <button onClick={handleConfirm} className="w-full py-4 rounded-full font-semibold text-white transition-all active:scale-95" style={{ backgroundColor: '#FF6B00' }}>
              Confirmer le versement
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
                {groupCaisses.map((c) => {
                  const txs = transactions.filter(t => t.sourceCaisseId === c.id && t.status === 'APPROVED');
                  const bal = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) - txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
                  return (
                    <button key={c.id} onClick={() => { setSelectedCaisse(c.id); setAmount(''); }} className="w-full text-left rounded-xl p-4 flex items-center gap-3 transition-all" style={selectedCaisse === c.id ? { backgroundColor: c.color + '20', border: `1px solid ${c.color}` } : { backgroundColor: '#212121', border: '1px solid #282828' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: c.color + '20' }}>
                        <Wallet className="w-5 h-5" style={{ color: c.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-text-primary text-sm font-semibold">{c.name}</p>
                        <p className="text-text-tertiary text-xs">Solde: {formatCurrencyCompact(Math.round(bal / 100))} FCFA</p>
                      </div>
                      {selectedCaisse === c.id && <Check className="w-5 h-5" style={{ color: c.color }} />}
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
                    <span className="text-text-tertiary text-xs">Solde disponible: <span style={{ color: '#1DB954' }}>{formatCurrencyCompact(maxAmount)} FCFA</span></span>
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

                <button onClick={() => isValid && buildPreview()} disabled={!isValid} className="w-full py-4 rounded-full font-semibold text-white transition-all active:scale-95 disabled:opacity-40" style={{ backgroundColor: '#FF6B00' }}>
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
