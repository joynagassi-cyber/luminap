// @vitest-environment jsdom
/**
 * Régression A4 : le provider ne doit JAMAIS lever au montage.
 *
 * Le chiffrement de la base rend sa création asynchrone (lecture de la clé au
 * Keystore). L'ancien provider appelait `getPowerSyncDatabase()` au premier
 * rendu : la fonction LÈVE (« Database not initialized »), React démontait
 * l'arbre et l'application affichait un écran vide — exactement le symptôme
 * « écran noir » que le reste du dépôt combat.
 *
 * Ces tests verrouillent les deux états :
 *   - base pas encore créée → children rendus, aucun contexte, AUCUNE exception ;
 *   - base créée → le contexte est fourni et les hooks de lecture fonctionnent.
 *
 * NON-VACUITÉ : remettre `const db = getPowerSyncDatabase()` dans le provider
 * ⇒ le premier test lève et échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useContext } from "react";
import { PowerSyncContext } from "@powersync/react";

const fakeDb = { id: "db-1" };
const state = { db: null as unknown };

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabaseOrNull: () => state.db,
  getPowerSyncDatabase: () => {
    if (!state.db) throw new Error("[PowerSync] Database not initialized.");
    return state.db;
  },
}));

vi.mock("@/lib/powersync/readiness", () => ({
  isPowerSyncDatabaseCreatedNow: () => state.db !== null,
  subscribePowerSyncDatabaseCreated: () => () => undefined,
}));

import { PowerSyncProvider } from "@/components/PowerSyncProvider";

function Probe() {
  const db = useContext(PowerSyncContext);
  return <div data-testid="probe">{db ? "avec-base" : "sans-base"}</div>;
}

beforeEach(() => {
  state.db = null;
});

afterEach(cleanup);

describe("PowerSyncProvider — démarrage asynchrone (A4)", () => {
  it("base pas encore créée : rend les enfants sans lever", () => {
    expect(() =>
      render(
        <PowerSyncProvider>
          <Probe />
        </PowerSyncProvider>,
      ),
    ).not.toThrow();

    expect(screen.getByTestId("probe")).toHaveTextContent("sans-base");
  });

  it("base créée : le contexte est fourni aux hooks de lecture", () => {
    state.db = fakeDb;
    render(
      <PowerSyncProvider>
        <Probe />
      </PowerSyncProvider>,
    );

    expect(screen.getByTestId("probe")).toHaveTextContent("avec-base");
  });
});
