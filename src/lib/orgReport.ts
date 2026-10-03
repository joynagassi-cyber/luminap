/**
 * Moteur de composition du rapport de gestion inter-organisations
 * (Phase 3 Feature 2 — rapports organisations).
 *
 * Agrège les données locales (PowerSync / IndexedDB, snake_case) en un
 * agrégat JSON `OrgReportPayload` prêt pour l'export multi-format
 * (`lib/export.ts` — pdf/docx/xlsx/png) et l'envoi à la mère via la
 * table `org_reports` (outbox offline-first).
 *
 * La fonction est PURE (pas de hook React) → testable en vitest.
 */

// ============================================================
// Types du payload
// ============================================================

export interface OrgReportPayload {
  fromOrg: { id: string; name: string };
  toOrg: { id: string; name: string };
  period: { start: string; end: string; label: string };
  summary: {
    totalIncome: number;
    totalExpense: number;
    netResult: number;
    eventCount: number;
    memberCount: number;
    documentCount: number;
  };
  transactions: Array<{
    id: string;
    date: string;
    type: "INCOME" | "EXPENSE";
    amount: number;
    person_name?: string;
    source?: string;
    event_id?: string;
  }>;
  events: Array<{
    id: string;
    name: string;
    status: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
  }>;
  members: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    purpose?: string;
    mime_type?: string;
  }>;
  /** Ids des documents uploadés joints au rapport (picker `DocumentPicker`). */
  document_refs: string[];
}

/**
 * Filtre une transaction sur la période `[start, end]` (bornes incluses).
 * Lit `date` si le champ existe (snake_case PowerSync / camelCase legacy),
 * sinon `created_at`. Dates bornées au format `YYYY-MM-DD` (comparaison
 * lexicographique fiable sur ISO ; seules les dates valides sont retenues).
 */
function inPeriod(dateStr: unknown, start: string, end: string): boolean {
  if (!dateStr || typeof dateStr !== "string") return false;
  const day = dateStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}/.test(day)) return false;
  return day >= start.slice(0, 10) && day <= end.slice(0, 10);
}

/**
 * Composition du rapport de gestion : agrégats (revenus/dépenses sur la
 * période, compteurs d'événements/membres/documents) + tableaux filtrés.
 *
 * - `transactions` : filtrées sur la période (`date` ?? `created_at`).
 * - `events` / `members` : l'org compte son état courant (non filtré).
 * - `documents` : uniquement les documents JOINTS (`document_refs`) ;
 *   `summary.documentCount` = leur nombre.
 */
export function buildOrgReport(params: {
  fromOrg: { id: string; name: string };
  toOrg: { id: string; name: string };
  period: { start: string; end: string; label: string };
  /** Transactions brutes (PS-like : snake_case OU camelCase legacy). */
  transactions: any[];
  /** Événements bruts (PS-like). */
  events: any[];
  /** Membres bruts (PS-like). */
  members: any[];
  /** Documents uploadés (PS-like : `useDocuments`). */
  documents: any[];
  /** Ids des documents à joindre au rapport (picker). */
  document_refs?: string[];
}): OrgReportPayload {
  const { fromOrg, toOrg, period, documents, document_refs = [] } = params;
  const rawTx = (params.transactions ?? []) as any[];
  const rawEvents = (params.events ?? []) as any[];
  const rawMembers = (params.members ?? []) as any[];

  // ── Transactions de la période ─────────────────────────────────────
  const txInPeriod = rawTx.filter((t) =>
    inPeriod(t?.date ?? t?.created_at, period.start, period.end),
  );

  const totalIncome = txInPeriod
    .filter((t) => t?.type === "INCOME")
    .reduce((s: number, t: any) => s + (Number(t?.amount) || 0), 0);
  const totalExpense = txInPeriod
    .filter((t) => t?.type === "EXPENSE")
    .reduce((s: number, t: any) => s + (Number(t?.amount) || 0), 0);

  // ── Documents joints (picker → document_refs) ──────────────────────
  const refSet = new Set(document_refs);
  const joinedDocs = (rawDocsSafe(documents)).filter((d) => refSet.has(d?.id));

  return {
    fromOrg,
    toOrg,
    period,
    summary: {
      totalIncome,
      totalExpense,
      netResult: totalIncome - totalExpense,
      eventCount: rawEvents.length,
      memberCount: rawMembers.length,
      documentCount: joinedDocs.length,
    },
    transactions: txInPeriod.map((t: any) => ({
      id: String(t?.id ?? ""),
      date: String(t?.date ?? t?.created_at ?? ""),
      type: t?.type === "EXPENSE" ? "EXPENSE" : "INCOME",
      amount: Number(t?.amount) || 0,
      ...(t?.person_name != null ? { person_name: String(t.person_name) } : {}),
      ...(t?.source != null ? { source: String(t.source) } : {}),
      ...((t?.event_id ?? t?.eventId) != null
        ? { event_id: String(t?.event_id ?? t?.eventId) }
        : {}),
    })),
    events: rawEvents.map((e: any) => ({
      id: String(e?.id ?? ""),
      name: String(e?.name ?? ""),
      status: String(e?.status ?? "UNKNOWN"),
      ...((e?.start_date ?? e?.startDate) != null
        ? { start_date: String(e?.start_date ?? e?.startDate) }
        : {}),
      ...((e?.end_date ?? e?.endDate) != null
        ? { end_date: String(e?.end_date ?? e?.endDate) }
        : {}),
      ...(e?.budget != null ? { budget: Number(e.budget) || 0 } : {}),
    })),
    members: rawMembers.map((m: any) => ({
      id: String(m?.id ?? ""),
      first_name: String(m?.first_name ?? m?.firstName ?? ""),
      last_name: String(m?.last_name ?? m?.lastName ?? ""),
    })),
    documents: joinedDocs.map((d: any) => ({
      id: String(d?.id ?? ""),
      title: String(d?.title ?? "Document"),
      ...(d?.purpose != null ? { purpose: String(d.purpose) } : {}),
      ...(d?.mime_type != null ? { mime_type: String(d.mime_type) } : {}),
    })),
    document_refs,
  };
}

function rawDocsSafe(documents: any[]): any[] {
  return Array.isArray(documents) ? documents : [];
}

/**
 * Calcule la période (mensuelle / semestrielle / annuelle) relative à une
 * date de référence. Bornes incluses au format `YYYY-MM-DD`, libellé FR
 * (ex. "Octobre 2026", "S2 2026", "2026").
 */
export function computePeriod(
  kind: "monthly" | "semiannual" | "annual",
  ref: Date = new Date(),
): { start: string; end: string; label: string } {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  if (kind === "monthly") {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    return {
      start: iso(start),
      end: iso(end),
      label: `${MONTHS_FR[ref.getMonth()]} ${ref.getFullYear()}`,
    };
  }
  if (kind === "semiannual") {
    // H1 : janvier–juin · H2 : juillet–décembre
    const h1 = ref.getMonth() < 6;
    const start = new Date(ref.getFullYear(), h1 ? 0 : 6, 1);
    const end = new Date(ref.getFullYear(), h1 ? 6 : 12, 0);
    return {
      start: iso(start),
      end: iso(end),
      label: `${h1 ? "S1" : "S2"} ${ref.getFullYear()}`,
    };
  }
  // annual
  const start = new Date(ref.getFullYear(), 0, 1);
  const end = new Date(ref.getFullYear(), 11, 31);
  return { start: iso(start), end: iso(end), label: `${ref.getFullYear()}` };
}
