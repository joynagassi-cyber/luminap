import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Transaction, Caisse } from '@/types';
import { formatCurrencyCompact, formatDate } from './utils';

interface ExportOptions {
  churchName?: string;
  churchLogoUrl?: string;
  transactions: Transaction[];
  caisses?: Caisse[];
  title?: string;
  period?: string;
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
    // Draw simple logo placeholder
    doc.setFillColor(255, 107, 0);
    doc.roundedRect(14, y, 25, 25, 3, 3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('L', 22, y + 17, { align: 'center' });
  }

  // Church name
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

  return y + 35;
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

  const totalIncome = transactions.filter(t => t.type === 'INCOME' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);

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
  const net = totalIncome - totalExpense;
  doc.text(`Résultat: ${net >= 0 ? '+' : '-'}${formatCurrencyCompact(Math.abs(net))} FCFA`, 120, 18);

  let y = drawHeader(doc, options, 38);

  // Table
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const rows = sorted.map(t => [
    formatDate(t.date),
    t.type === 'INCOME' ? 'Entrée' : 'Sortie',
    t.category?.labelFr || t.categoryId || '',
    t.description || '',
    formatCurrencyCompact(t.amount),
    t.status === 'APPROVED' ? 'Approuvé' : t.status === 'PENDING' ? 'En attente' : 'Brouillon',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Type', 'Catégorie', 'Description', 'Montant (FCFA)', 'Statut']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [255, 107, 0], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 18 },
      2: { cellWidth: 35 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 22 },
    },
    didDrawPage: (data) => drawFooter(doc, data.pageNumber, Math.ceil((rows.length + 1) / 35)),
  });

  doc.save(`lumina_export_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportExcel(options: ExportOptions) {
  const { transactions, caisses } = options;
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const totalIncome = transactions.filter(t => t.type === 'INCOME' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
  const summary = [
    ['Lumina — Rapport financier'],
    [options.churchName || 'Église MFE-JC Centrale'],
    [`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`],
    [],
    ['Résumé'],
    ['Total entrées', totalIncome, 'FCFA'],
    ['Total sorties', totalExpense, 'FCFA'],
    ['Résultat', totalIncome - totalExpense, 'FCFA'],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Résumé');

  // Transactions sheet
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const txRows = [
    ['Date', 'Type', 'Catégorie', 'Description', 'Montant (FCFA)', 'Statut', 'Caisse', 'Groupe'],
    ...sorted.map(t => [
      formatDate(t.date),
      t.type === 'INCOME' ? 'Entrée' : 'Sortie',
      t.category?.labelFr || t.categoryId || '',
      t.description || '',
      t.amount / 100,
      t.status === 'APPROVED' ? 'Approuvé' : t.status === 'PENDING' ? 'En attente' : 'Brouillon',
      caisses?.find(c => c.id === t.sourceCaisseId)?.name || '—',
      caisses?.find(c => c.id === t.sourceCaisseId && c.type === 'GROUP')?.name || '—',
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(txRows);
  ws2['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 30 },
    { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Transactions');

  // By group sheet
  if (caisses && caisses.length > 0) {
    const groupRows = [['Caisse', 'Entrées', 'Sorties', 'Solde']];
    for (const caisse of caisses) {
      const caissTxs = transactions.filter(t => t.sourceCaisseId === caisse.id && t.status === 'APPROVED');
      const income = caissTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expense = caissTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      groupRows.push([caisse.name, String(income / 100), String(expense / 100), String((income - expense) / 100)]);
    }
    const ws3 = XLSX.utils.aoa_to_sheet(groupRows);
    ws3['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Par groupe');
  }

  XLSX.writeFile(wb, `lumina_export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportCSV(options: ExportOptions) {
  const { transactions } = options;
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const BOM = '\uFEFF';
  const header = 'Date;Type;Catégorie;Description;Montant (FCFA);Statut;Caisse source';
  const rows = sorted.map(t => [
    formatDate(t.date),
    t.type === 'INCOME' ? 'Entrée' : 'Sortie',
    t.category?.labelFr || t.categoryId || '',
    `"${(t.description || '').replace(/"/g, '""')}"`,
    String(t.amount / 100),
    String(t.status === 'APPROVED' ? 'Approuvé' : t.status === 'PENDING' ? 'En attente' : 'Brouillon'),
    String(t.sourceCaisseId || ''),
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
