/**
 * Group Service (extended)
 *
 * Handles group lifecycle operations: update, delete, archive, restore.
 * Already had createGroup in group-service.ts - this extends it with lifecycle.
 */

import { generateId } from "./utils";
import { createGroupPS, updateGroupPS, deleteGroupPS } from "./dataLayer";
import { writeAudit, resolveAuditActor } from "./audit";
import { getOrganizationId } from "./orgContext";
import type {
  OrgUnit,
  Caisse,
  Group,
  Account,
  EventBudget,
  BudgetLine,
} from "@/types";

export interface GroupState {
  orgUnits: OrgUnit[];
  caisses: Caisse[];
  groups: Group[];
  accounts: Account[];
}

export interface EventBudgetState {
  eventBudgets: EventBudget[];
  budgetLines: BudgetLine[];
}

// --- updateGroup ---

export interface UpdateGroupResult {
  orgUnits: OrgUnit[];
  caisses: Caisse[];
  groups: Group[];
  accounts: Account[];
}

export function applyUpdateGroup(
  state: GroupState,
  id: string,
  data: Partial<OrgUnit>,
): UpdateGroupResult {
  const now = new Date().toISOString();
  return {
    orgUnits: state.orgUnits.map((ou) =>
      ou.id === id ? { ...ou, ...data, updatedAt: now } : ou,
    ),
    caisses: state.caisses.map((c) =>
      c.id === id
        ? {
            ...c,
            name: data.name ?? c.name,
            description: data.description ?? c.description,
            updatedAt: now,
          }
        : c,
    ),
    groups: state.groups.map((g) =>
      g.id === id ? { ...g, ...data, updatedAt: now } : g,
    ),
    accounts: state.accounts.map((a) =>
      a.id === id ? { ...a, name: data.name ?? a.name, updatedAt: now } : a,
    ),
  };
}

// --- deleteGroup ---

export function applyDeleteGroup(
  state: GroupState,
  id: string,
): Pick<GroupState, "orgUnits" | "caisses" | "groups" | "accounts"> {
  return {
    orgUnits: state.orgUnits.filter((ou) => ou.id !== id),
    caisses: state.caisses.filter((c) => c.id !== id),
    groups: state.groups.filter((g) => g.id !== id),
    accounts: state.accounts.filter((a) => a.id !== id),
  };
}

// --- archiveGroup ---

export interface ArchiveGroupResult {
  groups: Group[];
  accounts: Account[];
  caisses: Caisse[];
}

export function applyArchiveGroup(
  state: GroupState,
  id: string,
  reason: string,
  actorId: string,
): ArchiveGroupResult {
  const now = new Date().toISOString();
  return {
    groups: state.groups.map((g) =>
      g.id === id
        ? {
            ...g,
            status: "ARCHIVED" as const,
            archivedAt: now,
            archivedBy: actorId,
            archiveReason: reason,
            updatedAt: now,
          }
        : g,
    ),
    accounts: state.accounts.map((a) =>
      a.id === id
        ? {
            ...a,
            status: "ARCHIVED" as const,
            archivedAt: now,
            archivedBy: actorId,
            archiveReason: reason,
            updatedAt: now,
          }
        : a,
    ),
    caisses: state.caisses.map((c) =>
      c.id === id
        ? {
            ...c,
            status: "ARCHIVED" as const,
            archivedAt: now,
            archivedBy: actorId,
            archiveReason: reason,
            updatedAt: now,
          }
        : c,
    ),
  };
}

// --- restoreGroup ---

export interface RestoreGroupResult {
  groups: Group[];
  accounts: Account[];
  caisses: Caisse[];
}

export function applyRestoreGroup(
  state: Pick<GroupState, "groups" | "accounts" | "caisses">,
  id: string,
  reason: string,
  actorId: string,
): RestoreGroupResult {
  const now = new Date().toISOString();
  return {
    groups: state.groups.map((g) =>
      g.id === id
        ? {
            ...g,
            status: "ACTIVE" as const,
            archivedAt: null,
            archivedBy: null,
            archiveReason: null,
            updatedAt: now,
          }
        : g,
    ),
    accounts: state.accounts.map((a) =>
      a.id === id
        ? {
            ...a,
            status: "ACTIVE" as const,
            archivedAt: null,
            archivedBy: null,
            archiveReason: null,
            updatedAt: now,
          }
        : a,
    ),
    caisses: state.caisses.map((c) =>
      c.id === id
        ? {
            ...c,
            status: "ACTIVE" as const,
            archivedAt: null,
            archivedBy: null,
            archiveReason: null,
            updatedAt: now,
          }
        : c,
    ),
  };
}

// --- EventBudget ---

export function buildCreateEventBudget(
  eventId: string,
  currency: string,
): EventBudget {
  const now = new Date().toISOString();
  const id = generateId();
  return {
    id,
    eventId,
    currency,
    revisedAt: null,
    revisedBy: null,
    createdAt: now,
  };
}

export function buildAddBudgetLine(
  line: Omit<BudgetLine, "id" | "createdAt">,
): BudgetLine {
  const now = new Date().toISOString();
  const id = generateId();
  return { ...line, id, createdAt: now };
}

export function applyRemoveBudgetLine(
  budgetLines: BudgetLine[],
  eventBudgetId: string,
  lineId: string,
): BudgetLine[] {
  return budgetLines.filter(
    (bl) => !(bl.eventBudgetId === eventBudgetId && bl.id === lineId),
  );
}

// ============================================================
// Persistance AUDITÉE (NeverBreak #6)
// ============================================================
//
// Les appliers ci-dessus (`applyUpdateGroup`, `applyDeleteGroup`) sont PURS :
// ils ne touchent pas la base. L'écriture réelle passait par
// `createGroupPS` / `updateGroupPS` / `deleteGroupPS` appelés DIRECTEMENT
// depuis les pages — donc sans aucune trace d'audit. Ces fonctions sont le
// point d'entrée sanctionné : elles persistent PUIS écrivent l'entrée d'audit.
//
// Archivage / restauration : déjà tracés par `capabilities/lifecycle`
// (`action: "ARCHIVE" | "RESTORE"`).

export interface PersistCreateGroupParams {
  name: string;
  type: string;
  description: string;
}

/** Crée un groupe (org_units + groups + accounts + caisses) et le trace. */
export async function persistCreateGroup(
  params: PersistCreateGroupParams,
): Promise<string> {
  const id = await createGroupPS({
    name: params.name,
    type: params.type,
    description: params.description,
  });
  await writeAudit({
    orgId: getOrganizationId(),
    transactionId: null,
    ...resolveAuditActor(),
    action: "CREATE",
    entityType: "Group",
    entityId: id,
    beforeState: null,
    afterState: { id, ...params, status: "ACTIVE" },
    comment: null,
  });
  return id;
}

/** Met à jour un groupe (les 4 lignes partagent l'id) et le trace. */
export async function persistUpdateGroup(
  id: string,
  data: { name?: string; description?: string; type?: string },
  beforeState: Partial<Group> | null = null,
): Promise<void> {
  await updateGroupPS(id, data);
  await writeAudit({
    orgId: getOrganizationId(),
    transactionId: null,
    ...resolveAuditActor(),
    action: "UPDATE",
    entityType: "Group",
    entityId: id,
    beforeState,
    afterState: { id, ...data },
    comment: null,
  });
}

/** Supprime un groupe (et ses lignes liées) et le trace. */
export async function persistDeleteGroup(
  id: string,
  beforeState: Partial<Group> | null = null,
): Promise<void> {
  await deleteGroupPS(id);
  await writeAudit({
    orgId: getOrganizationId(),
    transactionId: null,
    ...resolveAuditActor(),
    action: "DELETE",
    entityType: "Group",
    entityId: id,
    beforeState,
    afterState: null,
    comment: null,
  });
}
