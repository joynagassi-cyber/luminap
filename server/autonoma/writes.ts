/**
 * Autonoma — exécution des écritures de l'app côté serveur.
 *
 * L'app est offline-first : chaque `*PS` de `src/lib/dataLayer.ts` est un
 * `executeWrite(sql, params)` (PowerSync, placeholders `?`). Côté serveur
 * Nitro, ce module reproduit ces plans d'écriture SANS les side-effects
 * navigateur (`localStorage`, `generateId()` base36) :
 *
 *  - SQL identique au code de l'app (colonnes réelles de la base),
 *  - ids déterministes (retournables dans `refs`),
 *  - aucun try/catch avalant les erreurs (l'app est non-fatal, nous
 *    non : un factory qui échoue doit faire échouer `up`).
 *
 * Chaque `writeXxx` correspond à la fonction nommée de l'entity audit
 * (`addTransactionPS`, `createGroupPS`, `createVersement`, …).
 */
import { randomUUID } from "node:crypto";

import { pgExecute, pgQuery } from "./pg-db";

export function newId(): string {
  return randomUUID();
}

// ── organizations / org_admins (createOrganizationPS, grantOrgAdminPS)

/**
 * `createOrganizationPS` + `setOrganizationStatusPS` : l'app crée
 * PENDING puis active ; scénario = org ACTIVE (registre, statut passé
 * en paramètre — PENDING est conservé par défaut pour respecter
 * l'app).
 */
export async function writeOrganization(input: {
  id: string;
  name: string;
  type?: string;
  status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO organizations (id, name, type, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.id, input.name, input.type ?? "CHURCH", input.status ?? "PENDING", now, now],
  );
  return { id: input.id };
}

/** `grantOrgAdminPS` (id uuid auto-généré par la base). */
export async function writeOrgAdmin(input: {
  adminProfileId: string;
  orgId: string;
  grantedBy?: string | null;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  const r = await pgExecute(
    `INSERT INTO org_admins (admin_profile_id, org_id, status, granted_by, created_at, updated_at)
     VALUES (?, ?, 'ACTIVE', ?, ?, ?) RETURNING id`,
    [input.adminProfileId, input.orgId, input.grantedBy ?? null, now, now],
  );
  return { id: String((r.array[0] as { id: string }).id) };
}

// ── profiles (INSERT minimal ; le trigger `handle_new_user` couvre le
//    path Supabase Auth — le scenario seed le profile directement) ─────

export async function writeProfile(input: {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  orgId?: string;
  status?: string;
}): Promise<{ id: string; email: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO profiles
      (id, email, first_name, last_name, role, org_id, status,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      input.id,
      input.email,
      input.firstName ?? null,
      input.lastName ?? null,
      input.role ?? "TREASURER",
      input.orgId ?? "org-1",
      input.status ?? "ACTIVE",
    ],
  );
  return { id: input.id, email: input.email };
}

/** `org_memberships` — pas de fonction réutilisable : INSERT inline. */
export async function writeOrgMembership(input: {
  userId: string;
  orgId: string;
  role?: string;
  status?: string;
}): Promise<{ id: string }> {
  const r = await pgExecute(
    `INSERT INTO org_memberships (user_id, org_id, role, status, joined_at)
     VALUES (?, ?, ?, ?, NOW()) RETURNING id`,
    [input.userId, input.orgId, input.role ?? "MEMBER", input.status ?? "ACTIVE"],
  );
  return { id: String((r.array[0] as { id: string }).id) };
}

// ── createGroupPS : 4 lignes partageant le même id ───────────────────

/**
 * `createGroupPS` (org_units + groups + accounts + caisses). Variantes
 * de type/statut acceptées (l'app n'expose que `type` en param) :
 * caisses.type reste 'GROUP' dans l'app — le factory le paramètre.
 */
export async function writeGroup(input: {
  id: string;
  orgId: string;
  name: string;
  type: string;
  description?: string;
  groupStatus?: string;
  /** Si vrai, ne crée PAS la ligne `org_units` (déjà créée par la
   *  factory `org_units` standalone — ids partagés entre les deux
   *  tables dans `createGroupPS` d'origine). Défaut : false. */
  skipOrgUnit?: boolean;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  const status = input.groupStatus ?? "ACTIVE";
  if (!input.skipOrgUnit) {
    await pgExecute(
      `INSERT INTO org_units (id, name, type, org_id, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [input.id, input.name, input.type, input.orgId, input.description ?? "", now, now],
    );
  }
  await pgExecute(
    `INSERT INTO groups (id, org_id, name, parent_group_id, responsable_member_id, status, archived_at, archived_by, archive_reason, created_at, updated_at)
     VALUES (?, ?, ?, null, null, ?, null, null, null, ?, ?)`,
    [input.id, input.orgId, input.name, status, now, now],
  );
  await pgExecute(
    `INSERT INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, archived_at, archived_by, archive_reason, created_at, updated_at)
     VALUES (?, ?, 'GROUP', ?, ?, 'XOF', 'ACTIVE', null, null, null, ?, ?)`,
    [input.id, input.orgId, input.id, input.name, now, now],
  );
  await pgExecute(
    `INSERT INTO caisses (id, name, description, type, color, org_id, archived_at, archived_by, archive_reason, created_at, updated_at)
     VALUES (?, ?, ?, 'GROUP', '#FF6B00', ?, null, null, null, ?, ?)`,
    [input.id, input.name, input.description ?? "", input.orgId, now, now],
  );
  return { id: input.id };
}

/** Standalone account / caisse (cas `main` du scénario, hors group). */
export async function writeAccount(input: {
  id: string;
  orgId: string;
  ownerType: string;
  ownerId: string;
  name: string;
  currency?: string;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    [input.id, input.orgId, input.ownerType, input.ownerId, input.name, input.currency ?? "XOF", now, now],
  );
  return { id: input.id };
}

export async function writeCaisse(input: {
  id: string;
  orgId: string;
  name: string;
  type?: string;
  description?: string;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO caisses (id, name, description, type, color, org_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, '#FF6B00', ?, 'ACTIVE', ?, ?)`,
    [input.id, input.name, input.description ?? "", input.type ?? "GROUP", input.orgId, now, now],
  );
  return { id: input.id };
}

/** `categories` — insert inline (key + label_fr, pas de NOT NULL de plus). */
export async function writeCategory(input: {
  id: string;
  orgId: string;
  key: string;
  labelFr: string;
  type: string;
}): Promise<{ id: string }> {
  await pgExecute(
    `INSERT INTO categories (id, key, label_fr, type, org_id, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [input.id, input.orgId, input.key, input.labelFr, input.type],
  );
  return { id: input.id };
}

// ── members (addMemberPS) ────────────────────────────────────────────

export async function writeMember(input: {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  status?: string;
  joinedAt?: string;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO members
      (id, org_id, first_name, last_name, phone, email,
       status, joined_at, archived_at, archived_by, archive_reason,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.firstName,
      input.lastName,
      input.phone ?? null,
      input.email ?? null,
      input.status ?? "ACTIVE",
      input.joinedAt ?? now,
      null,
      null,
      null,
      now,
      now,
    ],
  );
  return { id: input.id };
}

/** `addGroupMembershipPS` (id uuid par défaut… la colonne est text :
 *  l'app génère `crypto.randomUUID()` → même chose côté serveur). */
export async function writeGroupMembership(input: {
  id: string;
  memberId: string;
  groupId: string;
  role?: string;
  joinedAt?: string;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO group_memberships (id, member_id, group_id, role, joined_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.id, input.memberId, input.groupId, input.role ?? "MEMBRE", input.joinedAt ?? now, now],
  );
  return { id: input.id };
}

// ── events (addEventPS) ─────────────────────────────────────────────

export async function writeEvent(input: {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string | null;
  status?: string;
  type?: string;
  budget?: number;
  budgetItems?: string | null;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO events
      (id, org_id, name, description, start_date, end_date,
       status, budget, created_at, updated_at, budget_items, type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.name,
      input.description ?? "",
      input.startDate,
      input.endDate ?? null,
      input.status ?? "PLANIFIED",
      input.budget ?? 0,
      now,
      now,
      input.budgetItems ?? "[]",
      input.type ?? "EVENT",
    ],
  );
  return { id: input.id };
}

/** `event_budgets` / `budget_lines` — insert inline. */
export async function writeEventBudget(input: {
  id: string;
  eventId: string;
  currency?: string;
}): Promise<{ id: string }> {
  await pgExecute(
    `INSERT INTO event_budgets (id, event_id, currency, created_at)
     VALUES (?, ?, ?, NOW())`,
    [input.id, input.eventId, input.currency ?? "XOF"],
  );
  return { id: input.id };
}

export async function writeBudgetLine(input: {
  id: string;
  eventBudgetId: string;
  categoryId: string;
  plannedAmountCents: number;
  description?: string | null;
}): Promise<{ id: string }> {
  await pgExecute(
    `INSERT INTO budget_lines
      (id, event_budget_id, category_id, planned_amount_cents,
       actual_amount_cents, description, created_at)
     VALUES (?, ?, ?, ?, 0, ?, NOW())`,
    [input.id, input.eventBudgetId, input.categoryId, input.plannedAmountCents, input.description ?? null],
  );
  return { id: input.id };
}

// ── cotisations (addCotisationPS) ───────────────────────────────────

export async function writeCotisation(input: {
  id: string;
  orgId: string;
  culteId: string;
  membreId: string;
  statut?: string;
  montantObligatoire?: number;
  montantPaye?: number;
  datePaiement?: string | null;
  notes?: string | null;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO cotisations
      (id, org_id, culte_id, membre_id, statut, montantobligatoire, montantpaye,
       datepaiement, notes, createdat, updatedat)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.culteId,
      input.membreId,
      input.statut ?? "NON_PAYE",
      input.montantObligatoire ?? 5000,
      input.montantPaye ?? 0,
      input.datePaiement ?? null,
      input.notes ?? null,
      now,
      now,
    ],
  );
  return { id: input.id };
}

// ── transactions (addTransactionPS) ─────────────────────────────────

export interface TransactionWrite {
  id: string;
  orgId: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  categoryId: string;
  orgUnitId?: string | null;
  eventId?: string | null;
  source?: string | null;
  personName?: string | null;
  comment?: string | null;
  compensatesFor?: string | null;
  /** `uuid` en PG (colonne `created_by_id`) — uuid valide, jamais de slug. */
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  sourceCaisseId?: string | null;
  versementId?: string | null;
  reversalOfId?: string | null;
  cotisationId?: string | null;
}

/** `addTransactionPS` — 23 colonnes, INSERT seul (sans side-effect audit). */
export async function writeTransaction(tx: TransactionWrite): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO transactions (
      id, org_id, type, amount, description, date, status,
      category_id, org_unit_id, compensates_for, comment,
      version, created_by_id, approved_by_id, created_at,
      updated_at, approved_at, event_id, source, person_name,
      source_caisse_id, versement_id, reversal_of_id, cotisation_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.id,
      tx.orgId,
      tx.type,
      tx.amount,
      tx.description,
      tx.date,
      tx.status,
      tx.categoryId,
      tx.orgUnitId ?? null,
      tx.compensatesFor ?? null,
      tx.comment ?? null,
      1,
      tx.createdBy,
      tx.approvedBy ?? null,
      now,
      now,
      tx.approvedAt ?? null,
      tx.eventId ?? null,
      tx.source ?? null,
      tx.personName ?? null,
      tx.sourceCaisseId ?? null,
      tx.versementId ?? null,
      tx.reversalOfId ?? null,
      tx.cotisationId ?? null,
    ],
  );
  return { id: tx.id };
}

// ── versement-service (createVersement, ids contrôlés) ──────────────

export async function writeVersement(input: {
  id: string;
  orgId: string;
  sourceCaisseId: string;
  amount: number;
  date: string;
  comment?: string | null;
  createdBy: string;
  sourceTxId: string;
  targetTxId: string;
}): Promise<{ id: string; sourceTxId: string; targetTxId: string }> {
  const now = new Date().toISOString();
  const comment =
    input.comment ??
    `Versement ${Math.round(input.amount / 100)} FCFA -> Caisse principale`;

  await pgExecute(
    `INSERT INTO versements
      (id, org_id, from_account_id, to_account_id, amount_cents, date,
       status, created_by, approved_by, approved_at, created_at)
     VALUES (?, ?, ?, 'main', ?, ?, 'APPROVED', ?, ?, ?, ?)`,
    [input.id, input.orgId, input.sourceCaisseId, input.amount, input.date, input.createdBy, input.createdBy, now, now],
  );
  await writeTransaction({
    id: input.sourceTxId,
    orgId: input.orgId,
    type: "EXPENSE",
    amount: input.amount,
    description: "Versement vers caisse principale",
    date: input.date,
    status: "APPROVED",
    categoryId: "cat-dime",
    source: "CAISSE",
    comment,
    createdBy: input.createdBy,
    approvedBy: input.createdBy,
    approvedAt: now,
    sourceCaisseId: input.sourceCaisseId,
    versementId: input.id,
  });
  await writeTransaction({
    id: input.targetTxId,
    orgId: input.orgId,
    type: "INCOME",
    amount: input.amount,
    description: "Versement de groupe",
    date: input.date,
    status: "APPROVED",
    categoryId: "cat-dime",
    source: "CAISSE",
    comment,
    createdBy: input.createdBy,
    approvedBy: input.createdBy,
    approvedAt: now,
    sourceCaisseId: "main",
    versementId: input.id,
  });
  return { id: input.id, sourceTxId: input.sourceTxId, targetTxId: input.targetTxId };
}

// ── budgets capability (addOrgBudgetPS + addOrgBudgetLinePS) ────────

export async function writeOrgBudget(input: {
  id: string;
  orgId: string;
  fiscalYear: number;
  name: string;
  period?: string;
  totalBudgetedCents?: number;
  status?: string;
  currency?: string;
  costCenterId?: string | null;
  costCenterLabel?: string | null;
  note?: string | null;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO org_budgets
      (id, org_id, fiscal_year, period, cost_center_id, cost_center_label,
       name, total_budgeted_cents, status, currency, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.fiscalYear,
      input.period ?? "ANNUAL",
      input.costCenterId ?? null,
      input.costCenterLabel ?? null,
      input.name,
      input.totalBudgetedCents ?? 0,
      input.status ?? "ACTIVE",
      input.currency ?? "XOF",
      input.note ?? null,
      now,
      now,
    ],
  );
  return { id: input.id };
}

export async function writeOrgBudgetLine(input: {
  id: string;
  orgId: string;
  budgetId: string;
  categoryId?: string | null;
  plannedAmountCents: number;
  note?: string | null;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO org_budget_lines
      (id, org_id, budget_id, category_id, planned_amount_cents, note,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.budgetId,
      input.categoryId ?? null,
      input.plannedAmountCents,
      input.note ?? null,
      now,
      now,
    ],
  );
  return { id: input.id };
}

// ── giving capability (addGiving*PS) ────────────────────────────────

export async function writeGivingDonor(input: {
  id: string;
  orgId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  memberId?: string | null;
  taxReceiptEnabled?: boolean;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO giving_donors
      (id, org_id, full_name, email, phone, address, member_id,
       tax_receipt_enabled, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, null, ?, ?, null, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.fullName,
      input.email ?? null,
      input.phone ?? null,
      input.memberId ?? null,
      input.taxReceiptEnabled ? 1 : 0,
      now,
      now,
    ],
  );
  return { id: input.id };
}

export async function writeGivingCampaign(input: {
  id: string;
  orgId: string;
  name: string;
  purpose?: string | null;
  fund?: string | null;
  targetAmountCents?: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO giving_campaigns
      (id, org_id, name, purpose, fund, target_amount_cents, start_date,
       end_date, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.name,
      input.purpose ?? null,
      input.fund ?? null,
      input.targetAmountCents ?? 0,
      input.startDate?.slice(0, 10) ?? null,
      input.endDate?.slice(0, 10) ?? null,
      input.status ?? "ACTIVE",
      now,
      now,
    ],
  );
  return { id: input.id };
}

export async function writePledge(input: {
  id: string;
  orgId: string;
  campaignId: string;
  donorId: string;
  pledgedAmountCents: number;
  schedule?: string;
  amountPerPeriodCents?: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO pledges
      (id, org_id, campaign_id, donor_id, pledged_amount_cents, schedule,
       amount_per_period_cents, start_date, end_date, status, notes,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.campaignId,
      input.donorId,
      input.pledgedAmountCents,
      input.schedule ?? "ONCE",
      input.amountPerPeriodCents ?? 0,
      input.startDate?.slice(0, 10) ?? null,
      input.endDate?.slice(0, 10) ?? null,
      input.status ?? "ACTIVE",
      now,
      now,
    ],
  );
  return { id: input.id };
}

export async function writeTaxReceipt(input: {
  id: string;
  orgId: string;
  donorId: string;
  year: number;
  receiptNo: string;
  totalAmountCents?: number;
  issuedAt?: string;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO tax_receipts
      (id, org_id, donor_id, year, receipt_no, total_amount_cents,
       issued_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.donorId,
      input.year,
      input.receiptNo,
      input.totalAmountCents ?? 0,
      input.issuedAt ?? now,
      now,
      now,
    ],
  );
  return { id: input.id };
}

/** `linkTransactionGivingPS` — UNIQUE(org, transaction) : idempotent. */
export async function writeTransactionGiving(input: {
  id: string;
  orgId: string;
  transactionId: string;
  donorId: string;
  campaignId?: string | null;
}): Promise<{ id: string }> {
  const existing = await pgQuery<{ id: string }>(
    `SELECT id FROM transaction_giving WHERE org_id = ? AND transaction_id = ?`,
    [input.orgId, input.transactionId],
  );
  if (existing.length > 0) return { id: existing[0].id };
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO transaction_giving
      (id, org_id, transaction_id, donor_id, campaign_id, recorded_at,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.transactionId,
      input.donorId,
      input.campaignId ?? null,
      now,
      now,
      now,
    ],
  );
  return { id: input.id };
}

// ── invitations (createInvitationPS / claimInvitationPS) ───────────

export async function writeInvitation(input: {
  id: string;
  orgId: string;
  code: string;
  targetRole: string;
  targetScopeType?: string;
  targetGroupId?: string | null;
  targetMemberId?: string | null;
  issuedBy: string;
  expiresAt: string;
  maxUses?: number;
}): Promise<{ id: string; code: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO invitations (
      id, org_id, code, target_role, target_scope_type, target_group_id, target_member_id,
      issued_by, issued_at, expires_at, max_uses, used_count, status, created_at, updated_at,
      grants_payload, tags_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'ACTIVE', ?, ?, '[]', '[]')`,
    [
      input.id,
      input.orgId,
      input.code,
      input.targetRole,
      input.targetScopeType ?? "ORG",
      input.targetGroupId ?? null,
      input.targetMemberId ?? null,
      input.issuedBy,
      now,
      input.expiresAt,
      input.maxUses ?? 1,
      now,
      now,
    ],
  );
  return { id: input.id, code: input.code };
}

/**
 * `claimInvitationPS` — le déclencheur `settle_invitation_claim`
 * incrémente `invitations.used_count` (côté SQL) ; la row est
 * PENDING_SYNC (l'app ne l'active jamais elle-même).
 */
export async function writeInvitationClaim(input: {
  id: string;
  invitationId: string;
  claimedByDeviceId?: string | null;
  resultingUserId?: string | null;
  status?: string;
  rejectReason?: string | null;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO invitation_claims
      (id, invitation_id, claimed_by_device_id, claimed_at,
       resulting_user_id, status, reject_reason, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.invitationId,
      input.claimedByDeviceId ?? null,
      now,
      input.resultingUserId ?? null,
      input.status ?? "PENDING_SYNC",
      input.rejectReason ?? null,
      now,
      now,
    ],
  );
  return { id: input.id };
}

// ── notifications (createNotification est PURE en app : INSERT inline)

export async function writeNotification(input: {
  orgId: string;
  actionType: string;
  title: string;
  message: string;
  sourceTransactionId?: string | null;
  isRead?: boolean;
}): Promise<{ id: string }> {
  const r = await pgExecute(
    `INSERT INTO notifications
      (org_id, action_type, title, message, is_read, source_transaction_id)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    [
      input.orgId,
      input.actionType,
      input.title,
      input.message,
      input.isRead ?? false,
      input.sourceTransactionId ?? null,
    ],
  );
  return { id: String((r.array[0] as { id: string }).id) };
}

// ── audit_entries (writeAudit, audit.ts) ────────────────────────────

export async function writeAuditEntry(input: {
  id: string;
  orgId: string;
  transactionId?: string | null;
  userId: string;
  actorRoleAtTime?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  comment?: string | null;
}): Promise<{ id: string }> {
  await pgExecute(
    `INSERT INTO audit_entries
      (id, org_id, transaction_id, user_id, actor_role_at_time, action,
       entity_type, entity_id, before_state, after_state, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?)`,
    [
      input.id,
      input.orgId,
      input.transactionId ?? null,
      input.userId,
      input.actorRoleAtTime ?? null,
      input.action,
      input.entityType,
      input.entityId,
      JSON.stringify(input.beforeState ?? null),
      JSON.stringify(input.afterState ?? null),
      input.comment ?? null,
    ],
  );
  return { id: input.id };
}

// ── role_assignments (INSERT inline ; UNIQUE(session_id)) ───────────

export async function writeRoleAssignment(input: {
  orgId: string;
  role: string;
  sessionId: string;
}): Promise<{ id: string }> {
  const r = await pgExecute(
    `INSERT INTO role_assignments (session_id, role, org_id)
     VALUES (?, ?, ?) RETURNING id`,
    [input.sessionId, input.role, input.orgId],
  );
  return { id: String((r.array[0] as { id: string }).id) };
}

// ── report_definitions (reportDefinitionRepo.create) ────────────────

export async function writeReportDefinition(input: {
  id: string;
  orgId: string;
  name: string;
  dataSource: string;
  dimensions?: string[];
  metrics?: string[];
  groupBy?: string[];
  filters?: Record<string, unknown>;
  sortBy?: string | null;
  savedBy?: string | null;
  isTemplate?: boolean;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  const arr = (v: string[]) => `{${v.join(",")}}`;
  await pgExecute(
    `INSERT INTO report_definitions
      (id, org_id, name, data_source, dimensions, metrics, filters,
       group_by, sort_by, saved_by, is_template, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?::text[], ?::text[], ?::jsonb, ?::text[], ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.name,
      input.dataSource,
      arr(input.dimensions ?? []),
      arr(input.metrics ?? []),
      JSON.stringify(input.filters ?? {}),
      arr(input.groupBy ?? []),
      input.sortBy ?? null,
      input.savedBy ?? null,
      input.isTemplate ?? false,
      now,
      now,
    ],
  );
  return { id: input.id };
}

// ── forms (createFormDefinitionPS / createFormSubmissionPS) ─────────

export async function writeFormDefinition(input: {
  id: string;
  orgId: string;
  key: string;
  name: string;
  description?: string | null;
  version?: number;
  targetEntityType?: string | null;
  status?: string;
  fields?: Record<string, unknown>[];
}): Promise<{ id: string; key: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO form_definitions
      (id, org_id, key, name, description, version, target_entity_type,
       fields, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.key,
      input.name,
      input.description ?? null,
      input.version ?? 1,
      input.targetEntityType ?? null,
      JSON.stringify(input.fields ?? []),
      input.status ?? "DRAFT",
      now,
      now,
    ],
  );
  return { id: input.id, key: input.key };
}

export async function writeFormSubmission(input: {
  id: string;
  orgId: string;
  formDefinitionId: string;
  formVersion: number;
  submittedBy: string;
  data?: Record<string, unknown>;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  status?: string;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO form_submissions
      (id, org_id, form_definition_id, form_version, entity_type, entity_id,
       data, submitted_by, submitted_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.formDefinitionId,
      input.formVersion,
      input.linkedEntityType ?? null,
      input.linkedEntityId ?? null,
      JSON.stringify(input.data ?? {}),
      input.submittedBy,
      now,
      input.status ?? "SUBMITTED",
      now,
    ],
  );
  return { id: input.id };
}

// ── custom fields (createCustomFieldDefinitionPS / upsert…) ────────

export async function writeCustomFieldDefinition(input: {
  id: string;
  orgId: string;
  entityType: string;
  key: string;
  label: string;
  type: string;
  options?: unknown[] | null;
  order?: number;
}): Promise<{ id: string; key: string }> {
  const now = new Date().toISOString();
  await pgExecute(
    `INSERT INTO custom_field_definitions
      (id, org_id, entity_type, field_name, field_label, field_type,
       options, "order", created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?::text[], ?, ?, ?)`,
    [
      input.id,
      input.orgId,
      input.entityType,
      input.key,
      input.label,
      input.type,
      input.options ? `{${(input.options as string[]).join(",")}}` : "{}",
      input.order ?? 0,
      now,
      now,
    ],
  );
  return { id: input.id, key: input.key };
}

/** `upsertCustomFieldValuePS` — l'app INSERT (pas d'ON CONFLICT) :
 *  id contrôlé ici pour la teardown. */
export async function writeCustomFieldValue(input: {
  id: string;
  entityType: string;
  entityId: string;
  definitionId: string;
  value: unknown;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  const rowValue =
    typeof input.value === "object" && input.value !== null
      ? JSON.stringify(input.value)
      : JSON.stringify(String(input.value ?? ""));
  await pgExecute(
    `INSERT INTO custom_field_values
      (id, entity_type, entity_id, custom_field_definition_id, value,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?::jsonb, ?, ?)`,
    [input.id, input.entityType, input.entityId, input.definitionId, rowValue, now, now],
  );
  return { id: input.id };
}

// ── tags / grants (createTagPS / assignTagPS / createGrantPS) ──────

export async function writeTag(input: {
  orgId: string;
  name: string;
  description?: string | null;
}): Promise<{ id: string; name: string }> {
  const r = await pgExecute(
    `INSERT INTO tags (org_id, name, description)
     VALUES (?, ?, ?) RETURNING id`,
    [input.orgId, input.name, input.description ?? null],
  );
  return { id: String((r.array[0] as { id: string }).id), name: input.name };
}

export async function writeTagAssignment(input: {
  tagId: string;
  userId: string;
  orgId: string;
  assignedBy?: string | null;
}): Promise<{ id: string }> {
  const r = await pgExecute(
    `INSERT INTO tag_assignments (tag_id, user_id, org_id, assigned_by)
     VALUES (?, ?, ?, ?) RETURNING id`,
    [input.tagId, input.userId, input.orgId, input.assignedBy ?? null],
  );
  return { id: String((r.array[0] as { id: string }).id) };
}

/** `createGrantPS` — schéma agnostique (resource/action libres). */
export async function writeGrant(input: {
  subjectType: string;
  subjectId: string;
  resource: string;
  action: string;
  scopeResource?: string | null;
  scopeId?: string | null;
  grantedBy?: string | null;
}): Promise<{ id: string }> {
  const now = new Date().toISOString();
  // `granted_by` est `uuid` en PG — on force `null` (le créateur n'est
  // pas forcément un user PG ; la colonne est nullable, jamais de slug).
  const r = await pgExecute(
    `INSERT INTO grants
      (subject_type, subject_id, resource, action,
       scope_resource, scope_id, granted_by, granted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [
      input.subjectType,
      input.subjectId,
      input.resource,
      input.action,
      input.scopeResource ?? null,
      input.scopeId ?? null,
      input.grantedBy ?? null,
      now,
    ],
  );
  return { id: String((r.array[0] as { id: string }).id) };
}
