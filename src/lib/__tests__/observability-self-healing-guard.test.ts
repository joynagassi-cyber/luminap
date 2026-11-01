// @vitest-environment node
/**
 * Gardes d'auto-réparation — chaîne « erreur client → GitHub Issue → OpenHands »
 * et self-update mobile.
 *
 * Issu de l'AUDIT QA du 2026-11-01, qui a mesuré deux pannes silencieuses :
 *   1. DÉDUP SERVEUR INOPÉRANTE : la déduplication reposait sur l'API de
 *      recherche GitHub (délai d'indexation) → deux rapports de même signature
 *      en rafale créaient DEUX Issues (#307 ET #308). Correctif : réservation
 *      ATOMIQUE en base (`claim_error_report`, migration 20261101000003).
 *   2. SPAM DE FAUX POSITIFS PERF : le message « Tâche longue détectée (193 ms) »
 *      incluait la durée → signature distincte à chaque mesure → ~45 Issues
 *      identiques, autant de tentatives de correction autonome pour du bruit.
 *      Correctif : message CONSTANT + garde de transmission hors production.
 *
 * Ces gardes échouent si un refactor rebranche l'un de ces pièges.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { dedupeKey, DEDUPE_KEY_PREFIX } from "../../../supabase/functions/report-error/dedupe";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const EDGE_INDEX = "supabase/functions/report-error/index.ts";
const MIGRATION = "supabase/migrations/20261101000003_error_report_dedupe.sql";
const ROLLBACK = "supabase/migrations/rollback/20261101000003_rollback.sql";

describe("dedupeKey — clé de déduplication (logique pure, exécutée)", () => {
  it("préfixe la clé et inclut le dépôt (deux dépôts ne s'entre-dédupliquent pas)", () => {
    expect(dedupeKey("o/r", "abc")).toBe(`${DEDUPE_KEY_PREFIX}:o/r:abc`);
    expect(dedupeKey("o/r1", "abc")).not.toBe(dedupeKey("o/r2", "abc"));
  });

  it("est stable pour une même signature (dédup déterministe)", () => {
    expect(dedupeKey("o/r", "sig-1")).toBe(dedupeKey("o/r", "sig-1"));
  });

  it("retourne null si la signature est absente (fail-open, pas de dédup)", () => {
    expect(dedupeKey("o/r", undefined)).toBeNull();
    expect(dedupeKey("o/r", "")).toBeNull();
    expect(dedupeKey("o/r", "   ")).toBeNull();
  });

  it("ignore les espaces autour de la signature", () => {
    expect(dedupeKey("o/r", "  x  ")).toBe(`${DEDUPE_KEY_PREFIX}:o/r:x`);
  });
});

describe("edge function — déduplication ATOMIQUE (pas de doublon en rafale)", () => {
  const src = read(EDGE_INDEX);

  it("réserve la signature en base AVANT de créer l'Issue", () => {
    expect(src).toContain("claimSignature");
    expect(src).toContain("claim_error_report");
    // La réservation doit précéder la recherche GitHub (l'index est asynchrone).
    const claimIdx = src.indexOf("claimSignature(key)");
    const searchIdx = src.indexOf("findExistingIssue(repo, report.signature)");
    expect(claimIdx).toBeGreaterThan(-1);
    expect(searchIdx).toBeGreaterThan(-1);
    expect(claimIdx).toBeLessThan(searchIdx);
  });

  it("répond deduped:true quand la réservation est refusée", () => {
    expect(src).toMatch(/claimSignature\(key\)\)\)\s*\{[\s\S]*?deduped:\s*true/);
  });

  it("libère la réservation si la création de l'Issue échoue (pas de perte silencieuse)", () => {
    expect(src).toContain("releaseSignature");
    expect(src).toContain("release_error_report");
    // La libération doit apparaître dans la branche d'échec de création.
    expect(src).toMatch(/!createRes\.ok[\s\S]*?releaseSignature\(key\)/);
  });

  it("la fenêtre de dédup est alignée sur la RPC claim/release (6 h)", () => {
    expect(src).toContain("DEDUPE_WINDOW_HOURS = 6");
    expect(src).toContain("p_window_hours: DEDUPE_WINDOW_HOURS");
  });
});

describe("migration 20261101000003 — réservation atomique, surface fermée", () => {
  const src = read(MIGRATION);

  it("la clé primaire (dedupe_key, window_start) rend la concurrence impossible", () => {
    expect(src).toMatch(
      /PRIMARY KEY\s*\(\s*dedupe_key\s*,\s*window_start\s*\)/i,
    );
  });

  it("la réservation utilise ON CONFLICT DO NOTHING (pas de read-then-write)", () => {
    expect(src).toMatch(/ON CONFLICT[\s\S]*?DO NOTHING/i);
    expect(src).toContain("GET DIAGNOSTICS");
  });

  it("deny-all : RLS activée, aucun GRANT à anon/authenticated/PUBLIC", () => {
    expect(src).toContain("ENABLE ROW LEVEL SECURITY");
    expect(src).not.toMatch(/GRANT\s+[^;]*\bTO\s+(anon|authenticated|PUBLIC)\b/i);
    expect(src).toContain("TO service_role");
  });

  it("les RPC sont SECURITY DEFINER avec EXECUTE réservé au service_role", () => {
    expect(src).toMatch(/SECURITY\s+DEFINER/i);
    expect(src).toContain("claim_error_report");
    expect(src).toContain("release_error_report");
    for (const fn of ["claim_error_report", "release_error_report"]) {
      const re = new RegExp(
        `REVOKE ALL ON FUNCTION[\\s\\S]*?${fn}[\\s\\S]*?FROM PUBLIC`,
        "i",
      );
      expect(src).toMatch(re);
    }
    expect(src).toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]*?TO service_role/i);
  });

  it("un rollback existe et supprime fonctions + table (réversibilité)", () => {
    const rb = read(ROLLBACK);
    expect(rb).toContain("claim_error_report");
    expect(rb).toContain("release_error_report");
    expect(rb).toContain("DROP TABLE IF EXISTS public.error_report_dedupe");
  });
});

describe("perfMonitor — message CONSTANT (pas de spam de faux positifs)", () => {
  const src = read("src/lib/observability/perfMonitor.ts");

  it("le message d'une tâche longue n'embarque PAS la durée (signature stable)", () => {
    // Interdiction d'une interpolation `${...}` ou d'un « ms » dans le message
    // passé à reportError pour la tâche longue.
    expect(src).toContain("LONG_TASK_MESSAGE");
    expect(src).not.toMatch(/new Error\(\s*`[^`]*\$\{[^}]*\}[^`]*ms/i);
    expect(src).not.toMatch(/Tâche longue détectée \(\$\{/);
  });

  it("la durée vit dans context.durationMs (pas dans le message)", () => {
    expect(src).toMatch(/durationMs:\s*String\(Math\.round\(duration\)\)/);
  });

  it("le message d'opération lente est constant (nom dans le contexte)", () => {
    expect(src).toContain("SLOW_OPERATION_MESSAGE");
    expect(src).toMatch(/context:\s*\{\s*operation:\s*name,\s*durationMs/);
  });
});

describe("errorReporter — garde de transmission (pas de bruit dev → dépôt public)", () => {
  const src = read("src/lib/observability/errorReporter.ts");

  it("expose isTransmissionAllowed() conditionnée à la production", () => {
    expect(src).toContain("isTransmissionAllowed");
    expect(src).toMatch(/import\.meta\.env\.PROD/);
  });

  it("une échappatoire explicite existe pour tester la chaîne en dev", () => {
    expect(src).toContain("VITE_REPORT_ERRORS_IN_DEV");
  });

  it("le transport par défaut abandonne (drop) hors production", () => {
    expect(src).toMatch(/isTransmissionAllowed\(\)[\s\S]*?drop:\s*true/);
  });

  it("refuse les modes Vite de développement/test (PROD seul est insuffisant en CI)", () => {
    // La CI GitHub exporte NODE_ENV=production → un `vite dev` voit
    // `import.meta.env.PROD === true`. La garde doit AUSSI exiger un MODE
    // non-développement, sinon les serveurs de dev de la CI remontent au
    // dépôt public (mesuré : ~58 Issues « Tâche longue détectée »).
    expect(src).toContain("NON_PRODUCTION_MODES");
    expect(src).toContain("isTransmissionAllowedFor");
    expect(src).toMatch(/NON_PRODUCTION_MODES\.has\(env\.MODE/);
    expect(src).toMatch(/NON_PRODUCTION_MODES[\s\S]*?["']development["']/);
  });

  it("un rapport 'drop' est retiré de la file (pas de réessai infini)", () => {
    expect(src).toMatch(/result\.drop/);
    expect(src).toMatch(/else if \(!result\.drop\)/);
  });
});

describe("self-update — aucune panne silencieuse", () => {
  const store = read("src/updater/updaterStore.ts");

  it("remonte chaque échec (permission, téléchargement, installation) via reportError", () => {
    expect(store).toContain("reportUpdateFailure");
    expect(store).toContain("reportError");
    for (const stage of ['"canInstall"', '"openInstallSettings"', '"download"', '"install"']) {
      expect(store).toContain(stage);
    }
  });

  it("le store ne laisse AUCUN try/catch vide autour du flux de mise à jour", () => {
    // Un `catch {}` vide avalerait l'échec sans trace.
    expect(store).not.toMatch(/catch\s*\([^)]*\)\s*\{\s*\}/);
  });

  it("le listener de progression est retiré dans un finally (pas de fuite)", () => {
    expect(store).toMatch(/finally\s*\{[\s\S]*?handle\?\.remove\(\)/);
  });

  it("le plugin natif garde canRequestPackageInstalls() derrière l'API 26 (minSdk 21)", () => {
    const java = read("android/app/src/main/java/com/lumina/mfejc/ApkUpdaterPlugin.java");
    // L'appel ne doit apparaître QUE dans la branche SDK_INT >= 26.
    expect(java).toMatch(/SDK_INT\s*<\s*26[\s\S]*?value",\s*true/);
    expect(java).toContain("canRequestPackageInstalls()");
    expect(java).toMatch(/catch \(Exception e\)[\s\S]*?Log\.e\(TAG/);
  });

  it("le manifeste déclare REQUEST_INSTALL_PACKAGES et un FileProvider", () => {
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    expect(manifest).toContain("android.permission.REQUEST_INSTALL_PACKAGES");
    expect(manifest).toContain("androidx.core.content.FileProvider");
    expect(manifest).toContain("${applicationId}.fileprovider");
  });
});

describe("release — versionName/versionCode pilotés par le tag (self-update déterministe)", () => {
  const src = read(".github/workflows/release.yml");

  it("le workflow patche versionName et versionCode depuis le tag", () => {
    expect(src).toContain("Inject versionName/versionCode from tag");
    expect(src).toMatch(/sed -i -E[\s\S]*?versionCode/);
    expect(src).toMatch(/sed -i -E[\s\S]*?versionName/);
  });

  it("échoue bruyamment si le patch n'a pas pris (pas de Release fausse)", () => {
    expect(src).toMatch(/versionName non appliqué/);
    expect(src).toMatch(/versionCode non appliqué/);
  });
});

describe("Cypress — la remontée d'erreurs est neutralisée (défense en profondeur)", () => {
  const support = read("cypress/support/e2e.ts");
  const blocker = read("cypress/support/noErrorReporting.ts");

  it("le support Cypress charge le bloqueur", () => {
    expect(support).toContain("./noErrorReporting");
  });

  it("le bloqueur stubbe le POST report-error (aucun test ne crée d'Issue)", () => {
    expect(blocker).toContain("functions/v1/report-error");
    expect(blocker).toMatch(/method:\s*'POST'/);
    expect(blocker).toMatch(/ok:\s*true/);
    // Interception globale, avant chaque test.
    expect(blocker).toMatch(/beforeEach\(/);
  });
});

describe("CI — aucun workflow n'active la remontée d'erreurs en dev", () => {
  const workflows = readdirSync(join(root, ".github/workflows")).filter((f) =>
    f.endsWith(".yml"),
  );

  it("VITE_REPORT_ERRORS_IN_DEV n'est JAMAIS forcé à true dans un workflow", () => {
    // L'échappatoire existe pour un poste de développeur, jamais pour la CI :
    // un workflow qui l'activerait ferait remonter le bruit de la CI Cypress
    // (`vite dev` sur localhost) au dépôt public.
    const offenders: string[] = [];
    for (const wf of workflows) {
      const src = read(`.github/workflows/${wf}`);
      if (/VITE_REPORT_ERRORS_IN_DEV\s*[:=]\s*['"]?true/i.test(src)) {
        offenders.push(wf);
      }
    }
    expect(offenders).toEqual([]);
  });
});
