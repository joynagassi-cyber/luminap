/**
 * PR8 — Approbation en deux étapes (maker-checker) : tests COMPORTEMENTAUX du
 * chemin d'écriture RÉEL.
 *
 * On ne mocke PAS `@/lib/dataLayer` : `approveTransactionPS` est exécuté pour
 * de vrai contre un moteur PowerSync en mémoire (mêmes conventions que
 * `src/capabilities/__tests__/e2e-transaction.test.ts`). On vérifie que :
 *   1. maker-checker ACTIF + acteur = auteur → refus TYPÉ et AUCUNE écriture ;
 *   2. maker-checker ACTIF + autre acteur → écriture effectuée (statut APPROVED) ;
 *   3. maker-checker INACTIF → l'auteur peut approuver (comportement historique) ;
 *   4. le lot (`buildBatchApproveTransactions`) refuse si une transaction visée
 *      a été créée par l'acteur.
 *
 * NON-VACUITÉ (preuve) : en retirant la garde `if (enabled) { … assertApprovable }`
 * de `approveTransactionPS` (ou en la forçant à `false`), le test (1) ÉCHOUE
 * car le statut passe à APPROVED ; le restaurer le fait repasser. Idem pour (4)
 * en retirant la boucle de `buildBatchApproveTransactions`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Org context ──────────────────────────────────────────────────────────
const _orgCtx = vi.hoisted(() => ({ value: "mc-org-1" as string }));
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => _orgCtx.value,
  setOrganizationId: (id: string) => {
    _orgCtx.value = id;
  },
}));

// ─── Réglage d'organisation en mémoire ──────────────────────────────────────
const orgSettings = vi.hoisted(() => ({ makerChecker: false }));
vi.mock("@/lib/makerCheckerSettings", () => ({
  isMakerCheckerEnabled: vi.fn(async () => orgSettings.makerChecker),
}));

// ─── Kill-switch (fail-open) ────────────────────────────────────────────────
vi.mock("@/lib/featureFlags", () => ({
  isFeatureEnabled: () => true,
  parseFlags: () => ({}),
  setLocalFlag: vi.fn(),
  localFlags: () => ({}),
  getAllLocalFlags: () => ({}),
  FLAGS_STORAGE_KEY: "lumina-feature-flags",
}));

// ─── PowerSync en mémoire (moteur SQL minimal) ──────────────────────────────
const _psRows: Record<string, any[]> = {};

function qres(arr: any[]): any {
  const r = arr.slice() as any;
  r.array = arr;
  r.rows = arr;
  r.result = arr;
  return r;
}

function psExecute(sql: string, params: any[] = []): any {
  const tableMatch = sql.match(/FROM\s+(\w+)/i);
  const table = tableMatch ? tableMatch[1] : "unknown";
  const rows = _psRows[table] ?? [];

  // SELECT <cols> FROM <table> WHERE id = ? (utilisé par la garde maker-checker).
  const selectIdMatch = sql.match(/^SELECT .+ FROM (\w+) WHERE id = \?$/i);
  if (selectIdMatch) {
    const t = selectIdMatch[1];
    const found = (_psRows[t] ?? []).find((r: any) => r.id === params[0]);
    return qres(found ? [found] : []);
  }

  if (sql.startsWith("SELECT")) return qres(rows);

  const updateMatch = sql.match(/UPDATE (\w+)/i);
  if (updateMatch) {
    const t = updateMatch[1];
    if (_psRows[t]) {
      const idVal = params[params.length - 1];
      const idx = _psRows[t].findIndex((r: any) => r.id === idVal);
      if (idx !== -1) {
        const setMatch = sql.match(/SET (.+) WHERE/);
        if (setMatch) {
          let setExpr = setMatch[1];
          let pi = 0;
          while (setExpr.includes("?")) {
            const i = setExpr.indexOf("?");
            const eqBefore =
              i > 0 && setExpr[i - 1] === "=" && setExpr[i - 2] === " ";
            const col = eqBefore
              ? setExpr.substring(0, i - 1).trim()
              : setExpr.substring(0, i).trim();
            setExpr =
              col +
              " " +
              (pi < params.length ? String(params[pi++]) : "NULL") +
              setExpr.slice(i + 1);
          }
          setExpr.split(",").forEach((clause: string) => {
            const eqIdx = clause.indexOf("=");
            const col =
              eqIdx > 0 ? clause.substring(0, eqIdx).trim() : clause.split(/\s+/)[0];
            if (!col || col === "id") return;
            let val = clause.substring(eqIdx + 1).trim();
            // Les littéraux SQL (`status = 'APPROVED'`) arrivent entre quotes.
            val = val.replace(/^'(.*)'$/, "$1");
            _psRows[t][idx][col] = val;
          });
        }
      }
    }
    return qres([]);
  }
  return qres([]);
}

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({ execute: psExecute }),
  getPowerSyncConnector: vi.fn(),
  initPowerSync: vi.fn(async () => {}),
  disconnectPowerSync: vi.fn(async () => {}),
}));

// ─── Imports après les mocks ────────────────────────────────────────────────
import {
  approveTransactionPS,
  buildApproveTransaction,
  buildBatchApproveTransactions,
} from "@/lib/dataLayer";
import { getPowerSyncDatabase } from "@/lib/powersync";
import {
  MakerCheckerError,
  MAKER_CHECKER_SELF_APPROVAL,
} from "@/lib/makerChecker";
import type { Transaction } from "@/types";

function seed(id: string, createdById: string, status = "PENDING") {
  _psRows.transactions = _psRows.transactions ?? [];
  _psRows.transactions.push({
    id,
    org_id: _orgCtx.value,
    status,
    created_by_id: createdById,
    approved_by_id: null,
  });
}

function statusOf(id: string): string | undefined {
  return (_psRows.transactions ?? []).find((r) => r.id === id)?.status;
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    orgId: _orgCtx.value,
    type: "EXPENSE",
    amount: 100,
    description: "Dépense",
    date: "2026-10-31",
    status: "PENDING",
    createdAt: "2026-10-31T00:00:00.000Z",
    updatedAt: "2026-10-31T00:00:00.000Z",
    createdById: "creator-1",
    approvedById: null,
    approvedAt: null,
    categoryId: null,
    orgUnitId: null,
    eventId: null,
    source: null,
    personName: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    sourceCaisseId: null,
    versementId: null,
    reversalOfId: null,
    ...overrides,
  } as Transaction;
}

beforeEach(() => {
  _psRows.transactions = [];
  orgSettings.makerChecker = false;
});

describe("approveTransactionPS — maker-checker ACTIVÉ", () => {
  it("refuse l'auto-approbation (code typé) et N'ÉCRIT PAS", async () => {
    orgSettings.makerChecker = true;
    seed("tx-self", "creator-1");

    await expect(approveTransactionPS("tx-self", "creator-1")).rejects.toThrow(
      MakerCheckerError,
    );
    try {
      await approveTransactionPS("tx-self", "creator-1");
    } catch (err) {
      expect((err as MakerCheckerError).code).toBe(MAKER_CHECKER_SELF_APPROVAL);
    }
    // La transaction reste PENDING : aucune écriture n'a eu lieu.
    expect(statusOf("tx-self")).toBe("PENDING");
  });

  it("autorise un AUTRE acteur : la transaction passe APPROVED", async () => {
    orgSettings.makerChecker = true;
    seed("tx-other", "creator-1");

    await approveTransactionPS("tx-other", "approver-2");
    expect(statusOf("tx-other")).toBe("APPROVED");

    const rows = await getPowerSyncDatabase().execute(
      "SELECT * FROM transactions WHERE id = ?",
      ["tx-other"],
    );
    expect((rows as any)[0].approved_by_id).toBe("approver-2");
  });
});

describe("approveTransactionPS — maker-checker DÉSACTIVÉ (historique)", () => {
  it("l'auteur peut approuver sa propre transaction", async () => {
    orgSettings.makerChecker = false;
    seed("tx-legacy", "creator-1");

    await approveTransactionPS("tx-legacy", "creator-1");
    expect(statusOf("tx-legacy")).toBe("APPROVED");
  });
});

describe("buildApproveTransaction / buildBatchApproveTransactions", () => {
  it("buildApproveTransaction refuse l'auto-approbation quand activé", () => {
    const txs = [makeTx({ id: "t1", createdById: "creator-1" })];
    expect(() =>
      buildApproveTransaction(txs, "t1", "creator-1", "now", { enabled: true }),
    ).toThrow(MakerCheckerError);
  });

  it("buildApproveTransaction approuve un autre acteur quand activé", () => {
    const txs = [makeTx({ id: "t1", createdById: "creator-1" })];
    const out = buildApproveTransaction(txs, "t1", "other-2", "now", {
      enabled: true,
    });
    expect(out[0].status).toBe("APPROVED");
    expect(out[0].approvedById).toBe("other-2");
  });

  it("buildApproveTransaction conserve le comportement historique quand désactivé", () => {
    const txs = [makeTx({ id: "t1", createdById: "creator-1" })];
    const out = buildApproveTransaction(txs, "t1", "creator-1", "now", {
      enabled: false,
    });
    expect(out[0].status).toBe("APPROVED");
  });

  it("le LOT est refusé en entier si UNE transaction est de l'auteur", () => {
    const txs = [
      makeTx({ id: "t1", createdById: "other-2" }),
      makeTx({ id: "t2", createdById: "creator-1" }),
    ];
    expect(() =>
      buildBatchApproveTransactions(txs, ["t1", "t2"], "creator-1", "now", {
        enabled: true,
      }),
    ).toThrow(MakerCheckerError);
  });

  it("le LOT passe si aucune transaction n'est de l'auteur", () => {
    const txs = [
      makeTx({ id: "t1", createdById: "other-2" }),
      makeTx({ id: "t2", createdById: "other-3" }),
    ];
    const out = buildBatchApproveTransactions(txs, ["t1", "t2"], "creator-1", "now", {
      enabled: true,
    });
    expect(out.every((t) => t.status === "APPROVED")).toBe(true);
  });
});
