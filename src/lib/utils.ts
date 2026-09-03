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

/** Format like 2M, 300K, 15K */
export function formatCurrencyCompact(amountCents: number): string {
  const units = Math.abs(amountCents) / 100;
  if (units >= 1_000_000) {
    const val = units / 1_000_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (units >= 100_000) {
    const val = Math.round(units / 1000) / 10;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
  }
  if (units >= 1000) {
    return `${Math.round(units / 100) / 10}K`;
  }
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

/** Export transactions to PDF using jsPDF */
export async function exportToPDF(transactions: any[], filename: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const db = await import('@/lib/db');
  const orgName = await db.getConfig<string>('orgName').catch(() => null) || 'Église MFE-JC Centrale';
  const orgLogoUrl = await db.getConfig<string>('orgLogoUrl').catch(() => null) || '';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Header: Church logo + name
  if (orgLogoUrl) {
    try {
      doc.addImage(orgLogoUrl, 'PNG', margin, y, 25, 25);
    } catch (_) {
      // If image fails, skip logo
    }
  }
  doc.setFontSize(16);
  doc.setTextColor(0xFF, 0x6B, 0x00);
  doc.text(orgName, orgLogoUrl ? margin + 30 : pageWidth / 2, y + 10, { align: orgLogoUrl ? 'left' : 'center' });
  y += 14;

  doc.setFontSize(10);
  doc.setTextColor(0x80, 0x80, 0x80);
  doc.text('Lumina — Export Transaction', orgLogoUrl ? pageWidth - margin : pageWidth / 2, y, { align: orgLogoUrl ? 'right' : 'center' });
  y += 6;
  doc.text(`Généré le ${formatDateShort(new Date().toISOString())}`, orgLogoUrl ? pageWidth - margin : pageWidth / 2, y, { align: orgLogoUrl ? 'right' : 'center' });
  y += 10;

  // Separator line
  doc.setDrawColor(0xFF, 0x6B, 0x00);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

    doc.setFontSize(9);
    doc.setTextColor(0x21, 0x21, 0x21);
    const cols = [
      { label: 'Date', x: margin },
      { label: 'Type', x: margin + 28 },
      { label: 'Montant', x: margin + 46 },
      { label: 'Description', x: margin + 74 },
      { label: 'Catégorie', x: margin + 124 },
      { label: 'Statut', x: margin + 154 },
    ];
    cols.forEach(c => doc.text(c.label, c.x, y));
    y += 2;
    doc.setDrawColor(0xE0, 0xE0, 0xE0);
    doc.line(margin, y, margin + contentWidth, y);
    y += 4;

    doc.setFontSize(8);
    transactions.slice(0, 80).forEach((t) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        cols.forEach(c => doc.text(c.label, c.x, y));
        y += 2;
        doc.line(margin, y, margin + contentWidth, y);
        y += 4;
      }
      const date = formatDateShort(t.date);
      const type = t.type === 'INCOME' ? 'Entrée' : 'Sortie';
      const amount = formatCurrency(t.amount);
      const cat = t.category?.labelFr || '';
      const status = getStatusLabel(t.status);
      doc.setTextColor(0x33, 0x33, 0x33);
      doc.text(date, margin, y);
      doc.text(type, margin + 28, y);
      doc.text(amount, margin + 46, y);
      doc.text(t.description || '', margin + 74, y);
      doc.text(cat, margin + 124, y);
      doc.text(status, margin + 154, y);
      y += 5;
    });

    // Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(0x80, 0x80, 0x80);
      doc.text(`Page ${i}/${pageCount}`, pageWidth / 2, 290, { align: 'center' });
      doc.text(orgName, margin, 290);
      doc.text('Lumina', pageWidth - margin, 290, { align: 'right' });
      doc.setDrawColor(0xE0, 0xE0, 0xE0);
      doc.line(margin, 287, pageWidth - margin, 287);
    }

    doc.save(`${filename}.pdf`);
}

/** Export transactions to Excel using xlsx */
export function exportToExcel(transactions: any[], filename: string): void {
  import('xlsx').then((XLSX) => {
    const wsData = [['Date', 'Type', 'Montant (FCFA)', 'Description', 'Catégorie', 'Statut']];
    for (const t of transactions) {
      wsData.push([
        t.date,
        t.type === 'INCOME' ? 'Entrée' : 'Sortie',
        t.amount / 100,
        t.description || '',
        t.category?.labelFr || '',
        getStatusLabel(t.status),
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  });
}

export function getTodayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export type PeriodType = 'mois' | 'trimestre' | 'annee';
