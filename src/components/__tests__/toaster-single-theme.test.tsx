// @vitest-environment jsdom
/**
 * A6 — un seul toaster, thème réel, hors des zones d'en-tête.
 *
 * Défauts verrouillés ici (tous constatés dans le code, pas supposés) :
 *   1. `App.tsx` montait DEUX toasters Sonner (`Toaster` + `Toaster as Sonner`)
 *      → chaque message pouvait s'afficher deux fois ;
 *   2. le second lisait son thème dans `next-themes`, dépendance Next.js que
 *      l'application n'utilise nulle part : le thème réel (`data-theme` sur
 *      `<html>`, posé par `applyStoredThemeMode`) était ignoré ;
 *   3. la position : `top-center` est CONSERVÉE après examen — un toast placé
 *      en bas passerait au-dessus de la barre d'onglets (`--z-toast` 70 >
 *      `--z-nav` 40) et masquerait la navigation principale.
 *
 * NON-VACUITÉ : revenir à `theme="system"` (ou supprimer l'observateur) fait
 * échouer le test de bascule de thème ; remettre `position="top-center"` fait
 * échouer le test de position.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

const sonner = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }));

vi.mock("sonner", () => ({
  Toaster: (props: Record<string, unknown>) => {
    sonner.props.push(props);
    return <div data-testid="sonner" />;
  },
}));

import { Toaster } from "@/components/ui/toaster";

beforeEach(() => {
  sonner.props = [];
  delete document.documentElement.dataset.theme;
});

afterEach(cleanup);

describe("A6 — Toaster unique", () => {
  it("transmet le thème SOMBRE par défaut (pas « system »)", () => {
    render(<Toaster />);
    const props = sonner.props.at(-1)!;
    expect(props.theme).toBe("dark");
    expect(props.theme).not.toBe("system");
  });

  it("suit le thème réel de l'application (`data-theme`)", () => {
    document.documentElement.dataset.theme = "light";
    render(<Toaster />);
    expect(sonner.props.at(-1)!.theme).toBe("light");
  });

  it("réagit à un changement de thème après le montage", async () => {
    document.documentElement.dataset.theme = "dark";
    render(<Toaster />);
    expect(sonner.props.at(-1)!.theme).toBe("dark");

    await act(async () => {
      document.documentElement.dataset.theme = "light";
      // Laisse le MutationObserver livrer son rappel.
      await Promise.resolve();
    });

    expect(sonner.props.at(-1)!.theme).toBe("light");
  });

  it("ne recouvre JAMAIS la barre d'onglets (position haute)", () => {
    render(<Toaster />);
    const props = sonner.props.at(-1)!;
    // Le toast a un z-index supérieur au nav : placé en bas, il masquerait des
    // boutons de navigation. Il doit donc rester en haut.
    expect(props.position).toBe("top-center");
    expect(JSON.stringify(props.offset)).toContain("safe-area-top");
  });
});
