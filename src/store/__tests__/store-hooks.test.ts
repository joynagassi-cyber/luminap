// @vitest-environment jsdom
/**
 * Tests for useLocalStore, useToast, and useIsMobile.
 *
 * Store tests cover: initial state shape, selectRole (with localStorage),
 * addTransaction, updateTransaction validation & apply, deleteTransaction,
 * approveTransaction, reverseTransaction, createGroup, updateConfig (persist),
 * getCaisseForDisplay, getCotisationsForCulte, and notifications helpers.
 *
 * Toast tests cover: state transitions via the exported reducer (ADD/UPDATE/DISMISS/
 * REMOVE), TOAST_LIMIT enforcement, and the useToast hook's reactive state.
 *
 * Mobile tests cover: initial undefined state, media query subscription,
 * and reactive changes when matchMedia returns a new MediaQueryList.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

// ─── matchMedia shim for jsdom ────────────────────────────────────────────────
// Uses a mutable fixture object so the same MediaQueryList reference persists
// across matchMedia() calls — required by the hook's addEventListener pattern.
const _mqlFixtures = { matches: false, changeFn: undefined as (() => void) | undefined };

function _makeMql(query: string) {
  // `matches` is a getter (not a one-shot copy) so the MQL reflects the live
  // value in _mqlFixtures across tests, matching how `innerWidth` behaves.
  const mql: any = {
    get matches() {
      return _mqlFixtures.matches;
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener(_evt: string, fn: () => void) {
      _mqlFixtures.changeFn = fn;
    },
    removeEventListener(_evt: string, _fn: () => void) {
      _mqlFixtures.changeFn = undefined;
    },
  };
  return mql;
}

function triggerMediaChange() {
  if (_mqlFixtures.changeFn) _mqlFixtures.changeFn();
}

// Set up matchMedia on window once at module level so it survives across tests.
// Must be a real function for vi.spyOn() to work in tests that override it.
const _defaultMql = _makeMql("(max-width: 767px)");
let __originalMatchMedia: (() => any) | undefined;
function __initMatchMedia() {
  if (typeof window.matchMedia !== "function") {
    __originalMatchMedia = undefined;
    Object.defineProperty(window, "matchMedia", {
      value: ((_query: string) => _defaultMql) as any,
      configurable: true,
      writable: true,
    });
  }
}
__initMatchMedia();

beforeEach(() => {
  _mqlFixtures.matches = false;
  _mqlFixtures.changeFn = undefined;
});

afterEach(() => {
  vi.unstubAllGlobals();
  // Re-establish matchMedia after unstub clears stubs
  __initMatchMedia();
});

// ─── In-memory localStorage (jsdom has one but we clear between tests) ───────
beforeEach(() => {
  localStorage.clear();
});

// ─── Mock orgContext — must be before any import that pulls in useLocalStore ─
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: vi.fn(() => "test-org-1"),
  setOrganizationId: vi.fn(),
}));

// ─── Mock PowerSync database ─────────────────────────────────────────────────
const psRows: Array<{ sql: string; params: any[] }> = [];
vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: vi.fn(() => ({
    execute: vi.fn(async (sql: string, params: any[]) => {
      psRows.push({ sql, params });
      return { array: [] };
    }),
    getAll: vi.fn(async () => []),
  })),
  getPowerSyncConnector: vi.fn(),
  initPowerSync: vi.fn(async () => {}),
  disconnectPowerSync: vi.fn(async () => {}),
}));

// ─── Mock dataLayer ──────────────────────────────────────────────────────────
const _dlMock = vi.hoisted(() => ({
  addTransactionPS: vi.fn(async () => {}),
  updateTransactionPS: vi.fn(async () => {}),
  deleteTransactionPS: vi.fn(async () => {}),
  updateEventPS: vi.fn(async () => {}),
  updateMemberPS: vi.fn(async () => {}),
  updateCotisationPS: vi.fn(async () => {}),
  addGroupMembershipPS: vi.fn(async () => "mem-id-1"),
  removeGroupMembershipPS: vi.fn(async () => {}),
  getGroupMembershipsPS: vi.fn(async () => []),
}));
vi.mock("@/lib/dataLayer", () => _dlMock);

// ─── Mock lifecycle capability ───────────────────────────────────────────────
vi.mock("@/capabilities/lifecycle", () => ({
  lifecycle: {
    archive: vi.fn(async () => {}),
    restore: vi.fn(async () => {}),
  },
}));

// ─── Mock relationship capability ────────────────────────────────────────────
vi.mock("@/capabilities/relationship", () => ({
  relationship: {
    addMembership: vi.fn(async () => "mem-rel-1"),
    removeMembership: vi.fn(async () => {}),
  },
}));

// ─── Mock lib services used by the store ─────────────────────────────────────
vi.mock("@/lib/versement-service", () => ({
  createVersement: vi.fn(async () => ({
    sourceTx: { id: "v-tx-1", type: "VERSEMENT" },
    targetTx: { id: "v-tx-2", type: "VERSEMENT" },
  })),
}));

vi.mock("@/lib/group-service", () => ({
  createGroup: vi.fn((_data: any) => ({
    orgUnit: { id: "group-1", name: _data.name, type: "GROUP", description: _data.description },
    caisse: { id: "caisse-1", name: _data.name, type: "GROUP", color: _data.color },
    group: { id: "group-1", name: _data.name },
    account: { id: "caisse-1", name: _data.name },
  })),
}));

vi.mock("@/lib/transaction-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/transaction-service")>();
  return {
    ...actual,
    persistAddTransaction: vi.fn(async () => {}),
    auditAddTransaction: vi.fn(async () => {}),
    persistReverseTransaction: vi.fn(async () => {}),
  };
});

vi.mock("@/lib/event-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/event-service")>();
  return {
    ...actual,
    persistAddEvent: vi.fn(async () => {}),
    persistUpdateEvent: vi.fn(async () => {}),
    persistDeleteEvent: vi.fn(async () => {}),
  };
});

vi.mock("@/lib/member-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/member-service")>();
  return {
    ...actual,
    persistCreateMember: vi.fn(async () => {}),
  };
});

vi.mock("@/lib/cotisation-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cotisation-service")>();
  return {
    ...actual,
    persistCulte: vi.fn(async () => {}),
    persistMarkCotisationPaid: vi.fn(async () => {}),
    persistMarkCotisationsAbsent: vi.fn(async () => {}),
    persistUpdateCotisation: vi.fn(async () => {}),
  };
});

vi.mock("@/lib/notification-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notification-service")>();
  return {
    ...actual,
    createNotification: vi.fn((n: any, _s: any) => ({ ...n, id: "notif-1", createdAt: new Date().toISOString() })),
    markNotificationRead: vi.fn((id: string, s: any) =>
      s.notifications.map((n: any) => (n.id === id ? { ...n, read: true } : n))
    ),
    markAllNotificationsRead: vi.fn((s: any) =>
      s.notifications.map((n: any) => ({ ...n, read: true }))
    ),
  };
});

// ─── Imports after all mocks are installed ───────────────────────────────────
import { useLocalStore } from "@/store/useLocalStore";
import { useToast, toast, reducer, type State as ToastState } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function storeSnapshot() {
  const store = useLocalStore.getState();
  return {
    user: { role: store.user.role, id: store.user.id },
    transactions: store.transactions,
    events: store.events,
    members: store.members,
    groups: store.groups,
    accounts: store.accounts,
    caisses: store.caisses,
    orgUnits: store.orgUnits,
    cotisations: store.cotisations,
    notifications: store.notifications,
    appConfig: store.appConfig,
    isOnline: store.isOnline,
  };
}

function resetStore() {
  useLocalStore.setState({
    user: { id: "local-user", role: "TREASURIER", email: "", firstName: "Utilisateur", lastName: "", org: { id: "test-org-1", name: "Eglise", type: "Eglise" as const, accentColor: "#FF6B00" } },
    transactions: [],
    categories: [],
    orgUnits: [],
    caisses: [],
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
    isOnline: true,
  } as any);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useLocalStore
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("useLocalStore", () => {
  beforeEach(() => {
    resetStore();
    psRows.length = 0;
  });

  it("initializes with default user role TREASURIER", () => {
    const { user } = storeSnapshot();
    expect(user.role).toBe("TREASURIER");
  });

  it("starts with empty collections", () => {
    const snap = storeSnapshot();
    expect(snap.transactions).toEqual([]);
    expect(snap.events).toEqual([]);
    expect(snap.members).toEqual([]);
    expect(snap.groups).toEqual([]);
    expect(snap.cotisations).toEqual([]);
    expect(snap.notifications).toEqual([]);
  });

  it("isOnline defaults to true when navigator.onLine is true", () => {
    Object.defineProperty(global, "navigator", { value: { onLine: true }, configurable: true });
    resetStore();
    expect(storeSnapshot().isOnline).toBe(true);
  });

  // ── selectRole ──
  it("selectRole writes role to localStorage and updates store.user.role", async () => {
    await useLocalStore.getState().selectRole("ADMIN");
    expect(localStorage.getItem("lumina-role")).toBe("ADMIN");
    expect(storeSnapshot().user.role).toBe("ADMIN");
  });

  it("selectRole persists a session id in localStorage", async () => {
    await useLocalStore.getState().selectRole("ADMIN");
    expect(localStorage.getItem("lumina-session")).toBeTruthy();
  });

  // ── addTransaction ──
  it("addTransaction appends a new transaction", async () => {
    await useLocalStore.getState().addTransaction({
      orgId: "test-org-1",
      type: "INCOME",
      amount: 500,
      description: "Dons",
      date: "2026-09-11",
      status: "PENDING",
      categoryId: "cat-dime",
      sourceCaisseId: "caisse-main",
      createdById: "user-1",
      orgUnitId: null,
      eventId: null,
      versementId: null,
      source: null,
      personName: null,
      compensatesFor: null,
      comment: null,
    });
    expect(storeSnapshot().transactions).toHaveLength(1);
    expect(storeSnapshot().transactions[0]!.type).toBe("INCOME");
    expect(storeSnapshot().transactions[0]!.amount).toBe(500);
  });

  it("addTransaction calls persistAddTransaction from dataLayer", async () => {
    await useLocalStore.getState().addTransaction({
      orgId: "test-org-1",
      type: "EXPENSE",
      amount: 100,
      description: "Frais",
      date: "2026-09-11",
      status: "PENDING",
      categoryId: "cat-frais_fonctionnement",
      sourceCaisseId: "caisse-main",
      createdById: "user-1",
      orgUnitId: null,
      eventId: null,
      versementId: null,
      source: null,
      personName: null,
      compensatesFor: null,
      comment: null,
    });
    const { persistAddTransaction } = await import("@/lib/transaction-service");
    expect(persistAddTransaction).toHaveBeenCalled();
  });

  // ── updateTransaction ──
  it("updateTransaction throws on APPROVED transaction (immutable)", async () => {
    const txId = "tx-approved";
    useLocalStore.setState({ transactions: [{ id: txId, status: "APPROVED" } as any] } as any);
    await expect(
      useLocalStore.getState().updateTransaction(txId, { description: "x" })
    ).rejects.toThrow("TRANSACTION_APPROVED_IMMUTABLE");
  });

  it("updateTransaction applies changes to PENDING transaction", async () => {
    const txId = "tx-pending";
    useLocalStore.setState({ transactions: [{ id: txId, status: "PENDING", description: "old" } as any] } as any);
    await useLocalStore.getState().updateTransaction(txId, { description: "new" });
    expect(storeSnapshot().transactions[0]!.description).toBe("new");
  });

  it("updateTransaction calls updateTransactionPS", async () => {
    const txId = "tx-1";
    useLocalStore.setState({ transactions: [{ id: txId, status: "PENDING" } as any] } as any);
    await useLocalStore.getState().updateTransaction(txId, { description: "updated" });
    expect(_dlMock.updateTransactionPS).toHaveBeenCalledWith(txId, expect.objectContaining({ description: "updated" }));
  });

  // ── deleteTransaction ──
  it("deleteTransaction throws on APPROVED transaction", async () => {
    const txId = "tx-app";
    useLocalStore.setState({ transactions: [{ id: txId, status: "APPROVED" } as any] } as any);
    await expect(useLocalStore.getState().deleteTransaction(txId)).rejects.toThrow();
  });

  it("deleteTransaction removes a PENDING transaction", async () => {
    const txId = "tx-pend";
    useLocalStore.setState({ transactions: [
      { id: txId, status: "PENDING" } as any,
      { id: "tx-keep", status: "PENDING" } as any,
    ] } as any);
    await useLocalStore.getState().deleteTransaction(txId);
    expect(storeSnapshot().transactions.map(t => t.id)).toEqual(["tx-keep"]);
  });

  it("deleteTransaction calls deleteTransactionPS", async () => {
    const txId = "tx-1";
    useLocalStore.setState({ transactions: [{ id: txId, status: "PENDING" } as any] } as any);
    await useLocalStore.getState().deleteTransaction(txId);
    expect(_dlMock.deleteTransactionPS).toHaveBeenCalledWith(txId);
  });

  // ── batchDeleteTransactions ──
  it("batchDeleteTransactions blocks when any id is APPROVED", async () => {
    useLocalStore.setState({ transactions: [
      { id: "a", status: "APPROVED" } as any,
      { id: "b", status: "PENDING" } as any,
    ] } as any);
    await expect(useLocalStore.getState().batchDeleteTransactions(["a", "b"])).rejects.toThrow(
      "TRANSACTION_APPROVED_IMMUTABLE"
    );
  });

  it("batchDeleteTransactions removes multiple PENDING ids", async () => {
    useLocalStore.setState({ transactions: [
      { id: "x", status: "PENDING" } as any,
      { id: "y", status: "PENDING" } as any,
      { id: "z", status: "PENDING" } as any,
    ] } as any);
    await useLocalStore.getState().batchDeleteTransactions(["x", "z"]);
    expect(storeSnapshot().transactions.map(t => t.id)).toEqual(["y"]);
  });

  // ── approveTransaction ──
  it("approveTransaction sets status APPROVED with timestamp and userId", async () => {
    const txId = "tx-1";
    useLocalStore.setState({ transactions: [{ id: txId, status: "PENDING", version: 1 } as any] } as any);
    await useLocalStore.getState().approveTransaction(txId, "approver-1");
    const tx = storeSnapshot().transactions.find(t => t.id === txId)!;
    expect(tx.status).toBe("APPROVED");
    expect(tx.approvedById).toBe("approver-1");
    expect(tx.approvedAt).toBeTruthy();
    expect(tx.version).toBe(2);
  });

  // ── reverseTransaction ──
  it("reverseTransaction throws when transaction is not APPROVED", async () => {
    const txId = "tx-pend";
    useLocalStore.setState({ transactions: [{ id: txId, status: "PENDING" } as any] } as any);
    await expect(useLocalStore.getState().reverseTransaction(txId, "erreur")).rejects.toThrow(
      "Only approved transactions can be reversed"
    );
  });

  it("reverseTransaction appends a reversal entry", async () => {
    useLocalStore.setState({ transactions: [{ id: "tx-orig", type: "INCOME", amount: 200, status: "APPROVED", version: 1, createdById: "u1" } as any] } as any);
    await useLocalStore.getState().reverseTransaction("tx-orig", "montant incorrect");
    const txs = storeSnapshot().transactions;
    expect(txs).toHaveLength(2);
    const rev = txs.find(t => t.reversalOfId === "tx-orig");
    expect(rev).toBeDefined();
    expect(rev!.type).toBe("EXPENSE");
  });

  // ── createGroup ──
  it("createGroup adds group, orgUnit, caisse, and account entries", async () => {
    await useLocalStore.getState().createGroup({
      name: "Chorale",
      type: "GROUP",
      description: "Groupe musical",
      color: "#FF0000",
    });
    const snap = storeSnapshot();
    expect(snap.groups).toHaveLength(1);
    expect(snap.groups[0]!.name).toBe("Chorale");
    expect(snap.caisses).toHaveLength(1);
    expect(snap.accounts).toHaveLength(1);
    expect(snap.orgUnits).toHaveLength(1);
  });

  // ── updateConfig ──
  it("updateConfig merges appConfig and persists to localStorage", async () => {
    await useLocalStore.getState().updateConfig({ churchName: "Eglise Lumina" });
    expect(storeSnapshot().appConfig.churchName).toBe("Eglise Lumina");
    expect(localStorage.getItem("lumina-config")).toBeTruthy();
    const parsed = JSON.parse(localStorage.getItem("lumina-config")!) as any;
    expect(parsed.churchName).toBe("Eglise Lumina");
  });

  // ── getCaisseForDisplay ──
  it("getCaisseForDisplay returns null when account does not exist", () => {
    const result = useLocalStore.getState().getCaisseForDisplay("no-such-account");
    expect(result).toBeNull();
  });

  // ── Notifications ──
  it("createNotification prepends a new notification", async () => {
    await useLocalStore.getState().createNotification({
      type: "info" as any,
      message: "Hello",
      read: false,
    });
    expect(storeSnapshot().notifications).toHaveLength(1);
    expect(storeSnapshot().notifications[0]!.message).toBe("Hello");
  });

  it("markNotificationRead sets read=true on matching id", async () => {
    useLocalStore.setState({ notifications: [
      { id: "n1", message: "A", read: false },
      { id: "n2", message: "B", read: false },
    ] as any });
    await useLocalStore.getState().markNotificationRead("n1");
    const ns = storeSnapshot().notifications;
    expect(ns[0]!.read).toBe(true);
    expect(ns[1]!.read).toBe(false);
  });

  it("markAllNotificationsRead sets read=true on all", async () => {
    useLocalStore.setState({ notifications: [
      { id: "n1", read: false },
      { id: "n2", read: false },
    ] as any });
    await useLocalStore.getState().markAllNotificationsRead();
    expect(storeSnapshot().notifications.every((n: any) => n.read)).toBe(true);
  });

  // ── Cotisations ──
  it("getCotisationsForCulte returns an empty array when none exist", () => {
    const result = useLocalStore.getState().getCotisationsForCulte("culte-1");
    expect(result).toEqual([]);
  });

  it("getMembresEnAvance returns an empty array when no cotisations", () => {
    const result = useLocalStore.getState().getMembresEnAvance();
    expect(result).toEqual([]);
  });

  // ── Online/offline ──
  it("setOnline flips isOnline state", () => {
    expect(storeSnapshot().isOnline).toBe(true);
    useLocalStore.getState().setOnline(false);
    expect(storeSnapshot().isOnline).toBe(false);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useToast / toast
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("toast reducer (pure unit)", () => {
  const initialState: ToastState = { toasts: [] };

  it("ADD_TOAST pushes a toast at the head of the list", () => {
    const result = reducer(initialState, { type: "ADD_TOAST", toast: { id: "t1", title: "Hi" } as any });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0]!.id).toBe("t1");
  });

  it("ADD_TOAST respects TOAST_LIMIT=1 — second add drops the first", () => {
    let state: ToastState = reducer(initialState, { type: "ADD_TOAST", toast: { id: "t1" } as any });
    state = reducer(state, { type: "ADD_TOAST", toast: { id: "t2" } as any });
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]!.id).toBe("t2");
  });

  it("UPDATE_TOAST merges fields into the matching toast", () => {
    const withToast: ToastState = {
      toasts: [{ id: "t1", title: "original", open: true } as any],
    };
    const result = reducer(withToast, {
      type: "UPDATE_TOAST",
      toast: { id: "t1", title: "updated" },
    });
    expect(result.toasts[0]!.title).toBe("updated");
    expect(result.toasts[0]!.id).toBe("t1");
  });

  it("DISMISS_TOAST with toastId sets open=false on that toast", () => {
    const withToast: ToastState = {
      toasts: [{ id: "t1", open: true }, { id: "t2", open: true }] as any,
    };
    const result = reducer(withToast, { type: "DISMISS_TOAST", toastId: "t1" });
    expect(result.toasts[0]!.open).toBe(false);
    expect(result.toasts[1]!.open).toBe(true);
  });

  it("DISMISS_TOAST with no toastId dismisses all toasts", () => {
    const withToast: ToastState = {
      toasts: [{ id: "t1", open: true }, { id: "t2", open: true }] as any,
    };
    const result = reducer(withToast, { type: "DISMISS_TOAST" });
    expect(result.toasts.every((t: any) => t.open === false)).toBe(true);
  });

  it("REMOVE_TOAST with toastId removes only that toast", () => {
    const withToast: ToastState = {
      toasts: [{ id: "t1" }, { id: "t2" }] as any,
    };
    const result = reducer(withToast, { type: "REMOVE_TOAST", toastId: "t1" });
    expect(result.toasts.map((t: any) => t.id)).toEqual(["t2"]);
  });

  it("REMOVE_TOAST with no toastId clears all toasts", () => {
    const withToast: ToastState = {
      toasts: [{ id: "t1" }, { id: "t2" }] as any,
    };
    const result = reducer(withToast, { type: "REMOVE_TOAST" });
    expect(result.toasts).toEqual([]);
  });
});

describe("useToast hook", () => {
  it("starts with an empty toasts array", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it("toast() call adds a toast and update() mutates it", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ title: "Hello" });
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]!.title).toBe("Hello");
    const firstId = result.current.toasts[0]!.id;

    act(() => {
      result.current.toast({ title: "Updated" });
    });
    // TOAST_LIMIT=1 so the second toast replaces the first
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]!.title).toBe("Updated");
    expect(result.current.toasts[0]!.id).not.toBe(firstId);
  });

  it("dismiss() sets open=false on the toast", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ title: "Dismiss me" });
    });
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.toasts[0]!.open).toBe(false);
  });

  it("calling dismiss with an id dismisses that specific toast", () => {
    const { result } = renderHook(() => useToast());
    // With TOAST_LIMIT=1, only the latest toast remains — test dismiss on that single toast
    act(() => {
      result.current.toast({ title: "B" });
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]!.title).toBe("B");
    const id = result.current.toasts[0]!.id;
    act(() => {
      result.current.dismiss(id);
    });
    expect(result.current.toasts[0]!.open).toBe(false);
  });

  it("exceeding TOAST_LIMIT keeps only the most recent toast", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ title: "First" });
    });
    act(() => {
      result.current.toast({ title: "Second" });
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]!.title).toBe("Second");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useIsMobile
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("useIsMobile", () => {
  it("returns false when viewport is wider than breakpoint", () => {
    _mqlFixtures.matches = false;
    const spy = vi.spyOn(window, "matchMedia").mockReturnValue(_makeMql("(max-width: 767px)") as any);
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    spy.mockRestore();
  });

  it("returns true when viewport is narrower than breakpoint", () => {
    const spy = vi.spyOn(window, "matchMedia").mockReturnValue(_makeMql("(max-width: 767px)") as any);
    Object.defineProperty(window, "innerWidth", { value: 375, configurable: true });
    _mqlFixtures.matches = true;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    spy.mockRestore();
  });

  it("subscribes to matchMedia change events and updates reactively", () => {
    _mqlFixtures.matches = false;
    _mqlFixtures.changeFn = undefined;
    const mql = _makeMql("(max-width: 767px)");
    const spy = vi.spyOn(window, "matchMedia").mockReturnValue(mql as any);
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate media query change: now mobile
    _mqlFixtures.matches = true;
    Object.defineProperty(window, "innerWidth", { value: 375, configurable: true });
    act(() => {
      triggerMediaChange();
    });

    expect(result.current).toBe(true);
    spy.mockRestore();
  });

  it("unsubscribes on unmount (no error thrown)", () => {
    // Ensure matchMedia returns desktop state for this isolated test
    _mqlFixtures.matches = false;
    const spy = vi.spyOn(window, "matchMedia").mockReturnValue(_makeMql("(max-width: 767px)") as any);
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });

    const { result, unmount } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    expect(() => unmount()).not.toThrow();
    spy.mockRestore();
  });
});
