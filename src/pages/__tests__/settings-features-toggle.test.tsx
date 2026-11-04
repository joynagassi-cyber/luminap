// @vitest-environment jsdom
/**
 * A7 — `/settings/features` : les interrupteurs de visibilité sont des
 * `IonToggle` (interrupteur natif), plus des boutons maison imitant un
 * interrupteur.
 *
 * Le test ne compte pas les composants : il vérifie qu'EN BASCULER UN change
 * réellement l'état persisté. C'est là que ce genre de migration casse en
 * silence — un `IonToggle` bien présent mais dont l'`onIonChange` n'écrit
 * rien.
 *
 * NON-VACUITÉ : retirer le `onIonChange` du `IonToggle` fait échouer le test
 * « basculer un interrupteur masque la fonctionnalité ».
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

const store = vi.hoisted(() => ({ setFeatureVisible: vi.fn() }));

vi.mock("@/lib/features", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/features")>();
  const visible = Object.fromEntries(
    actual.FEATURES.filter((f) => f.kind === "feature").map((f) => [f.id, true]),
  );
  return {
    ...actual,
    // Aucune fonctionnalité épinglée : toutes sont donc pilotables.
    useFeatureConfig: () => ({
      visible,
      navTabs: [],
      setFeatureVisible: store.setFeatureVisible,
      addNavTab: vi.fn(),
      removeNavTab: vi.fn(),
      moveNavTab: vi.fn(),
      resetFeatures: vi.fn(),
    }),
  };
});

import SettingsFeatures from "@/pages/SettingsFeatures";

beforeEach(() => {
  cleanup();
  store.setFeatureVisible.mockReset();
});

describe("A7 — /settings/features : interrupteurs", () => {
  it("rend un interrupteur par fonctionnalité, avec un libellé explicite", () => {
    render(
      <MemoryRouter>
        <SettingsFeatures />
      </MemoryRouter>,
    );

    const toggles = screen.getAllByRole("switch");
    expect(toggles.length).toBeGreaterThan(0);
    // Le libellé doit rester parlant pour un lecteur d'écran.
    expect(screen.getByRole("switch", { name: "Afficher Événements" })).toBeInTheDocument();
  });

  it("basculer un interrupteur masque RÉELLEMENT la fonctionnalité", () => {
    render(
      <MemoryRouter>
        <SettingsFeatures />
      </MemoryRouter>,
    );

    const toggle = screen.getByRole("switch", { name: "Afficher Événements" });
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);

    // L'état persisté reçoit l'inverse de l'état courant : `false`.
    expect(store.setFeatureVisible).toHaveBeenCalledWith("events", false);
  });
});
