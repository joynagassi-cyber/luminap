/**
 * Cotisation Service
 *
 * Handles all business logic for cotisations (church contributions):
 * - createCulte: creates a culte event and initial cotisations for all active members
 * - markCotisationPaid: validates and records a cotisation payment
 * - markCotisationsAbsent: marks members absent for a culte
 * - updateCotisation: updates a cotisation record
 * - getMembreHistorique: retrieves a member's cotisation history
 * - getMembresEnAvance: retrieves members with advance payments
 */

import { generateId } from "./utils";
import { formatDate, formatCentsToFCFA } from "./utils";
import { getOrganizationId } from "./orgContext";
import { executeWrite, updateCotisationPS, updateMemberPS } from "./dataLayer";
import {
  determinerStatutAvance,
  calculerDon,
  isPaiementVerrouille,
} from "./cotisation-logic";
import type {
  Cotisation,
  CotisationStatut,
  Event,
  Member,
  Transaction,
} from "@/types";
import { get, set } from "./cache";

// ============================================================
// State snapshot passed into service functions
// ============================================================

export interface CotisationState {
  cotisations: Cotisation[];
  events: Event[];
  members: Member[];
  transactions: Transaction[];
}

// ============================================================
// createCulte
// ============================================================

export interface CreateCulteResult {
  culte: Event;
  cotisations: Cotisation[];
}

export function createCulte(
  params: { name: string; startDate: string; montantCotisationCents?: number },
  state: CotisationState,
): CreateCulteResult {
  const now = new Date().toISOString();
  const id = generateId();
  const members = state.members.filter((m) => m.status === "ACTIVE");
  if (params.montantCotisationCents === undefined || params.montantCotisationCents <= 0) {
    throw new Error("MONTANT_COTISATION_REQUIS");
  }
  const montantObligatoireCents = params.montantCotisationCents;

  const culte: Event = {
    id,
    orgId: getOrganizationId(),
    name: params.name,
    description: "",
    startDate: params.startDate,
    endDate: null,
    status: "PLANIFIED",
    type: "CULTE",
    budget: 0,
    budgetItems: [],
    shoppingItems: [],
    createdAt: now,
    updatedAt: now,
  };

  const newCotisations: Cotisation[] = members.map((m) => ({
    id: generateId(),
    culteId: id,
    membreId: m.id,
    statut: "NON_PAYE" as CotisationStatut,
    montantObligatoire: montantObligatoireCents,
    montantPaye: 0,
    datePaiement: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  }));

  return { culte, cotisations: newCotisations };
}

export async function persistCulte(
  culte: Event,
  cotisations: Cotisation[],
): Promise<void> {
  const now = new Date().toISOString();
  await executeWrite(
    "INSERT INTO events (id, org_id, name, description, start_date, end_date, status, type, budget, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      culte.id,
      culte.orgId,
      culte.name,
      culte.description,
      culte.startDate,
      null,
      "PLANIFIED",
      "CULTE",
      0,
      now,
      now,
    ],
  );

  for (const cot of cotisations) {
    await executeWrite(
      "INSERT INTO cotisations (id, org_id, culte_id, membre_id, statut, montantObligatoire, montantPaye, datePaiement, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        cot.id,
        culte.orgId,
        cot.culteId,
        cot.membreId,
        cot.statut,
        cot.montantObligatoire,
        cot.montantPaye,
        cot.datePaiement,
        cot.notes,
        cot.createdAt,
        cot.updatedAt,
      ],
    );
  }
}

// ============================================================
// markCotisationPaid
// ============================================================

export interface MarkCotisationPaidResult {
  updatedCot: Cotisation;
  updatedMembre?: Member;
  newTransaction?: Transaction;
  error?: string;
}

export function markCotisationPaid(
  cotisationId: string,
  montantPayeCents: number,
  datePaiement: string,
  state: CotisationState,
): MarkCotisationPaidResult {
  const cot = state.cotisations.find((c) => c.id === cotisationId);
  if (!cot) return { error: "COTISATION_NOT_FOUND", updatedCot: cot! };

  const culte = state.events.find((e) => e.id === cot.culteId);
  const membre = state.members.find((m) => m.id === cot.membreId);
  if (!culte || !membre)
    return { error: "CULTE_OR_MEMBER_NOT_FOUND", updatedCot: cot };

  if (
    isPaiementVerrouille({
      dateCulte: culte.startDate,
      cotisationEstPaye: cot.statut === "PAYE" || cot.statut === "EN_AVANCE",
    })
  ) {
    return { error: "PAIEMENT_VERROUILLE", updatedCot: cot };
  }
  if (montantPayeCents < cot.montantObligatoire) {
    return { error: "MONTANT_INSUFFISANT", updatedCot: cot };
  }

  const statut = determinerStatutAvance({
    datePaiement,
    dateCulte: culte.startDate,
  });
  const donCents = calculerDon(montantPayeCents, cot.montantObligatoire);
  const aAvance = (membre.montantEnAvance || 0) >= montantPayeCents;
  const now = new Date().toISOString();

  const updatedCot: Cotisation = {
    ...cot,
    statut,
    montantPaye: montantPayeCents,
    datePaiement,
    updatedAt: now,
  };

  let updatedMembre: Member | undefined;
  let newTransaction: Transaction | undefined;

  if (aAvance) {
    updatedMembre = {
      ...membre,
      montantEnAvance: membre.montantEnAvance - montantPayeCents,
      updatedAt: now,
    };
  } else {
    const sessionId = localStorage.getItem("lumina-session") || "local-user";
    newTransaction = {
      id: generateId(),
      orgId: getOrganizationId(),
      type: "INCOME",
      amount: montantPayeCents,
      description: `Cotisation ${membre.firstName} ${membre.lastName} -- Culte du ${formatDate(culte.startDate)}`,
      date: datePaiement.split("T")[0],
      status: "APPROVED",
      categoryId: "cat-dime",
      orgUnitId: null,
      eventId: cot.culteId,
      source: "COTISATION" as const,
      personName: `${membre.firstName} ${membre.lastName}`,
      compensatesFor: null,
      comment:
        donCents > 0
          ? `Cotisation + don ${formatCentsToFCFA(donCents)} FCFA`
          : "Cotisation",
      version: 1,
      sourceCaisseId: "main",
      versementId: null,
      reversalOfId: null,
      cotisationId,
      createdAt: now,
      updatedAt: now,
      createdById: sessionId,
      approvedById: sessionId,
      approvedAt: now,
    };
  }

  return { updatedCot, updatedMembre, newTransaction };
}

export async function persistMarkCotisationPaid(
  result: MarkCotisationPaidResult & {
    cotisationId: string;
    membreId?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();

  await updateCotisationPS(result.cotisationId, {
    statut: result.updatedCot.statut,
    montantPaye: result.updatedCot.montantPaye,
    datePaiement: result.updatedCot.datePaiement,
    updatedAt: now,
  });

  if (result.updatedMembre) {
    await updateMemberPS(result.updatedMembre.id, {
      montant_en_avance: result.updatedMembre.montantEnAvance,
      updated_at: now,
    });
  } else if (result.newTransaction) {
    const tx = result.newTransaction;
    await executeWrite(
      "INSERT INTO transactions (id, org_id, type, amount, description, date, status, category_id, org_unit_id, event_id, source, person_name, comment, version, source_caisse_id, versement_id, reversal_of_id, cotisation_id, created_by_id, approved_by_id, created_at, updated_at, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        tx.id,
        tx.orgId,
        tx.type,
        tx.amount,
        tx.description,
        tx.date,
        tx.status,
        tx.categoryId,
        tx.orgUnitId,
        tx.eventId,
        tx.source,
        tx.personName,
        tx.comment,
        tx.version,
        tx.sourceCaisseId,
        tx.versementId,
        tx.reversalOfId,
        tx.cotisationId,
        tx.createdById,
        tx.approvedById,
        tx.createdAt,
        tx.updatedAt,
        tx.approvedAt,
      ],
    );
  }
}

// ============================================================
// markCotisationsAbsent
// ============================================================

export interface MarkCotisationsAbsentResult {
  updatedCotisations: Cotisation[];
}

export function markCotisationsAbsent(
  culteId: string,
  membreIds: string[],
  state: CotisationState,
): MarkCotisationsAbsentResult {
  const now = new Date().toISOString();
  const updatedCotisations: Cotisation[] = state.cotisations.map((c) =>
    c.culteId === culteId && membreIds.includes(c.membreId)
      ? { ...c, statut: "ABSENT" as CotisationStatut, updatedAt: now }
      : c,
  );
  return { updatedCotisations };
}

export async function persistMarkCotisationsAbsent(
  culteId: string,
  membreIds: string[],
  state: CotisationState,
): Promise<void> {
  const now = new Date().toISOString();
  for (const cot of state.cotisations) {
    if (cot.culteId === culteId && membreIds.includes(cot.membreId)) {
      await updateCotisationPS(cot.id, { statut: "ABSENT", updatedAt: now });
    }
  }
}

// ============================================================
// updateCotisation
// ============================================================

export function updateCotisation(
  id: string,
  data: Partial<Cotisation>,
  state: CotisationState,
): Cotisation[] {
  const now = new Date().toISOString();
  return state.cotisations.map((c) =>
    c.id === id ? { ...c, ...data, updatedAt: now } : c,
  );
}

export async function persistUpdateCotisation(
  id: string,
  data: Partial<Cotisation>,
): Promise<void> {
  await updateCotisationPS(id, data);
}

// ============================================================
// Query helpers
// ============================================================

export function getCotisationsForCulte(
  culteId: string,
  state: CotisationState,
): Cotisation[] {
  return state.cotisations.filter((c) => c.culteId === culteId);
}

export function getMembreHistorique(
  membreId: string,
  state: CotisationState,
): { cotisation: Cotisation; culte: Event | undefined }[] {
  const cotisations = state.cotisations.filter((c) => c.membreId === membreId);
  // Build index for O(1) lookups instead of O(n) .find() per cotisation
  const culteIndex = new Map<string, Event>();
  for (const e of state.events) {
    culteIndex.set(e.id, e);
  }
  return cotisations
    .map((cot) => {
      const culte = culteIndex.get(cot.culteId);
      return { cotisation: cot, culte };
    })
    .filter(({ culte }) => culte !== undefined)
    .sort(
      (a, b) =>
        new Date(b.culte!.startDate).getTime() -
        new Date(a.culte!.startDate).getTime(),
    );
}

export function getMembresEnAvance(
  state: CotisationState,
): { membre: Member; montant: number }[] {
  return state.members
    .filter((m) => m.montantEnAvance > 0 && m.status === "ACTIVE")
    .map((m) => ({ membre: m, montant: m.montantEnAvance }))
    .sort((a, b) => b.montant - a.montant);
}
