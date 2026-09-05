import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatCurrencyFull, formatDate, getPeriodRange } from '@/lib/utils';
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart3, Download, X, FileText,
  ClipboardList, ArrowRightLeft, Calendar, ChevronDown, ChevronUp,
  Building2, Church, Users, Search, AlertCircle
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { exportPDF, exportExcel, exportCSV } from '@/lib/export';
import type { Transaction, Caisse, Event } from '@/types';

type Tab = 'global' | 'groupe' | 'evenement';
type PeriodType = 'ce-mois' | 'cette-annee' | 'personnalise';

function getMonthYearLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function getCaisseLabel(caisseId: string, caisses: Caisse[]): string {
  if (caisseId === 'main') return 'Caisse principale';
  return caisses.find(c => c.id === caisseId)?.name || caisseId;
}

function getCaisseColor(caisseId: string, caisses: Caisse[]): string {
  if (caisseId === 'main') return '#FF6B00';
  return caisses.find(c => c.id === caisseId)?.color || '#808080';
}

// ─── Rapport global ───────────────────────────────────────────────────────────

function GlobalReport({
  transactions, caisses, categories, appConfig
}: {
  transactions: Transaction[];
  caisses: Caisse[];
  categories: typeof import('@/types').Category[];
  appConfig: import('@/types').AppConfig;
}) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodType>('ce-mois');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    entrées: true,
    sorties: true,
    versements: true,
  });
  const [showExport, setShowExport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const periodRange = useMemo(() => getPeriodRange(period === 'ce-mois' ? 'mois' : 'annee'), [period]);

  const approved = transactions.filter(t =>
    t.status === 'APPROVED'
    && t.sourceCaisseId === 'main'
    && t.date >= periodRange.start.split('T')[0]
    && t.date <= periodRange.end.split('T')[0]
  );

  const incomeTxs = approved.filter(t => t.type === 'INCOME');
  const expenseTxs = approved.filter(t => t.type === 'EXPENSE');

  const totalIncome = incomeTxs.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenseTxs.reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  // Versements: group outflows that have a versementId
  const versementTxs = approved.filter(t => t.versementId !== null && t.sourceCaisseId !== 'main');
  const versementsMap = new Map<string, { amount: number; date: string; sourceCaisseId: string }>();
  for (const tx of versementTxs) {
    const existing = versementsMap.get(tx.versementId!);
    if (existing) {
      versementsMap.set(tx.versementId!, { ...existing, amount: existing.amount + tx.amount });
    } else {
      versementsMap.set(tx.versementId!, { amount: tx.amount, date: tx.date, sourceCaisseId: tx.sourceCaisseId! });
    }
  }
  const versementList = Array.from(versementsMap.values())
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalVersements = versementList.reduce((s, v) => s + v.amount, 0);

  // Group by category
  const byCategory = categories.map(cat => {
    const catTxs = approved.filter(t => t.categoryId === cat.id);
    const inc = catTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const exp = catTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { cat, income: inc, expense: exp, net: inc - exp };
  }).filter(c => c.income > 0 || c.expense > 0);

  // Filter by search
  const filteredIncome = incomeTxs.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (t.description || '').toLowerCase().includes(q)
      || (t.category?.labelFr || '').toLowerCase().includes(q)
      || formatCurrencyFull(t.amount).toLowerCase().includes(q);
  });
  const filteredExpense = expenseTxs.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (t.description || '').toLowerCase().includes(q)
      || (t.category?.labelFr || '').toLowerCase().includes(q)
      || formatCurrencyFull(t.amount).toLowerCase().includes(q);
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const periodLabel = period === 'ce-mois'
    ? getMonthYearLabel(new Date().toISOString())
    : new Date().getFullYear().toString();

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex rounded-xl p-1" style={{ backgroundColor: '#212121' }}>
        {(['ce-mois', 'cette-annee', 'personnalise'] as PeriodType[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
            style={period === p ? { backgroundColor: '#FF6B00', color: '#fff' } : { color: '#808080' }}
          >
            {p === 'ce-mois' ? 'Ce mois' : p === 'cette-annee' ? 'Cette année' : 'Personnalisé'}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#212121' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#1DB95420' }}>
            <TrendingUp className="w-4 h-4" style={{ color: '#1DB954' }} />
          </div>
          <p className="text-text-tertiary text-xs">Entrées</p>
          <p className="text-income font-bold text-sm mt-1">+{formatCurrencyCompact(totalIncome)}</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#212121' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#E5133220' }}>
            <TrendingDown className="w-4 h-4" style={{ color: '#E51332' }} />
          </div>
          <p className="text-text-tertiary text-xs">Sorties</p>
          <p className="text-expense font-bold text-sm mt-1">-{formatCurrencyCompact(totalExpense)}</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#212121' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#FF6B0020' }}>
            <BarChart3 className="w-4 h-4" style={{ color: '#FF6B00' }} />
          </div>
          <p className="text-text-tertiary text-xs">Résultat</p>
          <p className="font-bold text-sm mt-1" style={{ color: netResult >= 0 ? '#1DB954' : '#E51332' }}>
            {netResult >= 0 ? '+' : '-'}{formatCurrencyCompact(Math.abs(netResult))}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher dans les transactions..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-text-primary text-sm outline-none"
          style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
        />
      </div>

      {/* Entrées section */}
      <ReportSection
        title="Entrées"
        icon={TrendingUp}
        iconColor="#1DB954"
        total={totalIncome}
        totalFormatted={`+${formatCurrencyCompact(totalIncome)}`}
        count={filteredIncome.length}
        expanded={expandedSections.entrées}
        onToggle={() => toggleSection('entrées')}
      >
        {filteredIncome.length === 0 ? (
          <p className="text-text-tertiary text-xs text-center py-4">Aucune entrée dans cette période</p>
        ) : (
          <div className="space-y-2">
            {filteredIncome.sort((a, b) => b.date.localeCompare(a.date)).map(tx => (
              <TransactionRow key={tx.id} tx={tx} caisses={caisses} categories={categories} />
            ))}
          </div>
        )}
      </ReportSection>

      {/* Sorties section */}
      <ReportSection
        title="Sorties"
        icon={TrendingDown}
        iconColor="#E51332"
        total={totalExpense}
        totalFormatted={`-${formatCurrencyCompact(totalExpense)}`}
        count={filteredExpense.length}
        expanded={expandedSections.sorties}
        onToggle={() => toggleSection('sorties')}
      >
        {filteredExpense.length === 0 ? (
          <p className="text-text-tertiary text-xs text-center py-4">Aucune sortie dans cette période</p>
        ) : (
          <div className="space-y-2">
            {filteredExpense.sort((a, b) => b.date.localeCompare(a.date)).map(tx => (
              <TransactionRow key={tx.id} tx={tx} caisses={caisses} categories={categories} />
            ))}
          </div>
        )}
      </ReportSection>

      {/* Versements section */}
      <ReportSection
        title="Versements des groupes"
        icon={ArrowRightLeft}
        iconColor="#FF6B00"
        total={totalVersements}
        totalFormatted={`-${formatCurrencyCompact(totalVersements)}`}
        count={versementList.length}
        expanded={expandedSections.versements}
        onToggle={() => toggleSection('versements')}
      >
        {versementList.length === 0 ? (
          <p className="text-text-tertiary text-xs text-center py-4">Aucun versement dans cette période</p>
        ) : (
          <div className="space-y-2">
            {versementList.map((v, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#181818' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                  <ArrowRightLeft className="w-4 h-4" style={{ color: '#FF6B00' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium">
                    {getCaisseLabel(v.sourceCaisseId, caisses)} → Caisse principale
                  </p>
                  <p className="text-text-tertiary text-xs">{formatDate(v.date)}</p>
                </div>
                <span className="text-sm font-bold text-[#E51332]">-{formatCurrencyCompact(v.amount)} F</span>
              </div>
            ))}
          </div>
        )}
      </ReportSection>

      {/* Export button */}
      <button
        onClick={() => setShowExport(true)}
        className="w-full py-3.5 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)' }}
      >
        <Download className="w-4 h-4" /> Exporter le rapport
      </button>

      {/* Export modal */}
      {showExport && (
        <ExportModal
          appConfig={appConfig}
          onClose={() => setShowExport(false)}
          transactions={approved}
          caisses={caisses}
          periodLabel={periodLabel}
          versementList={versementList}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          netResult={netResult}
        />
      )}
    </div>
  );
}

// ─── Rapport par groupe ───────────────────────────────────────────────────────

function GroupReport({
  transactions, caisses, categories, accounts, members, memberships, appConfig
}: {
  transactions: Transaction[];
  caisses: Caisse[];
  categories: typeof import('@/types').Category[];
  accounts: import('@/types').Account[];
  members: import('@/types').Member[];
  memberships: import('@/types').GroupMembership[];
  appConfig: import('@/types').AppConfig;
}) {
  const navigate = useNavigate();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [period, setPeriod] = useState<PeriodType>('ce-mois');
  const [showExport, setShowExport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const periodRange = useMemo(() => getPeriodRange(period === 'ce-mois' ? 'mois' : 'annee'), [period]);

  const groupAccounts = accounts.filter(a => a.ownerType === 'GROUP' && a.status === 'ACTIVE');

  const groupTxs = useMemo(() => {
    if (!selectedGroupId) return [];
    return transactions.filter(t =>
      t.status === 'APPROVED'
      && t.sourceCaisseId === selectedGroupId
      && t.date >= periodRange.start.split('T')[0]
      && t.date <= periodRange.end.split('T')[0]
    );
  }, [selectedGroupId, transactions, periodRange]);

  const incomeTxs = groupTxs.filter(t => t.type === 'INCOME');
  const expenseTxs = groupTxs.filter(t => t.type === 'EXPENSE');
  const totalIncome = incomeTxs.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenseTxs.reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Versements from this group
  const versementTxs = groupTxs.filter(t => t.versementId !== null);
  const versementsMap = new Map<string, number>();
  for (const tx of versementTxs) {
    versementsMap.set(tx.versementId!, (versementsMap.get(tx.versementId!) || 0) + tx.amount);
  }
  const versementList = Array.from(versementsMap.entries())
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount);

  const selectedGroup = groupAccounts.find(a => a.id === selectedGroupId);
  const caisse = caisses.find(c => c.id === selectedGroupId);
  const periodLabel = period === 'ce-mois'
    ? getMonthYearLabel(new Date().toISOString())
    : new Date().getFullYear().toString();

  const filteredTxs = groupTxs.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (t.description || '').toLowerCase().includes(q)
      || (t.category?.labelFr || '').toLowerCase().includes(q)
      || formatCurrencyFull(t.amount).toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Group selector */}
      <div className="relative">
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none"
          style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
        >
          <option value="">Sélectionner un groupe...</option>
          {groupAccounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
      </div>

      {!selectedGroup ? (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: '#212121' }}>
          <Users className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-40" />
          <p className="text-text-tertiary text-sm">Sélectionnez un groupe pour voir son rapport</p>
        </div>
      ) : (
        <>
          {/* Group hero */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#212121', border: `1px solid ${caisse?.color || '#FF6B00'}30` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${caisse?.color || '#FF6B00'}20` }}>
                <Building2 className="w-6 h-6" style={{ color: caisse?.color || '#FF6B00' }} />
              </div>
              <div className="flex-1">
                <p className="text-text-primary font-bold text-lg">{selectedGroup.name}</p>
                <p className="text-text-tertiary text-xs">Rapport financier — {periodLabel}</p>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="text-text-tertiary text-xs mb-1">Solde du groupe</p>
              <p className="text-2xl font-black" style={{ color: balance >= 0 ? '#1DB954' : '#E51332' }}>
                {balance >= 0 ? '' : '-'}{formatCurrencyCompact(Math.abs(balance))}
                <span className="text-text-tertiary text-base font-medium ml-1">FCFA</span>
              </p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1DB95420' }}>
                  <TrendingUp className="w-3 h-3" style={{ color: '#1DB954' }} />
                </div>
                <span className="text-text-tertiary">Entrées: <span style={{ color: '#1DB954' }}>+{formatCurrencyCompact(totalIncome)}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
                  <TrendingDown className="w-3 h-3 rotate-180" style={{ color: '#E51332' }} />
                </div>
                <span className="text-text-tertiary">Sorties: <span style={{ color: '#E51332' }}>-{formatCurrencyCompact(totalExpense)}</span></span>
              </div>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex rounded-xl p-1" style={{ backgroundColor: '#212121' }}>
            {(['ce-mois', 'cette-annee', 'personnalise'] as PeriodType[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                style={period === p ? { backgroundColor: '#FF6B00', color: '#fff' } : { color: '#808080' }}
              >
                {p === 'ce-mois' ? 'Ce mois' : p === 'cette-annee' ? 'Cette année' : 'Personnalisé'}
              </button>
            ))}
          </div>

          {/* Versements from this group */}
          {versementList.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft className="w-4 h-4" style={{ color: '#FF6B00' }} />
                <p className="text-text-primary font-semibold text-sm">Versements vers caisse principale</p>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>{versementList.length}</span>
              </div>
              <div className="space-y-2">
                {versementList.map(v => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Versement</span>
                    <span className="font-bold text-[#E51332]">-{formatCurrencyCompact(v.amount)} F</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-text-primary font-semibold text-sm">Transactions ({filteredTxs.length})</p>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>
          <div className="space-y-2 mb-4">
            {filteredTxs.sort((a, b) => b.date.localeCompare(a.date)).map(tx => (
              <TransactionRow key={tx.id} tx={tx} caisses={caisses} categories={categories} />
            ))}
            {filteredTxs.length === 0 && (
              <p className="text-text-tertiary text-xs text-center py-4">Aucune transaction</p>
            )}
          </div>

          {/* Export */}
          <button
            onClick={() => setShowExport(true)}
            className="w-full py-3.5 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)' }}
          >
            <Download className="w-4 h-4" /> Exporter le rapport
          </button>

          {showExport && (
            <ExportModal
              appConfig={appConfig}
              onClose={() => setShowExport(false)}
              transactions={groupTxs}
              caisses={caisses}
              periodLabel={periodLabel}
              title={`Rapport ${selectedGroup.name}`}
              versementList={versementList}
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              netResult={balance}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Rapport par événement ────────────────────────────────────────────────────

function EventReport({
  transactions, events, caisses, categories, appConfig
}: {
  transactions: Transaction[];
  events: Event[];
  caisses: Caisse[];
  categories: typeof import('@/types').Category[];
  appConfig: import('@/types').AppConfig;
}) {
  const navigate = useNavigate();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [showExport, setShowExport] = useState(false);

  const event = events.find(e => e.id === selectedEventId);
  const eventTxs = transactions.filter(t => t.eventId === selectedEventId && t.status === 'APPROVED');
  const totalIncome = eventTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = eventTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  const handleExport = () => {
    if (!event) return;
    exportPDF({
      churchName: appConfig.churchName,
      churchLogoUrl: appConfig.churchLogoUrl,
      transactions: eventTxs,
      caisses,
      title: `Rapport événement — ${event.name}`,
    });
    setShowExport(false);
  };

  return (
    <div className="space-y-4">
      {/* Event selector */}
      <div className="relative">
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none"
          style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
        >
          <option value="">Sélectionner un événement...</option>
          {events.filter(e => e.status === 'COMPLETED' || e.status === 'CANCELLED').map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
      </div>

      {!event ? (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: '#212121' }}>
          <Calendar className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-40" />
          <p className="text-text-tertiary text-sm">Sélectionnez un événement terminé ou annulé</p>
        </div>
      ) : (
        <>
          {/* Event hero */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#212121' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
                <Calendar className="w-6 h-6" style={{ color: '#FF6B00' }} />
              </div>
              <div>
                <p className="text-text-primary font-bold text-lg">{event.name}</p>
                <p className="text-text-tertiary text-xs">{formatDate(event.startDate)}{event.endDate ? ` — ${formatDate(event.endDate)}` : ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: '#181818' }}>
                <p className="text-text-tertiary text-xs">Budget</p>
                <p className="text-text-primary font-bold text-sm mt-1">{formatCurrencyCompact(event.budget)} F</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: '#181818' }}>
                <p className="text-text-tertiary text-xs">Dépensé</p>
                <p className="font-bold text-sm mt-1" style={{ color: totalExpense > event.budget ? '#E51332' : '#FFB800' }}>
                  {formatCurrencyCompact(totalExpense)} F
                </p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: '#181818' }}>
                <p className="text-text-tertiary text-xs">Reste</p>
                <p className="font-bold text-sm mt-1" style={{ color: event.budget - totalExpense >= 0 ? '#1DB954' : '#E51332' }}>
                  {formatCurrencyCompact(Math.max(0, event.budget - totalExpense))} F
                </p>
              </div>
            </div>

            {/* Budget progress */}
            {event.budget > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-text-tertiary">Utilisation du budget</span>
                  <span className="text-text-secondary">{Math.min(100, Math.round((totalExpense / event.budget) * 100))}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (totalExpense / event.budget) * 100)}%`,
                      backgroundColor: totalExpense > event.budget ? '#E51332' : totalExpense > event.budget * 0.75 ? '#FFB800' : '#1DB954',
                    }}
                  />
                </div>
                {totalExpense > event.budget && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: '#E51332' }}>
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Budget dépassé de {formatCurrencyCompact(totalExpense - event.budget)} FCFA</span>
                  </div>
                )}
              </div>
            )}

            {/* Budget items breakdown */}
            {event.budgetItems.length > 0 && (
              <div className="mb-4">
                <p className="text-text-tertiary text-xs font-medium mb-2">Répartition par poste</p>
                <div className="space-y-2">
                  {event.budgetItems.map(item => {
                    const itemExpense = eventTxs
                      .filter(t => t.categoryId === item.categoryId)
                      .filter(t => t.type === 'EXPENSE')
                      .reduce((s, t) => s + t.amount, 0);
                    const itemIncome = eventTxs
                      .filter(t => t.categoryId === item.categoryId)
                      .filter(t => t.type === 'INCOME')
                      .reduce((s, t) => s + t.amount, 0);
                    const pct = item.allocated > 0 ? Math.min(100, Math.round((itemExpense / item.allocated) * 100)) : 0;
                    const isExceeded = itemExpense > item.allocated;
                    return (
                      <div key={item.id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-primary">{item.label}</span>
                          <span className="text-text-tertiary">{formatCurrencyCompact(itemExpense)}/{formatCurrencyCompact(item.allocated)} F</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: isExceeded ? '#E51332' : '#FF6B00' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-text-primary font-semibold text-sm">Transactions liées ({eventTxs.length})</p>
          </div>
          <div className="space-y-2 mb-4">
            {eventTxs.sort((a, b) => b.date.localeCompare(a.date)).map(tx => (
              <TransactionRow key={tx.id} tx={tx} caisses={caisses} categories={categories} />
            ))}
            {eventTxs.length === 0 && (
              <p className="text-text-tertiary text-xs text-center py-4">Aucune transaction enregistrée</p>
            )}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="w-full py-3.5 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)' }}
          >
            <Download className="w-4 h-4" /> Exporter le rapport
          </button>
        </>
      )}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function ReportSection({
  title, icon: Icon, iconColor, total, totalFormatted, count, expanded, onToggle, children
}: {
  title: string;
  icon: any;
  iconColor: string;
  total: number;
  totalFormatted: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#212121' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${iconColor}20` }}>
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
          <div className="text-left">
            <p className="text-text-primary font-semibold text-sm">{title}</p>
            <p className="text-text-tertiary text-xs">{count} transaction{count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: iconColor }}>{totalFormatted}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-text-tertiary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#282828' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function TransactionRow({
  tx, caisses, categories
}: {
  tx: Transaction;
  caisses: Caisse[];
  categories: import('@/types').Category[];
}) {
  const caisse = caisses.find(c => c.id === tx.sourceCaisseId);
  const category = categories.find(c => c.id === tx.categoryId);
  const isVersement = tx.versementId !== null;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{ backgroundColor: isVersement ? '#FF6B0008' : '#181818' }}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isVersement ? '' : ''}`} style={{ backgroundColor: tx.type === 'INCOME' ? '#1DB95420' : '#E5133220' }}>
        {tx.type === 'INCOME'
          ? <TrendingUp className="w-4 h-4" style={{ color: '#1DB954' }} />
          : <TrendingDown className="w-4 h-4 rotate-180" style={{ color: '#E51332' }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-text-primary text-sm font-medium truncate">{tx.description}</p>
          {isVersement && (
            <ArrowRightLeft className="w-3 h-3 flex-shrink-0" style={{ color: '#FF6B00' }} />
          )}
        </div>
        <p className="text-text-tertiary text-xs">
          {category?.labelFr || tx.categoryId}
          {caisse?.name && ` · ${caisse.name}`}
          <span className="ml-2">{formatDate(tx.date)}</span>
        </p>
      </div>
      <span className={`text-sm font-bold flex-shrink-0 ${tx.type === 'INCOME' ? 'text-[#1DB954]' : 'text-[#E51332]'}`}>
        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrencyCompact(tx.amount)} F
      </span>
    </div>
  );
}

function ExportModal({
  appConfig, onClose, transactions, caisses, periodLabel, title, versementList,
  totalIncome, totalExpense, netResult
}: {
  appConfig: import('@/types').AppConfig;
  onClose: () => void;
  transactions: Transaction[];
  caisses: Caisse[];
  periodLabel: string;
  title?: string;
  versementList?: { amount: number; date: string }[];
  totalIncome: number;
  totalExpense: number;
  netResult: number;
}) {
  const exportTitle = title || `Rapport financier — ${periodLabel}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg rounded-t-2xl p-5 pb-8"
        style={{ backgroundColor: '#181818' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-text-primary font-bold text-lg">Exporter le rapport</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        {appConfig.churchName && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ backgroundColor: '#212121' }}>
            {appConfig.churchLogoUrl && <img src={appConfig.churchLogoUrl} alt="" className="w-6 h-6 rounded" />}
            <span className="text-text-tertiary text-xs">{appConfig.churchName}</span>
            <span className="text-text-tertiary text-xs mx-1">·</span>
            <span className="text-text-tertiary text-xs">{exportTitle}</span>
          </div>
        )}

        {/* Summary preview */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#212121' }}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-text-tertiary text-xs">Entrées</p>
              <p className="text-income font-bold text-sm">+{formatCurrencyCompact(totalIncome)} F</p>
            </div>
            <div>
              <p className="text-text-tertiary text-xs">Sorties</p>
              <p className="text-expense font-bold text-sm">-{formatCurrencyCompact(totalExpense)} F</p>
            </div>
            <div>
              <p className="text-text-tertiary text-xs">Résultat</p>
              <p className="font-bold text-sm" style={{ color: netResult >= 0 ? '#1DB954' : '#E51332' }}>
                {netResult >= 0 ? '+' : '-'}{formatCurrencyCompact(Math.abs(netResult))} F
              </p>
            </div>
          </div>
          {versementList && versementList.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#282828' }}>
              <p className="text-text-tertiary text-xs">Versements groupes: <span className="text-[#FF6B00] font-semibold">{versementList.length}</span></p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              exportPDF({ churchName: appConfig.churchName, churchLogoUrl: appConfig.churchLogoUrl, transactions, caisses, title: exportTitle });
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform"
            style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
              <FileText className="text-lg" style={{ color: '#E51332' }} />
            </div>
            <div className="text-left">
              <p className="text-text-primary text-sm font-semibold">PDF</p>
              <p className="text-text-tertiary text-xs">Document professionnel avec en-tête</p>
            </div>
          </button>
          <button
            onClick={() => {
              exportExcel({ churchName: appConfig.churchName, churchLogoUrl: appConfig.churchLogoUrl, transactions, caisses, title: exportTitle });
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform"
            style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1DB95420' }}>
              <BarChart3 className="text-lg" style={{ color: '#1DB954' }} />
            </div>
            <div className="text-left">
              <p className="text-text-primary text-sm font-semibold">Excel</p>
              <p className="text-text-tertiary text-xs">Feuilles multiples (résumé, transactions, groupes)</p>
            </div>
          </button>
          <button
            onClick={() => {
              exportCSV({ churchName: appConfig.churchName, churchLogoUrl: appConfig.churchLogoUrl, transactions, caisses, title: exportTitle });
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform"
            style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3B82F620' }}>
              <ClipboardList className="text-lg" style={{ color: '#3B82F6' }} />
            </div>
            <div className="text-left">
              <p className="text-text-primary text-sm font-semibold">CSV</p>
              <p className="text-text-tertiary text-xs">Compatible avec tous les tableurs</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Reports page ────────────────────────────────────────────────────────

export default function Reports() {
  const navigate = useNavigate();
  const { transactions, categories, caisses, accounts, events, members, memberships, appConfig } = useLocalStore();
  const [activeTab, setActiveTab] = useState<Tab>('global');

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Rapports" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
            <BarChart3 className="w-5 h-5" style={{ color: '#FF6B00' }} />
          </div>
          <div>
            <h1 className="text-text-primary font-bold text-xl">Rapports financiers</h1>
            <p className="text-text-tertiary text-xs">État financier en quelques secondes</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-5 overflow-x-auto" style={{ backgroundColor: '#212121' }}>
          {([
            { id: 'global' as Tab, label: 'Global', icon: Church },
            { id: 'groupe' as Tab, label: 'Groupes', icon: Users },
            { id: 'evenement' as Tab, label: 'Événements', icon: Calendar },
          ]).map(({ id: tabId, label, icon: TabIcon }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className="flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
              style={activeTab === tabId ? { backgroundColor: '#FF6B00', color: '#fff' } : { color: '#808080' }}
            >
              <TabIcon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'global' && (
          <GlobalReport
            transactions={transactions}
            caisses={caisses}
            categories={categories}
            appConfig={appConfig}
          />
        )}

        {activeTab === 'groupe' && (
          <GroupReport
            transactions={transactions}
            caisses={caisses}
            categories={categories}
            accounts={accounts}
            members={members}
            memberships={memberships}
            appConfig={appConfig}
          />
        )}

        {activeTab === 'evenement' && (
          <EventReport
            transactions={transactions}
            events={events}
            caisses={caisses}
            categories={categories}
            appConfig={appConfig}
          />
        )}
      </div>
      <BottomNav />
    </div>
  );
}
