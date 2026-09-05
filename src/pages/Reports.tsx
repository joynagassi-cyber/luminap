import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, FileText, Download, TrendingUp, TrendingDown } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCentsToFCFA } from '@/lib/utils';
import type { ReportDefinition } from '@/types';

export default function Reports() {
  const navigate = useNavigate();
  const { transactions, accounts, events, members } = useLocalStore();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const monthlyReport = transactions
    .filter(t => t.status === 'APPROVED')
    .reduce((acc: Record<string, { income: number; expense: number }>, tx) => {
      const month = tx.date.substring(0, 7);
      if (!acc[month]) acc[month] = { income: 0, expense: 0 };
      if (tx.type === 'INCOME') acc[month].income += tx.amount;
      else acc[month].expense += tx.amount;
      return acc;
    }, {});

  const caisseReport = accounts.filter(a => a.ownerType === 'GROUP' && a.status === 'ACTIVE').map(account => {
    const txs = transactions.filter(t => t.sourceCaisseId === account.id && t.status === 'APPROVED');
    const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { caisse: account.name, income, expense, balance: income - expense };
  });

  const eventReport = events.filter(e => e.status === 'COMPLETED' || e.status === 'CANCELLED').map(event => {
    const txs = transactions.filter(t => t.eventId === event.id && t.status === 'APPROVED');
    const spent = txs.reduce((s, t) => s + t.amount, 0);
    return { event: event.name, budget: event.budget, spent, variance: event.budget - spent };
  });

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Rapports" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <h1 className="text-text-primary font-bold text-xl mb-5">Rapports</h1>

        {/* Monthly Report */}
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: '#1DB954' }} />
              <span className="text-text-primary font-semibold text-sm">Bilan mensuel</span>
            </div>
            <span className="text-text-tertiary text-xs">{Object.keys(monthlyReport).length} mois</span>
          </div>
          <div className="space-y-2">
            {Object.entries(monthlyReport).slice(-6).map(([month, data]) => (
              <div key={month} className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">{month}</span>
                <div className="flex gap-3">
                  <span style={{ color: '#1DB954' }}>+{formatCentsToFCFA(data.income)}</span>
                  <span style={{ color: '#E51332' }}>-{formatCentsToFCFA(data.expense)}</span>
                  <span className="font-semibold" style={{ color: (data.income - data.expense) >= 0 ? '#1DB954' : '#E51332' }}>
                    {(data.income - data.expense) >= 0 ? '+' : '-'}{formatCentsToFCFA(Math.abs(data.income - data.expense))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Caisse Report */}
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5" style={{ color: '#FF6B00' }} />
            <span className="text-text-primary font-semibold text-sm">Résumé par caisse</span>
          </div>
          <div className="space-y-2">
            {caisseReport.map((row) => (
              <div key={row.caisse} className="flex items-center justify-between text-xs">
                <span className="text-text-primary">{row.caisse}</span>
                <span style={{ color: row.balance >= 0 ? '#1DB954' : '#E51332' }}>
                  {row.balance >= 0 ? '+' : '-'}{formatCentsToFCFA(Math.abs(row.balance))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Event Report */}
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            <span className="text-text-primary font-semibold text-sm">Bilans d'événements</span>
          </div>
          <div className="space-y-2">
            {eventReport.length > 0 ? eventReport.map((row) => (
              <div key={row.event} className="text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-text-primary">{row.event}</span>
                  <span style={{ color: row.variance >= 0 ? '#1DB954' : '#E51332' }}>
                    {row.variance >= 0 ? '+' : '-'}{formatCentsToFCFA(Math.abs(row.variance))}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#282828' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${row.budget > 0 ? Math.min(100, (row.spent / row.budget) * 100) : 0}%`,
                      backgroundColor: row.spent > row.budget ? '#E51332' : '#1DB954',
                    }}
                  />
                </div>
                <div className="flex justify-between text-text-tertiary mt-1">
                  <span>{formatCentsToFCFA(row.spent)} dépensé</span>
                  <span>{formatCentsToFCFA(row.budget)} budget</span>
                </div>
              </div>
            )) : (
              <p className="text-text-tertiary text-xs text-center py-3">Aucun événement terminé</p>
            )}
          </div>
        </div>

        {/* Export button */}
        <button
          onClick={() => navigate('/finance')}
          className="w-full py-3.5 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)' }}
        >
          <Download className="w-4 h-4" /> Exporter le rapport
        </button>

        <p className="text-text-tertiary text-xs text-center mt-4">Plus de rapports disponibles prochainement</p>
      </div>
      <BottomNav />
    </div>
  );
}
