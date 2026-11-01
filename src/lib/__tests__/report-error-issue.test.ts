// @vitest-environment node
/**
 * Logique de l'edge function `report-error` (construction de l'Issue +
 * déduplication). Testée SANS Deno : `issue.ts` n'importe rien, on vérifie donc
 * la VRAIE logique de formatage (et non une réimplémentation).
 */
import { describe, it, expect } from "vitest";

import {
  buildIssueTitle,
  buildIssueBody,
  extractSignature,
  findDuplicate,
  fencedBlock,
  signatureMarker,
  SIGNATURE_MARKER,
  type ErrorReportPayload,
} from "../../../supabase/functions/report-error/issue";

const report: ErrorReportPayload = {
  kind: "lumina-error-report",
  signature: "abc123",
  type: "database",
  message: "new row violates row-level security policy for table \"transactions\"",
  stack: "Error: boom\n    at insert (dataLayer.ts:42:7)",
  source: "handled",
  generatedAt: "2026-11-01T10:00:00.000Z",
  appVersion: "abc1234",
  environment: "production",
  platform: "android",
  route: "/finance",
  online: true,
  session: { authenticated: true, role: "TREASURIER" },
  breadcrumbs: [
    { at: 1762000000000, category: "ui", message: "clic sur bouton-enregistrer" },
    { at: 1762000001000, category: "network", message: "POST /rest/v1/transactions → 403" },
  ],
  context: { table: "transactions", code: "42501" },
};

describe("buildIssueTitle", () => {
  it("préfixe par [auto], inclut le type et le message", () => {
    const title = buildIssueTitle(report);
    expect(title).toContain("[auto]");
    expect(title).toContain("database");
    expect(title).toContain("row-level security");
  });

  it("tronque un message très long", () => {
    const title = buildIssueTitle({ message: "x".repeat(500) });
    expect(title.length).toBeLessThanOrEqual(130);
    expect(title.endsWith("…")).toBe(true);
  });

  it("tolère un message absent", () => {
    expect(buildIssueTitle({})).toContain("Erreur inconnue");
  });
});

describe("buildIssueBody", () => {
  const body = buildIssueBody(report);

  it("inclut le type, la stack et le fil d'Ariane", () => {
    expect(body).toContain("database");
    expect(body).toContain("dataLayer.ts:42:7");
    expect(body).toContain("clic sur bouton-enregistrer");
    expect(body).toContain("POST /rest/v1/transactions → 403");
  });

  it("inclut le contexte d'exécution (route, rôle, plateforme, version)", () => {
    expect(body).toContain("/finance");
    expect(body).toContain("TREASURIER");
    expect(body).toContain("android");
    expect(body).toContain("abc1234");
  });

  it("inclut le marqueur de signature caché", () => {
    expect(body).toContain(`${SIGNATURE_MARKER}: abc123`);
  });

  it("affiche un repli quand il n'y a ni fil d'Ariane ni contexte", () => {
    const minimal = buildIssueBody({ message: "boom" });
    expect(minimal).toContain("_aucune action enregistrée_");
    expect(minimal).toContain("_aucun_");
  });
});

describe("fencedBlock", () => {
  it("utilise trois backticks quand le contenu n'en contient pas", () => {
    expect(fencedBlock("hello")).toBe("```\nhello\n```");
  });

  it("élargit la clôture si le contenu contient des backticks", () => {
    const block = fencedBlock("a ``` b");
    expect(block.startsWith("````")).toBe(true);
    expect(block.endsWith("````")).toBe(true);
  });
});

describe("extractSignature", () => {
  it("relit la signature écrite par buildIssueBody", () => {
    const body = buildIssueBody(report);
    expect(extractSignature(body)).toBe("abc123");
  });

  it("renvoie null sans marqueur", () => {
    expect(extractSignature("aucun marqueur")).toBeNull();
    expect(extractSignature(undefined)).toBeNull();
  });
});

describe("findDuplicate", () => {
  const now = Date.parse("2026-11-01T12:00:00.000Z");
  const fresh = {
    number: 1,
    state: "open",
    body: buildIssueBody(report),
    created_at: "2026-11-01T11:30:00.000Z",
  };

  it("détecte un doublon ouvert récent", () => {
    expect(findDuplicate([fresh], "abc123", now, 6 * 3600_000)?.number).toBe(1);
  });

  it("ignore une Issue fermée", () => {
    expect(findDuplicate([{ ...fresh, state: "closed" }], "abc123", now, 6 * 3600_000)).toBeNull();
  });

  it("ignore une signature différente", () => {
    expect(findDuplicate([fresh], "autre", now, 6 * 3600_000)).toBeNull();
  });

  it("ignore une Issue plus vieille que la fenêtre", () => {
    expect(findDuplicate([fresh], "abc123", now, 60_000)).toBeNull();
  });

  it("renvoie null sans signature", () => {
    expect(findDuplicate([fresh], undefined, now, 6 * 3600_000)).toBeNull();
  });
});

describe("signatureMarker", () => {
  it("renvoie une chaîne vide sans signature", () => {
    expect(signatureMarker(undefined)).toBe("");
  });
});
