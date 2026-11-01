// @vitest-environment jsdom
/**
 * PR13 — Contrôle admin du gel de période (`PeriodLockCard`, monté dans
 * `/settings/gestion`).
 *
 * Comportements verrouillés :
 *   1. R52 — tant que la clôture n'a pas été lue, l'écran affiche un squelette
 *      et JAMAIS « aucune période clôturée » (fait faux avant la 1re lecture).
 *   2. Un utilisateur SANS la permission `finance:manage` ne voit AUCUN
 *      contrôle (pas de bouton inerte) — garde RBAC.
 *   3. Fixer une date appelle `lockPeriod` (persistance) et affiche la clôture.
 *   4. « Rouvrir » appelle `clearPeriodLock` et repasse à l'état ouvert.
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) : retirer la garde
 * `if (!allowed) return null;` ⇒ le test « non-admin ne voit rien » échoue.
 * Rendre `loading` toujours `false` ⇒ le test « squelette avant lecture »
 * échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

const lockPeriod = vi.fn(async (d: string) => {
  void d;
  return true;
});
const clearPeriodLock = vi.fn(async () => true);
let lockedUntil: string | null = null;
let loading = false;

const access = vi.hoisted(() => ({ allowed: true }));
const user = vi.hoisted(() => ({ role: "ADMIN" }));

vi.mock("@/lib/periodLock", async () => {
  const actual = await vi.importActual<typeof import("@/lib/periodLock")>(
    "@/lib/periodLock",
  );
  return {
    ...actual,
    lockPeriod: (d: string) => lockPeriod(d),
    clearPeriodLock: () => clearPeriodLock(),
    getLockedUntil: async () => lockedUntil,
  };
});

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({ allowed: access.allowed, loading: false, source: "legacy" }),
}));

vi.mock("@/hooks/usePeriodLock", () => ({
  usePeriodLock: () => ({
    lockedUntil,
    loading,
    setLock: async (d: string) => {
      const ok = await lockPeriod(d);
      if (ok) lockedUntil = d;
      return ok;
    },
    clearLock: async () => {
      const ok = await clearPeriodLock();
      if (ok) lockedUntil = null;
      return ok;
    },
  }),
}));

vi.mock("@/lib/dataLayer", () => ({
  useCurrentUser: () => ({ id: "u-1", role: user.role, org: { id: "org-1" } }),
  isPowerSyncReadyNow: () => true,
}));

vi.mock("@/lib/orgContext", () => ({ getOrganizationId: () => "org-1" }));
vi.mock("@/lib/clientErrors", () => ({ captureClientError: vi.fn() }));
vi.mock("@/components/ui/use-toast", () => ({ toast: vi.fn() }));

import PeriodLockCard from "@/components/PeriodLockCard";

beforeEach(() => {
  lockPeriod.mockClear();
  clearPeriodLock.mockClear();
  lockedUntil = null;
  loading = false;
  access.allowed = true;
  user.role = "ADMIN";
});

afterEach(cleanup);

describe("PR13 — PeriodLockCard", () => {
  it("affiche un squelette et AUCUN verdict « aucune clôture » avant lecture", () => {
    loading = true;
    render(<PeriodLockCard />);
    expect(screen.getByTestId("period-lock-pending")).toBeInTheDocument();
    expect(screen.queryByText(/Aucune période clôturée/)).toBeNull();
  });

  it("un non-admin (sans finance:manage) ne voit aucun contrôle", () => {
    access.allowed = false;
    render(<PeriodLockCard />);
    expect(screen.queryByTestId("period-lock-card")).toBeNull();
    expect(screen.queryByTestId("period-lock-set")).toBeNull();
  });

  it("fixer une date persiste la clôture et l'affiche", async () => {
    render(<PeriodLockCard />);
    expect(
      screen.getByText(/Aucune période clôturée/),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("period-lock-date"), {
      target: { value: "2026-10-31" },
    });
    fireEvent.click(screen.getByTestId("period-lock-set"));

    await waitFor(() => expect(lockPeriod).toHaveBeenCalledWith("2026-10-31"));
    await waitFor(() =>
      expect(screen.getByTestId("period-lock-status")).toHaveTextContent(
        /31\/10\/2026/,
      ),
    );
  });

  it("« Rouvrir la période » appelle clearPeriodLock et repasse à ouvert", async () => {
    lockedUntil = "2026-10-31";
    render(<PeriodLockCard />);
    expect(screen.getByTestId("period-lock-status")).toHaveTextContent(
      /31\/10\/2026/,
    );

    fireEvent.click(screen.getByTestId("period-lock-clear"));
    await waitFor(() => expect(clearPeriodLock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId("period-lock-status")).toHaveTextContent(
        /Aucune période clôturée/,
      ),
    );
  });

  it("le bouton « Rouvrir » est désactivé quand aucune clôture n'existe", () => {
    render(<PeriodLockCard />);
    expect(
      (screen.getByTestId("period-lock-clear") as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
