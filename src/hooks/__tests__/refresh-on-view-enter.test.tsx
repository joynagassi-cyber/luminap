// @vitest-environment jsdom
/**
 * A5 — rafraîchissement au RETOUR dans la vue.
 *
 * Ionic conserve les pages montées : un `useEffect(…, [])` ne rejoue pas au
 * retour, et l'écran réaffichait des données périmées. Ces tests vérifient que
 * le hook passe bien par `useIonViewWillEnter` (le hook OFFICIEL d'Ionic, pas
 * un écouteur maison) et qu'il n'avale aucune erreur.
 *
 * NON-VACUITÉ : remplacer `useIonViewWillEnter` par `useEffect` ⇒ le test
 * « ne recharge PAS au montage » échoue (double chargement au premier
 * affichage) ; retirer le `.catch` ⇒ le test « erreur remontée » échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, cleanup } from "@testing-library/react";

const ionic = vi.hoisted(() => ({
  entered: [] as (() => void)[],
  calls: 0,
}));

vi.mock("@ionic/react", () => ({
  useIonViewWillEnter: (cb: () => void) => {
    ionic.calls += 1;
    ionic.entered.push(cb);
  },
}));

import { useRefreshOnViewEnter } from "@/hooks/useRefreshOnViewEnter";

function Page({ reload }: { reload: () => unknown }) {
  useRefreshOnViewEnter(reload, { label: "test" });
  return <div>page</div>;
}

/** Déclenche la DERNIÈRE souscription (celle de l'écran actuellement monté) —
 *  un routeur Ionic réel ne rejoue pas les souscriptions des vues quittées. */
function enter() {
  ionic.entered.at(-1)?.();
}

beforeEach(() => {
  ionic.entered = [];
  ionic.calls = 0;
});

afterEach(cleanup);

describe("useRefreshOnViewEnter", () => {
  it("s'abonne au hook Ionic et ne recharge PAS au montage", () => {
    const reload = vi.fn();
    render(<Page reload={reload} />);

    expect(ionic.calls).toBe(1);
    expect(reload).not.toHaveBeenCalled();

    enter();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("recharge à CHAQUE entrée dans la vue (retour inclus)", () => {
    const reload = vi.fn();
    render(<Page reload={reload} />);

    enter();
    enter();
    enter();
    expect(reload).toHaveBeenCalledTimes(3);
  });

  it("utilise toujours la dernière version du callback (pas de fermeture périmée)", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Page reload={first} />);
    rerender(<Page reload={second} />);

    enter();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("remonte une promesse rejetée à `onError` (jamais avalée)", async () => {
    const onError = vi.fn();
    const failure = new Error("réseau");
    function FailingPage() {
      useRefreshOnViewEnter(() => Promise.reject(failure), { label: "archives", onError });
      return <div />;
    }
    render(<FailingPage />);
    enter();

    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(failure, { label: "archives", phase: "refresh" });
  });

  it("remonte une exception synchrone à `onError`", () => {
    const onError = vi.fn();
    function ThrowingPage() {
      useRefreshOnViewEnter(
        () => {
          throw new Error("sync");
        },
        { label: "x", onError },
      );
      return <div />;
    }
    render(<ThrowingPage />);

    expect(() => enter()).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("respecte `enabled: false` (écran en cours de soumission)", () => {
    const reload = vi.fn();
    function DisabledPage() {
      useRefreshOnViewEnter(reload, { label: "x", enabled: false });
      return <div />;
    }
    render(<DisabledPage />);

    enter();
    expect(reload).not.toHaveBeenCalled();
  });
});
