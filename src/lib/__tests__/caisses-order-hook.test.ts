// @vitest-environment jsdom
/**
 * Câblage — `useCaisses` / `useAccounts` renvoient les caisses DANS L'ORDRE.
 *
 * Défaut mesuré : la requête SQL faisait `ORDER BY name` (ordre alphabétique
 * pur) ; la caisse principale n'apparaissait donc pas en tête et l'ordre était
 * arbitraire vis-à-vis de la hiérarchie. Le correctif trie côté hook
 * (`sortCaisses`), donc TOUS les consommateurs en bénéficient.
 *
 * Le test exerce le SQL RÉEL de `dataLayer.ts` sur `node:sqlite` (aucune
 * réimplémentation du tri dans le mock) : on prouve que le tri est bien
 * appliqué à la sortie du hook, pas seulement dans le helper isolé.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { DatabaseSync } from "node:sqlite";

const { DatabaseSync: SqliteDatabase } = process.getBuiltinModule("node:sqlite") as {
  DatabaseSync: new (path: string) => DatabaseSync;
};

const h = vi.hoisted(() => ({ db: null as any }));

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
vi.mock("@/lib/powersync", () => ({ getPowerSyncDatabase: () => h.db }));
vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: () => ({ caisses: [], accounts: [] }),
}));

import { setOrganizationId, resetOrganizationId } from "@/lib/orgContext";
import { markPowerSyncReady, useCaisses, useAccounts } from "@/lib/dataLayer";

const ORG = "org-A";

function makeDb(): DatabaseSync {
  const db = new SqliteDatabase(":memory:");
  db.exec(`
    CREATE TABLE caisses (
      id text, name text, description text, type text, color text, org_id text,
      created_at text, updated_at text
    );
    CREATE TABLE accounts (
      id text, org_id text, owner_type text, owner_id text, name text,
      currency text, status text, archived_at text, archived_by text,
      archive_reason text, created_at text, updated_at text
    );
  `);
  const ins = (t: string, r: Record<string, unknown>) => {
    const cols = Object.keys(r);
    db.prepare(
      `INSERT INTO ${t} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    ).run(...(cols.map((c) => r[c]) as any[]));
  };
  // Ordre alphabétique défavorable : « Zélie » avant la principale « Caisse ».
  ins("caisses", { id: "z", org_id: ORG, name: "Zélie", type: "GROUP" });
  ins("caisses", { id: "main", org_id: ORG, name: "Caisse principale", type: "MAIN" });
  ins("caisses", { id: "a", org_id: ORG, name: "Aumônerie", type: "GROUP" });
  ins("accounts", {
    id: "acc-z", org_id: ORG, owner_type: "GROUP", name: "Zélie", status: "ACTIVE",
  });
  ins("accounts", {
    id: "acc-main", org_id: ORG, owner_type: "ORGANIZATION",
    name: "Caisse principale", status: "ACTIVE",
  });
  return db;
}

const ids = (rows: any[] | undefined) => (rows ?? []).map((r) => r.id);

beforeEach(() => {
  h.db = makeDb();
  markPowerSyncReady();
  resetOrganizationId();
  setOrganizationId(ORG);
});

describe("useCaisses / useAccounts — ordre principal d'abord", () => {
  it("useCaisses place la caisse principale en tête, puis les groupes par nom", () => {
    const { result } = renderHook(() => useCaisses());
    expect(ids(result.current.data)).toEqual(["main", "a", "z"]);
  });

  it("useAccounts place le compte d'organisation en tête", () => {
    const { result } = renderHook(() => useAccounts());
    expect(ids(result.current.data)).toEqual(["acc-main", "acc-z"]);
  });
});
