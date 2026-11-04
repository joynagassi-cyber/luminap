// @vitest-environment jsdom
/**
 * A5 — fraîcheur des pages à données SANS `useIonViewWillEnter`.
 *
 * Contexte : Ionic garde les pages précédentes MONTÉES dans la pile
 * (`IonRouterOutlet`). L'audit craignait des données périmées au retour
 * en arrière faute de hook de cycle de vie de vue. Vérification faite,
 * les pages à données de Lumina consomment les hooks RÉACTIFS de
 * `dataLayer` (@powersync/react `useQuery`) : l'abonnement survit tant
 * que la page est montée, donc une donnée créée sur la page du dessus
 * est poussée dans la page retrouvée — sans remontage ni re-fetch.
 *
 * Ce test prouve le contrat côté app : le hook reflète le résultat
 * vivant de sa requête à chaque rendu (aucune copie figée au montage).
 * La poussée elle-même est le contrat de @powersync/react (simulée ici
 * par la réexécution SQL du mock à chaque rendu, comme
 * `caisses-order-hook.test.ts`). Le scénario bout-en-bout (créer →
 * retour → liste à jour) est validé sur appareil (checklist §4.15).
 *
 * `useIonViewWillEnter` reste l'outil indiqué pour une page qui
 * chargerait ses données de façon impérative ponctuelle — aucune page
 * à données ne le fait aujourd'hui (revue A5 ; exception assumée :
 * `CentralAdmin`, chargement à la sélection, voir docs/ui-exceptions.md).
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
import { markPowerSyncReady, useCaisses } from "@/lib/dataLayer";

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
  return db;
}

function insCaisse(id: string, name: string, type: string): void {
  h.db
    .prepare("INSERT INTO caisses (id, org_id, name, type) VALUES (?, ?, ?, ?)")
    .run(id, ORG, name, type);
}

const ids = (rows: any[] | undefined) => (rows ?? []).map((r) => r.id);

beforeEach(() => {
  h.db = makeDb();
  markPowerSyncReady();
  resetOrganizationId();
  setOrganizationId(ORG);
});

describe("A5 — une page gardée montée reçoit les données créées ailleurs", () => {
  it("création sur la page du dessus → visible au retour, sans remontage", () => {
    insCaisse("main", "Caisse principale", "MAIN");
    const { result, rerender } = renderHook(() => useCaisses());
    expect(ids(result.current.data)).toEqual(["main"]);

    // La page « création » écrit pendant que celle-ci reste montée dans
    // la pile ; PowerSync pousse le nouveau résultat → re-rendu du hook.
    insCaisse("event", "Événements", "GROUP");
    rerender();

    expect(ids(result.current.data)).toEqual(["main", "event"]);
  });

  it("suppression ailleurs → disparaît aussi sans remontage", () => {
    insCaisse("main", "Caisse principale", "MAIN");
    insCaisse("event", "Événements", "GROUP");
    const { result, rerender } = renderHook(() => useCaisses());
    expect(ids(result.current.data)).toEqual(["main", "event"]);

    h.db.prepare("DELETE FROM caisses WHERE id = ?").run("event");
    rerender();

    expect(ids(result.current.data)).toEqual(["main"]);
  });
});
