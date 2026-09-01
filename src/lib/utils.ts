import { type ClassValue, clsx } from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amountCents: number): string {
  const units = amountCents / 100;
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(units);
}

export function formatCurrencySigned(amountCents: number): string {
  const sign = amountCents >= 0 ? '+' : '';
  return sign + formatCurrency(amountCents);
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy', { locale: fr });
}

export function formatDateShort(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM', { locale: fr });
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Brouillon',
    PENDING: 'En attente',
    APPROVED: 'Approuvé',
    REJECTED: 'Rejeté',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: '#808080',
    PENDING: '#FFB800',
    APPROVED: '#1DB954',
    REJECTED: '#E51332',
  };
  return colors[status] || '#808080';
}

export function getPeriodRange(period: 'mois' | 'trimestre' | 'annee') {
  const now = new Date();
  let start: string;
  switch (period) {
    case 'mois':
      start = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      break;
    case 'trimestre': {
      const q = Math.floor(now.getMonth() / 3);
      start = format(new Date(now.getFullYear(), q * 3, 1), 'yyyy-MM-dd');
      break;
    }
    case 'annee':
      start = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');
      break;
  }
  return { start, end: format(now, 'yyyy-MM-dd') };
}

export function exportToCSV(transactions: any[], filename: string) {
  const headers = ['Date', 'Type', 'Montant', 'Description', 'Catégorie', 'Statut'];
  const rows = transactions.map(t => [
    t.date,
    t.type === 'INCOME' ? 'Entrée' : 'Sortie',
    (t.amount / 100).toString(),
    `"${t.description || ''}"`,
    t.category?.labelFr || '',
    t.status,
  ]);
  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getTodayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
