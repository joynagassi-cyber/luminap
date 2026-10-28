// @vitest-environment jsdom
/**
 * Phase 8 — Tests d'intrusion INTER-ORGANISATION (red team), côté CLIENT.
 *
 * Objectif mesurable : un membre de l'org A ne doit JAMAIS lire les données
 * de l'org B via les couches client de Lumina.
 *
 * ─── Périmètre (honnêteté) ─────────────────────────────────────────────────
 * Lumina est « front-first » : il n'y a PAS de routes serveur applicatives.
 * L'autorité finale d'isolation est la **RLS PostgreSQL** + les filtres de
 * synchronisation PowerSync (`powersync/sync-config.yaml`), NON exécutables
 * ici (pas de Postgres ni de connecteur en local). Ces tests couvrent donc la
 * PARTIE CLIENTE, en profondeur :
 *   1. les hooks de lecture `dataLayer` bornent la requête à l'organisation
 *      courante (`WHERE org_id = ?`) — vérifié contre un VRAI moteur SQL
 *      (`node:sqlite`, embarqué dans Node 24) et non un mock ;
 *   2. la garde de contexte (`orgContext` / `organization-context`) refuse
 *      l'entrée dans une organisation non autorisée.
 *
 * Les seuls « mocks » sont les frontières de plateforme (pas de vrai
 * PowerSync WASM ni de React context dans un test unitaire) :
 *   - `@powersync/react` → `useQuery` exécute le SQL réel sur `node:sqlite` ;
 *   - `@/lib/powersync`  → `getPowerSyncDatabase` renvoie le même `node:sqlite` ;
 *   - `@/store/useLocalStore` → fallback « vide » (on teste le chemin PowerSync).
 * Aucune logique métier n'est mockée : le SQL de `dataLayer.ts` est exercé tel
 * quel, avec les mêmes paramètres liés.
 *
 * ÉCHEC SANS CORRECTIF : le cas `useGroupMemberships` / `getGroupMembershipsPS`
 * échoue sur le code d'avant la Phase 8 (la requête ne filtrait pas `org_id`).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { DatabaseSync } from "node:sqlite";

// ─── Base SQLite réelle, partagée avec les mocks hoistés ────────────────────
const h = vi.hoisted(() => ({ db: null as any }));

/** Lie uniquement autant de paramètres qu'il y a de `?` (PowerSync tolère
 *  des paramètres supplémentaires — ex. `orgRev` — que SQLite refuse). */
function bind(sql: string, params: unknown[]): unknown[] {
  const n = (sql.match(/\?/g) ?? []).length;
  return (params ?? []).slice(0, n);
}

vi.mock("@powersync/react", () => ({
  useQuery: (sql: string, params: unknown[] = []) => {
    const rows = h.db.prepare(sql).all(...(bind(sql, params) as any[]));
    return { data: rows, isLoading: false, error: undefined };
  },
  usePowerSync: () => ({ execute: async () => ({ rowsAffected: 0 }) }),
  PowerSyncProvider: ({ children }: any) => children,
}));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => h.db,
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: () => ({
    transactions: [],
    events: [],
    members: [],
    groups: [],
    caisses: [],
    accounts: [],
    cotisations: [],
    documents: [],
    memberships: [],
    notifications: [],
    categories: [],
    orgUnits: [],
    versements: [],
    auditEntries: [],
  }),
}));

import { setOrganizationId, resetOrganizationId } from "@/lib/orgContext";
import { markPowerSyncReady } from "@/lib/dataLayer";
import {
  useEvents,
  useMembers,
  useCaisses,
  useGroups,
  useTransactions,
  useGroupMemberships,
  getGroupMembershipsPS,
  listFormDefinitionsPS,
  listFormSubmissionsPS,
  canAccessOrganization,
} from "@/lib/dataLayer";

const ORG_A = "org-A";
const ORG_B = "org-B";

/** Crée un `node:sqlite` en mémoire avec le sous-ensemble de schéma utilisé. */
function makeDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE events (
      id text, org_id text, name text, description text, start_date text,
      end_date text, status text, type text, budget integer, budget_items text,
      created_at text, updated_at text
    );
    CREATE TABLE members (
      id text, org_id text, first_name text, last_name text, phone text,
      email text, status text, joined_at text, archived_at text, archived_by text,
      archive_reason text, total_dons integer, montant_en_avance integer,
      created_at text, updated_at text
    );
    CREATE TABLE caisses (
      id text, name text, description text, type text, color text, org_id text,
      created_at text, updated_at text
    );
    CREATE TABLE groups (
      id text, org_id text, name text, parent_group_id text,
      responsable_member_id text, status text, archived_at text, archived_by text,
      archive_reason text, created_at text, updated_at text
    );
    CREATE TABLE transactions (
      id text, org_id text, type text, amount integer, description text, date text,
      status text, category_id text, org_unit_id text, event_id text, source text,
      person_name text, compensates_for text, comment text, version integer,
      source_caisse_id text, versement_id text, reversal_of_id text,
      created_by_id text, approved_by_id text, created_at text, updated_at text,
      approved_at text
    );
    CREATE TABLE group_memberships (
      id text, org_id text, member_id text, group_id text, role text,
      created_at text
    );
    CREATE TABLE profiles (id text, org_id text, role text);
    CREATE TABLE org_memberships (
      id text, user_id text, org_id text, role text, status text
    );
    CREATE TABLE org_admins (
      id text, admin_profile_id text, org_id text, status text
    );
    CREATE TABLE organizations (id text, name text, status text);
    CREATE TABLE form_definitions (
      id text, org_id text, key text, name text, description text,
      version integer, target_entity_type text, fields text, status text,
      created_at text, updated_at text
    );
    CREATE TABLE form_submissions (
      id text, org_id text, form_definition_id text, form_version integer,
      linked_entity_type text, linked_entity_id text, data text,
      submitted_by text, submitted_at text, status text, rejected_by text,
      rejection_reason text, created_at text
    );
  `);

  const insert = (table: string, row: Record<string, unknown>) => {
    const cols = Object.keys(row);
    db.prepare(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    ).run(...(cols.map((c) => row[c]) as any[]));
  };

  // Org A
  insert("events", { id: "e-a", org_id: ORG_A, name: "Culte A" });
  insert("members", { id: "m-a", org_id: ORG_A, first_name: "Alice" });
  insert("caisses", { id: "c-a", org_id: ORG_A, name: "Caisse A" });
  insert("groups", { id: "g-a", org_id: ORG_A, name: "Groupe A" });
  insert("transactions", { id: "t-a", org_id: ORG_A, description: "Dîme A" });
  insert("group_memberships", {
    id: "gm-a",
    org_id: ORG_A,
    member_id: "m-a",
    group_id: "g-a",
    role: "MEMBRE",
  });

  // Org B (le « voisin » à ne jamais exposer)
  insert("events", { id: "e-b", org_id: ORG_B, name: "Culte B" });
  insert("members", { id: "m-b", org_id: ORG_B, first_name: "Bob" });
  insert("caisses", { id: "c-b", org_id: ORG_B, name: "Caisse B" });
  insert("groups", { id: "g-b", org_id: ORG_B, name: "Groupe B" });
  insert("transactions", { id: "t-b", org_id: ORG_B, description: "Dîme B" });
  insert("group_memberships", {
    id: "gm-b",
    org_id: ORG_B,
    member_id: "m-b",
    group_id: "g-b",
    role: "MEMBRE",
  });

  // Appartenances (garde de contexte)
  insert("profiles", { id: "u-a", org_id: ORG_A, role: "MEMBRE" });
  insert("org_memberships", {
    id: "om-a",
    user_id: "u-a",
    org_id: ORG_A,
    role: "MEMBRE",
    status: "ACTIVE",
  });
  insert("organizations", { id: ORG_A, name: "Org A", status: "ACTIVE" });
  insert("organizations", { id: ORG_B, name: "Org B", status: "ACTIVE" });

  // Formulaires — org A et org B (mêmes ids dans les deux orgs pour prouver
  // que seul le filtre org_id distingue les deux).
  insert("form_definitions", {
    id: "fd-a",
    org_id: ORG_A,
    key: "bapteme",
    name: "Baptêmes A",
    version: 1,
    fields: "[]",
    status: "PUBLISHED",
  });
  insert("form_definitions", {
    id: "fd-b",
    org_id: ORG_B,
    key: "bapteme",
    name: "Baptêmes B",
    version: 1,
    fields: "[]",
    status: "PUBLISHED",
  });
  insert("form_submissions", {
    id: "fs-a",
    org_id: ORG_A,
    form_definition_id: "fd-a",
    form_version: 1,
    data: "{}",
    submitted_by: "u-a",
    status: "SUBMITTED",
  });
  insert("form_submissions", {
    id: "fs-b",
    org_id: ORG_B,
    form_definition_id: "fd-b",
    form_version: 1,
    data: "{}",
    submitted_by: "u-b",
    status: "SUBMITTED",
  });

  return db;
}

/**
 * Adaptateur « PowerSync-like » au-dessus de `node:sqlite` : `dataLayer.ts`
 * appelle `db.execute(sql, params)`, `db.getOptional(...)`,
 * `db.readTransaction(cb)` et `db.getAll(...)`. On exécute le SQL RÉEL (pas de
 * réimplémentation du filtrage) ; seul le format de retour est adapté.
 */
function psLike(db: DatabaseSync) {
  const run = (sql: string, params: unknown[] = []) => {
    const stmt = db.prepare(sql);
    const bound = bind(sql, params) as any[];
    // Une requête sans résultat (INSERT/UPDATE) : `all` renvoie [].
    const rows = stmt.all(...bound);
    return { array: rows, rowsAffected: rows.length };
  };
  return {
    prepare: (sql: string) => db.prepare(sql),
    execute: async (sql: string, params: unknown[] = []) => run(sql, params),
    getAll: async (sql: string, params: unknown[] = []) => run(sql, params).array,
    getOptional: async (sql: string, params: unknown[] = []) =>
      run(sql, params).array[0] ?? null,
    readTransaction: async (cb: (tx: { execute: typeof run }) => unknown) =>
      cb({ execute: run }),
  };
}

const ids = (rows: any[] | undefined) => (rows ?? []).map((r) => r.id);

beforeEach(() => {
  h.db = psLike(makeDb());
  markPowerSyncReady();
  resetOrganizationId();
});

describe("intrusion inter-org — lectures bornées à l'organisation courante", () => {
  it("useEvents n'expose que les événements de l'org courante", () => {
    setOrganizationId(ORG_A);
    const { result } = renderHook(() => useEvents());
    expect(ids(result.current.data)).toEqual(["e-a"]);
    expect(ids(result.current.data)).not.toContain("e-b");
  });

  it("useMembers n'expose que les membres de l'org courante", () => {
    setOrganizationId(ORG_A);
    const { result } = renderHook(() => useMembers());
    expect(ids(result.current.data)).toEqual(["m-a"]);
  });

  it("useCaisses n'expose que les caisses de l'org courante", () => {
    setOrganizationId(ORG_A);
    const { result } = renderHook(() => useCaisses());
    expect(ids(result.current.data)).toEqual(["c-a"]);
  });

  it("useGroups n'expose que les groupes de l'org courante", () => {
    setOrganizationId(ORG_A);
    const { result } = renderHook(() => useGroups());
    expect(ids(result.current.data)).toEqual(["g-a"]);
  });

  it("useTransactions n'expose que les transactions de l'org courante", () => {
    setOrganizationId(ORG_A);
    const { result } = renderHook(() => useTransactions());
    expect(ids(result.current.data)).toEqual(["t-a"]);
  });

  it("useGroupMemberships n'expose que les appartenances de l'org courante (Phase 8)", () => {
    setOrganizationId(ORG_A);
    const { result } = renderHook(() => useGroupMemberships());
    expect(ids(result.current.data)).toEqual(["gm-a"]);
    expect(ids(result.current.data)).not.toContain("gm-b");
  });

  it("getGroupMembershipsPS n'expose que les appartenances de l'org courante (Phase 8)", async () => {
    setOrganizationId(ORG_A);
    const rows = await getGroupMembershipsPS();
    expect(ids(rows)).toEqual(["gm-a"]);
  });

  /**
   * Chemins formulaires (form_definitions / form_submissions).
   *
   * Le cloisonnement de ces lectures repose sur DEUX barrières :
   *   1. `powersync/sync-config.yaml` — la base LOCALE ne contient jamais que
   *      les lignes des orgs du profil (streams bornés par `org_id IN (...)`) ;
   *   2. le filtre `org_id = ?` posé par l'appelant (`filters.orgId`).
   *
   * Ces fonctions de liste ne lisent PAS `getOrganizationId()` en interne :
   * c'est l'appelant qui borne. On prouve ici qu'un appel borné à l'org A ne
   * remonte jamais l'org B, même si la base locale contenait les deux (ce qui
   * est exactement le scénario « sync trop large »).
   */
  it("listFormDefinitionsPS borné par orgId n'expose pas les définitions de l'autre org", async () => {
    const defs = await listFormDefinitionsPS({ orgId: ORG_A });
    expect(ids(defs)).toEqual(["fd-a"]);
    expect(ids(defs)).not.toContain("fd-b");
  });

  it("listFormSubmissionsPS borné par formDefinitionId n'expose que la bonne org", async () => {
    const subs = await listFormSubmissionsPS({ formDefinitionId: "fd-a" });
    expect(ids(subs)).toEqual(["fs-a"]);
    expect(ids(subs)).not.toContain("fs-b");
  });

  it("listFormDefinitionsPS sans filtre est un point à borner (comportement documenté)", async () => {
    // Sans `orgId`, la fonction renvoie tout ce que la base LOCALE contient —
    // d'où l'importance de la barrière sync-config. On fige ce comportement
    // pour qu'une future régression (ex. suppression du filtre appelant) soit
    // visible : le test échouera si l'implémentation ajoute un filtre interne.
    const defs = await listFormDefinitionsPS();
    expect(ids(defs).sort()).toEqual(["fd-a", "fd-b"]);
  });

  it("changer d'organisation change la vue (pas de fuite résiduelle)", () => {
    setOrganizationId(ORG_A);
    const a = renderHook(() => useEvents());
    expect(ids(a.result.current.data)).toEqual(["e-a"]);

    setOrganizationId(ORG_B);
    const b = renderHook(() => useEvents());
    expect(ids(b.result.current.data)).toEqual(["e-b"]);
    expect(ids(b.result.current.data)).not.toContain("e-a");
  });

  it("sans organisation résolue, aucune donnée d'org n'est exposée", () => {
    // `resetOrganizationId` (beforeEach) → org non résolue : le marqueur
    // `__no_org__` ne correspond à aucune ligne, donc 0 fuite.
    const { result } = renderHook(() => useEvents());
    expect(ids(result.current.data)).toEqual([]);
  });
});

describe("intrusion inter-org — garde de contexte", () => {
  it("canAccessOrganization refuse une organisation où l'utilisateur n'est pas lié", async () => {
    expect(await canAccessOrganization("u-a", ORG_A)).toBe(true);
    expect(await canAccessOrganization("u-a", ORG_B)).toBe(false);
  });

  it("canAccessOrganization refuse un utilisateur ou une org vide", async () => {
    expect(await canAccessOrganization("", ORG_A)).toBe(false);
    expect(await canAccessOrganization("u-a", "")).toBe(false);
  });

  it("canAccessOrganization refuse un utilisateur inexistant", async () => {
    expect(await canAccessOrganization("u-inconnu", ORG_A)).toBe(false);
  });
});
