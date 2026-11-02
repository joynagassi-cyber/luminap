/**
 * PR5 — « Signaler un problème » : ENVOI réel du diagnostic.
 *
 * Verrouille le cœur pur `buildProblemReport` + l'envoi `sendProblemReport`.
 * Trois angles :
 *   1. **Sans PII** — le rapport sérialisé ne contient AUCUNE clé
 *      `email` / `name` / `orgId` / `payload`, et les valeurs qui ressemblent à
 *      une adresse e-mail ou à un jeton sont expurgées (note libre incluse).
 *   2. **Contenu utile** — les contrôles de santé en échec ET les codes/messages
 *      des erreurs récentes sont présents (le support peut agir).
 *   3. **Dégradation gracieuse** — Sentry non configuré (pas de DSN) : l'envoi
 *      ne lève pas, `sentToSentry = false`, mais l'enregistrement local est
 *      conservé (`savedLocally = true`) et relisible.
 *
 * NON-VACUITÉ (preuve documentée, vérifiée) :
 *   - Retirer la ligne `errors: recentErrors.map(toReportError)` de
 *     `buildProblemReport` → le test « inclut les codes d'erreur » échoue
 *     (le tableau `errors` devient vide).
 *   - Retirer l'appel `persistProblemReport(report)` de `sendProblemReport` →
 *     le test « conserve l'enregistrement local » échoue (`savedLocally` passe
 *     à `false` et `getLastProblemReport()` renvoie `null`).
 *   - Retirer `redact(note)` dans `buildProblemReport` → le test
 *     « expurge la PII de la note » échoue.
 *   Vérifié en commentant chacune de ces lignes : le test correspondant passe
 *   au rouge, puis la source est restaurée.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Sentry est neutralisé : on n'envoie rien en test, mais on observe l'appel.
vi.mock("@sentry/react", () => ({
  captureMessage: vi.fn(),
}));

import * as Sentry from "@sentry/react";

import {
  buildProblemReport,
  sendProblemReport,
  getProblemReports,
  getLastProblemReport,
  clearProblemReports,
  isSentryConfigured,
  scrubIdentities,
} from "@/lib/reportProblem";
import { authService } from "@/lib/auth";
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

/** Un rapport sérialisé ne doit contenir aucune de ces clés sensibles. */
const FORBIDDEN_KEYS = ["email", "name", "orgId", "org_id", "payload", "userId"];

function keysOf(obj: unknown, acc: Set<string> = new Set()): Set<string> {
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      acc.add(k);
      keysOf(v, acc);
    }
  }
  return acc;
}

beforeEach(() => {
  clearProblemReports();
  vi.clearAllMocks();
  // Le DSN Sentry est forcé ABSENT par défaut : en CI, `.env.local` définit
  // `VITE_SENTRY_DSN` (le workflow écrit le secret) → sans ce stub, le test
  // « dégradation gracieuse » échouerait alors que le code est correct. Chaque
  // test qui veut un DSN le stubbe explicitement (`vi.stubEnv`).
  vi.stubEnv("VITE_SENTRY_DSN", "");
});

afterEach(() => {
  clearProblemReports();
  vi.unstubAllEnvs();
});

describe("buildProblemReport — structure sans PII (PR5)", () => {
  it("ne contient AUCUNE clé PII (email/name/orgId/payload…)", () => {
    const report = buildProblemReport(
      base,
      [{ source: "onerror", message: "TypeError: x" }],
      "2026-10-31T08:00:00.000Z",
      "Ça plante quand j'ouvre les membres",
    );
    const serialized = JSON.stringify(report);
    for (const key of FORBIDDEN_KEYS) {
      expect(keysOf(report).has(key), `clé interdite présente : ${key}`).toBe(
        false,
      );
      expect(serialized).not.toContain(`"${key}"`);
    }
  });

  it("n'expose JAMAIS l'identifiant d'organisation (orgId)", () => {
    const report = buildProblemReport(base, [], "t", "");
    expect(JSON.stringify(report)).not.toContain("org-1");
  });

  it("inclut les métadonnées de contexte (version, env, plateforme, en ligne)", () => {
    const report = buildProblemReport(base, [], "2026-10-31T08:00:00.000Z");
    expect(report.kind).toBe("lumina-problem-report");
    expect(report.generatedAt).toBe("2026-10-31T08:00:00.000Z");
    expect(report.appVersion).toBe("1.0.9");
    expect(report.platform).toBe("web");
    expect(report.online).toBe(true);
    expect(typeof report.environment).toBe("string");
    expect(report.environment.length).toBeGreaterThan(0);
  });

  it("reprend le niveau de santé global et les contrôles en échec", () => {
    // Org non résolue = error ; hors ligne + sync en attente = warn.
    const report = buildProblemReport(
      { ...base, hasOrg: false, online: false, syncReady: false },
      [],
      "t",
    );
    expect(report.overall).toBe("error");
    expect(report.failedChecks).toContain("org");
    expect(report.failedChecks).toContain("network");
    expect(report.failedChecks).toContain("sync");
    // Un contrôle « ok » (version) n'est PAS listé comme en échec.
    expect(report.failedChecks).not.toContain("version");
  });

  it("inclut les codes ET messages des erreurs récentes", () => {
    const report = buildProblemReport(
      base,
      [
        { source: "onerror", message: "TypeError: boom" },
        { source: "handled", message: "Échec du chargement" },
      ],
      "t",
    );
    expect(report.errors).toHaveLength(2);
    expect(report.errors.map((e) => e.code)).toEqual(["onerror", "handled"]);
    expect(report.errors[0].message).toContain("boom");
  });

  it("expurge la PII de la note libre (e-mail, jeton)", () => {
    const report = buildProblemReport(
      base,
      [],
      "t",
      "Contactez-moi à user@example.com svp",
    );
    expect(report.note).not.toContain("user@example.com");
    expect(report.note).toContain("<email>");
  });

  it("expurge la PII des messages d'erreur repris", () => {
    const report = buildProblemReport(
      base,
      [{ source: "onerror", message: "échec pour admin@church.org" }],
      "t",
    );
    expect(report.errors[0].message).not.toContain("admin@church.org");
  });

  it("expurge les JETONS (JWT, Bearer) de la note ET des erreurs", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSM";
    const report = buildProblemReport(
      base,
      [{ source: "handled", message: `401 avec Bearer ${jwt}` }],
      "t",
      `mon token : ${jwt}`,
    );
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(jwt);
    expect(report.note).toContain("<jwt>");
    expect(report.errors[0].message).toContain("<jwt>");

    // Un jeton opaque (non-JWT) porté par `Bearer` est aussi expurgé.
    const opaque = buildProblemReport(
      base,
      [{ source: "handled", message: "401 Bearer sk_live_ABC123XYZ" }],
      "t",
    );
    expect(opaque.errors[0].message).not.toContain("sk_live_ABC123XYZ");
    expect(opaque.errors[0].message).toContain("Bearer <token>");
  });

  it("N'INTRODUIT jamais le nom d'organisation (PII non saisie)", () => {
    // Le nom d'org alimente le contrôle « org » du rapport santé, mais
    // `buildProblemReport` ne conserve QUE les identifiants de contrôle : le
    // nom ne doit donc jamais atteindre le rapport.
    const report = buildProblemReport(
      { ...base, orgName: "Église Saint-Michel" },
      [],
      "t",
    );
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("Saint-Michel");
    expect(report.failedChecks).toEqual([]);
  });

  it("neutralise les caractères de contrôle et plafonne la note (entrée hostile)", () => {
    const report = buildProblemReport(
      base,
      [],
      "t",
      "boom\u001b[31m\u0000" + "x".repeat(5000),
    );
    expect(report.note).not.toContain("\u001b");
    expect(report.note).not.toContain("\u0000");
    expect(report.note.length).toBeLessThanOrEqual(1000);
  });
});

describe("sendProblemReport — Sentry non configuré (dégradation gracieuse)", () => {
  it("le DSN est absent en environnement de test", () => {
    // Sans `VITE_SENTRY_DSN`, l'app doit considérer Sentry comme non configuré.
    expect(isSentryConfigured()).toBe(false);
  });

  it("ne lève pas, n'appelle pas Sentry, mais conserve l'enregistrement local", () => {
    const result = sendProblemReport(
      base,
      [{ source: "handled", message: "boom" }],
      "note libre",
      "2026-10-31T08:00:00.000Z",
    );
    expect(result.sentToSentry).toBe(false);
    expect(result.savedLocally).toBe(true);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("l'enregistrement local est relisible (« dernier signalement »)", () => {
    sendProblemReport(base, [], "un souci", "2026-10-31T08:00:00.000Z");
    const last = getLastProblemReport();
    expect(last).not.toBeNull();
    expect(last?.note).toBe("un souci");
    expect(last?.generatedAt).toBe("2026-10-31T08:00:00.000Z");
    expect(getProblemReports()).toHaveLength(1);
  });

  it("le journal local est borné (plus récent en premier)", () => {
    for (let i = 0; i < 15; i++) {
      sendProblemReport(base, [], `note-${i}`, `2026-10-31T08:00:${i}`);
    }
    const all = getProblemReports();
    expect(all.length).toBeLessThanOrEqual(10);
    // Le plus récent (note-14) est en tête.
    expect(all[0].note).toBe("note-14");
  });
});

describe("sendProblemReport — Sentry configuré (envoi réel)", () => {
  it("émet un captureMessage avec le rapport structuré, sans PII", () => {
    // Simule un DSN présent (Sentry configuré).
    vi.stubEnv("VITE_SENTRY_DSN", "https://abc@o0.ingest.sentry.io/1");
    try {
      const result = sendProblemReport(
        base,
        [{ source: "onerror", message: "boom" }],
        "souci",
        "2026-10-31T08:00:00.000Z",
      );
      expect(result.sentToSentry).toBe(true);
      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
      const call = vi.mocked(Sentry.captureMessage).mock.calls[0];
      expect(call[0]).toContain("Problème signalé");
      // Le 2ᵉ argument porte le contexte structuré (`extra.report`).
      const options = call[1] as { extra?: Record<string, unknown> } | undefined;
      const extra = JSON.stringify(options?.extra ?? {});
      for (const key of FORBIDDEN_KEYS) {
        expect(extra).not.toContain(`"${key}"`);
      }
      expect(extra).toContain("boom");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

/**
 * PR5 — audit PII (nom propre / téléphone). `redact` ne masque que les PII à
 * FORME reconnaissable (e-mail, JWT, Bearer) : un NOM ou un NUMÉRO de téléphone
 * saisi par l'utilisateur traversait le rapport tel quel. Le rapport part vers
 * Sentry et est conservé localement → fuite. On retire désormais les identités
 * de l'utilisateur courant par VALEUR (`scrubIdentities`).
 */
describe("scrubIdentities — retrait par valeur (PR5)", () => {
  it("masque un jeton connu, insensible à la casse", () => {
    expect(scrubIdentities("Bonjour Jean DUPONT", ["Jean Dupont"])).toBe(
      "Bonjour <masqué>",
    );
  });

  it("ignore les jetons trop courts (bruit) et les vides", () => {
    expect(scrubIdentities("abc a", ["a", "", "  "])).toBe("abc a");
  });

  it("échappe les métacaractères RegExp (pas d'injection de motif)", () => {
    // Sans échappement, `a.b` matcherait `axb` et le motif serait interprété.
    expect(scrubIdentities("valeur a.b ici", ["a.b"])).toBe("valeur <masqué> ici");
    expect(scrubIdentities("axb", ["a.b"])).toBe("axb");
  });

  it("sans identité → texte inchangé", () => {
    expect(scrubIdentities("rien à masquer", [])).toBe("rien à masquer");
  });
});

describe("buildProblemReport — le rapport ne fuit ni nom ni téléphone (PR5)", () => {
  const identities = ["Marie Dupont", "marie.dupont@church.org", "Dupont"];

  it("masque le nom de l'utilisateur dans la note libre", () => {
    const report = buildProblemReport(
      base,
      [],
      "t",
      "Contactez Marie Dupont au 06 12 34 56 78",
      identities,
    );
    expect(report.note).not.toContain("Marie Dupont");
    expect(report.note).toContain("<masqué>");
  });

  it("masque le nom de l'utilisateur dans les messages d'erreur repris", () => {
    const report = buildProblemReport(
      base,
      [{ source: "handled", message: "Échec du chargement pour Marie Dupont" }],
      "t",
      "",
      identities,
    );
    expect(report.errors[0].message).not.toContain("Marie Dupont");
  });

  it("l'e-mail est masqué par `redact` même sans identité fournie", () => {
    const report = buildProblemReport(
      base,
      [],
      "t",
      "écrire à marie.dupont@church.org",
    );
    expect(report.note).not.toContain("marie.dupont@church.org");
  });
});

describe("sendProblemReport — identités de l'utilisateur courant (PR5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("masque par défaut le prénom/nom/e-mail du profil connecté", () => {
    const profile = {
      id: "u1",
      email: "marie.dupont@church.org",
      first_name: "Marie",
      last_name: "Dupont",
      role: "ADMIN",
      org_id: "org-1",
      created_at: "t",
      updated_at: "t",
    };
    vi.spyOn(authService, "getState").mockReturnValue({
      session: null,
      user: null,
      profile,
      isLoading: false,
      error: null,
    } as ReturnType<typeof authService.getState>);

    const result = sendProblemReport(
      base,
      [{ source: "handled", message: "souci pour Marie Dupont" }],
      "mon nom est Marie Dupont et mon mail marie.dupont@church.org",
      "2026-10-31T08:00:00.000Z",
    );

    const serialized = JSON.stringify(result.report);
    expect(serialized).not.toContain("Marie Dupont");
    expect(serialized).not.toContain("marie.dupont@church.org");
    // Le signalement reste utile : la note survit (partiellement masquée).
    expect(result.savedLocally).toBe(true);
    expect(result.report.note).toContain("<masqué>");
  });

  it("sans profil connecté → aucune exception, identités vides", () => {
    vi.spyOn(authService, "getState").mockReturnValue({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
      error: null,
    } as ReturnType<typeof authService.getState>);
    expect(() =>
      sendProblemReport(base, [], "note", "2026-10-31T08:00:00.000Z"),
    ).not.toThrow();
  });
});
