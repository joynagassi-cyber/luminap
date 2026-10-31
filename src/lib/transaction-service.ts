/**
 * Transaction Service
 *
 * Handles all transaction business logic including audit logging.
 */

import { workflow } from "@/capabilities/workflow";
import { policy } from "@/capabilities/policy";
import { writeAudit } from "@/lib/audit";
import { getOrganizationId } from "@/lib/orgContext";
import { generateId } from "@/lib/utils";
import { assertApprovable } from "@/lib/makerChecker";
import type { Permission } from "@/lib/rbac";
import {
  addTransactionPS,
  updateTransactionPS,
  deleteTransactionPS,
} from "@/lib/dataLayer";
import { isPeriodLockedError } from "@/lib/periodLock";
import type { Transaction } from "@/types";

export interface TransactionState {
  transactions: Transaction[];
  user: { role: string; id: string };
}

/** Entrée de création de transaction (avant `buildAddTransaction`). */
export type TransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt" | "version" | "reversalOfId"
>;
/**
 * Options d'approbation (PR8 maker-checker). Par défaut `enabled: false` :
 * le comportement historique est conservé à l'identique pour tout appelant
 * qui ne fournit pas ces options (tests existants inclus).
 */
export interface ApproveOptions {
  /** Maker-checker actif pour l'organisation (réglage `maker_checker_enabled`). */
  enabled?: boolean;
  /** Permissions effectives de l'acteur — vérifiées seulement si fournies. */
  actorPermissions?: readonly Permission[];
}

// --- addTransaction ---

/**
 * Valide une NOUVELLE transaction avant persistance. Source de vérité unique
 * des règles de création, réutilisée par la saisie manuelle ET par l'import CSV
 * (PR12) — aucune règle dupliquée côté import.
 *
 * Contrôles : type ∈ {INCOME, EXPENSE} ; montant strictement positif et borné
 * (`policy.transaction.validateAmount`, en centimes) ; description non vide ;
 * date au format `AAAA-MM-JJ` ; catégorie renseignée.
 *
 * Ne lève jamais : retourne `{ allowed, reason }` (message FR prêt à afficher).
 */
export function validateAddTransaction(
  input: Partial<TransactionInput>,
): { allowed: boolean; reason?: string } {
  if (input.type !== "INCOME" && input.type !== "EXPENSE") {
    return {
      allowed: false,
      reason: "Type invalide (attendu : INCOME ou EXPENSE)",
    };
  }
  if (typeof input.amount !== "number" || !Number.isFinite(input.amount)) {
    return { allowed: false, reason: "Montant invalide" };
  }
  const amountCheck = policy.transaction.validateAmount(input.amount);
  if (!amountCheck.ok) {
    return { allowed: false, reason: amountCheck.message ?? "Montant invalide" };
  }
  if (!input.description || !input.description.trim()) {
    return { allowed: false, reason: "La description est obligatoire" };
  }
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { allowed: false, reason: "La date doit être au format AAAA-MM-JJ" };
  }
  if (!input.categoryId) {
    return { allowed: false, reason: "La catégorie est obligatoire" };
  }
  return { allowed: true };
}

export function buildAddTransaction(
  tx: Omit<
    Transaction,
    "id" | "createdAt" | "updatedAt" | "version" | "reversalOfId"
  >,
  state: TransactionState,
): { id: string; newTx: Transaction } {
  const id = generateId();
  const now = new Date().toISOString();
  const newTx: Transaction = {
    ...tx,
    id,
    createdAt: now,
    updatedAt: now,
    version: 1,
    reversalOfId: null,
  };
  return { id, newTx };
}

export async function persistAddTransaction(newTx: Transaction): Promise<void> {
  try {
    await addTransactionPS({
      org_id: newTx.orgId,
      type: newTx.type,
      amount: newTx.amount,
      description: newTx.description,
      date: newTx.date,
      status: newTx.status,
      category_id: newTx.categoryId,
      org_unit_id: newTx.orgUnitId,
      compensates_for: newTx.compensatesFor,
      comment: newTx.comment,
      created_by_id: newTx.createdById,
      approved_by_id: newTx.approvedById,
      approved_at: newTx.approvedAt,
      event_id: newTx.eventId,
      source: newTx.source,
      person_name: newTx.personName,
      source_caisse_id: newTx.sourceCaisseId,
      versement_id: newTx.versementId,
      reversal_of_id: newTx.reversalOfId,
      cotisation_id: null,
    });
  } catch (error) {
    // PR13 — un rejet de gel de période est une DÉCISION métier : il remonte
    // (ne pas l'avaler comme une panne transitoire, sinon la période close
    // serait silencieusement modifiable).
    if (isPeriodLockedError(error)) throw error;
    // Persist failure is non-fatal; offline queue will retry
  }
}

export async function auditAddTransaction(
  id: string,
  tx: Omit<
    Transaction,
    "id" | "createdAt" | "updatedAt" | "version" | "reversalOfId"
  >,
  newTx: Transaction,
  role: string,
): Promise<void> {
  await writeAudit({
    orgId: getOrganizationId(),
    transactionId: id,
    userId: tx.createdById || "local-user",
    actorRoleAtTime: role,
    action: "CREATE",
    entityType: "Transaction",
    entityId: id,
    beforeState: null,
    afterState: newTx,
    comment: null,
  });
}

// --- updateTransaction ---

export function validateUpdateTransaction(
  transactions: Transaction[],
  id: string,
  data: Partial<Transaction>,
): { allowed: boolean; reason?: string } {
  const oldTx = transactions.find((t) => t.id === id);
  const guardResult = workflow.check(
    "transaction",
    oldTx?.status as any,
    data.status as any,
  );
  return guardResult;
}

export function applyUpdateTransaction(
  transactions: Transaction[],
  id: string,
  data: Partial<Transaction>,
): Transaction[] {
  return transactions.map((t) =>
    t.id === id
      ? {
          ...t,
          ...data,
          updatedAt: new Date().toISOString(),
          version: t.version + 1,
        }
      : t,
  );
}

// --- deleteTransaction ---

export function validateDeleteTransaction(
  transactions: Transaction[],
  id: string,
): { allowed: boolean; reason?: string } {
  const oldTx = transactions.find((t) => t.id === id);
  const guardResult = workflow.check(
    "transaction",
    oldTx?.status as any,
    "DELETED" as any,
  );
  return guardResult;
}

export function applyDeleteTransaction(
  transactions: Transaction[],
  id: string,
): Transaction[] {
  return transactions.filter((t) => t.id !== id);
}

// --- batchDeleteTransactions ---

export function validateBatchDeleteTransactions(
  transactions: Transaction[],
  ids: string[],
): string[] {
  const blockedIds = ids.filter((id) => {
    const tx = transactions.find((t) => t.id === id);
    return (
      workflow.check("transaction", tx?.status as any, "DELETED" as any)
        .allowed === false
    );
  });
  return blockedIds;
}

// --- approveTransaction ---

export function buildApproveTransaction(
  transactions: Transaction[],
  id: string,
  userId: string,
  now: string,
  options: ApproveOptions = {},
): Transaction[] {
  // PR8 maker-checker : refus TYPÉ (jamais un silence) quand l'acteur est
  // l'auteur et que le réglage est actif. Par défaut (`enabled` absent), la
  // garde est neutre → comportement historique inchangé.
  if (options.enabled) {
    const target = transactions.find((t) => t.id === id);
    if (target) {
      assertApprovable(target, userId, {
        enabled: true,
        actorPermissions: options.actorPermissions,
      });
    }
  }
  return transactions.map((t) =>
    t.id === id
      ? {
          ...t,
          status: "APPROVED" as const,
          approvedById: userId,
          approvedAt: now,
          updatedAt: now,
          version: t.version + 1,
        }
      : t,
  );
}

// --- batchApproveTransactions ---

export function buildBatchApproveTransactions(
  transactions: Transaction[],
  ids: string[],
  userId: string,
  now: string,
  options: ApproveOptions = {},
): Transaction[] {
  // PR8 — même garde que l'approbation unitaire, sur CHAQUE transaction visée.
  // Une seule transaction créée par l'acteur suffit à refuser tout le lot :
  // on ne veut pas approuver « en partie » un lot hétérogène en silence.
  if (options.enabled) {
    for (const id of ids) {
      const target = transactions.find((t) => t.id === id);
      if (target) {
        assertApprovable(target, userId, {
          enabled: true,
          actorPermissions: options.actorPermissions,
        });
      }
    }
  }
  return transactions.map((t) =>
    ids.includes(t.id)
      ? {
          ...t,
          status: "APPROVED" as const,
          approvedById: userId,
          approvedAt: now,
          updatedAt: now,
          version: t.version + 1,
        }
      : t,
  );
}

// --- reverseTransaction ---

export interface ReverseTransactionResult {
  reversalTx: Transaction;
}

export function buildReverseTransaction(
  transactions: Transaction[],
  id: string,
  userId: string,
  reason: string,
  // Horloge injectable (défaut : maintenant). Permet aux tests d'être
  // déterministes — sans ce paramètre, deux lectures successives de
  // `new Date()` pouvaient différer d'1 ms et faire échouer une assertion
  // d'égalité (test instable observé en CI : « 15:40:06.147Z vs .146Z »).
  now: string = new Date().toISOString(),
): ReverseTransactionResult | null {
  const tx = transactions.find((t) => t.id === id);
  if (!tx || tx.status !== "APPROVED") return null;

  const reversalId = generateId();
  return {
    reversalTx: {
      ...tx,
      id: reversalId,
      type: tx.type === "INCOME" ? "EXPENSE" : "INCOME",
      reversalOfId: id,
      status: "APPROVED",
      approvedById: userId,
      approvedAt: now,
      comment: `Contre-transaction: ${reason}`,
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
  };
}

export async function persistReverseTransaction(
  reversalTx: Transaction,
): Promise<void> {
  try {
    await addTransactionPS({
      org_id: reversalTx.orgId,
      type: reversalTx.type,
      amount: reversalTx.amount,
      description: reversalTx.description,
      date: reversalTx.date,
      status: reversalTx.status,
      category_id: reversalTx.categoryId,
      org_unit_id: reversalTx.orgUnitId,
      compensates_for: reversalTx.compensatesFor,
      comment: reversalTx.comment,
      created_by_id: reversalTx.createdById,
      approved_by_id: reversalTx.approvedById,
      approved_at: reversalTx.approvedAt,
      event_id: reversalTx.eventId,
      source: reversalTx.source,
      person_name: reversalTx.personName,
      source_caisse_id: reversalTx.sourceCaisseId,
      versement_id: reversalTx.versementId,
      reversal_of_id: reversalTx.reversalOfId,
      cotisation_id: null,
    });
  } catch (error) {
    // PR13 — rejet de gel de période : décision métier, à propager.
    if (isPeriodLockedError(error)) throw error;
    // Persist failure is non-fatal; offline queue will retry
  }
}
