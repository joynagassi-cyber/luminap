import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Transaction, Caisse, Event } from "@/types";
import { formatCurrencyCompact, formatDate, formatCurrencyFull } from "./utils";
import type { OrgReportPayload } from "./orgReport";

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

function drawHeader(
  doc: jsPDF,
  options: ExportOptions,
  startY: number,
): number {
  const y = startY;

  // Church logo
  if (options.churchLogoUrl) {
    try {
      doc.addImage(options.churchLogoUrl, "PNG", 14, y, 25, 25);
    } catch {
      // If image fails, skip logo
    }
  } else {
    doc.setFillColor(255, 107, 0);
    doc.roundedRect(14, y, 25, 25, 3, 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("L", 22, y + 17, { align: "center" });
  }

  const churchName = options.churchName || "Lumina";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(churchName, 45, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  if (options.title) doc.text(options.title, 45, y + 16);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 45, y + 24);
  if (options.period) doc.text(options.period, 45, y + 30);

  return y + 38;
}

function drawFooter(doc: jsPDF, page: number, totalPages: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Lumina · Page ${page} sur ${totalPages}`,
    doc.internal.pageSize.getWidth() / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" },
  );
}

export function exportPDF(options: ExportOptions) {
  const { transactions, caisses } = options;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const totalIncome =
    options.totalIncome ??
    transactions
      .filter((t) => t.type === "INCOME" && t.status === "APPROVED")
      .reduce((s, t) => s + t.amount, 0);
  const totalExpense =
    options.totalExpense ??
    transactions
      .filter((t) => t.type === "EXPENSE" && t.status === "APPROVED")
      .reduce((s, t) => s + t.amount, 0);
  const netResult = options.netResult ?? totalIncome - totalExpense;

  // Summary box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, 10, pageWidth - 28, 20, 3, 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`Total entrées: ${formatCurrencyCompact(totalIncome)} FCFA`, 20, 18);
  doc.setTextColor(229, 19, 50);
  doc.text(
    `Total sorties: ${formatCurrencyCompact(totalExpense)} FCFA`,
    70,
    18,
  );
  doc.setTextColor(29, 185, 84);
  doc.text(
    `Résultat: ${netResult >= 0 ? "+" : "-"}${formatCurrencyCompact(Math.abs(netResult))} FCFA`,
    120,
    18,
  );

  let y = drawHeader(doc, options, 38);

  // Versements section if available
  if (options.versementList && options.versementList.length > 0) {
    const verseRows = options.versementList.map((v) => [
      formatDate(v.date),
      caisses?.find((c) => c.id === v.sourceCaisseId)?.name ||
        v.sourceCaisseId ||
        "—",
      formatCurrencyCompact(v.amount),
    ]);
    autoTable(doc, {
      startY: y,
      head: [["Date", "Groupe", "Montant (FCFA)"]],
      body: verseRows,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: {
        fillColor: [255, 107, 0],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 60 },
        2: { cellWidth: 30, halign: "right" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Main transactions table
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const rows = sorted.map((t) => [
    formatDate(t.date),
    t.type === "INCOME" ? "Entrée" : "Sortie",
    t.category?.labelFr || t.categoryId || "",
    t.description || "",
    formatCurrencyCompact(t.amount),
    t.versementId ? "Versement" : "",
    t.status === "APPROVED"
      ? "Approuvé"
      : t.status === "PENDING"
        ? "En attente"
        : "Brouillon",
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Date",
        "Type",
        "Catégorie",
        "Description",
        "Montant (FCFA)",
        "Type",
        "Statut",
      ],
    ],
    body: rows,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [255, 107, 0], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 15 },
      2: { cellWidth: 30 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 18 },
      6: { cellWidth: 20 },
    },
    didDrawPage: (data) =>
      drawFooter(doc, data.pageNumber, Math.ceil((rows.length + 1) / 35)),
  });

  doc.save(`lumina_export_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportExcel(options: ExportOptions) {
  const { transactions, caisses } = options;
  const wb = XLSX.utils.book_new();

  const totalIncome =
    options.totalIncome ??
    transactions
      .filter((t) => t.type === "INCOME" && t.status === "APPROVED")
      .reduce((s, t) => s + t.amount, 0);
  const totalExpense =
    options.totalExpense ??
    transactions
      .filter((t) => t.type === "EXPENSE" && t.status === "APPROVED")
      .reduce((s, t) => s + t.amount, 0);

  // Summary sheet
  const summary: any[] = [
    ["Lumina — Rapport financier"],
    [options.churchName || "Église MFE-JC Centrale"],
    [options.title || ""],
    [`Date d'export: ${new Date().toLocaleDateString("fr-FR")}`],
    [options.period || ""],
    [],
    ["Résumé"],
    ["Total entrées", totalIncome / 100, "FCFA"],
    ["Total sorties", totalExpense / 100, "FCFA"],
    ["Résultat", (totalIncome - totalExpense) / 100, "FCFA"],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Résumé");

  // Versements sheet
  if (options.versementList && options.versementList.length > 0) {
    const verseRows = [
      ["Date", "Groupe", "Montant (FCFA)"],
      ...options.versementList.map((v) => [
        formatDate(v.date),
        caisses?.find((c) => c.id === v.sourceCaisseId)?.name ||
          v.sourceCaisseId ||
          "—",
        v.amount / 100,
      ]),
    ];
    const wsVerse = XLSX.utils.aoa_to_sheet(verseRows);
    wsVerse["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsVerse, "Versements");
  }

  // Transactions sheet
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const txRows = [
    [
      "Date",
      "Type",
      "Catégorie",
      "Description",
      "Montant (FCFA)",
      "Statut",
      "Caisse source",
      "Versement",
      "Événement",
    ],
    ...sorted.map((t) => [
      formatDate(t.date),
      t.type === "INCOME" ? "Entrée" : "Sortie",
      t.category?.labelFr || t.categoryId || "",
      t.description || "",
      t.amount / 100,
      t.status === "APPROVED"
        ? "Approuvé"
        : t.status === "PENDING"
          ? "En attente"
          : "Brouillon",
      caisses?.find((c) => c.id === t.sourceCaisseId)?.name || "—",
      t.versementId ? "Oui" : "—",
      t.eventId || "—",
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(txRows);
  ws2["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 30 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Transactions");

  // By group sheet
  if (caisses && caisses.length > 0) {
    const groupRows = [["Caisse", "Type", "Entrées", "Sorties", "Solde"]];
    for (const caisse of caisses) {
      const caissTxs = transactions.filter(
        (t) => t.sourceCaisseId === caisse.id && t.status === "APPROVED",
      );
      const income = caissTxs
        .filter((t) => t.type === "INCOME")
        .reduce((s, t) => s + t.amount, 0);
      const expense = caissTxs
        .filter((t) => t.type === "EXPENSE")
        .reduce((s, t) => s + t.amount, 0);
      groupRows.push([
        caisse.name,
        caisse.type === "MAIN" ? "Principale" : "Groupe",
        String(income / 100),
        String(expense / 100),
        String((income - expense) / 100),
      ]);
    }
    const ws3 = XLSX.utils.aoa_to_sheet(groupRows);
    ws3["!cols"] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, ws3, "Par groupe");
  }

  // Event budget sheet if event provided
  if (options.event) {
    const evt = options.event;
    const eventTxs = transactions.filter(
      (t) => t.eventId === evt.id && t.status === "APPROVED",
    );
    const budgetRows = [
      ["Budget de l'événement", evt.name],
      ["Statut", evt.status],
      ["Début", formatDate(evt.startDate)],
      ["Fin", evt.endDate ? formatDate(evt.endDate) : "—"],
      [],
      ["Poste", "Alloué (FCFA)", "Dépensé (FCFA)", "Variation"],
      ...evt.budgetItems.map((item) => {
        const itemExpense = eventTxs
          .filter(
            (t) => t.categoryId === item.categoryId && t.type === "EXPENSE",
          )
          .reduce((s, t) => s + t.amount, 0);
        return [
          item.label,
          String(item.allocated / 100),
          String(itemExpense / 100),
          String((item.allocated - itemExpense) / 100),
        ];
      }),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(budgetRows);
    ws4["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Budget événement");
  }

  XLSX.writeFile(
    wb,
    `lumina_export_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}

export function exportCSV(options: ExportOptions) {
  const { transactions, caisses } = options;
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const BOM = "\uFEFF";
  const header =
    "Date;Type;Catégorie;Description;Montant (FCFA);Statut;Caisse source;Versement;Événement";
  const rows = sorted.map((t) => [
    formatDate(t.date),
    t.type === "INCOME" ? "Entrée" : "Sortie",
    t.category?.labelFr || t.categoryId || "",
    `"${(t.description || "").replace(/"/g, '""')}"`,
    String(t.amount / 100),
    String(
      t.status === "APPROVED"
        ? "Approuvé"
        : t.status === "PENDING"
          ? "En attente"
          : "Brouillon",
    ),
    String(caisses?.find((c) => c.id === t.sourceCaisseId)?.name || ""),
    t.versementId ? "Oui" : "",
    t.eventId || "",
  ]);

  const csv = BOM + [header, ...rows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lumina_export_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Rapports inter-organisations — export multi-format (Phase 3 Feature 2)
//
// Un seul générateur, quatre formats. Le `payload` est le résultat pur de
// `buildOrgReport` (lib/orgReport.ts) : agrégats + tableaux filtrés.
//  - pdf / xlsx : déclenchent le download local (fonctions existantes).
//  - docx       : download déclenché via `docx` (Packer.toBlob + <a>).
//  - png        : renvoie un Blob (graphique recharts) pour l'upload dans
//                 le bucket privé `org_reports`.
// Les montants du payload sont en FCFA (pas en centimes) : formatés tels
// quels, sans division par 100 (contrairement à `exportExcel` legacy).
// ============================================================

export type OrgReportFormat = "pdf" | "docx" | "xlsx" | "png";

export async function exportOrgReport(
  payload: OrgReportPayload,
  format: OrgReportFormat,
): Promise<Blob | void> {
  switch (format) {
    case "pdf":
      return exportOrgReportPDF(payload);
    case "docx":
      return exportOrgReportDOCX(payload);
    case "xlsx":
      return exportOrgReportXLSX(payload);
    case "png":
      return exportOrgReportPNG(payload);
  }
}

/** PDF — génère et renvoie un Blob (uploadable dans `org_reports`). */
function exportOrgReportPDF(payload: OrgReportPayload): Blob {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { summary, period } = payload;

  // ── En-tête ─────────────────────────────────────────────────────────────
  doc.setFillColor(255, 107, 0);
  doc.roundedRect(14, 10, 25, 25, 3, 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("L", 22, 27, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(
    `Rapport de gestion — ${payload.fromOrg.name} → ${payload.toOrg.name}`,
    45,
    18,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Période : ${period.label} (${period.start} → ${period.end}) · Généré le ${new Date().toLocaleDateString("fr-FR")}`,
    45,
    26,
  );

  // ── Résumé ──────────────────────────────────────────────────────────────
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, 38, pageWidth - 28, 16, 3, 3);
  doc.setFontSize(10);
  doc.setTextColor(29, 185, 84);
  doc.text(`Entrées: ${formatCurrencyCompact(summary.totalIncome)} FCFA`, 20, 47);
  doc.setTextColor(229, 19, 50);
  doc.text(
    `Sorties: ${formatCurrencyCompact(summary.totalExpense)} FCFA`,
    75,
    47,
  );
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Résultat: ${summary.netResult >= 0 ? "+" : "-"}${formatCurrencyCompact(Math.abs(summary.netResult))} FCFA`,
    130,
    47,
  );

  let y = 58;

  const addTable = (title: string, head: string[], body: string[][]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(title, 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [255, 107, 0], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  };

  addTable(
    "Synthèse",
    ["Indicateur", "Valeur"],
    [
      ["Transactions sur la période", String(payload.transactions.length)],
      ["Événements", String(summary.eventCount)],
      ["Membres", String(summary.memberCount)],
      ["Documents joints", String(summary.documentCount)],
    ],
  );

  if (payload.transactions.length > 0) {
    addTable(
      "Transactions de la période",
      ["Date", "Type", "Source", "Montant (FCFA)"],
      payload.transactions.map((t) => [
        formatDate(t.date),
        t.type === "INCOME" ? "Entrée" : "Sortie",
        t.source ?? t.person_name ?? "—",
        formatCurrencyCompact(t.amount),
      ]),
    );
  }

  if (payload.events.length > 0) {
    addTable(
      "Événements",
      ["Événement", "Statut", "Budget"],
      payload.events.map((e) => [
        e.name,
        e.status,
        e.budget != null ? formatCurrencyCompact(e.budget) : "—",
      ]),
    );
  }

  if (payload.documents.length > 0) {
    addTable(
      "Documents joints",
      ["Titre", "Objet"],
      payload.documents.map((d) => [d.title, d.purpose ?? "—"]),
    );
  }

  // Pied de page (nombre de pages estimé)
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p);
    drawFooter(doc, p, doc.getNumberOfPages());
  }

  return doc.output("blob");
}

/** DOCX — génère et renvoie un Blob (uploadable + preview). */
async function exportOrgReportDOCX(payload: OrgReportPayload): Promise<Blob> {
  const { summary, period } = payload;
  const cell = (text: string, bold = false): TableCell =>
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text, bold, size: 18, color: bold ? "FF6B00" : "1E1E1E" }),
          ],
        }),
      ],
    });
  const headerRow = (cols: string[]) =>
    new TableRow({ children: cols.map((c) => cell(c, true)) });
  const dataRow = (cols: string[]) => new TableRow({ children: cols.map((c) => cell(c)) });

  const makeTable = (head: string[], rows: string[][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow(head), ...rows.map((r) => dataRow(r))],
    });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: `Rapport de gestion — ${payload.fromOrg.name} → ${payload.toOrg.name}`,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `Période : ${period.label} (${period.start} → ${period.end})`,
          }),
          new Paragraph({
            text: `Généré le ${new Date().toLocaleDateString("fr-FR")}`,
          }),
          new Paragraph({
            text: `Entrées : ${formatCurrencyCompact(summary.totalIncome)} FCFA · Sorties : ${formatCurrencyCompact(summary.totalExpense)} FCFA · Résultat : ${summary.netResult >= 0 ? "+" : "-"}${formatCurrencyCompact(Math.abs(summary.netResult))} FCFA`,
          }),
          new Paragraph({
            text: `Transactions : ${payload.transactions.length} · Événements : ${summary.eventCount} · Membres : ${summary.memberCount} · Documents joints : ${summary.documentCount}`,
          }),
          ...(payload.transactions.length > 0
            ? [
                new Paragraph({
                  text: "Transactions de la période",
                  heading: HeadingLevel.HEADING_2,
                }),
                makeTable(
                  ["Date", "Type", "Source", "Montant (FCFA)"],
                  payload.transactions.map((t) => [
                    formatDate(t.date),
                    t.type === "INCOME" ? "Entrée" : "Sortie",
                    t.source ?? t.person_name ?? "—",
                    formatCurrencyCompact(t.amount),
                  ]),
                ) as unknown as Paragraph,
              ]
            : []),
          ...(payload.events.length > 0
            ? [
                new Paragraph({
                  text: "Événements",
                  heading: HeadingLevel.HEADING_2,
                }),
                makeTable(
                  ["Événement", "Statut", "Budget"],
                  payload.events.map((e) => [
                    e.name,
                    e.status,
                    e.budget != null ? formatCurrencyCompact(e.budget) : "—",
                  ]),
                ) as unknown as Paragraph,
              ]
            : []),
          ...(payload.documents.length > 0
            ? [
                new Paragraph({
                  text: "Documents joints",
                  heading: HeadingLevel.HEADING_2,
                }),
                makeTable(
                  ["Titre", "Objet"],
                  payload.documents.map((d) => [d.title, d.purpose ?? "—"]),
                ) as unknown as Paragraph,
              ]
            : []),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

/** XLSX — génère un multi-feuilles et renvoie le Blob. */
function exportOrgReportXLSX(payload: OrgReportPayload): Blob {
  const { summary, period } = payload;
  const wb = XLSX.utils.book_new();

  const summarySheet: any[] = [
    [`Rapport de gestion — ${payload.fromOrg.name} → ${payload.toOrg.name}`],
    [`Période : ${period.label} (${period.start} → ${period.end})`],
    [`Généré le ${new Date().toLocaleDateString("fr-FR")}`],
    [],
    ["Total entrées (FCFA)", summary.totalIncome],
    ["Total sorties (FCFA)", summary.totalExpense],
    ["Résultat (FCFA)", summary.netResult],
    ["Transactions", payload.transactions.length],
    ["Événements", summary.eventCount],
    ["Membres", summary.memberCount],
    ["Documents joints", summary.documentCount],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summarySheet);
  ws1["!cols"] = [{ wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Résumé");

  if (payload.transactions.length > 0) {
    const txRows = [
      ["Date", "Type", "Source", "Montant (FCFA)"],
      ...payload.transactions.map((t) => [
        formatDate(t.date),
        t.type === "INCOME" ? "Entrée" : "Sortie",
        t.source ?? t.person_name ?? "",
        t.amount,
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(txRows);
    ws2["!cols"] = [
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Transactions");
  }

  if (payload.events.length > 0) {
    const evtRows = [
      ["Événement", "Statut", "Budget (FCFA)"],
      ...payload.events.map((e) => [e.name, e.status, e.budget ?? ""]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(evtRows);
    ws3["!cols"] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, ws3, "Événements");
  }

  if (payload.documents.length > 0) {
    const docRows = [
      ["Titre", "Objet"],
      ...payload.documents.map((d) => [d.title, d.purpose ?? ""]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(docRows);
    ws4["!cols"] = [
      { wch: 30 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws4, "Documents");
  }

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * PNG — génère un graphique de barres (recharts, revenus/dépenses sur la
 * période) et renvoie le Blob. Recharts (React) ne peut pas s'exécuter en
 * contexte non-React fiablement ici, on dessine donc le graphique avec
 * l'API native canvas (mêmes données + mêmes sémantiques de couleur) et on
 * renvoie le canvas via `toDataURL` → Blob.
 */
function exportOrgReportPNG(payload: OrgReportPayload): Blob {
  const W = 800;
  const H = 400;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Blob([], { type: "image/png" });

  const { summary, period } = payload;
  const bars = [
    { label: "Entrées", value: summary.totalIncome, color: "#1DB954" },
    { label: "Sorties", value: summary.totalExpense, color: "#E51332" },
    {
      label: "Résultat",
      value: Math.abs(summary.netResult),
      color: "#FF6B00",
    },
  ];
  const max = Math.max(...bars.map((b) => b.value), 1);

  // Fond
  ctx.fillStyle = "#F5F5F5";
  ctx.fillRect(0, 0, W, H);

  // Titre
  ctx.fillStyle = "#1E1E1E";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(
    `Rapport — ${payload.fromOrg.name} → ${payload.toOrg.name}`,
    24,
    36,
  );
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#646464";
  ctx.fillText(`Période : ${period.label}`, 24, 58);

  // Barres
  const chartX = 60;
  const chartY = 100;
  const chartW = W - 120;
  const chartH = H - 200;
  const gap = 40;
  const barW = (chartW - gap * (bars.length - 1)) / bars.length;

  // Ligne de base
  ctx.strokeStyle = "#CCCCCC";
  ctx.beginPath();
  ctx.moveTo(chartX, chartY + chartH);
  ctx.lineTo(chartX + chartW, chartY + chartH);
  ctx.stroke();

  bars.forEach((b, i) => {
    const x = chartX + i * (barW + gap);
    const h = (b.value / max) * (chartH - 30);
    const y = chartY + chartH - h;
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = "#1E1E1E";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      `${formatCurrencyCompact(b.value)} FCFA`,
      x + barW / 2,
      y - 6,
      "center",
    );
    ctx.fillStyle = "#646464";
    ctx.font = "13px sans-serif";
    ctx.fillText(b.label, x + barW / 2, chartY + chartH + 18, "center");
  });

  const dataUrl = canvas.toDataURL("image/png");
  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}

