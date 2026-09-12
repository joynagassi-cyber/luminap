/**
 * Tests for src/lib/account.ts (getAccountBalance) and
 * src/lib/transaction-service.ts (add / approve / reverse / batch-delete logic).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── In-memory PowerSync mock ──────────────────────────────────────────────
// Shared state must be hoisted: vi.mock factories run before module-level
// initializers, so a plain const would not be in scope there.
const psState = vi.hoisted(() => ({ rows: [] as any[] }));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: vi.fn(() => ({
    execute: vi.fn(async (sql: string, params: any[]) => {
      psState.rows.push({ sql, params });
      if (params?.[2] === "APPROVED") {
        return {
          array: [
            { type: "INCOME", amount: 100 },
            { type: "INCOME", amount: 50 },
            { type: "EXPENSE", amount: 30 },
          ],
        };
      }
      return { array: [] };
    }),
    getOptional: vi.fn(async () => null),
  })),
  getPowerSyncConnector: vi.fn(),
  initPowerSync: vi.fn(async () => {}),
  disconnectPowerSync: vi.fn(async () => {}),
}));

// ─── Data layer mock ────────────────────────────────────────────────────────
vi.mock("@/lib/dataLayer", () => ({
  addTransactionPS: vi.fn(async () => "new-id"),
  updateTransactionPS: vi.fn(async () => {}),
  deleteTransactionPS: vi.fn(async () => {}),
  canAccessOrganization: vi.fn(async () => true),
  useCurrentUser: vi.fn(() => ({
    data: { id: "user-1", role: "ADMIN" },
  })),
}));

// ─── Org context mock ───────────────────────────────────────────────────────
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: vi.fn(() => "test-org"),
  setOrganizationId: vi.fn(),
}));

// ─── Audit mock ─────────────────────────────────────────────────────────────
vi.mock("@/lib/audit", () => ({
  write: vi.fn(async () => {}),
  auditLogRepo: { write: vi.fn(async () => {}), list: vi.fn() },
  writeAudit: vi.fn(async () => {}),
}));

import { getAccountBalance } from "@/lib/account";
import { clear as clearCache } from "@/lib/cache";
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
import type { Transaction } from "@/types";

// A fully-populated transaction fixture
function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  const base: Transaction = {
    id: "tx-1",
    orgId: "test-org",
    type: "INCOME",
    amount: 100,
    description: "Dons",
    date: "2026-09-11",
    status: "PENDING",
    createdAt: "2026-09-11T00:00:00.000Z",
    updatedAt: "2026-09-11T00:00:00.000Z",
    createdById: "user-1",
    approvedById: null,
    approvedAt: null,
    categoryId: "cat-1",
    orgUnitId: null,
    eventId: null,
    source: null,
    personName: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    sourceCaisseId: "caisse-1",
    versementId: null,
    reversalOfId: null,
    ...overrides,
  };
  return base;
}

const txState: { user: { role: string; id: string } } = {
  user: { role: "ADMIN", id: "user-1" },
};

describe("getAccountBalance (account.ts)", () => {
  beforeEach(() => {
    psState.rows = [];
    clearCache();
  });

  it("sums APPROVED INCOME and subtracts APPROVED EXPENSE", async () => {
    const balance = await getAccountBalance("caisse-1");
    // income 100 + 50 = 150, expense 30 → 120
    expect(balance).toBe(120);
    expect(psState.rows.length).toBe(1);
  });

  it("ignores PENDING transactions (query filters on APPROVED only)", async () => {
    const balance = await getAccountBalance("caisse-1");
    expect(balance).toBe(120);
    // The SQL call is the only data source — PENDING rows are excluded by the query
    expect(psState.rows[0].params).toEqual([
      "caisse-1",
      "test-org",
      "APPROVED",
    ]);
  });

  it("caches the result — 2nd call does not re-execute PS", async () => {
    await getAccountBalance("caisse-1");
    expect(psState.rows.length).toBe(1);
    psState.rows = [];
    const second = await getAccountBalance("caisse-1");
    // No new PS call on the 2nd invocation, same value returned
    expect(second).toBe(120);
    expect(psState.rows.length).toBe(0);
  });

  it("re-computes for a different account (different cache key)", async () => {
    await getAccountBalance("caisse-1");
    psState.rows = [];
    await getAccountBalance("caisse-2");
    expect(psState.rows.length).toBe(1);
    expect(psState.rows[0].params[0]).toBe("caisse-2");
  });
});

describe("buildAddTransaction", () => {
  it("generates a unique id, sets version=1, reversalOfId=null, timestamps", () => {
    const tx = makeTx({ id: "", createdAt: "", updatedAt: "", version: 0, reversalOfId: "x" as any });
    const input = {
      orgId: tx.orgId,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      date: tx.date,
      status: tx.status,
      categoryId: tx.categoryId,
      orgUnitId: tx.orgUnitId,
      eventId: tx.eventId,
      source: tx.source,
      personName: tx.personName,
      compensatesFor: tx.compensatesFor,
      comment: tx.comment,
      createdById: tx.createdById,
      approvedById: tx.approvedById,
      approvedAt: tx.approvedAt,
      sourceCaisseId: tx.sourceCaisseId,
      versementId: tx.versementId,
    } as any;

    const { id, newTx } = buildAddTransaction(input, {
      transactions: [],
      user: txState.user,
    });

    expect(id).toBeTruthy();
    expect(id.length).toBeGreaterThan(0);
    expect(newTx.id).toBe(id);
    expect(newTx.version).toBe(1);
    expect(newTx.reversalOfId).toBeNull();
    expect(newTx.createdAt).toBeTruthy();
    expect(newTx.updatedAt).toBeTruthy();
    expect(newTx.createdAt).toBe(newTx.updatedAt);
    // timestamps are valid ISO strings
    expect(new Date(newTx.createdAt).toISOString()).toBe(newTx.createdAt);
  });

  it("produces a different id on each call", () => {
    const input = makeTx() as any;
    const a = buildAddTransaction(input, { transactions: [], user: txState.user });
    const b = buildAddTransaction(input, { transactions: [], user: txState.user });
    expect(a.id).not.toBe(b.id);
  });
});

describe("persistAddTransaction", () => {
  it("calls addTransactionPS with the mapped fields", async () => {
    const tx = makeTx();
    await persistAddTransaction(tx);
    const { addTransactionPS } = await import("@/lib/dataLayer");
    expect(addTransactionPS).toHaveBeenCalled();
    const call = vi.mocked(addTransactionPS).mock.calls[0]![0];
    expect(call.org_id).toBe("test-org");
    expect(call.reversal_of_id).toBeNull();
    expect(call.type).toBe("INCOME");
  });

  it("swallows persist errors (non-fatal offline queue retry)", async () => {
    const { addTransactionPS } = await import("@/lib/dataLayer");
    vi.mocked(addTransactionPS).mockRejectedValueOnce(new Error("offline"));
    await expect(persistAddTransaction(makeTx())).resolves.toBeUndefined();
  });
});

describe("auditAddTransaction", () => {
  it("writes an audit entry with action CREATE", async () => {
    const tx = makeTx();
    const input = {
      orgId: tx.orgId,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      date: tx.date,
      status: tx.status,
      categoryId: tx.categoryId,
      orgUnitId: tx.orgUnitId,
      eventId: tx.eventId,
      source: tx.source,
      personName: tx.personName,
      compensatesFor: tx.compensatesFor,
      comment: tx.comment,
      createdById: tx.createdById,
      approvedById: tx.approvedById,
      approvedAt: tx.approvedAt,
      sourceCaisseId: tx.sourceCaisseId,
      versementId: tx.versementId,
    } as any;

    await auditAddTransaction("tx-1", input, tx, "ADMIN");

    const { writeAudit } = await import("@/lib/audit");
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "test-org",
        transactionId: "tx-1",
        action: "CREATE",
        entityType: "Transaction",
        entityId: "tx-1",
        afterState: expect.objectContaining({ id: "tx-1" }),
      }),
    );
  });
});

describe("validateUpdateTransaction", () => {
  it("blocks updates to APPROVED transactions with TRANSACTION_APPROVED_IMMUTABLE", () => {
    const transactions = [makeTx({ status: "APPROVED" })];
    const result = validateUpdateTransaction(
      transactions,
      "tx-1",
      { status: "PENDING" } as any,
    );
    expect(result).toEqual({
      allowed: false,
      reason: "TRANSACTION_APPROVED_IMMUTABLE",
    });
  });

  it("allows PENDING → APPROVED (approve flow)", () => {
    const transactions = [makeTx({ status: "PENDING" })];
    const result = validateUpdateTransaction(
      transactions,
      "tx-1",
      { status: "APPROVED" } as any,
    );
    expect(result.allowed).toBe(true);
  });

  it("allows updates on PENDING/DRAFT/REJECTED transactions", () => {
    const transactions = [makeTx({ status: "PENDING" })];
    const result = validateUpdateTransaction(
      transactions,
      "tx-1",
      { description: "changed" },
    );
    expect(result.allowed).toBe(true);
  });

  it("returns allow when the transaction does not exist (no status → guard fallthrough)", () => {
    const transactions: Transaction[] = [];
    const result = validateUpdateTransaction(transactions, "missing", {});
    // transactionGuard(undefined as any, undefined as any) → neither APPROVED → allowed
    expect(result.allowed).toBe(true);
  });
});

describe("applyUpdateTransaction", () => {
  it("merges the data and bumps version + updatedAt for the matching id", () => {
    const transactions = [makeTx({ status: "PENDING" })];
    const result = applyUpdateTransaction(
      transactions,
      "tx-1",
      { description: "updated", version: 1 },
    );
    const updated = result.find((t) => t.id === "tx-1")!;
    expect(updated.description).toBe("updated");
    expect(updated.version).toBe(2);
    expect(updated.updatedAt).toBeTruthy();
    // other transactions are untouched
    expect(result.length).toBe(1);
  });

  it("leaves other transactions unchanged", () => {
    const transactions = [makeTx({ status: "PENDING" }), makeTx({ id: "tx-2", status: "PENDING" })];
    const result = applyUpdateTransaction(transactions, "tx-1", { description: "x" });
    const other = result.find((t) => t.id === "tx-2")!;
    expect(other.description).toBe("Dons");
    expect(other.version).toBe(1);
  });
});

describe("validateDeleteTransaction", () => {
  it("blocks deletion of APPROVED transactions", () => {
    const transactions = [makeTx({ status: "APPROVED" })];
    const result = validateDeleteTransaction(transactions, "tx-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("TRANSACTION_APPROVED_IMMUTABLE");
  });

  it("allows deletion of PENDING transactions", () => {
    const transactions = [makeTx({ status: "PENDING" })];
    const result = validateDeleteTransaction(transactions, "tx-1");
    expect(result.allowed).toBe(true);
  });
});

describe("applyDeleteTransaction", () => {
  it("removes the transaction with the given id", () => {
    const transactions = [makeTx(), makeTx({ id: "tx-2" })];
    const result = applyDeleteTransaction(transactions, "tx-1");
    expect(result.map((t) => t.id)).toEqual(["tx-2"]);
  });
});

describe("validateBatchDeleteTransactions", () => {
  it("returns the list of blocked APPROVED ids", () => {
    const transactions = [
      makeTx({ id: "tx-1", status: "APPROVED" }),
      makeTx({ id: "tx-2", status: "PENDING" }),
      makeTx({ id: "tx-3", status: "APPROVED" }),
    ];
    const blocked = validateBatchDeleteTransactions(transactions, [
      "tx-1",
      "tx-2",
      "tx-3",
      "tx-missing",
    ]);
    expect(blocked.sort()).toEqual(["tx-1", "tx-3"]);
  });

  it("returns an empty list when no APPROVED transactions are in the batch", () => {
    const transactions = [
      makeTx({ id: "tx-1", status: "PENDING" }),
      makeTx({ id: "tx-2", status: "DRAFT" }),
    ];
    const blocked = validateBatchDeleteTransactions(transactions, [
      "tx-1",
      "tx-2",
    ]);
    expect(blocked).toEqual([]);
  });
});

describe("buildApproveTransaction", () => {
  it("sets status to APPROVED, sets approvedById/At and bumps version", () => {
    const transactions = [makeTx({ status: "PENDING", version: 1 })];
    const now = "2026-09-11T12:00:00.000Z";
    const result = buildApproveTransaction(transactions, "tx-1", "user-2", now);
    const approved = result.find((t) => t.id === "tx-1")!;
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedById).toBe("user-2");
    expect(approved.approvedAt).toBe(now);
    expect(approved.updatedAt).toBe(now);
    expect(approved.version).toBe(2);
  });

  it("leaves other transactions untouched", () => {
    const transactions = [
      makeTx({ id: "tx-1", status: "PENDING" }),
      makeTx({ id: "tx-2", status: "PENDING" }),
    ];
    const result = buildApproveTransaction(transactions, "tx-1", "user-2", "now");
    expect(result.find((t) => t.id === "tx-2")!.status).toBe("PENDING");
    expect(result.find((t) => t.id === "tx-2")!.approvedById).toBeNull();
  });
});

describe("buildBatchApproveTransactions", () => {
  it("approves all transactions in the given id list", () => {
    const transactions = [
      makeTx({ id: "tx-1", status: "PENDING" }),
      makeTx({ id: "tx-2", status: "PENDING" }),
      makeTx({ id: "tx-3", status: "PENDING" }),
    ];
    const result = buildBatchApproveTransactions(
      transactions,
      ["tx-1", "tx-3"],
      "user-1",
      "now",
    );
    expect(result.find((t) => t.id === "tx-1")!.status).toBe("APPROVED");
    expect(result.find((t) => t.id === "tx-2")!.status).toBe("PENDING");
    expect(result.find((t) => t.id === "tx-3")!.status).toBe("APPROVED");
    expect(result.find((t) => t.id === "tx-3")!.approvedById).toBe("user-1");
    expect(result.find((t) => t.id === "tx-3")!.version).toBe(2);
  });
});

describe("buildReverseTransaction", () => {
  it("returns null when the transaction is not APPROVED", () => {
    const transactions = [makeTx({ status: "PENDING" })];
    const result = buildReverseTransaction(
      transactions,
      "tx-1",
      "user-1",
      "erreur de saisie",
    );
    expect(result).toBeNull();
  });

  it("returns null when the transaction does not exist", () => {
    const result = buildReverseTransaction([], "missing", "user-1", "raison");
    expect(result).toBeNull();
  });

  it("inverts INCOME → EXPENSE, sets reversalOfId, version=1 and comment", () => {
    const transactions = [
      makeTx({
        id: "tx-1",
        type: "INCOME",
        amount: 500,
        status: "APPROVED",
        version: 3,
      }),
    ];
    const result = buildReverseTransaction(
      transactions,
      "tx-1",
      "user-9",
      "montant incorrect",
    )!;
    const rev = result.reversalTx;
    expect(rev.type).toBe("EXPENSE");
    expect(rev.amount).toBe(500);
    expect(rev.reversalOfId).toBe("tx-1");
    expect(rev.status).toBe("APPROVED");
    expect(rev.approvedById).toBe("user-9");
    expect(rev.version).toBe(1);
    expect(rev.comment).toBe("Contre-transaction: montant incorrect");
    expect(rev.id).not.toBe("tx-1");
    expect(rev.createdAt).toBe(rev.updatedAt);
  });

  it("inverts EXPENSE → INCOME", () => {
    const transactions = [
      makeTx({ id: "tx-1", type: "EXPENSE", status: "APPROVED" }),
    ];
    const result = buildReverseTransaction(transactions, "tx-1", "u", "r")!;
    expect(result.reversalTx.type).toBe("INCOME");
  });
});

describe("persistReverseTransaction", () => {
  it("calls addTransactionPS with the mapped reversal fields", async () => {
    const transactions = [
      makeTx({ id: "tx-1", type: "INCOME", status: "APPROVED" }),
    ];
    const result = buildReverseTransaction(
      transactions,
      "tx-1",
      "user-1",
      "raison",
    )!;
    await persistReverseTransaction(result.reversalTx);

    const { addTransactionPS } = await import("@/lib/dataLayer");
    expect(addTransactionPS).toHaveBeenCalled();
    const call = vi.mocked(addTransactionPS).mock.calls[0]![0];
    expect(call.reversal_of_id).toBe("tx-1");
    expect(call.org_id).toBe("test-org");
  });

  it("swallows persist errors (non-fatal)", async () => {
    const { addTransactionPS } = await import("@/lib/dataLayer");
    vi.mocked(addTransactionPS).mockRejectedValueOnce(new Error("offline"));
    const tx = makeTx({ id: "rev-1", type: "EXPENSE" });
    await expect(persistReverseTransaction(tx)).resolves.toBeUndefined();
  });
});
