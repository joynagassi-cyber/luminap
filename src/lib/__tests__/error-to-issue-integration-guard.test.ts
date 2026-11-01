// @vitest-environment node
/**
 * Garde d'intégration « erreurs → GitHub Issues ».
 *
 * Le système est utile seulement si CHAQUE maillon de la chaîne reste branché.
 * Ces gardes STATIQUES (lecture du source) verrouillent les points qu'un
 * refactor pourrait silencieusement débrancher :
 *   1. le jeton GitHub n'est JAMAIS lu côté client (il fuit dans le bundle/APK) ;
 *   2. l'edge function utilise le label déclencheur `openhands` et une allowlist
 *      de dépôts (pas d'injection de repo) ;
 *   3. l'edge function vérifie elle-même l'appelant (`auth.getUser`) et PLAFONNE
 *      la voie anonyme (pré-login) — un endpoint public non borné permet de
 *      spammer des Issues ;
 *   4. les points de capture clés appellent bien `reportError`
 *      (clientErrors, ErrorBoundary racine, LazyRoute, PowerSync, perf) ;
 *   5. `main.tsx` arme la capture (breadcrumbs + perf + flush).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const EDGE_INDEX = "supabase/functions/report-error/index.ts";
const EDGE_ISSUE = "supabase/functions/report-error/issue.ts";

describe("sécurité — le jeton GitHub reste côté serveur", () => {
  it("aucun fichier de src/ ne lit GITHUB_TOKEN", () => {
    const files = [
      "src/lib/observability/errorReporter.ts",
      "src/lib/observability/breadcrumbs.ts",
      "src/lib/observability/perfMonitor.ts",
      "src/lib/clientErrors.ts",
      "src/lib/reportProblem.ts",
    ];
    for (const f of files) {
      expect(read(f)).not.toContain("GITHUB_TOKEN");
    }
  });

  it("l'edge function, elle, lit GITHUB_TOKEN (Deno.env)", () => {
    const src = read(EDGE_INDEX);
    expect(src).toContain("GITHUB_TOKEN");
    expect(src).toContain("Deno.env.get");
  });
});

describe("edge function — label déclencheur et allowlist", () => {
  it("utilise le label `openhands` par défaut", () => {
    expect(read(EDGE_INDEX)).toContain('"openhands"');
  });

  it("valide le dépôt cible contre une allowlist", () => {
    const src = read(EDGE_INDEX);
    expect(src).toContain("ALLOWED_REPOS");
    expect(src).toContain("joynagassi-cyber/luminap");
    expect(src).toContain("Dépôt non autorisé");
  });

  it("exige un appelant authentifié (getUser)", () => {
    expect(read(EDGE_INDEX)).toContain("auth.getUser");
  });

  it("déduplique avant de créer l'Issue", () => {
    const src = read(EDGE_INDEX);
    expect(src).toContain("findExistingIssue");
    expect(src).toContain("deduped");
  });

  it("la logique de formatage est pure (aucun import Deno dans issue.ts)", () => {
    const src = read(EDGE_ISSUE);
    expect(src).not.toContain("Deno.");
    expect(src).not.toContain("https://");
    expect(src).toContain("buildIssueTitle");
    expect(src).toContain("buildIssueBody");
  });
});

describe("edge function — voie anonyme (pré-login) rate-limitée", () => {
  const EDGE_THROTTLE = "supabase/functions/report-error/throttle.ts";

  it("le JWT n'est plus exigé : la voie anonyme existe", () => {
    const src = read(EDGE_INDEX);
    expect(src).toContain("isAnonymousCaller");
    expect(src).toContain("ANON_MAX_PER_HOUR");
    expect(src).toContain("USER_MAX_PER_HOUR");
  });

  it("l'anonyme est plafonné par un bucket = hachage d'IP (jamais l'IP)", () => {
    const src = read(EDGE_INDEX);
    expect(src).toContain("ipBucket");
    expect(src).toContain("extractClientIp");
    expect(read(EDGE_THROTTLE)).toContain("crypto.subtle.digest");
  });

  it("le rate-limiting passe par la RPC service_role (register_anonymous_report)", () => {
    const src = read(EDGE_INDEX);
    expect(src).toContain("register_anonymous_report");
    expect(src).toContain("SERVICE_ROLE_KEY");
    expect(src).toContain("429");
  });

  it("sans service_role, la voie anonyme est REFUSÉE (jamais non plafonnée)", () => {
    expect(read(EDGE_INDEX)).toContain(
      "Rate-limiting indisponible pour les rapports anonymes",
    );
  });

  it("throttle.ts est pur (aucun import Deno)", () => {
    const src = read(EDGE_THROTTLE);
    expect(src).not.toContain("Deno.");
    expect(src).not.toContain("https://");
    expect(src).toContain("extractClientIp");
    expect(src).toContain("ipBucket");
  });

  it("le transport client envoie AUSSI les rapports pré-login (pas de retour anticipé)", () => {
    const src = read("src/lib/observability/errorReporter.ts");
    // Plus de garde « if (!accessToken) return { ok: false } » : l'appel part
    // même sans session, identifié comme anonyme côté serveur.
    expect(src).not.toContain("pas de session → réessayer plus tard");
    expect(src).toMatch(
      /headers:\s*accessToken\s*\?\s*\{\s*Authorization/,
    );
  });
});

describe("migration — la surface RPC de rate-limiting reste fermée", () => {
  const MIGRATION = "supabase/migrations/20261101000002_error_report_throttle.sql";

  it("la table de comptage est en deny-all (RLS activée, aucun accès client)", () => {
    const src = read(MIGRATION);
    expect(src).toContain("ENABLE ROW LEVEL SECURITY");
    // Aucun GRANT à anon/authenticated : seule la voie service_role est ouverte.
    expect(src).not.toMatch(/GRANT\s+[^;]*\bTO\s+(anon|authenticated|PUBLIC)\b/i);
    expect(src).toContain("TO service_role");
  });

  it("la RPC est SECURITY DEFINER avec EXECUTE révoqué de PUBLIC/anon/authenticated", () => {
    const src = read(MIGRATION);
    expect(src).toMatch(/SECURITY\s+DEFINER/i);
    expect(src).toContain("register_anonymous_report");
    expect(src).toMatch(/REVOKE ALL ON FUNCTION[\s\S]*?FROM PUBLIC/i);
    expect(src).toMatch(/REVOKE ALL ON FUNCTION[\s\S]*?FROM anon/i);
    expect(src).toMatch(/REVOKE ALL ON FUNCTION[\s\S]*?FROM authenticated/i);
    expect(src).toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]*?TO service_role/i);
  });

  it("un rollback existe (réversibilité)", () => {
    expect(() =>
      read("supabase/migrations/rollback/20261101000002_rollback.sql"),
    ).not.toThrow();
  });
});

describe("points de capture branchés sur reportError", () => {
  const cases: Array<[string, string]> = [
    ["src/lib/clientErrors.ts", "onerror"],
    ["src/App.tsx", "error-boundary"],
    ["src/ionic/routes/lazy-route.tsx", "lazy-route-boundary"],
    ["src/lib/powersync/SupabaseConnector.ts", "powersync-fatal"],
    ["src/lib/powersync/index.ts", "powersync-status"],
    ["src/lib/observability/perfMonitor.ts", "slow-operation"],
  ];

  for (const [file, marker] of cases) {
    it(`${file} remonte via reportError (${marker})`, () => {
      const src = read(file);
      expect(src).toContain("reportError");
      expect(src).toContain(marker);
    });
  }

  it("la page Santé remonte aussi un signalement utilisateur", () => {
    expect(read("src/pages/Health.tsx")).toContain("sendProblemReportToIssues");
    expect(read("src/lib/reportProblem.ts")).toContain("reportUserProblem");
  });
});

describe("main.tsx — armement de l'observabilité", () => {
  it("installe les breadcrumbs, le moniteur de perf et le flush", () => {
    const src = read("src/main.tsx");
    expect(src).toContain("installBreadcrumbCapture");
    expect(src).toContain("installLongTaskMonitor");
    expect(src).toContain("flushPendingReports");
  });
});

describe("ObservabilityBridge — contexte de session", () => {
  it("met à jour session + identités + flush online", () => {
    const src = read("src/lib/observability/ObservabilityBridge.tsx");
    expect(src).toContain("setSessionContext");
    expect(src).toContain("setReportIdentities");
    expect(src).toContain("flushPendingReports");
  });

  it("est monté dans App.tsx sous le routeur", () => {
    expect(read("src/App.tsx")).toContain("ObservabilityBridge");
  });
});
