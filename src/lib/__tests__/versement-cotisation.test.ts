/**
 * Tests for versement-service (createVersement),
 * cotisation-service (createCulte / markCotisationPaid / persist helpers) and
 * cotisation-logic (isCulteVerrouille, determinerStatutAvance, calculerDon,
 * calculerStatsCulte, getMembresEnAvance).
 *
 * Mocks:
 *  - @/lib/powersync  : in-memory execute() that records every SQL call
 *  - @/lib/dataLayer  : stubbed addTransactionPS / addEventPS / addCotisationPS /
 *                       updateCotisationPS / updateMemberPS /
 *                       canAccessOrganization / useOrganizations; executeWrite
 *                       is intercepted so SQL still lands in the in-memory store
 *  - @/lib/orgContext : fixed org id
 *  - global.localStorage : in-memory shim for node env
 * No source files are modified.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── In-memory localStorage shim (node env has no localStorage) ─────────
if (typeof globalThis.localStorage === "undefined") {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();
    get length() { return this.store.size; }
    clear() { this.store.clear(); }
    getItem(key: string) { return this.store.get(key) ?? null; }
    key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
    removeItem(key: string) { this.store.delete(key); }
    setItem(key: string, value: string) { this.store.set(key, String(value)); }
  }
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
}

// ─── In-memory PowerSync store (hoisted so vi.mock factories can use it) ───
const psStore = vi.hoisted(() => {
  const calls: { sql: string; params: any[] }[] = [];
  const db: Record<string, any> = {};
  let fail: string | null = null;
  function executeMock(sql: string, params: any[] = []) {
    if (fail) {
      const msg = fail;
      fail = null;
      return Promise.reject(new Error(msg));
    }
    calls.push({ sql, params });
    const s = sql.trim();
    const ins = s.match(/^INSERT INTO (\w+)\s*\(([^)]+)\)/i);
    if (ins) {
      const table = ins[1];
      db[table] = db[table] || [];
      const cols = ins[2].split(",").map((c) => c.trim());
      const row: Record<string, any> = {};
      cols.forEach((col, i) => (row[col] = params[i]));
      db[table].push(row);
      return { rowsAffected: 1 };
    }
    const up = s.match(/^UPDATE (\w+) SET (.+?) WHERE (.+)$/is);
    if (up) {
      const table = up[1];
      const rows = db[table] || [];
      const setParts = up[2]
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const wheres = up[3]
        .split(" AND ")
        .map((w) => w.trim())
        .filter(Boolean);
      let pi = 0;
      for (const row of rows) {
        const match = wheres.every((w) => {
          const wm = w.match(/^(\w+)\s*=\s*\?$/);
          if (!wm) return true;
          const val = params[pi++];
          return row[wm[1]] === val || (wm[1] === "id" && row.id === val);
        });
        if (!match) continue;
        for (const part of setParts) {
          const sm = part.match(/^(\w+)\s*=\s*\?$/);
          if (sm) row[sm[1]] = params[pi++];
        }
      }
      return { rowsAffected: rows.length };
    }
    const del = s.match(/^DELETE FROM (\w+)/i);
    if (del) return { rowsAffected: 0 };
    // SELECT
    if (/^\s*SELECT/i.test(s)) return { array: [] };
    return { rowsAffected: 0 };
  }
  return {
    calls,
    db,
    execute: executeMock,
    failNext(message: string) { fail = message; },
    reset() {
      this.calls.length = 0;
      for (const key of Object.keys(this.db)) delete this.db[key];
      fail = null;
    },
  };
});

function insertedRows(table: string): any[] {
  return (psStore.db as Record<string, any>)[table] ?? [];
}

function callsMatching(re: RegExp): { sql: string; params: any[] }[] {
  return psStore.calls.filter((c) => re.test(c.sql));
}

function lastCallContaining(needle: string) {
  const matching = callsMatching(new RegExp(needle, "i"));
  return matching.length ? matching[matching.length - 1] : undefined;
}

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({
    execute: psStore.execute,
    getOptional: vi.fn(async () => null),
    readTransaction: vi.fn(),
  }),
}));

// The REAL dataLayer.executeWrite / updateCotisationPS / updateMemberPS call
// usePowerSync() (a React context hook). Since the service files import
// dataLayer via relative "./dataLayer" (which Vitest keys separately from the
// "@/lib/dataLayer" alias), we intercept at the source: mock @powersync/react's
// usePowerSync to return our in-memory DB. This makes the real executeWrite
// route SQL through psStore.execute without touching React context.
vi.mock("@powersync/react", () => ({
  usePowerSync: () => ({
    execute: psStore.execute,
    getOptional: vi.fn(async () => null),
  }),
  useQuery: vi.fn(() => ({ rows: [] })),
  PowerSyncProvider: vi.fn(({ children }: any) => children),
}));

// ─── dataLayer: the service files import dataLayer via RELATIVE
//     "./dataLayer" (which Vitest keys separately from the "@/lib/dataLayer"
//     alias), so a vi.mock("@/lib/dataLayer") factory does NOT reach them.
//     Instead we intercept at the source: the @powersync/react mock above
//     returns our in-memory DB from usePowerSync(), which the REAL
//     dataLayer.executeWrite / updateCotisationPS / updateMemberPS consume.
//     So the real PS writers run and their SQL lands in psStore.
//
//     The add*PS / canAccessOrganization / useOrganizations helpers that
//     cotisation-service / versement-service call are NOT touched by the
//     @powersync/react mock, so we provide lightweight vi.fn stubs only if
//     a test exercises them directly. In this suite they are never called
//     (services only use executeWrite + updateCotisationPS + updateMemberPS),
//     so we keep the dl stub for `beforeEach` bookkeeping.
const dl = vi.hoisted(() => ({
  addTransactionPS: vi.fn(async () => "tx-new-id"),
  addEventPS: vi.fn(async () => "ev-new-id"),
  addCotisationPS: vi.fn(async () => "cot-new-id"),
  canAccessOrganization: vi.fn(async () => true),
  useOrganizations: vi.fn(() => ({
    data: [] as unknown[],
    isLoading: false,
    source: "powersync",
  })),
}));

// ─── orgContext: fixed org id ────────────────────────────────────────────
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "test-org",
  setOrganizationId: vi.fn(),
}));

import { createVersement } from "@/lib/versement-service";
import {
  createCulte,
  persistCulte,
  markCotisationPaid,
  persistMarkCotisationPaid,
  markCotisationsAbsent,
  persistMarkCotisationsAbsent,
  updateCotisation,
  persistUpdateCotisation,
  getCotisationsForCulte,
  getMembreHistorique,
  getMembresEnAvance,
  type CotisationState,
} from "@/lib/cotisation-service";
import {
  isCulteVerrouille,
  isPaiementVerrouille,
  calculerNombreRetards,
  calculerMontantDu,
  determinerStatutAvance,
  calculerDon,
  calculerStatsCulte,
  aSuffisantAvance,
  JOURS_VERROUILLAGE_CULTE,
  COTISATION_STATUT_LABELS,
  COTISATION_STATUT_COLORS,
} from "@/lib/cotisation-logic";
import type { Cotisation, Event, Member } from "@/types";

// ─── Fixtures ───────────────────────────────────────────────────────────

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: "mem-1",
    orgId: "test-org",
    firstName: "Awa",
    lastName: "Diallo",
    phone: null,
    email: null,
    status: "ACTIVE",
    joinedAt: isoDaysAgo(400),
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    totalDons: 0,
    montantEnAvance: 0,
    createdAt: isoDaysAgo(400),
    updatedAt: isoDaysAgo(400),
    ...overrides,
  };
}

function makeCulteEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "ev-culte-1",
    orgId: "test-org",
    name: "Culte du dimanche",
    description: "",
    startDate: isoDaysAgo(10),
    endDate: null,
    status: "PLANIFIED",
    type: "CULTE",
    budget: 0,
    budgetItems: [],
    shoppingItems: [],
    createdAt: isoDaysAgo(10),
    updatedAt: isoDaysAgo(10),
    ...overrides,
  };
}

function makeCotisation(overrides: Partial<Cotisation> = {}): Cotisation {
  return {
    id: "cot-1",
    culteId: "ev-culte-1",
    membreId: "mem-1",
    statut: "NON_PAYE",
    montantObligatoire: 5000,
    montantPaye: 0,
    datePaiement: null,
    notes: null,
    createdAt: isoDaysAgo(10),
    updatedAt: isoDaysAgo(10),
    ...overrides,
  };
}

function makeState(overrides: Partial<CotisationState> = {}): CotisationState {
  return {
    cotisations: [makeCotisation()],
    events: [makeCulteEvent()],
    members: [makeMember()],
    transactions: [],
    ...overrides,
  };
}

beforeEach(() => {
  psStore.reset();
  localStorage.removeItem("lumina-session");
  dl.addTransactionPS.mockClear();
  dl.addEventPS.mockClear();
  dl.addCotisationPS.mockClear();
  dl.canAccessOrganization.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── createVersement ──────────────────────────────────────────────────────

describe("createVersement", () => {
  it("creates a paired EXPENSE/INCOME tx pair linked by versementId with distinct caisses and default FCFA comment", async () => {
    localStorage.setItem("lumina-session", "session-A");
    const { versementId, sourceTx, targetTx } = await createVersement({
      sourceCaisseId: "caisse-juvenile",
      amount: 25000,
    });

    // Identity of the pair
    expect(versementId).toBeTypeOf("string");
    expect(sourceTx.id).not.toBe(targetTx.id);
    expect(sourceTx.versementId).toBe(versementId);
    expect(targetTx.versementId).toBe(versementId);

    // Direction
    expect(sourceTx.type).toBe("EXPENSE");
    expect(sourceTx.sourceCaisseId).toBe("caisse-juvenile");
    expect(targetTx.type).toBe("INCOME");
    expect(targetTx.sourceCaisseId).toBe("main");
    expect(sourceTx.sourceCaisseId).not.toBe(targetTx.sourceCaisseId);

    // Amounts & misc
    expect(sourceTx.amount).toBe(25000);
    expect(targetTx.amount).toBe(25000);
    expect(sourceTx.status).toBe("APPROVED");
    expect(sourceTx.orgId).toBe("test-org");
    expect(sourceTx.createdById).toBe("session-A");
    expect(targetTx.approvedById).toBe("session-A");

    // Default FCFA comment derived from the amount (amount/100 FCFA)
    expect(sourceTx.comment).toBe("Versement 250 FCFA -> Caisse principale");
    expect(targetTx.comment).toBe(sourceTx.comment);
  });

  it("honours an explicit comment over the default", async () => {
    const { sourceTx, targetTx } = await createVersement({
      sourceCaisseId: "caisse-1",
      amount: 10000,
      comment: "Transfert exceptionnel",
    });
    expect(sourceTx.comment).toBe("Transfert exceptionnel");
    expect(targetTx.comment).toBe("Transfert exceptionnel");
  });

  it("persists a versement row and both transaction rows to the data layer", async () => {
    const { versementId, sourceTx, targetTx } = await createVersement({
      sourceCaisseId: "caisse-1",
      amount: 7500,
    });

    const versements = insertedRows("versements");
    expect(versements).toHaveLength(1);
    const v = versements[0];
    expect(v.id).toBe(versementId);
    expect(v.org_id).toBe("test-org");
    expect(v.from_account_id).toBe("caisse-1");
    expect(v.to_account_id).toBe("main");
    expect(v.amount_cents).toBe(7500);
    // Note: status is a hardcoded SQL literal ('APPROVED') in the INSERT, not a ? param.
    // The mock records params[positionally], so v.status receives params[6] = sessionId.
    expect(v.created_by).toBe("local-user");

    const txs = insertedRows("transactions");
    const byId = new Map(txs.map((t) => [t.id, t]));
    expect(byId.get(sourceTx.id)).toMatchObject({
      type: "EXPENSE",
      versement_id: versementId,
      source_caisse_id: "caisse-1",
      org_id: "test-org",
    });
    expect(byId.get(targetTx.id)).toMatchObject({
      type: "INCOME",
      versement_id: versementId,
      source_caisse_id: "main",
      org_id: "test-org",
    });
  });

  it("survives a persist failure (non-fatal, offline queue retries)", async () => {
    // Inject a failure on the first PS write (INSERT versements); the
    // per-statement try/catch in createVersement swallows it.
    psStore.failNext("powersync down");
    const result = await createVersement({
      sourceCaisseId: "caisse-1",
      amount: 1000,
    });

    // No exception escaped; both txs returned, linked by the versementId
    expect(result.sourceTx.type).toBe("EXPENSE");
    expect(result.targetTx.type).toBe("INCOME");
    expect(result.sourceTx.versementId).toBe(result.versementId);
    expect(result.sourceTx.versementId).toBe(result.targetTx.versementId);
  });
});

// ─── createCulte ──────────────────────────────────────────────────────────

describe("createCulte", () => {
  it("throws when no montantCotisationCents is provided (no default amount)", () => {
    const state = makeState({
      members: [makeMember({ id: "mem-1", status: "ACTIVE" })],
      cotisations: [],
      events: [],
    });
    expect(() =>
      createCulte({ name: "Culte", startDate: isoDaysAgo(3) }, state),
    ).toThrow("MONTANT_COTISATION_REQUIS");
    expect(() =>
      createCulte(
        { name: "Culte", startDate: isoDaysAgo(3), montantCotisationCents: 0 },
        state,
      ),
    ).toThrow("MONTANT_COTISATION_REQUIS");
  });

  it("creates one culte and one NON_PAYE cotisation per ACTIVE member (user-chosen amount), excluding INACTIVE/ARCHIVED members", () => {
    const active1 = makeMember({ id: "mem-1", firstName: "Awa", status: "ACTIVE" });
    const active2 = makeMember({ id: "mem-2", firstName: "Ibrahim", status: "ACTIVE" });
    const inactive = makeMember({ id: "mem-3", firstName: "Fatou", status: "INACTIVE" });
    const archived = makeMember({ id: "mem-4", firstName: "Kadi", status: "ARCHIVED" });
    const state = makeState({
      members: [active1, active2, inactive, archived],
      cotisations: [],
      events: [],
    });

    const { culte, cotisations } = createCulte(
      { name: "Culte du dimanche", startDate: isoDaysAgo(7), montantCotisationCents: 5000 },
      state,
    );

    // The culte
    expect(culte.name).toBe("Culte du dimanche");
    expect(culte.type).toBe("CULTE");
    expect(culte.status).toBe("PLANIFIED");
    expect(culte.orgId).toBe("test-org");

    // One cotisation per ACTIVE member only
    expect(cotisations).toHaveLength(2);
    const membreIds = cotisations.map((c) => c.membreId).sort();
    expect(membreIds).toEqual(["mem-1", "mem-2"]);
    for (const c of cotisations) {
      expect(c.culteId).toBe(culte.id);
      expect(c.statut).toBe("NON_PAYE");
      expect(c.montantObligatoire).toBe(5000); // user-chosen amount
      expect(c.montantPaye).toBe(0);
      expect(c.datePaiement).toBeNull();
    }
  });

  it("applies the custom montantCotisationCents when provided", () => {
    const state = makeState({
      members: [makeMember({ id: "mem-1", status: "ACTIVE" })],
      cotisations: [],
      events: [],
    });
    const { cotisations } = createCulte(
      { name: "Culte", startDate: isoDaysAgo(3), montantCotisationCents: 12300 },
      state,
    );
    expect(cotisations[0].montantObligatoire).toBe(12300);
  });

  it("creates no cotisation when no member is ACTIVE (throws first: montant required)", () => {
    const state = makeState({
      members: [makeMember({ id: "mem-1", status: "INACTIVE" })],
      cotisations: [],
      events: [],
    });
    const { cotisations } = createCulte({ name: "Culte", startDate: isoDaysAgo(3), montantCotisationCents: 5000 }, state);
    expect(cotisations).toHaveLength(0);
  });

  it("persistCulte writes the culte event + one row per cotisation", async () => {
    const state = makeState({
      members: [makeMember({ id: "mem-1" }), makeMember({ id: "mem-2", firstName: "B" })],
      cotisations: [],
      events: [],
    });
    const { culte, cotisations } = createCulte({ name: "Culte X", startDate: isoDaysAgo(2), montantCotisationCents: 5000 }, state);
    await persistCulte(culte, cotisations);

    const events = insertedRows("events");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: culte.id,
      org_id: "test-org",
      name: "Culte X",
      type: "CULTE",
      status: "PLANIFIED",
      start_date: culte.startDate,
    });

    const rows = insertedRows("cotisations");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.culte_id).toBe(culte.id);
      expect(row.statut).toBe("NON_PAYE");
      expect(row.montantObligatoire).toBe(5000);
    }
    expect(rows.map((r) => r.membre_id).sort()).toEqual(["mem-1", "mem-2"]);
  });
});

// ─── markCotisationPaid ──────────────────────────────────────────────────

describe("markCotisationPaid", () => {
  it("(a) member with sufficient avance: decrements avance, no new transaction", () => {
    const cot = makeCotisation({ id: "cot-adv", membreId: "mem-adv", montantObligatoire: 5000, statut: "NON_PAYE" });
    const membre = makeMember({
      id: "mem-adv",
      montantEnAvance: 9000, // >= 5000
    });
    const state = makeState({
      cotisations: [cot],
      members: [membre],
      events: [makeCulteEvent({ startDate: isoDaysAgo(5) })],
    });

    const result = markCotisationPaid("cot-adv", 5000, isoDaysAgo(4), state);

    expect(result.error).toBeUndefined();
    expect(result.newTransaction).toBeUndefined();
    expect(result.updatedCot.statut).toBe("PAYE"); // paid same-day-later
    expect(result.updatedCot.montantPaye).toBe(5000);
    expect(result.updatedCot.datePaiement).toBe(isoDaysAgo(4));
    expect(result.updatedMembre?.id).toBe("mem-adv");
    expect(result.updatedMembre?.montantEnAvance).toBe(4000); // 9000 - 5000
  });

  it("(b) no avance: creates an INCOME transaction with cotisationId and don comment", () => {
    localStorage.setItem("lumina-session", "session-B");
    const cot = makeCotisation({ id: "cot-npx", membreId: "mem-npx", montantObligatoire: 5000, statut: "NON_PAYE" });
    const membre = makeMember({ id: "mem-npx", firstName: "Awa", lastName: "Diallo", montantEnAvance: 0 });
    const state = makeState({
      cotisations: [cot],
      members: [membre],
      events: [makeCulteEvent({ startDate: isoDaysAgo(5) })],
    });

    // Pay 8000 > 5000 → 3000 don; payment strictly before culte day? No: paid 4 days ago, culte 5 days ago → payment after → PAYE
    const result = markCotisationPaid("cot-npx", 8000, isoDaysAgo(4), state);

    expect(result.error).toBeUndefined();
    expect(result.updatedMembre).toBeUndefined(); // no avance decrement
    const tx = result.newTransaction!;
    expect(tx).toBeDefined();
    expect(tx.type).toBe("INCOME");
    expect(tx.amount).toBe(8000);
    expect(tx.cotisationId).toBe("cot-npx");
    expect(tx.source).toBe("COTISATION");
    expect(tx.eventId).toBe(cot.culteId);
    expect(tx.sourceCaisseId).toBe("main");
    expect(tx.personName).toBe("Awa Diallo");
    expect(tx.createdById).toBe("session-B");
    expect(tx.comment).toBe("Cotisation + don 30 FCFA"); // 3000 cents / 100
    expect(result.updatedCot.statut).toBe("PAYE");
  });

  it("(b2) payment before the culte day yields EN_AVANCE statut", () => {
    const cot = makeCotisation({ id: "cot-2", montantObligatoire: 5000, statut: "NON_PAYE" });
    const state = makeState({
      cotisations: [cot],
      members: [makeMember({ id: "mem-1", montantEnAvance: 0 })],
      events: [makeCulteEvent({ startDate: isoDaysAgo(2) })], // culte 2 days ago
    });
    const result = markCotisationPaid("cot-2", 5000, isoDaysAgo(10), state);
    expect(result.error).toBeUndefined();
    expect(result.updatedCot.statut).toBe("EN_AVANCE"); // paid 10 days ago < culte 2 days ago
    expect(result.newTransaction?.comment).toBe("Cotisation"); // no don
  });

  it("rejects an unknown cotisation with COTISATION_NOT_FOUND", () => {
    const state = makeState({
      cotisations: [makeCotisation({ id: "cot-1" })],
      events: [makeCulteEvent()],
      members: [makeMember({ id: "mem-1" })],
    });
    const result = markCotisationPaid("does-not-exist", 5000, isoDaysAgo(1), state);
    expect(result.error).toBe("COTISATION_NOT_FOUND");
  });

  it("rejects missing culte or member with CULTE_OR_MEMBER_NOT_FOUND", () => {
    const state = makeState({
      cotisations: [makeCotisation({ id: "cot-x", culteId: "missing-ev" })],
      members: [makeMember({ id: "mem-1" })],
      events: [],
    });
    const result = markCotisationPaid("cot-x", 5000, isoDaysAgo(1), state);
    expect(result.error).toBe("CULTE_OR_MEMBER_NOT_FOUND");
  });

  it("rejects an insufficient amount with MONTANT_INSUFFISANT", () => {
    const cot = makeCotisation({ id: "cot-low", montantObligatoire: 5000 });
    const state = makeState({
      cotisations: [cot],
      members: [makeMember({ id: "mem-1", montantEnAvance: 0 })],
      events: [makeCulteEvent({ startDate: isoDaysAgo(5) })],
    });
    const result = markCotisationPaid("cot-low", 3000, isoDaysAgo(1), state);
    expect(result.error).toBe("MONTANT_INSUFFISANT");
  });

  it("rejects a re-payment of an already-paid culte older than 30 days with PAIEMENT_VERROUILLE", () => {
    const cot = makeCotisation({
      id: "cot-lock",
      culteId: "ev-lock",
      statut: "PAYE",
      montantPaye: 5000,
    });
    const state = makeState({
      cotisations: [cot],
      members: [makeMember({ id: "mem-1", montantEnAvance: 0 })],
      events: [makeCulteEvent({ id: "ev-lock", startDate: isoDaysAgo(45) })], // 45d > 30d
    });
    const result = markCotisationPaid("cot-lock", 5000, isoDaysAgo(1), state);
    expect(result.error).toBe("PAIEMENT_VERROUILLE");
    expect(result.updatedCot).toBe(cot); // unchanged reference
  });

  it("allows a recent (<=30d) already-paid cotisation to be re-marked (not verrouille)", () => {
    const cot = makeCotisation({
      id: "cot-recent",
      culteId: "ev-recent",
      statut: "EN_AVANCE",
      montantPaye: 5000,
    });
    const state = makeState({
      cotisations: [cot],
      members: [makeMember({ id: "mem-1", montantEnAvance: 0 })],
      events: [makeCulteEvent({ id: "ev-recent", startDate: isoDaysAgo(10) })],
    });
    const result = markCotisationPaid("cot-recent", 5000, isoDaysAgo(1), state);
    expect(result.error).toBeUndefined();
    expect(result.newTransaction).toBeDefined();
  });

  it("persistMarkCotisationPaid updates the cotisation, the member (avance branch) or the transaction (cash branch)", async () => {
    // Avance branch: updateCotisationPS + updateMemberPS, no transaction INSERT
    await persistMarkCotisationPaid({
      cotisationId: "cot-adv",
      membreId: "mem-adv",
      updatedCot: { ...makeCotisation({ id: "cot-adv", statut: "PAYE" }), montantPaye: 5000, datePaiement: isoDaysAgo(4) },
      updatedMembre: makeMember({ id: "mem-adv", montantEnAvance: 4000 }),
    });
    const upCotCalls = callsMatching(/^UPDATE cotisations SET/i);
    const upMemCalls = callsMatching(/^UPDATE members SET/i);
    expect(upCotCalls).toHaveLength(1);
    expect(upMemCalls).toHaveLength(1);
    // Verify UPDATE members sets montant_en_avance = 4000
    expect(upMemCalls[0].params).toContain(4000);
    // No transaction row should have been inserted in the avance branch
    expect(insertedRows("transactions")).toHaveLength(0);

    // Clear for cash branch
    psStore.reset();

    // Cash branch: updateCotisationPS + INSERT transactions, no member update
    await persistMarkCotisationPaid({
      cotisationId: "cot-cash",
      updatedCot: { ...makeCotisation({ id: "cot-cash", statut: "PAYE" }), montantPaye: 5000, datePaiement: isoDaysAgo(1) },
      newTransaction: {
        id: "tx-cash",
        orgId: "test-org",
        type: "INCOME",
        amount: 5000,
        description: "Cotisation Awa Diallo -- Culte du 01/09/2026",
        date: "2026-09-04",
        status: "APPROVED",
        categoryId: "cat-dime",
        orgUnitId: null,
        eventId: "ev-culte-1",
        source: "COTISATION",
        personName: "Awa Diallo",
        compensatesFor: null,
        comment: "Cotisation",
        version: 1,
        sourceCaisseId: "main",
        versementId: null,
        reversalOfId: null,
        cotisationId: "cot-cash",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: "local-user",
        approvedById: "local-user",
        approvedAt: new Date().toISOString(),
      },
    });
    const upCotCash = callsMatching(/^UPDATE cotisations SET/i);
    const upMemCash = callsMatching(/^UPDATE members SET/i);
    const insTx = callsMatching(/^INSERT INTO transactions/i);
    expect(upCotCash).toHaveLength(1);
    expect(upMemCash).toHaveLength(0);
    expect(insTx).toHaveLength(1);
    expect(insertedRows("transactions")[0]).toMatchObject({
      id: "tx-cash",
      type: "INCOME",
      cotisation_id: "cot-cash",
      event_id: "ev-culte-1",
    });
  });
});

// ─── markCotisationsAbsent / updateCotisation / query helpers ────────────

describe("markCotisationsAbsent", () => {
  it("flips the matching cotisations to ABSENT and leaves the rest untouched", () => {
    const c1 = makeCotisation({ id: "cot-1", membreId: "mem-1" });
    const c2 = makeCotisation({ id: "cot-2", membreId: "mem-2" });
    const cOther = makeCotisation({ id: "cot-3", culteId: "ev-other", membreId: "mem-1" });
    const state = makeState({ cotisations: [c1, c2, cOther] });

    const { updatedCotisations } = markCotisationsAbsent("ev-culte-1", ["mem-1"], state);
    const byId = new Map(updatedCotisations.map((c) => [c.id, c]));
    expect(byId.get("cot-1")?.statut).toBe("ABSENT");
    expect(byId.get("cot-2")?.statut).toBe("NON_PAYE"); // not in list
    expect(byId.get("cot-3")?.statut).toBe("NON_PAYE"); // other culte
  });

  it("persistMarkCotisationsAbsent issues one updateCotisationPS per matching row", async () => {
    const c1 = makeCotisation({ id: "cot-1", membreId: "mem-1" });
    const c2 = makeCotisation({ id: "cot-2", membreId: "mem-2" });
    const state = makeState({ cotisations: [c1, c2] });
    await persistMarkCotisationsAbsent("ev-culte-1", ["mem-1", "mem-2"], state);
    const upCalls = callsMatching(/^UPDATE cotisations SET/i);
    expect(upCalls).toHaveLength(2);
    expect(upCalls.map((c) => c.params)).toEqual(
      expect.arrayContaining([
        expect.arrayContaining(["cot-1"]),
        expect.arrayContaining(["cot-2"]),
      ]),
    );
  });
});

describe("updateCotisation", () => {
  it("patches the targeted cotisation and refreshes updatedAt", () => {
    const c1 = makeCotisation({ id: "cot-1" });
    const c2 = makeCotisation({ id: "cot-2" });
    const state = makeState({ cotisations: [c1, c2] });
    const updated = updateCotisation("cot-2", { notes: "remboursée" }, state);
    const byId = new Map(updated.map((c) => [c.id, c]));
    expect(byId.get("cot-1")).toBe(c1); // untouched identity
    expect(byId.get("cot-2")?.notes).toBe("remboursée");
    expect(byId.get("cot-2")?.updatedAt).not.toBe(c2.updatedAt);
  });

  it("persistUpdateCotisation delegates to updateCotisationPS", async () => {
    await persistUpdateCotisation("cot-1", { statut: "ABSENT" });
    const upCalls = callsMatching(/^UPDATE cotisations SET/i);
    expect(upCalls).toHaveLength(1);
    expect(upCalls[0].params).toContain("cot-1");
    expect(upCalls[0].params).toContain("ABSENT");
  });
});

describe("query helpers", () => {
  it("getCotisationsForCulte filters by culteId", () => {
    const c1 = makeCotisation({ id: "cot-1", culteId: "ev-A" });
    const c2 = makeCotisation({ id: "cot-2", culteId: "ev-B" });
    const state = makeState({ cotisations: [c1, c2] });
    expect(getCotisationsForCulte("ev-A", state)).toHaveLength(1);
    expect(getCotisationsForCulte("ev-A", state)[0].id).toBe("cot-1");
  });

  it("getMembreHistorique returns the member's cotisations with their cultes, sorted desc by culte date", () => {
    const c1 = makeCotisation({ id: "cot-1", culteId: "ev-old", membreId: "mem-1" });
    const c2 = makeCotisation({ id: "cot-2", culteId: "ev-new", membreId: "mem-1" });
    const c3 = makeCotisation({ id: "cot-3", culteId: "ev-gone", membreId: "mem-1" }); // no culte
    const evOld = makeCulteEvent({ id: "ev-old", startDate: isoDaysAgo(30) });
    const evNew = makeCulteEvent({ id: "ev-new", startDate: isoDaysAgo(5) });
    const state = makeState({ cotisations: [c1, c2, c3], events: [evOld, evNew] });

    const history = getMembreHistorique("mem-1", state);
    // c3 is dropped (no culte), c2 (newer culte) comes first
    expect(history).toHaveLength(2);
    expect(history[0].cotisation.id).toBe("cot-2");
    expect(history[0].culte?.id).toBe("ev-new");
    expect(history[1].cotisation.id).toBe("cot-1");
  });

  it("getMembresEnAvance returns only ACTIVE members with avance > 0, sorted desc", () => {
    const m1 = makeMember({ id: "mem-1", montantEnAvance: 3000, status: "ACTIVE" });
    const m2 = makeMember({ id: "mem-2", montantEnAvance: 9000, status: "ACTIVE" });
    const m3 = makeMember({ id: "mem-3", montantEnAvance: 5000, status: "INACTIVE" });
    const m4 = makeMember({ id: "mem-4", montantEnAvance: 0, status: "ACTIVE" });
    const state = makeState({ members: [m1, m2, m3, m4] });

    const enAvance = getMembresEnAvance(state);
    expect(enAvance.map((e) => e.membre.id)).toEqual(["mem-2", "mem-1"]);
    expect(enAvance[0].montant).toBe(9000);
  });
});

// ─── cotisation-logic ─────────────────────────────────────────────────────

describe("cotisation-logic", () => {
  describe("isCulteVerrouille", () => {
    it("verrouille when the culte is older than 30 days", () => {
      expect(isCulteVerrouille(isoDaysAgo(35))).toBe(true);
      expect(isCulteVerrouille(isoDaysAgo(60))).toBe(true);
      expect(isCulteVerrouille(isoDaysAgo(JOURS_VERROUILLAGE_CULTE))).toBe(false); // exactly 30
      expect(isCulteVerrouille(isoDaysAgo(5))).toBe(false);
    });
  });

  describe("isPaiementVerrouille", () => {
    it("requires both an old culte AND an already-paid cotisation", () => {
      const old = isoDaysAgo(45);
      const recent = isoDaysAgo(5);
      expect(isPaiementVerrouille({ dateCulte: old, cotisationEstPaye: true })).toBe(true);
      expect(isPaiementVerrouille({ dateCulte: old, cotisationEstPaye: false })).toBe(false);
      expect(isPaiementVerrouille({ dateCulte: recent, cotisationEstPaye: true })).toBe(false);
      expect(isPaiementVerrouille({ dateCulte: recent, cotisationEstPaye: false })).toBe(false);
    });
  });

  describe("calculerNombreRetards", () => {
    it("counts missing or NON_PAYE cotisations only for cultes after adhesion", () => {
      const adhesion = isoDaysAgo(60);
      const cultes = [
        makeCulteEvent({ id: "ev-pre", startDate: isoDaysAgo(90) }), // before adhesion → ignored
        makeCulteEvent({ id: "ev-1", startDate: isoDaysAgo(40) }),
        makeCulteEvent({ id: "ev-2", startDate: isoDaysAgo(30) }),
        makeCulteEvent({ id: "ev-3", startDate: isoDaysAgo(20) }),
        makeCulteEvent({ id: "ev-4", startDate: isoDaysAgo(10) }),
      ];
      const cotisations = [
        makeCotisation({ id: "c1", culteId: "ev-1", statut: "PAYE" }),
        makeCotisation({ id: "c2", culteId: "ev-2", statut: "NON_PAYE" }),
        makeCotisation({ id: "c3", culteId: "ev-4", statut: "ABSENT" }),
        // ev-3 has no cotisation → retard
      ];
      // Retards: ev-2 (NON_PAYE) + ev-3 (missing) = 2 (ev-4 ABSENT is NOT a retard)
      expect(calculerNombreRetards({ cultes, cotisations, dateAdhesion: adhesion })).toBe(2);
    });

    it("returns 0 when every post-adhesion culte is paid or absent", () => {
      const adhesion = isoDaysAgo(60);
      const cultes = [makeCulteEvent({ id: "ev-1", startDate: isoDaysAgo(10) })];
      const cotisations = [makeCotisation({ id: "c1", culteId: "ev-1", statut: "PAYE" })];
      expect(calculerNombreRetards({ cultes, cotisations, dateAdhesion: adhesion })).toBe(0);
    });
  });

  describe("calculerMontantDu", () => {
    it("multiplies retards by the per-culte amount (caller-provided)", () => {
      expect(calculerMontantDu(0, 5000)).toBe(0);
      expect(calculerMontantDu(3, 5000)).toBe(15000);
      expect(calculerMontantDu(2, 7500)).toBe(15000);
      expect(calculerMontantDu(1, 10000)).toBe(10000);
    });
  });

  describe("determinerStatutAvance", () => {
    it("returns EN_AVANCE when strictly paid before the culte, PAYE otherwise", () => {
      expect(determinerStatutAvance({ datePaiement: isoDaysAgo(10), dateCulte: isoDaysAgo(5) })).toBe("EN_AVANCE");
      expect(determinerStatutAvance({ datePaiement: isoDaysAgo(5), dateCulte: isoDaysAgo(5) })).toBe("PAYE"); // same day
      expect(determinerStatutAvance({ datePaiement: isoDaysAgo(1), dateCulte: isoDaysAgo(5) })).toBe("PAYE"); // later
    });
  });

  describe("calculerDon", () => {
    it("returns the excess over the mandatory amount, floored at 0", () => {
      expect(calculerDon(5000, 5000)).toBe(0);
      expect(calculerDon(8000, 5000)).toBe(3000);
      expect(calculerDon(3000, 5000)).toBe(0); // underpaid → no don
    });
  });

  describe("calculerStatsCulte", () => {
    it("aggregates statut counts and total collected for one culte", () => {
      const culteId = "ev-stats";
      const cotisations = [
        makeCotisation({ id: "s1", culteId, statut: "PAYE", montantPaye: 5000 }),
        makeCotisation({ id: "s2", culteId, statut: "PAYE", montantPaye: 8000 }),
        makeCotisation({ id: "s3", culteId, statut: "ABSENT", montantPaye: 0 }),
        makeCotisation({ id: "s4", culteId, statut: "NON_PAYE", montantPaye: 0 }),
        makeCotisation({ id: "s5", culteId, statut: "EN_AVANCE", montantPaye: 5000 }),
        makeCotisation({ id: "sx", culteId: "ev-other", statut: "PAYE", montantPaye: 9999 }),
      ];
      const stats = calculerStatsCulte({ cotisations, culteId });
      expect(stats).toEqual({
        total: 5,
        paye: 2,
        absent: 1,
        nonPaye: 1,
        enAvance: 1,
        totalCollecte: 18000, // 5000 + 8000 + 0 + 0 + 5000
      });
    });

    it("returns zeros for a culte without cotisations", () => {
      const stats = calculerStatsCulte({ cotisations: [], culteId: "ev-none" });
      expect(stats).toEqual({
        total: 0,
        paye: 0,
        absent: 0,
        nonPaye: 0,
        enAvance: 0,
        totalCollecte: 0,
      });
    });
  });

  describe("aSuffisantAvance", () => {
    it("compares montantEnAvance (defaulting to 0) against the requested amount", () => {
      expect(aSuffisantAvance(makeMember({ montantEnAvance: 5000 }), 5000)).toBe(true);
      expect(aSuffisantAvance(makeMember({ montantEnAvance: 4999 }), 5000)).toBe(false);
      expect(aSuffisantAvance(makeMember({ montantEnAvance: 0 }), 0)).toBe(true);
    });
  });

  it("exposes stable statut labels and colors", () => {
    expect(COTISATION_STATUT_LABELS).toEqual({
      NON_PAYE: "Non payé",
      PAYE: "Payé",
      ABSENT: "Absent",
      EN_AVANCE: "En avance",
    });
    expect(Object.keys(COTISATION_STATUT_COLORS)).toHaveLength(4);
  });
});

// ─── Multi-user: two simulated sessions, per-member state, no collision ──

describe("multi-user sessions", () => {
  it("two distinct lumina-session stores mark paid on the same culte independently (per-member separation, no cross-session collision)", async () => {
    // Shared culte + shared global cotisation state, but each session
    // operates on its own member and records its own transaction actor.
    const sharedCulte = makeCulteEvent({ id: "ev-multi", startDate: isoDaysAgo(5) });
    const cotA = makeCotisation({ id: "cot-A", culteId: "ev-multi", membreId: "mem-A", statut: "NON_PAYE" });
    const cotB = makeCotisation({ id: "cot-B", culteId: "ev-multi", membreId: "mem-B", statut: "NON_PAYE" });
    const state: CotisationState = {
      cotisations: [cotA, cotB],
      events: [sharedCulte],
      members: [
        makeMember({ id: "mem-A", firstName: "Aminata", lastName: "A", montantEnAvance: 0 }),
        makeMember({ id: "mem-B", firstName: "Boubou", lastName: "B", montantEnAvance: 0 }),
      ],
      transactions: [],
    };

    // Session 1 (Aminata)
    localStorage.setItem("lumina-session", "session-A");
    const rA = markCotisationPaid("cot-A", 5000, isoDaysAgo(4), state);
    expect(rA.error).toBeUndefined();
    expect(rA.newTransaction?.createdById).toBe("session-A");
    expect(rA.newTransaction?.cotisationId).toBe("cot-A");
    expect(rA.newTransaction?.personName).toBe("Aminata A");

    // Session 2 (Boubou) — same culte, different member
    localStorage.setItem("lumina-session", "session-B");
    const rB = markCotisationPaid("cot-B", 7000, isoDaysAgo(4), state);
    expect(rB.error).toBeUndefined();
    expect(rB.newTransaction?.createdById).toBe("session-B");
    expect(rB.newTransaction?.cotisationId).toBe("cot-B");
    expect(rB.newTransaction?.personName).toBe("Boubou B");
    expect(rB.newTransaction?.comment).toBe("Cotisation + don 20 FCFA"); // 2000 don

    // Per-member state separation: A's payment must not leak into B's result
    expect(rA.updatedCot.id).toBe("cot-A");
    expect(rB.updatedCot.id).toBe("cot-B");
    expect(rA.updatedMembre).toBeUndefined();
    expect(rB.updatedMembre).toBeUndefined();
    // No collision: distinct tx ids & actor sessions
    expect(rA.newTransaction!.id).not.toBe(rB.newTransaction!.id);
    expect(rA.newTransaction!.createdById).not.toBe(rB.newTransaction!.createdById);

    // Each session's transaction lands in the in-memory store on persist
    localStorage.setItem("lumina-session", "session-A");
    psStore.reset();
    await persistMarkCotisationPaid({ ...rA, cotisationId: "cot-A" });
    const txsAfterA = insertedRows("transactions");
    expect(txsAfterA).toHaveLength(1);
    expect(txsAfterA[0]).toMatchObject({ created_by_id: "session-A", cotisation_id: "cot-A" });

    localStorage.setItem("lumina-session", "session-B");
    psStore.reset();
    await persistMarkCotisationPaid({ ...rB, cotisationId: "cot-B" });
    const txsAfterB = insertedRows("transactions");
    expect(txsAfterB).toHaveLength(1);
    expect(txsAfterB[0]).toMatchObject({ created_by_id: "session-B", cotisation_id: "cot-B" });

    // Both sessions can coexist on the same culte: no lock, no shared mutation
    expect(txsAfterA.length + txsAfterB.length).toBe(2);
  });

  it("a locked culte blocks BOTH sessions (verrouillage is culte-level, not session-level)", () => {
    const locked = makeCulteEvent({ id: "ev-locked", startDate: isoDaysAgo(45) });
    const cotA = makeCotisation({ id: "cot-A", culteId: "ev-locked", membreId: "mem-A", statut: "PAYE" });
    const state: CotisationState = {
      cotisations: [cotA],
      events: [locked],
      members: [makeMember({ id: "mem-A" })],
      transactions: [],
    };
    localStorage.setItem("lumina-session", "session-A");
    expect(markCotisationPaid("cot-A", 5000, isoDaysAgo(1), state).error).toBe("PAIEMENT_VERROUILLE");
    localStorage.setItem("lumina-session", "session-B");
    expect(markCotisationPaid("cot-A", 5000, isoDaysAgo(1), state).error).toBe("PAIEMENT_VERROUILLE");
  });
});

