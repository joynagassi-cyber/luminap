// @vitest-environment jsdom
/**
 * Anti double-soumission (Phase 10 / PM17).
 *
 * Défaut visé : un double-clic/double-tap rapide sur une action financière
 * déclenche le handler DEUX fois avant que React ne re-rendu (`disabled`).
 * Preuve : avec `useSubmitGuard`, le 2ᵉ appel concurrent est ignoré → le
 * service n'est appelé qu'UNE fois.
 */
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";

function Harness({ fn }: { fn: () => Promise<void> }) {
  const { submitting, run } = useSubmitGuard();
  return (
    <button
      disabled={submitting}
      onClick={() => {
        void run(fn).catch(() => {});
      }}
    >
      {submitting ? "En cours" : "Valider"}
    </button>
  );
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((r) => {
    resolve = () => r();
  });
  return { promise, resolve };
}

describe("useSubmitGuard — anti double-soumission", () => {
  it("deux clics rapides = UN seul appel (le 2ᵉ est ignoré)", async () => {
    const d = deferred();
    const fn = vi.fn(() => d.promise);

    render(<Harness fn={fn} />);
    const btn = screen.getByRole("button");

    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(fn).toHaveBeenCalledTimes(1);

    d.resolve();
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());

    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
    cleanup();
  });

  it("le bouton est désactivé pendant l'exécution", async () => {
    const d = deferred();
    const fn = vi.fn(() => d.promise);

    render(<Harness fn={fn} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByRole("button")).toBeDisabled());

    d.resolve();
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());
    cleanup();
  });

  it("réarme le guard même si `fn` échoue (pas de blocage définitif)", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    render(<Harness fn={fn} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
    cleanup();
  });
});
