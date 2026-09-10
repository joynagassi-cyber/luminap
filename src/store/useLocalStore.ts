/**
 * Legacy Store - PowerSync Migration Complete
 *
 * Business logic extracted to:
 * - src/lib/cotisation-service.ts
 * - src/lib/notification-service.ts
 * - src/lib/transaction-service.ts
 * - src/lib/event-service.ts
 * - src/lib/group-lifecycle.ts
 * - src/lib/member-service.ts
 * This store focuses on state management and PowerSync delegation.
 */

import { create } from "zustand";
import { lifecycle } from "@/capabilities/lifecycle";
import { relationship } from "@/capabilities/relationship";
import { getOrganizationId } from "@/lib/orgContext";
import { createVersement as createVersementService } from "@/lib/versement-service";
import { createGroup as createGroupService } from "@/lib/group-service";
import {
  buildAddTransaction,
  persistAddTransaction,
  auditAddTransaction,
  validateUpdateTransaction,
  applyUpdateTransaction,
  validateDeleteTransaction,
  applyDeleteTransaction,
  validateBatchDeleteTransactions,
  buildApproveTransaction,
  buildBatchApproveTransactions,
  buildReverseTransaction,
  persistReverseTransaction,
} from "@/lib/transaction-service";
import {
  buildAddEvent,
  persistAddEvent,
  applyUpdateEvent,
  persistUpdateEvent,
  applyDeleteEvent,
  persistDeleteEvent,
  applyUpdateEventStatus,
  addBudgetItem,
  removeBudgetItem,
  updateShoppingItemStatus,
} from "@/lib/event-service";
import {
  buildCreateMember,
  persistCreateMember,
  applyUpdateMember,
  applyDeleteMember,
} from "@/lib/member-service";
import {
  applyUpdateGroup,
  applyDeleteGroup,
  applyArchiveGroup,
  applyRestoreGroup,
  buildCreateEventBudget,
  buildAddBudgetLine,
  applyRemoveBudgetLine,
} from "@/lib/group-lifecycle";
import {
  createCulte,
  persistCulte,
  markCotisationPaid,
  persistMarkCotisationPaid,
  markCotisationsAbsent,
  persistMarkCotisationsAbsent,
  updateCotisation as updateCotisationService,
  persistUpdateCotisation,
  getCotisationsForCulte as getCotisationsForCulteSvc,
  getMembreHistorique as getMembreHistoriqueSvc,
  getMembresEnAvance as getMembresEnAvanceSvc,
} from "@/lib/cotisation-service";
import {
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notification-service";
import {
  addTransactionPS,
  updateTransactionPS,
  deleteTransactionPS,
  updateEventPS,
  updateMemberPS,
  updateCotisationPS,
} from "@/lib/dataLayer";
import { getPowerSyncDatabase } from "@/lib/powersync";
import type {
  User,
  Role,
  Transaction,
  Category,
  OrgUnit,
  Caisse,
  Event,
  BudgetItem,
  ShoppingItem,
  AppConfig,
  NotificationItem,
  Member,
  Group,
  Account,
  GroupMembership,
  Cotisation,
} from "@/types";
// Church-specific seed data & role helpers — extracted from lib into the
// church Business Pack. `DEFAULT_USER` is re-exported here for backward
// compatibility (e2e-auth.test.ts mocks @/store/useLocalStore and expects it).
// Seed data is read via churchSeedData() (lazy org context).
import { DEFAULT_USER, churchSeedData } from "@/packs/church";
export { DEFAULT_USER };

// --- Sub-types ---
interface EventBudget {
  id: string;
  eventId: string;
  currency: string;
  revisedAt: string | null;
  revisedBy: string | null;
  createdAt: string;
}

interface BudgetLine {
  id: string;
  eventBudgetId: string;
  categoryId: string;
  plannedAmountCents: number;
  actualAmountCents: number;
  description: string | null;
  createdAt: string;
}

interface StoreSnapshot {
  transactions: Transaction[];
  events: Event[];
  members: Member[];
  orgUnits: OrgUnit[];
  caisses: Caisse[];
  groups: Group[];
  accounts: Account[];
  cotisations: Cotisation[];
  eventBudgets: EventBudget[];
  budgetLines: BudgetLine[];
  notifications: NotificationItem[];
  user: { role: string; id: string };
}

interface LocalStoreState {
  user: User;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  caisses: Caisse[];
  events: Event[];
  auditEntries: any[];
  notifications: NotificationItem[];
  appConfig: AppConfig;
  members: Member[];
  groups: Group[];
  accounts: Account[];
  memberships: GroupMembership[];
  eventBudgets: EventBudget[];
  budgetLines: BudgetLine[];
  cotisations: Cotisation[];
  isLoading: boolean;
  isOnline: boolean;
  selectRole: (role: Role) => Promise<void>;
  createNotification: (
    notif: Omit<NotificationItem, "id" | "createdAt">,
  ) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addTransaction: (
    tx: Omit<
      Transaction,
      "id" | "createdAt" | "updatedAt" | "version" | "reversalOfId"
    >,
  ) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  batchDeleteTransactions: (ids: string[]) => Promise<void>;
  approveTransaction: (id: string, userId?: string) => Promise<void>;
  batchApproveTransactions: (ids: string[], userId?: string) => Promise<void>;
  reverseTransaction: (id: string, reason: string) => Promise<void>;
  createVersement: (data: {
    sourceCaisseId: string;
    amount: number;
    comment?: string;
  }) => Promise<void>;
  syncEventBudget: (eventId: string) => Promise<void>;
  addEvent: (
    event: Omit<Event, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateEvent: (id: string, data: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  updateEventStatus: (
    id: string,
    status: Event["status"],
    userId?: string,
  ) => Promise<void>;
  addBudgetItem: (
    eventId: string,
    item: Omit<BudgetItem, "id">,
  ) => Promise<void>;
  removeBudgetItem: (eventId: string, itemId: string) => Promise<void>;
  updateShoppingItemStatus: (
    eventId: string,
    itemId: string,
    status: ShoppingItem["status"],
  ) => Promise<void>;
  updateConfig: (config: Partial<AppConfig>) => Promise<void>;
  createGroup: (data: {
    name: string;
    type: string;
    description: string;
    color: string;
  }) => Promise<void>;
  updateGroup: (id: string, data: Partial<OrgUnit>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  archiveGroup: (id: string, reason: string, actorId: string) => Promise<void>;
  restoreGroup: (id: string, reason: string, actorId: string) => Promise<void>;
  createEventBudget: (eventId: string, currency: string) => Promise<void>;
  addBudgetLine: (
    eventBudgetId: string,
    line: Omit<BudgetLine, "id" | "createdAt">,
  ) => Promise<void>;
  removeBudgetLine: (eventBudgetId: string, lineId: string) => Promise<void>;
  getEventBudget: (eventId: string) => EventBudget | undefined;
  getBudgetLines: (eventBudgetId: string) => BudgetLine[];
  createMember: (
    data: Omit<Member, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateMember: (id: string, data: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  archiveMember: (id: string, reason: string, actorId: string) => Promise<void>;
  restoreMember: (id: string, reason: string, actorId: string) => Promise<void>;
  addMemberToGroup: (
    membership: Omit<GroupMembership, "id" | "createdAt">,
  ) => Promise<void>;
  removeMemberFromGroup: (id: string) => Promise<void>;
  loadInitialData: () => Promise<void>;
  setOnline: (online: boolean) => void;
  getCaisseForDisplay: (
    accountId: string,
  ) => {
    id: string;
    name: string;
    description: string;
    type: "MAIN" | "GROUP";
    color: string;
    orgId: string;
    createdAt: string;
    updatedAt: string;
    archivedAt: string | null;
    archivedBy: string | null;
    archiveReason: string | null;
    status: "ACTIVE" | "ARCHIVED";
  } | null;
  createCulte: (data: {
    name: string;
    startDate: string;
    montantCotisationCents?: number;
  }) => Promise<void>;
  markCotisationPaid: (
    cotisationId: string,
    montantPayeCents: number,
    datePaiement: string,
  ) => Promise<void>;
  markCotisationsAbsent: (
    culteId: string,
    membreIds: string[],
  ) => Promise<void>;
  updateCotisation: (id: string, data: Partial<Cotisation>) => Promise<void>;
  getCotisationsForCulte: (culteId: string) => Cotisation[];
  getMembreHistorique: (
    membreId: string,
  ) => { cotisation: Cotisation; culte: Event | undefined }[];
  getMembresEnAvance: () => { membre: Member; montant: number }[];
}

export const useLocalStore = create<LocalStoreState>()(
  (set, get) => {
    const snap = (): StoreSnapshot => ({
      transactions: get().transactions,
      events: get().events,
      members: get().members,
      orgUnits: get().orgUnits,
      caisses: get().caisses,
      groups: get().groups,
      accounts: get().accounts,
      cotisations: get().cotisations,
      eventBudgets: get().eventBudgets,
      budgetLines: get().budgetLines,
      notifications: get().notifications,
      user: { role: get().user.role, id: get().user.id },
    });

    const seed = churchSeedData();
    return {
      user: seed.user,
      transactions: [],
      categories: seed.categories,
      orgUnits: seed.orgUnits,
      caisses: seed.caisses,
      events: [],
      auditEntries: [],
      notifications: [],
      members: [],
      groups: [],
      accounts: [],
      memberships: [],
      eventBudgets: [],
      budgetLines: [],
      cotisations: [],
      appConfig: { churchName: "", churchLogoUrl: "", userPhoto: "" },
      isLoading: false,
      isOnline: navigator.onLine,

      selectRole: async (role) => {
        const sessionId =
          localStorage.getItem("lumina-session") ?? crypto.randomUUID();
        localStorage.setItem("lumina-session", sessionId);
        localStorage.setItem("lumina-role", role);
        set({ user: { ...get().user, role } });
      },

      // --- Notifications ---
      createNotification: async (notif) => {
        const newNotif = createNotification(notif, get());
        set({ notifications: [newNotif, ...get().notifications] });
      },

      markNotificationRead: async (id) => {
        set({ notifications: markNotificationRead(id, get()) });
      },

      markAllNotificationsRead: async () => {
        set({ notifications: markAllNotificationsRead(get()) });
      },

      // --- Transactions ---
      addTransaction: async (tx) => {
        const { id, newTx } = buildAddTransaction(tx, snap());
        await persistAddTransaction(newTx);
        await auditAddTransaction(id, tx, newTx, snap().user.role);
        set({ transactions: [...get().transactions, newTx] });
      },

      updateTransaction: async (id, data) => {
        const v = validateUpdateTransaction(snap().transactions, id, data);
        if (!v.allowed)
          throw new Error(v.reason ?? "TRANSACTION_APPROVED_IMMUTABLE");
        await updateTransactionPS(id, data);
        set({
          transactions: applyUpdateTransaction(snap().transactions, id, data),
        });
      },

      deleteTransaction: async (id) => {
        const v = validateDeleteTransaction(snap().transactions, id);
        if (!v.allowed)
          throw new Error(v.reason ?? "TRANSACTION_APPROVED_IMMUTABLE");
        await deleteTransactionPS(id);
        set({ transactions: applyDeleteTransaction(snap().transactions, id) });
      },

      batchDeleteTransactions: async (ids) => {
        const blocked = validateBatchDeleteTransactions(
          snap().transactions,
          ids,
        );
        if (blocked.length > 0)
          throw new Error("TRANSACTION_APPROVED_IMMUTABLE");
        for (const id of ids) {
          try {
            await deleteTransactionPS(id);
          } catch (e) {
            console.error("[Store] Failed to delete:", id, e);
          }
        }
        set({
          transactions: snap().transactions.filter((t) => !ids.includes(t.id)),
        });
      },

      approveTransaction: async (id, userId) => {
        const now = new Date().toISOString();
        set({
          transactions: buildApproveTransaction(
            snap().transactions,
            id,
            userId ?? snap().user.id,
            now,
          ),
        });
        try {
          await updateTransactionPS(id, {
            status: "APPROVED",
            approved_by_id: userId ?? snap().user.id,
            approved_at: now,
          });
        } catch (e) {
          console.error("[Store] Failed to approve:", e);
        }
      },

      batchApproveTransactions: async (ids, userId) => {
        const now = new Date().toISOString();
        for (const txId of ids) {
          try {
            await updateTransactionPS(txId, {
              status: "APPROVED",
              approved_by_id: userId ?? snap().user.id,
              approved_at: now,
            });
          } catch (e) {
            console.error("[Store] Failed to approve:", txId, e);
          }
        }
        set({
          transactions: buildBatchApproveTransactions(
            snap().transactions,
            ids,
            userId ?? snap().user.id,
            now,
          ),
        });
      },

      reverseTransaction: async (id, reason) => {
        const result = buildReverseTransaction(
          snap().transactions,
          id,
          snap().user.id,
          reason,
        );
        if (!result)
          throw new Error("Only approved transactions can be reversed");
        await persistReverseTransaction(result.reversalTx);
        set({ transactions: [...get().transactions, result.reversalTx] });
      },

      createVersement: async (data) => {
        const result = await createVersementService(data);
        set({
          transactions: [
            ...get().transactions,
            result.sourceTx,
            result.targetTx,
          ],
        });
      },

      syncEventBudget: async (eventId: string) => {},

      // --- Events ---
      addEvent: async (event) => {
        const newEvent = buildAddEvent(event);
        await persistAddEvent(newEvent);
        set({ events: [...get().events, newEvent] });
      },

      updateEvent: async (id, data) => {
        await persistUpdateEvent(id, data);
        set({ events: applyUpdateEvent(get().events, id, data) });
      },

      deleteEvent: async (id) => {
        await persistDeleteEvent(id);
        set({ events: applyDeleteEvent(get().events, id) });
      },

      updateEventStatus: async (id, status) => {
        await updateEventPS(id, { status });
        set({ events: applyUpdateEventStatus(get().events, id, status) });
      },

      addBudgetItem: async (eventId, item) => {
        const event = get().events.find((e) => e.id === eventId);
        if (!event) return;
        const { newItems, total } = addBudgetItem(
          event.budgetItems,
          eventId,
          item,
        );
        await get().updateEvent(eventId, {
          budgetItems: newItems,
          budget: total,
        });
      },

      removeBudgetItem: async (eventId, itemId) => {
        const event = get().events.find((e) => e.id === eventId);
        if (!event) return;
        const { newItems, total } = removeBudgetItem(event.budgetItems, itemId);
        await get().updateEvent(eventId, {
          budgetItems: newItems,
          budget: total,
        });
      },

      updateShoppingItemStatus: async (eventId, itemId, status) => {
        const event = get().events.find((e) => e.id === eventId);
        if (!event) return;
        const newItems = updateShoppingItemStatus(
          event.shoppingItems,
          itemId,
          status,
        );
        await get().updateEvent(eventId, { shoppingItems: newItems });
      },

      updateConfig: async (config) => {
        const updated = { ...get().appConfig, ...config };
        set({ appConfig: updated });
        localStorage.setItem("lumina-config", JSON.stringify(updated));
      },

      // --- Groups ---
      createGroup: async (data) => {
        const groupCount = get().caisses.filter(
          (c) => c.type === "GROUP",
        ).length;
        const result = createGroupService({
          ...data,
          existingGroupCount: groupCount,
        });
        set({
          orgUnits: [...get().orgUnits, result.orgUnit],
          caisses: [...get().caisses, result.caisse],
          groups: [...get().groups, result.group],
          accounts: [...get().accounts, result.account],
        });
      },

      updateGroup: async (id, data) => {
        const { orgUnits, caisses, groups, accounts } = applyUpdateGroup(
          snap(),
          id,
          data,
        );
        set({ orgUnits, caisses, groups, accounts });
      },

      deleteGroup: async (id) => {
        const { orgUnits, caisses, groups, accounts } = applyDeleteGroup(
          snap(),
          id,
        );
        set({ orgUnits, caisses, groups, accounts });
      },

      archiveGroup: async (id, reason, actorId) => {
        await lifecycle.archive("Group", id, reason, actorId);
        const { groups, accounts, caisses } = applyArchiveGroup(
          snap(),
          id,
          reason,
          actorId,
        );
        set({ groups, accounts, caisses });
      },

      restoreGroup: async (id, reason, actorId) => {
        await lifecycle.restore("Group", id, reason, actorId);
        const { groups, accounts, caisses } = applyRestoreGroup(
          snap(),
          id,
          reason,
          actorId,
        );
        set({ groups, accounts, caisses });
      },

      // --- Budget ---
      createEventBudget: async (eventId, currency = "XOF") => {
        set({
          eventBudgets: [
            ...get().eventBudgets,
            buildCreateEventBudget(eventId, currency),
          ],
        });
      },

      addBudgetLine: async (eventBudgetId, line) => {
        set({ budgetLines: [...get().budgetLines, buildAddBudgetLine(line)] as any });
      },

      removeBudgetLine: async (eventBudgetId, lineId) => {
        set({
          budgetLines: applyRemoveBudgetLine(
            get().budgetLines,
            eventBudgetId,
            lineId,
          ) as any,
        });
      },

      getEventBudget: (eventId) =>
        get().eventBudgets.find((eb) => eb.eventId === eventId),
      getBudgetLines: (eventBudgetId) =>
        get().budgetLines.filter((bl) => bl.eventBudgetId === eventBudgetId),

      // --- Cotisations ---
      createCulte: async (data) => {
        const result = createCulte(data, snap());
        set({
          events: [...get().events, result.culte],
          cotisations: [...get().cotisations, ...result.cotisations],
        });
        await persistCulte(result.culte, result.cotisations);
      },

      markCotisationPaid: async (
        cotisationId,
        montantPayeCents,
        datePaiement,
      ) => {
        const result = markCotisationPaid(
          cotisationId,
          montantPayeCents,
          datePaiement,
          snap(),
        );
        if (result.error) throw new Error(result.error);
        set({
          cotisations: get().cotisations.map((c) =>
            c.id === cotisationId ? result.updatedCot : c,
          ),
        });
        if (result.updatedMembre)
          set({
            members: get().members.map((m) =>
              m.id === result.updatedMembre!.id ? result.updatedMembre! : m,
            ),
          });
        if (result.newTransaction)
          set({ transactions: [...get().transactions, result.newTransaction] });
        await persistMarkCotisationPaid({
          ...result,
          cotisationId,
          membreId: result.updatedMembre?.id,
        });
      },

      markCotisationsAbsent: async (culteId, membreIds) => {
        const result = markCotisationsAbsent(culteId, membreIds, snap());
        set({ cotisations: result.updatedCotisations });
        await persistMarkCotisationsAbsent(culteId, membreIds, snap());
      },

      updateCotisation: async (id, data) => {
        set({ cotisations: updateCotisationService(id, data, snap()) });
        await persistUpdateCotisation(id, data);
      },

      getCotisationsForCulte: (culteId) =>
        getCotisationsForCulteSvc(culteId, snap()),
      getMembreHistorique: (membreId) =>
        getMembreHistoriqueSvc(membreId, snap()),
      getMembresEnAvance: () => getMembresEnAvanceSvc(snap()),

      // --- Members ---
      createMember: async (data) => {
        const member = buildCreateMember(data);
        await persistCreateMember(member);
        set({ members: [...get().members, member] });
      },

      updateMember: async (id, data) => {
        await updateMemberPS(id, data);
        set({ members: applyUpdateMember(get().members, id, data) });
      },

      deleteMember: async (id) => {
        set({ members: applyDeleteMember(get().members, id) });
      },

      archiveMember: async (id, reason, actorId) => {
        const now = new Date().toISOString();
        await lifecycle.archive("Member", id, reason, actorId);
        set({
          members: get().members.map((m) =>
            m.id === id
              ? {
                  ...m,
                  status: "ARCHIVED" as const,
                  archivedAt: now,
                  archivedBy: actorId,
                  archiveReason: reason,
                  updatedAt: now,
                }
              : m,
          ),
        });
      },

      restoreMember: async (id, reason, actorId) => {
        const now = new Date().toISOString();
        await lifecycle.restore("Member", id, reason, actorId);
        set({
          members: get().members.map((m) =>
            m.id === id
              ? {
                  ...m,
                  status: "ACTIVE" as const,
                  archivedAt: null,
                  archivedBy: null,
                  archiveReason: null,
                  updatedAt: now,
                }
              : m,
          ),
        });
      },

      // --- Memberships ---
      addMemberToGroup: async (membership) => {
        const id = await relationship.addMembership(
          membership.groupId,
          membership.memberId,
          membership.roleInGroup,
          "local-user",
        );
        set({
          memberships: [
            ...get().memberships,
            { ...membership, id, createdAt: new Date().toISOString() },
          ],
        });
      },

      removeMemberFromGroup: async (id) => {
        await relationship.removeMembership(id, "local-user");
        set({ memberships: get().memberships.filter((m) => m.id !== id) });
      },

      // --- Data loading ---
      loadInitialData: async () => {
        set({ isLoading: true });
        try {
          const storedConfig = localStorage.getItem("lumina-config");
          const storedRole = localStorage.getItem("lumina-role") as Role;
          const db = getPowerSyncDatabase();
          const cotisations = await db
            .getAll<Cotisation>("cotisations")
            .catch(() => [] as Cotisation[]);
          set({
            cotisations,
            appConfig: storedConfig
              ? JSON.parse(storedConfig)
              : { churchName: "", churchLogoUrl: "", userPhoto: "" },
            user: { ...churchSeedData().user, role: storedRole || "TREASURIER" },
            isLoading: false,
          });
        } catch (e) {
          set({ isLoading: false });
        }
      },

      setOnline: (isOnline) => set({ isOnline }),

      getCaisseForDisplay: (accountId: string) => {
        const state = get();
        const acc = state.accounts.find((a) => a.id === accountId);
        if (acc) {
          const caisse = state.caisses.find((c) => c.id === accountId);
          return {
            id: acc.id,
            name: acc.name,
            description:
              state.orgUnits.find((o) => o.id === acc.id)?.description || "",
            type:
              acc.ownerType === "ORGANIZATION" ? "MAIN" : ("GROUP" as const),
            color: caisse?.color || "#FF6B00",
            orgId: acc.orgId,
            createdAt: acc.createdAt,
            updatedAt: acc.updatedAt,
            archivedAt: acc.archivedAt,
            archivedBy: acc.archivedBy,
            archiveReason: acc.archiveReason,
            status: acc.status,
          };
        }
        return state.caisses.find((c) => c.id === accountId) ?? null;
      },
    };
  },
  undefined as any,
);
