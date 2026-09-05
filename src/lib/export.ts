import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Transaction, Caisse, Event } from '@/types';
import { formatCurrencyCompact, formatDate, formatCurrencyFull } from './utils';

export interface ExportOptions {
  churchName?: string;
  churchLogoUrl?: string;
  transactions: Transaction[];
  caisses?: Caisse[];
  title?: string;
  period?: string;
  // Optional versement data for group reports
  versementList?: { amount: number; date: string; sourceCaisseId?: string }[];
  // Optional event data
  event?: Event;
  // Extra summary data
  totalIncome?: number;
  totalExpense?: number;
  netResult?: number;
}

function drawHeader(doc: jsPDF, options: ExportOptions, startY: number): number {
  let y = startY;

  // Church logo
  if (options.churchLogoUrl) {
    try {
      doc.addImage(options.churchLogoUrl, 'PNG', 14, y, 25, 25);
    } catch {
      // If image fails, skip logo
    }
  } else {
    doc.setFillColor(255, 107, 0);
    doc.roundedRect(14, y, 25, 25, 3, 3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('L', 22, y + 17, { align: 'center' });
  }

  const churchName = options.churchName || 'Église MFE-JC Centrale';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(churchName, 45, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  if (options.title) doc.text(options.title, 45, y + 16);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 45, y + 24);
  if (options.period) doc.text(options.period, 45, y + 30);

  return y + 38;
}

function drawFooter(doc: jsPDF, page: number, totalPages: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Lumina · Page ${page} sur ${totalPages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
}

export function exportPDF(options: ExportOptions) {
  const { transactions, caisses } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const totalIncome = options.totalIncome ?? transactions.filter(t => t.type === 'INCOME' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const totalExpense = options.totalExpense ?? transactions.filter(t => t.type === 'EXPENSE' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const netResult = options.netResult ?? totalIncome - totalExpense;

  // Summary box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, 10, pageWidth - 28, 20, 3, 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`Total entrées: ${formatCurrencyCompact(totalIncome)} FCFA`, 20, 18);
  doc.setTextColor(229, 19, 50);
  doc.text(`Total sorties: ${formatCurrencyCompact(totalExpense)} FCFA`, 70, 18);
  doc.setTextColor(29, 185, 84);
  doc.text(`Résultat: ${netResult >= 0 ? '+' : '-'}${formatCurrencyCompact(Math.abs(netResult))} FCFA`, 120, 18);

  let y = drawHeader(doc, options, 38);

  // Versements section if available
  if (options.versementList && options.versementList.length > 0) {
    const verseRows = options.versementList.map(v => [
      formatDate(v.date),
      caisses?.find(c => c.id === v.sourceCaisseId)?.name || v.sourceCaisseId || '—',
      formatCurrencyCompact(v.amount),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Groupe', 'Montant (FCFA)']],
      body: verseRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [255, 107, 0], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 60 }, 2: { cellWidth: 30, halign: 'right' } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Main transactions table
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const rows = sorted.map(t => [
    formatDate(t.date),
    t.type === 'INCOME' ? 'Entrée' : 'Sortie',
    t.category?.labelFr || t.categoryId || '',
    t.description || '',
    formatCurrencyCompact(t.amount),
    t.versementId ? 'Versement' : '',
    t.status === 'APPROVED' ? 'Approuvé' : t.status === 'PENDING' ? 'En attente' : 'Brouillon',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Type', 'Catégorie', 'Description', 'Montant (FCFA)', 'Type', 'Statut']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [255, 107, 0], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 15 },
      2: { cellWidth: 30 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 18 },
      6: { cellWidth: 20 },
    },
    didDrawPage: (data) => drawFooter(doc, data.pageNumber, Math.ceil((rows.length + 1) / 35)),
  });

  doc.save(`lumina_export_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportExcel(options: ExportOptions) {
  const { transactions, caisses } = options;
  const wb = XLSX.utils.book_new();

  const totalIncome = options.totalIncome ?? transactions.filter(t => t.type === 'INCOME' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const totalExpense = options.totalExpense ?? transactions.filter(t => t.type === 'EXPENSE' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);

  // Summary sheet
  const summary: any[] = [
    ['Lumina — Rapport financier'],
    [options.churchName || 'Église MFE-JC Centrale'],
    [options.title || ''],
    [`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`],
    [options.period || ''],
    [],
    ['Résumé'],
    ['Total entrées', totalIncome / 100, 'FCFA'],
    ['Total sorties', totalExpense / 100, 'FCFA'],
    ['Résultat', (totalIncome - totalExpense) / 100, 'FCFA'],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Résumé');

  // Versements sheet
  if (options.versementList && options.versementList.length > 0) {
    const verseRows = [
      ['Date', 'Groupe', 'Montant (FCFA)'],
      ...options.versementList.map(v => [
        formatDate(v.date),
        caisses?.find(c => c.id === v.sourceCaisseId)?.name || v.sourceCaisseId || '—',
        v.amount / 100,
      ]),
    ];
    const wsVerse = XLSX.utils.aoa_to_sheet(verseRows);
    wsVerse['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsVerse, 'Versements');
  }

  // Transactions sheet
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const txRows = [
    ['Date', 'Type', 'Catégorie', 'Description', 'Montant (FCFA)', 'Statut', 'Caisse source', 'Versement', 'Événement'],
    ...sorted.map(t => [
      formatDate(t.date),
      t.type === 'INCOME' ? 'Entrée' : 'Sortie',
      t.category?.labelFr || t.categoryId || '',
      t.description || '',
      t.amount / 100,
      t.status === 'APPROVED' ? 'Approuvé' : t.status === 'PENDING' ? 'En attente' : 'Brouillon',
      caisses?.find(c => c.id === t.sourceCaisseId)?.name || '—',
      t.versementId ? 'Oui' : '—',
      t.eventId || '—',
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(txRows);
  ws2['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 30 },
    { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Transactions');

  // By group sheet
  if (caisses && caisses.length > 0) {
    const groupRows = [['Caisse', 'Type', 'Entrées', 'Sorties', 'Solde']];
    for (const caisse of caisses) {
      const caissTxs = transactions.filter(t => t.sourceCaisseId === caisse.id && t.status === 'APPROVED');
      const income = caissTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expense = caissTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      groupRows.push([
        caisse.name,
        caisse.type === 'MAIN' ? 'Principale' : 'Groupe',
        String(income / 100),
        String(expense / 100),
        String((income - expense) / 100),
      ]);
    }
    const ws3 = XLSX.utils.aoa_to_sheet(groupRows);
    ws3['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Par groupe');
  }

  // Event budget sheet if event provided
  if (options.event) {
    const evt = options.event;
    const eventTxs = transactions.filter(t => t.eventId === evt.id && t.status === 'APPROVED');
    const budgetRows = [
      ['Budget de l\'événement', evt.name],
      ['Statut', evt.status],
      ['Début', formatDate(evt.startDate)],
      ['Fin', evt.endDate ? formatDate(evt.endDate) : '—'],
      [],
      ['Poste', 'Alloué (FCFA)', 'Dépensé (FCFA)', 'Variation'],
      ...evt.budgetItems.map(item => {
        const itemExpense = eventTxs.filter(t => t.categoryId === item.categoryId && t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        return [item.label, String(item.allocated / 100), String(itemExpense / 100), String((item.allocated - itemExpense) / 100)];
      }),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(budgetRows);
    ws4['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Budget événement');
  }

  XLSX.writeFile(wb, `lumina_export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportCSV(options: ExportOptions) {
  const { transactions, caisses } = options;
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const BOM = '\uFEFF';
  const header = 'Date;Type;Catégorie;Description;Montant (FCFA);Statut;Caisse source;Versement;Événement';
  const rows = sorted.map(t => [
    formatDate(t.date),
    t.type === 'INCOME' ? 'Entrée' : 'Sortie',
    t.category?.labelFr || t.categoryId || '',
    `"${(t.description || '').replace(/"/g, '""')}"`,
    String(t.amount / 100),
    String(t.status === 'APPROVED' ? 'Approuvé' : t.status === 'PENDING' ? 'En attente' : 'Brouillon'),
    String(caisses?.find(c => c.id === t.sourceCaisseId)?.name || ''),
    t.versementId ? 'Oui' : '',
    t.eventId || '',
  ]);

  const csv = BOM + [header, ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lumina_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
