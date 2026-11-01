// @vitest-environment jsdom
/**
 * Error reporter — classification, rapport contextuel SANS PII, dédup /
 * rate-limiting, file d'attente hors-ligne et flush.
 *
 * Le transport est INJECTÉ (`setReportTransport`) : on teste la vraie logique
 * (construction, dédup, file) sans appeler l'edge function ni Supabase.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  classifyError,
  errorSignature,
  buildErrorReport,
  scrubIdentities,
  reportError,
  flushPendingReports,
  getQueuedReports,
  clearQueuedReports,
  resetReporterState,
  setReportTransport,
  setReportIdentities,
  shouldReport,
  DEDUPE_WINDOW_MS,
  type ErrorReport,
} from "@/lib/observability/errorReporter";
import { pushBreadcrumb, clearBreadcrumbs } from "@/lib/observability/breadcrumbs";

beforeEach(() => {
  resetReporterState();
  clearQueuedReports();
  clearBreadcrumbs();
  setReportIdentities([]);
  setReportTransport(async () => ({ ok: false })); // par défaut : ne pas « envoyer »
});

describe("classifyError", () => {
  it("détecte les erreurs de base de données (RLS, SQLSTATE, PostgREST)", () => {
    expect(classifyError('new row violates row-level security policy for table "x"', undefined)).toBe("database");
    expect(classifyError("duplicate key value violates unique constraint", undefined)).toBe("database");
    expect(classifyError("permission denied for table transactions", undefined)).toBe("database");
    // Le code PostgREST/SQLSTATE est porté par `err.code`, pas le message.
    expect(classifyError("boom", undefined, undefined, "PGRST301")).toBe("database");
    expect(classifyError("boom", undefined, undefined, "42501")).toBe("database");
  });

  it("détecte les erreurs de synchronisation (PowerSync)", () => {
    expect(classifyError("PSYNC_S2105 Unexpected aud claim", undefined)).toBe("sync");
    expect(classifyError("waitForFirstSync failed", undefined)).toBe("sync");
    expect(classifyError("uploadData rejected", undefined)).toBe("sync");
  });

  it("détecte les erreurs de performance", () => {
    expect(classifyError("Tâche longue détectée (230 ms)", undefined)).toBe("performance");
    expect(classifyError("operation timed out", undefined)).toBe("performance");
  });

  it("classe le reste en fonctionnel", () => {
    expect(classifyError("Le montant est invalide", undefined)).toBe("functional");
  });

  it("un type explicite prime sur l'inférence", () => {
    expect(classifyError("boom", undefined, "crash")).toBe("crash");
  });
});

describe("errorSignature", () => {
  it("est stable pour une même erreur (même message + même trame)", () => {
    const stack = "Error: x\n    at f (index-abc12345.js:1:2)";
    const a = errorSignature("crash", "x", stack);
    const b = errorSignature("crash", "x", stack);
    expect(a).toBe(b);
  });

  it("ignore le hash de build (regroupe entre déploiements)", () => {
    const s1 = "Error: x\n    at f (index-aaaaaaaa.js:1:2)";
    const s2 = "Error: x\n    at f (index-bbbbbbbb.js:1:2)";
    expect(errorSignature("crash", "x", s1)).toBe(errorSignature("crash", "x", s2));
  });

  it("diffère selon le type", () => {
    expect(errorSignature("crash", "x")).not.toBe(errorSignature("sync", "x"));
  });
});

describe("scrubIdentities", () => {
  it("retire les identités par valeur (insensible à la casse)", () => {
    const out = scrubIdentities("Contact jean@x.com (Jean Dupont)", ["jean@x.com", "Jean Dupont"]);
    expect(out).not.toContain("jean@x.com");
    expect(out).not.toContain("Jean Dupont");
  });

  it("ignore les jetons trop courts", () => {
    expect(scrubIdentities("a a a", ["a"])).toBe("a a a");
  });
});

describe("buildErrorReport — politique PII", () => {
  it("expurge e-mail et jeton du message et de la stack", () => {
    const err = new Error("échec pour user@example.com token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghij.klmnopqrst");
    err.stack = "Error: échec pour user@example.com\n at x";
    const report = buildErrorReport(err, { source: "handled" }, "2026-11-01T00:00:00.000Z");
    expect(report.message).not.toContain("user@example.com");
    expect(report.stack).not.toContain("user@example.com");
  });

  it("retire les identités connues par valeur", () => {
    const err = new Error("Impossible d'enregistrer pour Jean Dupont");
    const report = buildErrorReport(err, { source: "handled" }, "2026-11-01T00:00:00.000Z", [
      "Jean Dupont",
    ]);
    expect(report.message).not.toContain("Jean Dupont");
  });

  it("joint les 5 dernières actions du fil d'Ariane", () => {
    for (let i = 0; i < 8; i += 1) pushBreadcrumb("ui", `action ${i}`);
    const report = buildErrorReport(new Error("boom"), { source: "handled" }, "now");
    expect(report.breadcrumbs).toHaveLength(5);
    expect(report.breadcrumbs[4].message).toBe("action 7");
  });

  it("structure le contexte d'exécution", () => {
    const report = buildErrorReport(new Error("boom"), { source: "handled" }, "2026-11-01T00:00:00.000Z");
    expect(report.kind).toBe("lumina-error-report");
    expect(report.generatedAt).toBe("2026-11-01T00:00:00.000Z");
    expect(report.type).toBe("functional");
    expect(report.source).toBe("handled");
    expect(report.session).toEqual({ authenticated: false, role: null });
  });
});

describe("déduplication / rate-limiting", () => {
  it("shouldReport refuse une signature vue dans la fenêtre", () => {
    const now = Date.now();
    expect(shouldReport("sig", now)).toBe(true);
    // simule un signalement déjà enregistré
    reportError(new Error("boom"), { source: "handled" });
    const sig = getQueuedReports()[0]?.signature ?? "sig";
    expect(shouldReport(sig, Date.now())).toBe(false);
  });

  it("reportError ne met en file qu'UNE fois la même erreur", () => {
    // Même site d'appel (même ligne → même signature) répété : une seule entrée.
    for (let i = 0; i < 3; i += 1) reportError(new Error("même erreur"), { source: "handled" });
    expect(getQueuedReports()).toHaveLength(1);
  });

  it("reportError ne lève jamais", () => {
    expect(() => reportError(undefined, { source: "handled" })).not.toThrow();
  });

  it("la fenêtre de dédup est d'une minute", () => {
    expect(DEDUPE_WINDOW_MS).toBe(60_000);
  });
});

describe("file d'attente et flush", () => {
  it("un envoi réussi vide la file", async () => {
    reportError(new Error("boom 1"), { source: "handled" });
    // Laisse l'envoi automatique (transport par défaut : échec) se terminer
    // avant de changer de transport, sinon le flush partagé garde l'ancien.
    await flushPendingReports();
    expect(getQueuedReports()).toHaveLength(1);
    setReportTransport(async () => ({ ok: true }));
    const sent = await flushPendingReports();
    expect(sent).toBe(1);
    expect(getQueuedReports()).toHaveLength(0);
  });

  it("un échec conserve le rapport en file pour un nouvel essai", async () => {
    reportError(new Error("boom 2"), { source: "handled" });
    await flushPendingReports();
    setReportTransport(async () => ({ ok: false }));
    const sent = await flushPendingReports();
    expect(sent).toBe(0);
    expect(getQueuedReports()).toHaveLength(1);
  });

  it("un transport qui lève ne perd pas le rapport", async () => {
    reportError(new Error("boom 3"), { source: "handled" });
    await flushPendingReports();
    setReportTransport(async () => {
      throw new Error("réseau");
    });
    const sent = await flushPendingReports();
    expect(sent).toBe(0);
    expect(getQueuedReports()).toHaveLength(1);
  });

  it("les appels concurrents de flush partagent le même résultat", async () => {
    reportError(new Error("boom 4"), { source: "handled" });
    await flushPendingReports();
    setReportTransport(async () => ({ ok: true }));
    const [a, b] = await Promise.all([flushPendingReports(), flushPendingReports()]);
    expect(a).toBe(b);
    expect(getQueuedReports()).toHaveLength(0);
  });

  it("le rapport mis en file est complet et expurgé", () => {
    setReportIdentities(["jean@x.com"]);
    reportError(new Error("échec pour jean@x.com"), { source: "handled", route: "/finance" });
    const report = getQueuedReports()[0] as ErrorReport;
    expect(report.route).toBe("/finance");
    expect(report.message).not.toContain("jean@x.com");
  });

  it("getQueuedReports tolère un stockage corrompu", () => {
    localStorage.setItem("lumina-error-reports-queue", "{not json");
    expect(getQueuedReports()).toEqual([]);
  });
});
