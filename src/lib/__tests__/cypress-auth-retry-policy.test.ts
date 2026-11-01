/**
 * Garde anti-dérive de la politique de résilience cloud-auth.
 *
 * Le module testé (`cypress/support/authRetryPolicy.ts`) est PUR (aucune
 * dépendance Cypress) : il décide, à partir du statut HTTP GoTrue et de la
 * bannière d'erreur, si une tentative est :
 *   - TRANSITOIRE (429/5xx/POST en vol) → retentable puis skippable ;
 *   - AUTHENTIQUE (identifiants invalides) → JAMAIS retentée, JAMAIS skippée.
 *
 * Ce test verrouille la règle « jamais de skip silencieux sur un vrai échec
 * d'auth » — c'est la propriété qui rend le gate CI digne de confiance.
 */
import { describe, it, expect } from "vitest";
import {
  AUTH_RETRY,
  classifyAuthAttempt,
  classifyAuthBanner,
  cloudBackoffDelayMs,
  isRetryable,
  maySkipAfterBudget,
} from "../../../cypress/support/authRetryPolicy";

describe("cloud-auth retry policy — budget borné", () => {
  it("le budget de retry est borné et le backoff plafonné", () => {
    expect(AUTH_RETRY.maxAttempts).toBeGreaterThan(1);
    expect(AUTH_RETRY.maxAttempts).toBeLessThanOrEqual(5);
    // Backoff exponentiel mais plafonné.
    expect(cloudBackoffDelayMs(1)).toBe(AUTH_RETRY.baseDelayMs);
    expect(cloudBackoffDelayMs(2)).toBe(AUTH_RETRY.baseDelayMs * 2);
    expect(cloudBackoffDelayMs(50)).toBe(AUTH_RETRY.maxDelayMs);
  });
});

describe("cloud-auth retry policy — classification", () => {
  it("429/5xx/408 sont TRANSITOIRES (retentables)", () => {
    for (const status of [408, 429, 500, 502, 503, 504]) {
      expect(classifyAuthAttempt(status, "")).toBe("transient");
      expect(isRetryable(classifyAuthAttempt(status, ""))).toBe(true);
    }
  });

  it("400/401/403 sans bannière reconnue = identifiants refusés (jamais retentés)", () => {
    for (const status of [400, 401, 403]) {
      const kind = classifyAuthAttempt(status, "");
      expect(kind).toBe("invalid-credentials");
      expect(isRetryable(kind)).toBe(false);
    }
  });

  it("la bannière « Invalid email or password » = échec authentique", () => {
    expect(classifyAuthBanner("Invalid email or password.")).toBe(
      "invalid-credentials",
    );
    expect(
      classifyAuthAttempt(400, "Invalid email or password."),
    ).toBe("invalid-credentials");
  });

  it("la bannière rate-limit est TRANSITOIRE même sur un 400", () => {
    expect(
      classifyAuthBanner("Too many login attempts. Please wait and try again."),
    ).toBe("transient");
  });

  it("« already exists » = already-registered", () => {
    expect(classifyAuthBanner("User already exists")).toBe(
      "already-registered",
    );
  });

  it("status 0 (POST en vol) = pending", () => {
    expect(classifyAuthAttempt(0, "")).toBe("pending");
  });
});

describe("cloud-auth retry policy — règle « jamais de skip silencieux »", () => {
  it("un échec AUTHENTIQUE n'est JAMAIS skippable", () => {
    expect(maySkipAfterBudget("invalid-credentials", "Invalid email or password.")).toBe(
      false,
    );
    expect(maySkipAfterBudget("already-registered", "User already exists")).toBe(
      false,
    );
  });

  it("une cause INFRA (transitoire) est skippable", () => {
    expect(maySkipAfterBudget("transient", "Too many requests")).toBe(true);
  });

  it("un pending SANS bannière (POST jamais revenu) est skippable", () => {
    expect(maySkipAfterBudget("pending", "")).toBe(true);
  });

  it("un pending AVEC une bannière inconnue n'est PAS skippable (on échoue)", () => {
    expect(maySkipAfterBudget("pending", "quelque chose d'inconnu")).toBe(false);
  });
});
