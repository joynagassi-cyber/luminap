/**
 * Cotisation Capability — cotisations par groupe (T-CT1).
 *
 * Élargit la logique de cotisation (historiquement réservée aux cultes
 * dominicaux de l'organisation) à :
 *   - groupe  : une cotisation par événement de groupe (type = "CULTE"
 *               dans `events`, lié au groupe via `events.budget_items`)
 *   - culte   : comportement inchangé (tous les membres actifs de l'org)
 *
 * Règles métier :
 *   - le montant de la cotisation est TOUJOURS fourni par l'appelant
 *     (aucun montant par défaut n'est imposé par la capa) ;
 *   - le surplus (au-dessus du montant obligatoire) est comptabilisé
 *     comme don (`calculerDon` de cotisation-logic) ;
 *   - le paiement consomme d'abord l'avance du membre
 *     (`montant_en_avance`) avant de créer une transaction.
 *
 * Backend : PowerSync (local) → file d'upload → PostgreSQL, où le RLS
 * arbitre (la capa n'est pas la barrière de sécurité).
 */

import { getPowerSyncDatabase } from "@/lib/powersync";
import { writeAudit } from "@/lib/audit";
import { isCulteVerrouille, calculerDon, type CotisationStatut } from "@/lib/cotisation-logic";
import { generateId } from "@/lib/utils";
import type { AuditEntry, Cotisation, Event } from "@/types";

// ============================================================
// Types
// ============================================================

/** Type de contexte d'une session de cotisation. */
export type CotisationContextType = "ORG" | "GROUP";

/** Paramètres pour la création d'une session de cotisation. */
export interface CotisationContext {
  /** "ORG" = culte dominant (tous les membres actifs de l'org),
   *  "GROUP" = cotisation d'un groupe (membres du groupe seulement). */
  type: CotisationContextType;
  /** ID du groupe (obligatoire si type === "GROUP"). */
  groupId?: string;
  /** Nom de l'unité pour l'affichage (ex. "Juniors", "Culte du dimanche"). */
  label: string;
}

/** Session de cotisation créée par `createCotisationSession`. */
export interface CotisationSession {
  /** ID de l'événement `CULTE` créé dans `events`. */
  event: Event;
  /** Cotisations NON_PAYE créées (une par membre éligible). */
  cotisations: Array<Cotisation & { id: string }>;
}

/** Résultat de `collectCotisation` — une cotisation payée. */
export interface CollectResult {
  cotisation: Cotisation;
  /** Membre mis à jour si l'avance a été consommée. */
  updatedMembre?: { id: string; montantEnAvance: number };
  /** Don (surplus) comptabilisé, en cents. */
  donCents: number;
}

/** Statistiques d'une session de cotisation. */
export interface CotisationStats {
  total: number;
  paye: number;
  absent: number;
  nonPaye: number;
  enAvance: number;
  totalCollecteCents: number;
  /** Montant obligatoire total (nombre de cotisations × montant oblig). */
  attenduCents: number;
}

// ============================================================
// Helpers internes
// ============================================================

/** Membres actifs du groupe, via `group_memberships` join `members`. */
async function getGroupMemberIds(groupId: string): Promise<string[]> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT gm.member_id FROM group_memberships gm
     JOIN members m ON m.id = gm.member_id
     WHERE gm.group_id = ? AND m.status = 'ACTIVE'`,
    [groupId],
  );
  return (res?.array ?? []).map((r: any) => String(r.member_id));
}

/** Membres actifs de l'organisation. */
async function getActiveOrgMemberIds(orgId: string): Promise<string[]> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT id FROM members WHERE org_id = ? AND status = 'ACTIVE'`,
    [orgId],
  );
  return (res?.array ?? []).map((r: any) => String(r.id));
}

function rowToCotisation(r: any): Cotisation & { id: string } {
  return {
    id: String(r.id ?? ""),
    culteId: String(r.culte_id),
    membreId: String(r.membre_id),
    statut: (r.statut ?? "NON_PAYE") as CotisationStatut,
    montantObligatoire: Number(r.montantObligatoire ?? r.montantobligatoire ?? 0),
    montantPaye: Number(r.montantPaye ?? r.montantpaye ?? 0),
    datePaiement: r.datePaiement ?? r.datepaiement ?? null,
    notes: r.notes ?? null,
    createdAt: String(r.createdAt ?? r.createdat ?? ""),
    updatedAt: String(r.updatedAt ?? r.updatedat ?? ""),
  };
}

// ============================================================
// API publique
// ============================================================

/**
 * Créer une session de cotisation : un événement `CULTE` dans `events`
 * + une ligne `cotisations` NON_PAYE par membre éligible.
 *
 * - type "ORG" : tous les membres actifs de l'org (comportement actuel).
 * - type "GROUP" : uniquement les membres actifs du groupe.
 *
 * Le montant `montantCotisationCents` est OBLIGATOIRE (aucun défaut) :
 * c'est l'appelant qui décide du montant — le service ne l'impose jamais.
 */
export async function createCotisationSession(
  ctx: CotisationContext,
  params: {
    name: string;
    startDate: string;
    montantCotisationCents: number;
    orgId: string;
    actorId: string;
  },
): Promise<CotisationSession> {
  if (params.montantCotisationCents <= 0) {
    throw new Error("MONTANT_COTISATION_REQUIS");
  }

  const memberId: string[] =
    ctx.type === "GROUP"
      ? ctx.groupId
        ? await getGroupMemberIds(ctx.groupId)
        : []
      : await getActiveOrgMemberIds(params.orgId);

  const now = new Date().toISOString();
  const eventId = generateId();
  const db = getPowerSyncDatabase();

  // `budget_items` porte l'info du contexte (le schema events n'a pas
  // de colonne `group_id` : on encode le contexte dans le JSONB existant).
  const budgetItemsJson = JSON.stringify([
    {
      source: ctx.type === "GROUP" ? "group" : "org",
      groupId: ctx.type === "GROUP" ? ctx.groupId : null,
      label: ctx.label,
    },
  ]);

  await db.execute(
    `INSERT INTO events (id, org_id, name, description, start_date, end_date, status, type, budget, budget_items, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, 'PLANIFIED', 'CULTE', 0, ?, ?, ?)`,
    [
      eventId,
      params.orgId,
      params.name,
      "",
      params.startDate,
      budgetItemsJson,
      now,
      now,
    ],
  );

  const cotisations: Array<Cotisation & { id: string }> = [];
  for (const mId of memberId) {
    const cotId = generateId();
    await db.execute(
      `INSERT INTO cotisations (id, org_id, culte_id, membre_id, statut, montantObligatoire, montantPaye, datePaiement, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'NON_PAYE', ?, 0, NULL, NULL, ?, ?)`,
      [cotId, params.orgId, eventId, mId, params.montantCotisationCents, now, now],
    );
    cotisations.push({
      id: cotId,
      culteId: eventId,
      membreId: mId,
      statut: "NON_PAYE",
      montantObligatoire: params.montantCotisationCents,
      montantPaye: 0,
      datePaiement: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeAudit({
    orgId: params.orgId,
    transactionId: null,
    userId: params.actorId,
    actorRoleAtTime: "ADMIN",
    action: "CREATE",
    entityType: "CotisationSession",
    entityId: eventId,
    beforeState: null,
    afterState: {
      type: ctx.type,
      groupId: ctx.groupId ?? null,
      label: ctx.label,
      montantCents: params.montantCotisationCents,
      memberCount: memberId.length,
    },
    comment:
      ctx.type === "GROUP"
        ? `Session de cotisation (groupe ${ctx.label}) créée : ${memberId.length} membre(s), ${params.montantCotisationCents} F/membre`
        : `Session de cotisation (org) créée : ${memberId.length} membre(s), ${params.montantCotisationCents} F/membre`,
  } as Omit<AuditEntry, "id" | "createdAt">);

  const event: Event = {
    id: eventId,
    orgId: params.orgId,
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

  return { event, cotisations };
}

/**
 * Payer une cotisation.
 * - consomme d'abord l'avance du membre (`montant_en_avance`) ;
 * - le surplus au-dessus du montant obligatoire est comptabilisé comme don ;
 * - rejette si le culte est verrouillé (> 30 j) et déjà payé.
 */
export async function collectCotisation(
  cotisationId: string,
  montantPayeCents: number,
  datePaiement: string,
  actorId: string,
): Promise<CollectResult> {
  const db = getPowerSyncDatabase();

  const res = await db.execute(
    `SELECT c.*, e.start_date FROM cotisations c
     JOIN events e ON e.id = c.culte_id WHERE c.id = ?`,
    [cotisationId],
  );
  const row = res?.array?.[0];
  if (!row) throw new Error("COTISATION_NOT_FOUND");

  const cot = rowToCotisation(row);

  if (isCulteVerrouille(String(row.start_date))) {
    throw new Error("CULTE_VERROUILLE");
  }

  // Conso de l'avance
  const mRes = await db.execute(
    `SELECT montant_en_avance FROM members WHERE id = ?`,
    [cot.membreId],
  );
  const avance = Number(mRes?.array?.[0]?.montant_en_avance ?? 0);
  const resteAPayer = montantPayeCents - avance;
  const donCents = calculerDon(montantPayeCents, cot.montantObligatoire);

  const newStatut: CotisationStatut =
    resteAPayer <= 0 ? "EN_AVANCE" : "PAYE";

  await db.execute(
    `UPDATE cotisations SET statut = ?, montantPaye = ?, datePaiement = ? WHERE id = ?`,
    [newStatut, montantPayeCents, datePaiement, cot.id],
  );

  let updatedMembre;
  if (avance > 0) {
    const newAvance = Math.max(0, avance - montantPayeCents);
    await db.execute(
      `UPDATE members SET montant_en_avance = ? WHERE id = ?`,
      [newAvance, cot.membreId],
    );
    updatedMembre = { id: cot.membreId, montantEnAvance: newAvance };
  }

  await writeAudit({
    orgId: String(row.org_id ?? ""),
    transactionId: null,
    userId: actorId,
    actorRoleAtTime: "ADMIN",
    action: "UPDATE",
    entityType: "Cotisation",
    entityId: cot.id,
    beforeState: { statut: cot.statut, montantPaye: cot.montantPaye },
    afterState: { statut: newStatut, montantPaye: montantPayeCents, donCents },
    comment: `Cotisation payée (${newStatut}) — don : ${donCents} F`,
  } as Omit<AuditEntry, "id" | "createdAt">);

  const updatedCot: Cotisation = {
    ...cot,
    statut: newStatut,
    montantPaye: montantPayeCents,
    datePaiement: datePaiement,
  };

  return { cotisation: updatedCot, updatedMembre, donCents };
}

/** Marquer une cotisation ABSENT (le membre n'était pas présent). */
export async function markCotisationAbsent(
  cotisationId: string,
  actorId: string,
): Promise<void> {
  const db = getPowerSyncDatabase();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE cotisations SET statut = 'ABSENT', updatedAt = ? WHERE id = ?`,
    [now, cotisationId],
  );
  await writeAudit({
    orgId: "",
    transactionId: null,
    userId: actorId,
    actorRoleAtTime: "ADMIN",
    action: "UPDATE",
    entityType: "Cotisation",
    entityId: cotisationId,
    beforeState: null,
    afterState: { statut: "ABSENT" },
    comment: "Cotisation marquée ABSENT",
  } as Omit<AuditEntry, "id" | "createdAt">);
}

/** Récupérer les cotisations d'un contexte (org ou groupe). */
export async function listCotisations(
  ctx: { type: CotisationContextType; groupId?: string },
  orgId: string,
): Promise<Array<Cotisation & { id: string }>> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT c.* FROM cotisations c
     JOIN events e ON e.id = c.culte_id
     WHERE c.org_id = ?`,
    [orgId],
  );
  let cots = (res?.array ?? []).map(rowToCotisation);

  if (ctx.type === "GROUP" && ctx.groupId) {
    const memberIds = await getGroupMemberIds(ctx.groupId);
    const idSet = new Set(memberIds);
    cots = cots.filter((c) => idSet.has(c.membreId));
  }
  return cots;
}

/** Statistiques d'une session de cotisation (événement `CULTE`). */
export async function getCotisationStats(
  culteId: string,
): Promise<CotisationStats> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT c.statut, c.montantObligatoire, c.montantPaye, COUNT(*) AS n
     FROM cotisations c WHERE c.culte_id = ?
     GROUP BY c.statut, c.montantObligatoire, c.montantPaye`,
    [culteId],
  );
  const rows: any[] = res?.array ?? [];

  const byStatus: Record<CotisationStatut, number> = {
    NON_PAYE: 0,
    PAYE: 0,
    ABSENT: 0,
    EN_AVANCE: 0,
  };
  let totalCollecteCents = 0;
  let attenduCents = 0;
  let total = 0;

  for (const r of rows) {
    const n = Number(r.n);
    total += n;
    const s = (r.statut as CotisationStatut) ?? "NON_PAYE";
    byStatus[s] = (byStatus[s] ?? 0) + n;
    totalCollecteCents += n * Number(r.montantPaye ?? 0);
    attenduCents += n * Number(r.montantObligatoire ?? 0);
  }

  return {
    total,
    paye: byStatus.PAYE,
    absent: byStatus.ABSENT,
    nonPaye: byStatus.NON_PAYE,
    enAvance: byStatus.EN_AVANCE,
    totalCollecteCents,
    attenduCents,
  };
}

/** Historique de cotisation d'un membre (tous contextes). */
export async function getMembreHistoriqueCotisations(
  membreId: string,
  limit = 50,
): Promise<Array<Cotisation & { id: string }>> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT c.* FROM cotisations c WHERE c.membre_id = ?
     ORDER BY c.createdAt DESC LIMIT ?`,
    [membreId, limit],
  );
  return (res?.array ?? []).map(rowToCotisation);
}

export { isCulteVerrouille, calculerDon, calculerMontantDu } from "@/lib/cotisation-logic";
export type { CotisationStatut };
