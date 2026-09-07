import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { useTransactions, useAccounts, useCategories } from '@/lib/dataLayer';
import { formatCurrencyCompact, formatCurrencyFull, formatDate, getPeriodRange } from '@/lib/utils';
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart3, Download, X, FileText,
  ClipboardList, ArrowRightLeft, Calendar, ChevronDown, ChevronUp,
  Building2, Church, Users, Search, AlertCircle
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { exportPDF, exportExcel, exportCSV } from '@/lib/export';
import type { Transaction, Caisse, Event, Category, AppConfig, Account, Member, GroupMembership } from '@/types';

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

export default function Reports() {
  const navigate = useNavigate();
  const { transactions: idbTxs, caisses: idbCaisses, categories: idbCats, accounts: idbAccounts, events: idbEvents, members: idbMembers, memberships: idbMemberships, isLoading, appConfig } = useLocalStore();

  // PowerSync with fallback
  const { data: psTransactions } = useTransactions();
  const { data: psCaisses } = useCaisses();
  const { data: psCategories } = useCategories();
  const { data: psAccounts } = useAccounts();
  const { data: psEvents } = useEvents();
  const { data: psMembers } = useMembers();

  const transactions = psTransactions ?? idbTxs;
  const caisses = psCaisses ?? idbCaisses;
  const categories = psCategories ?? idbCats;
  const accounts = psAccounts ?? idbAccounts;
  const events = psEvents ?? idbEvents;
  const members = psMembers ?? idbMembers;

  const [activeTab, setActiveTab] = useState<Tab>('global');
  const [period, setPeriod] = useState<PeriodType>('ce-mois');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    entrées: true,
    sorties: true,
    versements: true,
  });
  const [showExport, setShowExport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const periodRange = getPeriodRange(period === 'ce-mois' ? 'mois' : 'annee');

  const approved = transactions.filter((t: any) =>
    t.status === 'APPROVED'
    && t.source_caisse_id === 'main' || t.sourceCaisseId === 'main'
    && t.date >= periodRange.start.split('T')[0]
    && t.date <= periodRange.end.split('T')[0]
  );

  const totalIncome = approved.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpense = approved.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Rapports" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: '#212121' }}>
          {[
            { id: 'global' as Tab, label: 'Global' },
            { id: 'groupe' as Tab, label: 'Groupes' },
            { id: 'evenement' as Tab, label: 'Événements' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={activeTab === tab.id ? { backgroundColor: '#FF6B00', color: '#fff' } : { color: '#B3B3B3' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Period selector */}
        <div className="flex gap-2 mb-5">
          {[
            { id: 'ce-mois' as PeriodType, label: 'Ce mois' },
            { id: 'cette-annee' as PeriodType, label: 'Cette année' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="flex-1 py-2 rounded-lg text-xs font-medium"
              style={period === p.id ? { backgroundColor: '#212121', color: '#FF6B00', border: '1px solid #FF6B00' } : { backgroundColor: '#181818', color: '#B3B3B3' }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
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

        {/* Export button */}
        <button
          onClick={() => setShowExport(true)}
          className="w-full py-3.5 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 mb-6"
          style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)' }}
        >
          <Download className="w-4 h-4" /> Exporter le rapport
        </button>

        {/* Transactions list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-primary font-semibold text-sm">Transactions approuvées</p>
            <span className="text-xs text-text-tertiary">{approved.length} transaction{approved.length > 1 ? 's' : ''}</span>
          </div>
          {approved.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#212121' }}>
              <p className="text-text-tertiary text-sm">Aucune transaction</p>
            </div>
          ) : (
            approved
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 20)
              .map((tx: any) => (
                <div key={tx.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#212121' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tx.type === 'INCOME' ? '#1DB95420' : '#E5133220' }}>
                    {tx.type === 'INCOME'
                      ? <TrendingUp className="w-4 h-4" style={{ color: '#1DB954' }} />
                      : <TrendingDown className="w-4 h-4" style={{ color: '#E51332' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-text-tertiary text-xs">{formatDate(tx.date)}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: tx.type === 'INCOME' ? '#1DB954' : '#E51332' }}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrencyCompact(tx.amount)} F
                  </span>
                </div>
              ))
          )}
        </div>
      </div>
      <BottomNav />

      {/* Export modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowExport(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-lg rounded-t-2xl p-5 pb-8" style={{ backgroundColor: '#181818' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-text-primary font-bold text-lg">Exporter le rapport</h2>
              <button onClick={() => setShowExport(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
                <span className="text-text-tertiary text-sm"><X className="w-4 h-4" /></span>
              </button>
            </div>
            <div className="space-y-3">
              <button onClick={() => {
                exportPDF({ churchName: appConfig.churchName, churchLogoUrl: appConfig.churchLogoUrl, transactions: approved, caisses: caisses as any, title: `Rapport — ${period === 'ce-mois' ? 'Ce mois' : 'Cette année'}` });
                setShowExport(false);
              }} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5133220' }}>
                  <FileText className="text-lg" style={{ color: '#E51332' }} />
                </div>
                <div className="text-left">
                  <p className="text-text-primary text-sm font-semibold">PDF</p>
                  <p className="text-text-tertiary text-xs">Document professionnel</p>
                </div>
              </button>
              <button onClick={() => {
                exportExcel({ churchName: appConfig.churchName, churchLogoUrl: appConfig.churchLogoUrl, transactions: approved, caisses: caisses as any, title: `Rapport — ${period === 'ce-mois' ? 'Ce mois' : 'Cette année'}` });
                setShowExport(false);
              }} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1DB95420' }}>
                  <BarChart3 className="text-lg" style={{ color: '#1DB954' }} />
                </div>
                <div className="text-left">
                  <p className="text-text-primary text-sm font-semibold">Excel</p>
                  <p className="text-text-tertiary text-xs">Feuilles multiples</p>
                </div>
              </button>
              <button onClick={() => {
                exportCSV({ churchName: appConfig.churchName, churchLogoUrl: appConfig.churchLogoUrl, transactions: approved, caisses: caisses as any, title: `Rapport — ${period === 'ce-mois' ? 'Ce mois' : 'Cette année'}` });
                setShowExport(false);
              }} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3B82F620' }}>
                  <ClipboardList className="text-lg" style={{ color: '#3B82F6' }} />
                </div>
                <div className="text-left">
                  <p className="text-text-primary text-sm font-semibold">CSV</p>
                  <p className="text-text-tertiary text-xs">Compatible tableurs</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
