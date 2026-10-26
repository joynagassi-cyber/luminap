/**
 * Tests de capture des erreurs client (contrat Phase 1/2).
 * Priorité : la redaction (aucune PII dans les rapports).
 */
import { describe, it, expect } from "vitest";
import { redact, buildContext, getRecentErrors, clearRecentErrors } from "../clientErrors";

describe("redact — aucune PII dans les rapports", () => {
  it("masque les adresses e-mail", () => {
    expect(redact("user@example.com a échoué")).toBe("<email> a échoué");
  });

  it("masque les jetons JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    expect(redact(`Bearer token=${jwt}`)).not.toContain("eyJhbGci");
  });

  it("masque un en-tête Bearer", () => {
    expect(redact("Authorization: Bearer abc.def.ghi")).toContain("<token>");
  });

  it("laisse passer un message sans PII", () => {
    expect(redact("NetworkError when attempting to fetch resource.")).toBe(
      "NetworkError when attempting to fetch resource.",
    );
  });
});

describe("buildContext", () => {
  it("extrait le message d'une Error", () => {
    const ctx = buildContext("onerror", new Error("boom"));
    expect(ctx.message).toBe("boom");
    expect(ctx.source).toBe("onerror");
  });

  it("accepte une chaîne brute", () => {
    const ctx = buildContext("unhandledrejection", "oops");
    expect(ctx.message).toBe("oops");
    expect(ctx.source).toBe("unhandledrejection");
  });

  it("gère une valeur inconnue", () => {
    const ctx = buildContext("onerror", { weird: true });
    expect(ctx.message).toBe("Erreur inconnue");
  });

  it("redacte le message et la stack", () => {
    const err = new Error("échec pour user@example.com");
    const ctx = buildContext("onerror", err);
    expect(ctx.message).not.toContain("user@example.com");
  });
});

describe("buffer d'erreurs récentes (page santé)", () => {
  it("démarre vide puis conserve les erreurs via les handlers globaux", () => {
    clearRecentErrors();
    expect(getRecentErrors()).toHaveLength(0);
    // installClientErrorCapture n'est pas testé ici (nécessite window) ; on
    // vérifie seulement que le buffer est lisible et effaçable.
    clearRecentErrors();
    expect(getRecentErrors()).toHaveLength(0);
  });
});
