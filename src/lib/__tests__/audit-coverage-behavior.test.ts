/**
 * NeverBreak #6 — preuve COMPORTEMENTALE : les mutations des services
 * récemment câblés écrivent RÉELLEMENT une entrée d'audit (pas seulement un
 * appel `writeAudit` présent dans le source).
 *
 * Couvre : `member-service`, `cotisation-service`, `versement-service`,
 * `group-lifecycle`.
 *
 * Le mock PowerSync est STATEFUL (les requêtes SQL réelles sont exercées) et
 * `@/lib/audit` n'est PAS mocké : on observe l'INSERT réel dans
 * `audit_entries`. Chaque assertion est STRICTE (`length === 1`) pour qu'une
 * écriture manquante fasse échouer le test (non-vacuité).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── localStorage shim (node env) ────────────────────────────────────────
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

// ─── In-memory PowerSync store ───────────────────────────────────────────
const psStore = vi.hoisted(() => {
  const db: Record<string, any[]> = {};
  function execute(sql: string, params: any[] = []) {
    const s = sql.trim();
    const ins = s.match(/^INSERT INTO (\w+)\s*\(([^)]+)\)/i);
    if (ins) {
      const table = ins[1];
      const cols = ins[2].split(",").map((c) => c.trim());
      const row: Record<string, any> = {};
      cols.forEach((col, i) => (row[col] = params[i]));
      (db[table] = db[table] || []).push(row);
      return Promise.resolve({ rowsAffected: 1 });
    }
    const up = s.match(/^UPDATE (\w+) SET/i);
    if (up) return Promise.resolve({ rowsAffected: 1 });
    const del = s.match(/^DELETE FROM (\w+)/i);
    if (del) return Promise.resolve({ rowsAffected: 0 });
    if (/^\s*SELECT/i.test(s)) return Promise.resolve({ array: [] });
    return Promise.resolve({ rowsAffected: 0 });
  }
  return {
    db,
    execute,
    reset() {
      for (const key of Object.keys(db)) delete db[key];
    },
  };
});

function auditRows(): any[] {
  return psStore.db["audit_entries"] ?? [];
}

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({
    execute: psStore.execute,
    getOptional: vi.fn(async () => null),
    readTransaction: vi.fn(),
  }),
}));

// `dataLayer` consomme `usePowerSync()` (contexte React) pour certaines
// lectures ; on renvoie le même store pour ne pas dépendre du contexte.
vi.mock("@powersync/react", () => ({
  usePowerSync: () => ({ execute: psStore.execute, getOptional: vi.fn(async () => null) }),
  useQuery: vi.fn(() => ({ rows: [] })),
  PowerSyncProvider: vi.fn(({ children }: any) => children),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "test-org",
  setOrganizationId: vi.fn(),
  subscribeOrganization: vi.fn(() => () => {}),
}));

vi.mock("@/lib/clientErrors", () => ({ captureClientError: vi.fn() }));

import { persistCreateMember } from "@/lib/member-service";
import { buildCreateMember } from "@/lib/member-service";
import {
  createCulte,
  persistCulte,
  markCotisationPaid,
  persistMarkCotisationPaid,
  type CotisationState,
} from "@/lib/cotisation-service";
import { createVersement } from "@/lib/versement-service";
import {
  persistCreateGroup,
  persistUpdateGroup,
  persistDeleteGroup,
} from "@/lib/group-lifecycle";
import type { Cotisation, Event, Member } from "@/types";

const ISO = new Date().toISOString();

function makeMember(over: Partial<Member> = {}): Member {
  return {
    id: "mem-1",
    orgId: "test-org",
    firstName: "Awa",
    lastName: "Diallo",
    phone: null,
    email: null,
    status: "ACTIVE",
    joinedAt: ISO,
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    totalDons: 0,
    montantEnAvance: 0,
    createdAt: ISO,
    updatedAt: ISO,
    ...over,
  };
}

function makeCulte(over: Partial<Event> = {}): Event {
  return {
    id: "culte-1",
    orgId: "test-org",
    name: "Culte du dimanche",
    description: "",
    startDate: ISO,
    endDate: null,
    status: "PLANIFIED",
    type: "CULTE",
    budget: 0,
    budgetItems: [],
    shoppingItems: [],
    createdAt: ISO,
    updatedAt: ISO,
    ...over,
  };
}

function makeCotisation(over: Partial<Cotisation> = {}): Cotisation {
  return {
    id: "cot-1",
    culteId: "culte-1",
    membreId: "mem-1",
    statut: "NON_PAYE",
    montantObligatoire: 5000,
    montantPaye: 0,
    datePaiement: null,
    notes: null,
    createdAt: ISO,
    updatedAt: ISO,
    ...over,
  };
}

beforeEach(() => {
  psStore.reset();
  localStorage.clear();
});
afterEach(() => vi.clearAllMocks());

describe("NeverBreak #6 — member-service trace la création d'un membre", () => {
  it("persistCreateMember écrit UNE entrée d'audit Member/CREATE", async () => {
    const member = buildCreateMember({
      orgId: "test-org",
      firstName: "Awa",
      lastName: "Diallo",
      phone: null,
      email: null,
      status: "ACTIVE",
      joinedAt: ISO,
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      totalDons: 0,
      montantEnAvance: 0,
    });

    expect(auditRows()).toHaveLength(0);
    await persistCreateMember(member);

    expect(auditRows()).toHaveLength(1);
    const row = auditRows()[0];
    expect(row.entity_type).toBe("Member");
    expect(row.action).toBe("CREATE");
    expect(row.entity_id).toBe(member.id);
    expect(row.org_id).toBe("test-org");
    expect(row.before_state).toBeNull();
    expect(JSON.parse(row.after_state).id).toBe(member.id);
  });
});

describe("NeverBreak #6 — cotisation-service trace culte + cotisations", () => {
  it("persistCulte écrit l'audit du culte ET de chaque cotisation initialisée", async () => {
    const state: CotisationState = {
      members: [makeMember({ id: "mem-1" }), makeMember({ id: "mem-2" })],
      events: [],
      cotisations: [],
      transactions: [],
    };
    const { culte, cotisations } = createCulte(
      { name: "Culte", startDate: ISO, montantCotisationCents: 5000 },
      state,
    );

    await persistCulte(culte, cotisations);

    const rows = auditRows();
    // 1 culte + 2 cotisations = 3 entrées (strictement).
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.entity_type === "Event")).toHaveLength(1);
    expect(rows.filter((r) => r.entity_type === "Cotisation")).toHaveLength(2);
    expect(rows.every((r) => r.action === "CREATE")).toBe(true);
  });

  it("persistMarkCotisationPaid trace la cotisation payée et lie la transaction", async () => {
    const culte = makeCulte();
    const membre = makeMember();
    const cot = makeCotisation();
    const result = markCotisationPaid(cot.id, 5000, ISO, {
      members: [membre],
      events: [culte],
      cotisations: [cot],
      transactions: [],
    });
    expect(result.error).toBeUndefined();

    await persistMarkCotisationPaid({ ...result, cotisationId: cot.id, membreId: membre.id });

    expect(auditRows()).toHaveLength(1);
    const row = auditRows()[0];
    expect(row.entity_type).toBe("Cotisation");
    expect(row.action).toBe("UPDATE");
    expect(row.entity_id).toBe(cot.id);
    expect(row.transaction_id).toBe(result.newTransaction?.id);
    expect(JSON.parse(row.after_state).statut).toBe(result.updatedCot.statut);
  });
});

describe("NeverBreak #6 — versement-service trace le mouvement d'argent", () => {
  it("createVersement écrit UNE entrée d'audit Versement/CREATE liée à la tx source", async () => {
    localStorage.setItem("lumina-session", "session-A");
    const { versementId, sourceTx } = await createVersement({
      sourceCaisseId: "caisse-1",
      amount: 25000,
    });

    expect(auditRows()).toHaveLength(1);
    const row = auditRows()[0];
    expect(row.entity_type).toBe("Versement");
    expect(row.action).toBe("CREATE");
    expect(row.entity_id).toBe(versementId);
    expect(row.transaction_id).toBe(sourceTx.id);
    expect(row.user_id).toBe("session-A");
  });
});

describe("NeverBreak #6 — group-lifecycle trace create/update/delete", () => {
  it("persistCreateGroup → Group/CREATE", async () => {
    const id = await persistCreateGroup({
      name: "Groupe Jeunesse",
      type: "GROUP",
      description: "Jeunes",
    });
    expect(auditRows()).toHaveLength(1);
    expect(auditRows()[0]).toMatchObject({
      entity_type: "Group",
      action: "CREATE",
      entity_id: id,
    });
  });

  it("persistUpdateGroup → Group/UPDATE (avant/après)", async () => {
    await persistUpdateGroup("g-1", { name: "Renommé" }, { id: "g-1", name: "Ancien" });
    expect(auditRows()).toHaveLength(1);
    const row = auditRows()[0];
    expect(row).toMatchObject({ entity_type: "Group", action: "UPDATE", entity_id: "g-1" });
    expect(JSON.parse(row.before_state).name).toBe("Ancien");
    expect(JSON.parse(row.after_state).name).toBe("Renommé");
  });

  it("persistDeleteGroup → Group/DELETE", async () => {
    await persistDeleteGroup("g-2", { id: "g-2", name: "Supprimé" });
    expect(auditRows()).toHaveLength(1);
    const row = auditRows()[0];
    expect(row).toMatchObject({ entity_type: "Group", action: "DELETE", entity_id: "g-2" });
    expect(row.after_state).toBeNull();
    expect(JSON.parse(row.before_state).name).toBe("Supprimé");
  });
});
