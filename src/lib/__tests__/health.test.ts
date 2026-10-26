/**
 * Health snapshot (Phase 11, proposition PR4) — cœur pur.
 *
 * Vérifie la logique de sévérité et le rapport, sans navigateur ni PowerSync.
 * Le but du rapport est de donner une vue « santé » fiable : si l'organisation
 * n'est pas résolue, c'est une ERREUR (l'app ne peut pas fonctionner) ; hors
 * ligne ou sync en attente sont des avertissements ; des erreurs récentes
 * nombreuses sont une erreur.
 */
import { describe, it, expect } from "vitest";

import { buildHealthReport, worstLevel } from "@/lib/health";
import type { HealthInputs } from "@/lib/health";

const base: HealthInputs = {
  appVersion: "1.0.9",
  platform: "web",
  online: true,
  syncReady: true,
  hasOrg: true,
  orgId: "org-1",
  recentErrorCount: 0,
};

describe("worstLevel", () => {
  it("renvoie ok si tout est ok", () => {
    expect(worstLevel(["ok", "ok"])).toBe("ok");
  });
  it("warn prime sur ok", () => {
    expect(worstLevel(["ok", "warn"])).toBe("warn");
  });
  it("error prime sur tout", () => {
    expect(worstLevel(["ok", "warn", "error"])).toBe("error");
  });
  it("liste vide = ok", () => {
    expect(worstLevel([])).toBe("ok");
  });
});

describe("buildHealthReport", () => {
  it("nominal : tout vert → overall ok", () => {
    const r = buildHealthReport(base, "2026-10-26T12:00:00.000Z");
    expect(r.overall).toBe("ok");
    expect(r.generatedAt).toBe("2026-10-26T12:00:00.000Z");
    expect(r.checks.find((c) => c.id === "org")?.level).toBe("ok");
  });

  it("organisation non résolue = error (bloque l'app)", () => {
    const r = buildHealthReport({ ...base, hasOrg: false }, "t");
    expect(r.checks.find((c) => c.id === "org")?.level).toBe("error");
    expect(r.overall).toBe("error");
  });

  it("hors ligne = warn (mode local), pas une erreur", () => {
    const r = buildHealthReport({ ...base, online: false }, "t");
    expect(r.checks.find((c) => c.id === "network")?.level).toBe("warn");
    expect(r.overall).toBe("warn");
  });

  it("sync en attente = warn", () => {
    const r = buildHealthReport({ ...base, syncReady: false }, "t");
    expect(r.checks.find((c) => c.id === "sync")?.level).toBe("warn");
  });

  it("peu d'erreurs = warn, beaucoup = error", () => {
    expect(
      buildHealthReport({ ...base, recentErrorCount: 2 }, "t").checks.find(
        (c) => c.id === "errors",
      )?.level,
    ).toBe("warn");
    expect(
      buildHealthReport({ ...base, recentErrorCount: 9 }, "t").checks.find(
        (c) => c.id === "errors",
      )?.level,
    ).toBe("error");
  });

  it("version manquante = warn", () => {
    const r = buildHealthReport({ ...base, appVersion: "" }, "t");
    expect(r.checks.find((c) => c.id === "version")?.level).toBe("warn");
  });

  it("le détail des erreurs cite la dernière erreur (sans PII)", () => {
    const r = buildHealthReport(
      { ...base, recentErrorCount: 1, lastErrorMessage: "boom" },
      "t",
    );
    const err = r.checks.find((c) => c.id === "errors");
    expect(err?.detail).toContain("boom");
    expect(err?.detail).toContain("1 erreur");
  });
});
