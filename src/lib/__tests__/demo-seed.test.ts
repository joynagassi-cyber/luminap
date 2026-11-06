// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildDemoTransactions, DEMO_ENABLED, seedDemoData } from "@/lib/demo/seedDemo";

describe("démo faker (DEV-only)", () => {
  it("DEMO_ENABLED vaut true en test (DEV) — le garde prod repose sur import.meta.env.DEV", () => {
    expect(DEMO_ENABLED).toBe(true);
  });

  it("buildDemoTransactions : déterministe (seed fixe), N lignes valides sur 6 mois", () => {
    const a = buildDemoTransactions(30, "org-demo", 42);
    const b = buildDemoTransactions(30, "org-demo", 42);
    expect(a).toEqual(b); // déterministe
    expect(a).toHaveLength(30);
    for (const tx of a) {
      expect(tx.org_id).toBe("org-demo");
      expect(["INCOME", "EXPENSE"]).toContain(tx.type);
      expect(tx.amount).toBeGreaterThanOrEqual(500);
      expect(tx.amount).toBeLessThanOrEqual(250000);
      expect(tx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["APPROVED", "PENDING"]).toContain(tx.status);
    }
    // au moins une entrée et une sortie
    expect(a.some((t) => t.type === "INCOME")).toBe(true);
    expect(a.some((t) => t.type === "EXPENSE")).toBe(true);
  });

  it("seedDemoData ne lève jamais et retourne un compte (0 sans DB initialisée en test)", async () => {
    const n = await seedDemoData(5);
    expect(typeof n).toBe("number");
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(5);
  });
});
