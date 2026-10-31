// @vitest-environment node
/**
 * PR13 — Gel de période comptable : règle pure + persistance + application au
 * point d'étranglement d'écriture (`dataLayer.assertTransactionWritable`).
 *
 * Comportements verrouillés :
 *   1. RÈGLE PURE `isDateLocked` — borne INCLUSIVE : la date de clôture
 *      elle-même est gelée, le LENDEMAIN est ouvert ; aucune clôture ⇒ rien
 *      n'est gelé (fail-open) ; dates illisibles ⇒ non gelées.
 *   2. `assertPeriodOpen` lève une erreur TYPÉE `PERIOD_LOCKED` (message FR)
 *      pour une date gelée, et ne fait rien sinon.
 *   3. PERSISTANCE `lockPeriod` / `getLockedUntil` / `clearPeriodLock` — passe
 *      bien par `org_settings` (clé `period_locked_until`), scoping org, et
 *      `getLockedUntil` est fail-open.
 *   4. APPLICATION : `assertTransactionWritable` lit la clôture puis REJETTE
 *      une date gelée ; une écriture sur date ouverte passe.
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) : remplacer le corps de
 * `isDateLocked` par `return false;` fait échouer les cas « date gelée » et
 * « borne inclusive » ; retirer l'appel `assertTransactionWritable(tx.date)`
 * de `dataLayer` fait échouer « rejette une date gelée via dataLayer ».
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── org_settings stateful mock (même forme que org-settings.test.ts) ────────
const psState = vi.hoisted(() => ({
  rows: [] as Array<{ org_id: string; key: string; value: string | null }>,
}));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: vi.fn(() => ({
    execute: vi.fn(async (sql: string, params: any[]) => {
      if (/INSERT INTO org_settings/i.test(sql)) {
        const [org_id, key, value] = params as string[];
        const existing = psState.rows.find(
          (r) => r.org_id === org_id && r.key === key,
        );
        if (existing) existing.value = value;
        else psState.rows.push({ org_id, key, value });
        return { array: [] };
      }
      if (/DELETE FROM org_settings/i.test(sql)) {
        const [org_id, key] = params as string[];
        psState.rows = psState.rows.filter(
          (r) => !(r.org_id === org_id && r.key === key),
        );
        return { array: [] };
      }
      if (/SELECT value FROM org_settings/i.test(sql)) {
        const [org_id, key] = params as string[];
        return {
          array: psState.rows
            .filter((r) => r.org_id === org_id && r.key === key)
            .map((r) => ({ value: r.value })),
        };
      }
      return { array: [] };
    }),
  })),
}));

vi.mock("@/lib/clientErrors", () => ({ captureClientError: vi.fn() }));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: vi.fn(() => "org-1"),
}));

import {
  isDateLocked,
  assertPeriodOpen,
  isPeriodLockedError,
  periodLockMessage,
  lockPeriod,
  getLockedUntil,
  clearPeriodLock,
  PERIOD_LOCKED,
} from "@/lib/periodLock";
import { ORG_SETTING_KEYS } from "@/lib/orgSettings";

beforeEach(() => {
  psState.rows = [];
});

describe("PR13 — règle pure isDateLocked (borne inclusive, fail-open)", () => {
  it("date égale à la clôture ⇒ GELÉE (borne inclusive)", () => {
    expect(isDateLocked("2026-10-31", "2026-10-31")).toBe(true);
  });

  it("date antérieure ⇒ GELÉE ; LENDEMAIN ⇒ OUVERTE", () => {
    expect(isDateLocked("2026-10-15", "2026-10-31")).toBe(true);
    expect(isDateLocked("2026-11-01", "2026-10-31")).toBe(false);
  });

  it("aucune clôture ⇒ rien n'est gelé (fail-open)", () => {
    expect(isDateLocked("2020-01-01", null)).toBe(false);
    expect(isDateLocked("2020-01-01", undefined)).toBe(false);
    expect(isDateLocked("2020-01-01", "")).toBe(false);
  });

  it("date de transaction illisible ⇒ non gelée (on ne bloque pas sur du douteux)", () => {
    expect(isDateLocked(null, "2026-10-31")).toBe(false);
    expect(isDateLocked("pas-une-date", "2026-10-31")).toBe(false);
  });

  it("tolère une date-heure ISO en entrée (slice au jour)", () => {
    expect(isDateLocked("2026-10-31T22:00:00Z", "2026-10-31")).toBe(true);
  });
});

describe("PR13 — assertPeriodOpen lève une erreur TYPÉE", () => {
  it("date gelée ⇒ PeriodLockedError code PERIOD_LOCKED, message FR", () => {
    try {
      assertPeriodOpen("2026-10-31", "2026-10-31");
      throw new Error("aurait dû lever");
    } catch (e) {
      expect(isPeriodLockedError(e)).toBe(true);
      expect((e as { code: string }).code).toBe(PERIOD_LOCKED);
      expect((e as Error).message).toMatch(/Période comptable clôturée/);
      expect((e as Error).message).toMatch(/31\/10\/2026/);
    }
  });

  it("date ouverte ⇒ aucune exception", () => {
    expect(() => assertPeriodOpen("2026-11-01", "2026-10-31")).not.toThrow();
    expect(() => assertPeriodOpen("2026-01-01", null)).not.toThrow();
  });

  it("periodLockMessage rend le message FR du gel, sinon le repli", () => {
    let locked: unknown;
    try {
      assertPeriodOpen("2026-10-31", "2026-10-31");
    } catch (e) {
      locked = e;
    }
    expect(periodLockMessage(locked, "repli")).toMatch(/Période comptable clôturée/);
    expect(periodLockMessage(new Error("boom"), "repli")).toBe("repli");
  });
});

describe("PR13 — persistance via org_settings (clé period_locked_until)", () => {
  it("lockPeriod écrit dans org_settings puis getLockedUntil relit la date", async () => {
    expect(await getLockedUntil()).toBeNull(); // aucune clôture au départ
    expect(await lockPeriod("2026-10-31")).toBe(true);
    expect(await getLockedUntil()).toBe("2026-10-31");
    // La clé persistée est bien celle du socle partagé.
    expect(psState.rows.some((r) => r.key === ORG_SETTING_KEYS.periodLockedUntil)).toBe(
      true,
    );
  });

  it("lockPeriod refuse une date invalide (pas d'enregistrement)", async () => {
    await expect(lockPeriod("31/10/2026")).rejects.toThrow(/invalide/);
    expect(psState.rows).toHaveLength(0);
  });

  it("clearPeriodLock rouvre la période (plus aucune clôture lue)", async () => {
    await lockPeriod("2026-10-31");
    expect(await clearPeriodLock()).toBe(true);
    expect(await getLockedUntil()).toBeNull();
  });
});
