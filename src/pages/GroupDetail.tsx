import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2, TrendingUp, TrendingDown, Wallet,
  Plus, Filter, X, Send,
} from 'lucide-react';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@/lib/utils';
import { useLocalStore } from '@/store/useLocalStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { PageSkeleton } from '@/components/Skeleton';
import ConfirmModal from '@/components/ConfirmModal';

function formatDateRange(start: string, end: string | null) {
  if (end) {
    const s = format(new Date(start), 'd MMM yyyy', { locale: fr });
    const e = format(new Date(end), 'd MMM yyyy', { locale: fr });
    return `${s} – ${e}`;
  }
  return format(new Date(start), 'd MMM yyyy', { locale: fr });
}


export default function GroupDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { orgUnits, transactions, categories, caisses, isLoading } = useLocalStore();

  const orgUnit = orgUnits.find(o => o.id === id);
  const caisse = caisses.find(c => c.id === id);
  // Use sourceCaisseId for filtering (new architecture)
  const groupTransactions = transactions.filter(t => t.sourceCaisseId === id);

  const totalIncome = groupTransactions.filter(t => t.type === 'INCOME' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const totalExpense = groupTransactions.filter(t => t.type === 'EXPENSE' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const pendingIncome = groupTransactions.filter(t => t.type === 'INCOME' && t.status === 'PENDING').reduce((s, t) => s + t.amount, 0);
  const pendingExpense = groupTransactions.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING').reduce((s, t) => s + t.amount, 0);

  const byCategory = new Map<string, { income: number; expense: number }>();
  for (const t of groupTransactions.filter(x => x.status === 'APPROVED')) {
    const existing = byCategory.get(t.categoryId) || { income: 0, expense: 0 };
    if (t.type === 'INCOME') existing.income += t.amount;
    else existing.expense += t.amount;
    byCategory.set(t.categoryId, existing);
  }

  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'PENDING'>('ALL');
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showVersementModal, setShowVersementModal] = useState(false);
  const [versementAmount, setVersementAmount] = useState('');

  const showError = (msg: string) => { setErrorMsg(msg); setShowErrorModal(true); };

  const handleVersement = () => {
    const amount = versementAmount ? parseFloat(versementAmount) * 100 : balance;
    if (amount <= 0) {
      showError('Montant invalide');
      return;
    }
    useLocalStore.getState().versement(id, amount, `Versement ${orgUnit?.name}`)
      .then(() => setShowVersementModal(false))
      .catch((err: any) => showError(String(err)));
  };

  const filteredTxs = groupTransactions
    .filter(t => {
      if (filter === 'INCOME') return t.type === 'INCOME';
      if (filter === 'EXPENSE') return t.type === 'EXPENSE';
      if (filter === 'PENDING') return t.status === 'PENDING';
      return true;
    })
    .filter(t => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return t.description.toLowerCase().includes(q) || t.category?.labelFr?.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (isLoading || !orgUnit) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopHeader title="Groupe" showBack />
        <PageSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title={orgUnit.name} showBack />
      <div className="max-w-lg mx-auto px-5 pb-24">

        {/* Hero Card */}
        <div className="rounded-xl p-5 mb-5 text-center" style={{
          backgroundColor: '#212121',
          border: `1px solid ${caisse?.color ? caisse.color + '40' : '#282828'}`,
        }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: caisse?.color ? caisse.color + '20' : '#FF6B0020' }}>
              <Building2 className="w-5 h-5" style={{ color: caisse?.color || '#FF6B00' }} />
            </div>
            <span className="text-text-tertiary text-sm capitalize">{orgUnit.type}</span>
          </div>
          <p className="text-text-tertiary text-sm mb-1">Solde de la caisse</p>
          <p className="text-3xl font-black tabular-nums mb-1" style={{ color: balance >= 0 ? '#1DB954' : '#E51332' }}>
            {balance >= 0 ? '' : '-'}{formatCurrencyCompact(Math.abs(balance))} <span className="text-sm font-medium text-text-tertiary">FCFA</span>
          </p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#1DB954' }} />
              <span className="text-text-tertiary text-sm">+{formatCurrencyCompact(totalIncome)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E51332' }} />
              <span className="text-text-tertiary text-sm">-{formatCurrencyCompact(totalExpense)}</span>
            </div>
          </div>
          {/* Verse to main caisse button */}
          {balance > 0 && (
            <button
              onClick={() => setShowVersementModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}
            >
              <Send className="w-3.5 h-3.5" />Verser à la caisse principale
            </button>
          )}
        </div>

        {/* Pending */}
        {(pendingIncome > 0 || pendingExpense > 0) && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {pendingIncome > 0 && (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: '#FFB80020', color: '#FFB800' }}>
                {formatCurrencyCompact(pendingIncome)} en attente (entrées)
              </span>
            )}
            {pendingExpense > 0 && (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: '#80808020', color: '#808080' }}>
                {formatCurrencyCompact(pendingExpense)} en attente (sorties)
              </span>
            )}
          </div>
        )}

        {/* ─── Filter & Search ─────────────────────────────────────── */}
        <div className="mb-4">
          {/* Filter chips */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {([
              { key: 'ALL', label: 'Tous', color: '#FF6B00' },
              { key: 'INCOME', label: 'Entrées', color: '#1DB954' },
              { key: 'EXPENSE', label: 'Sorties', color: '#E51332' },
              { key: 'PENDING', label: 'En attente', color: '#FFB800' },
            ] as const).map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all"
                style={{
                  backgroundColor: filter === key ? color + '25' : '#212121',
                  color: filter === key ? color : '#808080',
                  border: filter === key ? `1px solid ${color}50` : '1px solid #282828',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans les mouvements…"
              className="w-full pl-9 pr-9 py-2.5 rounded-full text-sm text-text-primary outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
                <X className="w-3 h-3 text-text-tertiary" />
              </button>
            )}
          </div>
        </div>

        {/* ─── By Category ─────────────────────────────────────────── */}
        {byCategory.size > 0 && (
          <div className="mb-5">
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">Par catégorie</p>
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
              <div className="flex items-center px-4 py-3 text-xs text-text-tertiary border-b" style={{ borderBottomColor: '#282828' }}>
                <span className="flex-1">Libellé</span>
                <span className="w-24 text-right">Entrées</span>
                <span className="w-24 text-right">Net</span>
              </div>
              {Array.from(byCategory.entries()).map(([catId, v]) => {
                const cat = categories.find(c => c.id === catId);
                return (
                  <div key={catId} className="flex items-center px-4 py-3 text-sm border-b last:border-0" style={{ borderBottomColor: '#282828' }}>
                    <span className="flex-1 text-text-primary">{cat?.labelFr || catId}</span>
                    <span className="w-24 text-right tabular-nums" style={{ color: '#1DB954' }}>{formatCurrencyCompact(v.income)}</span>
                    <span className="w-24 text-right tabular-nums font-medium" style={{ color: v.income - v.expense >= 0 ? '#1DB954' : '#E51332' }}>
                      {v.income - v.expense >= 0 ? '+' : ''}{formatCurrencyCompact(v.income - v.expense)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Transaction List ────────────────────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
              {filter === 'ALL' ? 'Tous les mouvements' : filter === 'INCOME' ? 'Entrées' : filter === 'EXPENSE' ? 'Sorties' : 'En attente'}
              <span className="text-text-tertiary ml-1 font-normal">({filteredTxs.length})</span>
            </p>
            <button onClick={() => navigate('/finance')} className="text-xs font-medium" style={{ color: '#FF6B00' }}>Tout voir</button>
          </div>
          <div className="space-y-2">
            {filteredTxs.length === 0 ? (
              <div className="text-center py-10 rounded-lg" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                <Wallet className="w-8 h-8 mx-auto mb-3 text-text-tertiary" />
                <p className="text-text-tertiary text-sm">Aucun mouvement</p>
                <p className="text-text-tertiary text-xs mt-1">Commencez par ajouter une entrée ou sortie</p>
              </div>
            ) : (
              filteredTxs.map((tx) => {
                const isIncome = tx.type === 'INCOME';
                return (
                  <button
                    key={tx.id}
                    onClick={() => navigate(`/transaction/${tx.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left active:scale-98 transition-transform"
                    style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isIncome ? '#1DB95420' : '#E5133220' }}>
                      {isIncome
                        ? <TrendingUp className="w-4 h-4" style={{ color: '#1DB954' }} />
                        : <TrendingDown className="w-4 h-4" style={{ color: '#E51332' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium truncate">{tx.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-text-tertiary text-xs">{tx.category?.labelFr}</span>
                        <span className="text-text-tertiary text-xs">·</span>
                        <span className="text-text-tertiary text-xs">{formatDate(tx.date)}</span>
                        {tx.source && (
                          <>
                            <span className="text-text-tertiary text-xs">·</span>
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#282828', color: '#B3B3B3' }}>{tx.source}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold tabular-nums" style={{ color: isIncome ? '#1DB954' : '#E51332' }}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      {tx.status === 'PENDING' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FFB80020', color: '#FFB800' }}>en attente</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Quick Actions ───────────────────────────────────────── */}
        <div className="flex gap-3 mb-6 pb-6">
          <button
            onClick={() => navigate('/transaction/new', { state: { orgUnitId: id, defaultType: 'INCOME' } })}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#1DB954', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4" />Entrée
          </button>
          <button
            onClick={() => navigate('/transaction/new', { state: { orgUnitId: id, defaultType: 'EXPENSE' } })}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#E51332', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4" />Sortie
          </button>
        </div>
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
        open={showVersementModal}
        onClose={() => setShowVersementModal(false)}
        onConfirm={handleVersement}
        title={`Verser vers la caisse principale`}
        description={
          versementAmount
            ? `Confirmer le versement de ${parseFloat(versementAmount).toLocaleString('fr-FR')} FCFA depuis ${orgUnit?.name} ?`
            : `Confirmer le versement de ${formatCurrencyCompact(balance)} FCFA depuis ${orgUnit?.name} ?`
        }
        confirmLabel="Verser"
        confirmVariant="primary"
      >
        <div className="mt-4">
          <label className="block text-text-secondary text-sm font-medium mb-2">
            Montant (FCFA) — laisser vide pour tout verser ({formatCurrencyCompact(balance)} FCFA)
          </label>
          <input
            type="number"
            value={versementAmount}
            onChange={(e) => setVersementAmount(e.target.value)}
            placeholder="Montant personnalisé..."
            className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none"
            style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            min="0"
            max={balance / 100}
          />
        </div>
      </ConfirmModal>

      <BottomNav />
    </div>
  );
}
