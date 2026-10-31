/**
 * Tests de src/lib/orgSettings.ts — socle de réglages par organisation
 * (PR8 maker-checker, PR13 gel de période).
 *
 * Non-vacuité : la logique de lecture/écriture est réelle (mock PowerSync
 * stateful qui stocke les lignes). Retirer le `JSON.parse` ou la clause
 * `ON CONFLICT` ferait échouer les tests de round-trip.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── PowerSync mock stateful (stockage en mémoire de org_settings) ──────────
const psState = vi.hoisted(() => ({
  rows: [] as Array<{ org_id: string; key: string; value: string | null }>,
  failExecute: false,
}));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: vi.fn(() => ({
    execute: vi.fn(async (sql: string, params: any[]) => {
      if (psState.failExecute) throw new Error("db down");
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

vi.mock("@/lib/clientErrors", () => ({
  captureClientError: vi.fn(),
}));

import {
  getOrgSetting,
  setOrgSetting,
  clearOrgSetting,
  ORG_SETTING_KEYS,
} from "@/lib/orgSettings";
import { captureClientError } from "@/lib/clientErrors";

const ORG = "org-test-1";

beforeEach(() => {
  psState.rows = [];
  psState.failExecute = false;
  vi.mocked(captureClientError).mockClear();
});

describe("orgSettings — lecture / écriture / suppression", () => {
  it("un réglage ABSENT renvoie le défaut fourni (fail-safe)", async () => {
    expect(await getOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, false, ORG)).toBe(
      false,
    );
    expect(await getOrgSetting(ORG_SETTING_KEYS.periodLockedUntil, null, ORG)).toBe(
      null,
    );
  });

  it("round-trip : écrit puis relit la même valeur (objet et scalaire)", async () => {
    await setOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, true, ORG);
    expect(await getOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, false, ORG)).toBe(
      true,
    );

    await setOrgSetting(ORG_SETTING_KEYS.periodLockedUntil, "2026-10-31", ORG);
    expect(
      await getOrgSetting(ORG_SETTING_KEYS.periodLockedUntil, null, ORG),
    ).toBe("2026-10-31");
  });

  it("l'écriture est un UPSERT : une seconde valeur remplace la première, sans doublon", async () => {
    await setOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, true, ORG);
    await setOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, false, ORG);
    expect(psState.rows).toHaveLength(1);
    expect(
      await getOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, true, ORG),
    ).toBe(false);
  });

  it("les réglages sont cloisonnés par organisation", async () => {
    await setOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, true, ORG);
    await setOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, false, "org-2");
    expect(
      await getOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, true, ORG),
    ).toBe(true);
    expect(
      await getOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, true, "org-2"),
    ).toBe(false);
  });

  it("clearOrgSetting ramène au défaut", async () => {
    await setOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, true, ORG);
    expect(await clearOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, ORG)).toBe(
      true,
    );
    expect(await getOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, false, ORG)).toBe(
      false,
    );
  });

  it("une valeur illisible (JSON invalide) retombe sur le défaut sans lever", async () => {
    psState.rows.push({
      org_id: ORG,
      key: ORG_SETTING_KEYS.makerCheckerEnabled,
      value: "{not json",
    });
    expect(await getOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, false, ORG)).toBe(
      false,
    );
  });

  it("une erreur de base est instrumentée puis retombe sur le défaut (jamais d'exception)", async () => {
    psState.failExecute = true;
    expect(await getOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, false, ORG)).toBe(
      false,
    );
    expect(captureClientError).toHaveBeenCalled();
    expect(await setOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, true, ORG)).toBe(
      false,
    );
  });
});
