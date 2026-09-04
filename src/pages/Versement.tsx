import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact } from '@/lib/utils';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
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

  const groupCaisses = caisses.filter(c => c.type === 'GROUP');
  const selected = groupCaisses.find(c => c.id === selectedCaisse);

  const approvedTxs = transactions.filter(t => t.sourceCaisseId === selectedCaisse && t.status === 'APPROVED');
  const balance = approvedTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) - approvedTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balanceFCFA = Math.round(balance / 100);

  const maxAmount = Math.max(0, balanceFCFA);
  const amountNum = Math.round(parseFloat(amount || '0'));
  const isValid = amountNum > 0 && amountNum <= maxAmount;

  const handleConfirm = async () => {
    if (!isValid || !selectedCaisse) return;
    const versementId = Date.now().toString(36);
    const mainCaisse = caisses.find(c => c.id === 'main');
    if (!mainCaisse) return;

    const amountCents = amountNum * 100;
    const now = new Date().toISOString();
    const sessionId = localStorage.getItem('lumina-session') || 'local-user';

    // Source transaction (debit from group)
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

    // Target transaction (credit to main)
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

    // Add both transactions
    await addTransaction(sourceTx);
    await addTransaction(targetTx);
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

        {showConfirm ? (
          <div className="space-y-4">
            <div className="rounded-xl p-5 text-center" style={{ backgroundColor: '#212121' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#FF6B0020' }}>
                <Check className="w-8 h-8" style={{ color: '#FF6B00' }} />
              </div>
              <p className="text-text-tertiary text-sm mb-1">Confirmer le versement</p>
              <p className="text-3xl font-black" style={{ color: '#FF6B00' }}>{formatCurrencyCompact(amountNum)} <span className="text-text-tertiary text-base font-medium">FCFA</span></p>
              <p className="text-text-tertiary text-xs mt-2">De {selected?.name} → Caisse principale</p>
              {comment && <p className="text-text-tertiary text-xs mt-2 italic">"{comment}"</p>}
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
                        <span className="text-lg">{c.color === '#3B82F6' ? '👔' : c.color === '#8B5CF6' ? '👦' : c.color === '#EC4899' ? '👩' : c.color === '#14B8A6' ? '👨' : c.color === '#F59E0B' ? '🎵' : '👥'}</span>
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

                <button onClick={() => isValid && setShowConfirm(true)} disabled={!isValid} className="w-full py-4 rounded-full font-semibold text-white transition-all active:scale-95 disabled:opacity-40" style={{ backgroundColor: '#FF6B00' }}>
                  Confirmer
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
