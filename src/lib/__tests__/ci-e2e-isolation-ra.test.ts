/**
 * Garde R-A — isolation de la CI vis-à-vis de la production.
 *
 * CLASSE DE DÉFAUT (mesurée le 2026-11-04) : la suite Cypress tourne contre la
 * base de PRODUCTION (`cypress.yml` injecte `SUPABASE_URL`/`POWERSYNC_URL`
 * prod) et crée, à chaque run, des comptes `ss-e2e-*@lumina.dev` et des
 * organisations `Self-Serve E2E %` / `Annexe %`. Le nettoyage côté spec
 * (`cy.cleanupTestArtifacts`) est NON FATAL et n'efface ni les organisations
 * ni les `auth.users` → pollution illimitée (262 orgs vides + 97 comptes au
 * 2026-11-04, 265 orgs au total).
 *
 * Correctif : un balayage SQL réutilisable (`scripts/e2e-purge.sql`), un
 * workflow planifié (`.github/workflows/e2e-purge.yml`) et un durcissement des
 * workflows E2E pour viser un projet de TEST dédié (`TEST_*`) avec repli prod.
 *
 * Cette garde vérifie que le dispositif reste en place et cohérent. Elle ne
 * teste pas la base (pas de réseau en test unitaire).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");
const has = (rel: string) => existsSync(resolve(root, rel));

const PURGE_SQL = "scripts/e2e-purge.sql";
const PURGE_SH = "scripts/e2e-purge.sh";
const PURGE_WF = ".github/workflows/e2e-purge.yml";
const CYPRESS_WF = ".github/workflows/cypress.yml";
const CI_WF = ".github/workflows/ci.yml";

describe("R-A — isolation de la CI (artefacts E2E)", () => {
  it("le script de purge existe (SQL + runner)", () => {
    expect(has(PURGE_SQL), `${PURGE_SQL} manquant`).toBe(true);
    expect(has(PURGE_SH), `${PURGE_SH} manquant`).toBe(true);
  });

  it("le SQL purge les orgs E2E ET les comptes ss-e2e (jamais les comptes partagés)", () => {
    const raw = read(PURGE_SQL);
    // On scanne le CODE, pas les commentaires : la doc du fichier CITE les
    // comptes à préserver (sinon `not.toMatch` matcherait sa propre doc).
    const sql = raw
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n");
    // Organisations de test.
    expect(sql).toMatch(/delete from public\.organizations\b/i);
    expect(sql).toMatch(/'Self-Serve E2E%'/);
    expect(sql).toMatch(/'Annexe%'/);
    // Comptes éphémères.
    expect(sql).toMatch(/delete from auth\.users\b/i);
    expect(sql).toMatch(/'ss-e2e-%@lumina\.dev'/);
    // Ne touche JAMAIS aux comptes/orgs persistants partagés.
    expect(sql).not.toMatch(/lumina-org-e2e@lumina\.dev/);
    expect(sql).not.toMatch(/lumina-org-unconfigured@lumina\.dev/);
    // Le trigger « dernier admin » est désactivé puis RÉACTIVÉ.
    expect(sql).toMatch(/disable trigger trg_org_admins_not_last/i);
    expect(sql).toMatch(/enable trigger trg_org_admins_not_last/i);
  });

  it("le workflow de purge existe, référence le script et le secret", () => {
    expect(has(PURGE_WF), `${PURGE_WF} manquant`).toBe(true);
    const wf = read(PURGE_WF);
    expect(wf).toMatch(/scripts\/e2e-purge\.sh/);
    expect(wf).toMatch(/SUPABASE_ACCESS_TOKEN/);
    // Déclencheurs : après le workflow Cypress + filet quotidien.
    expect(wf).toMatch(/workflow_run:/);
    expect(wf).toMatch(/Cypress Tests/);
    expect(wf).toMatch(/schedule:/);
  });

  it("les workflows E2E préfèrent un projet de TEST (secrets TEST_*) à la prod", () => {
    for (const wf of [CYPRESS_WF, CI_WF]) {
      const src = read(wf);
      // La source d'URL Supabase doit passer par TEST_* avant le repli prod.
      expect(src, `${wf} ne cible pas TEST_SUPABASE_URL`).toMatch(
        /secrets\.TEST_SUPABASE_URL\s*\|\|\s*secrets\.SUPABASE_URL/,
      );
      expect(src, `${wf} ne cible pas TEST_SUPABASE_ANON_KEY`).toMatch(
        /secrets\.TEST_SUPABASE_ANON_KEY\s*\|\|\s*secrets\.SUPABASE_ANON_KEY/,
      );
    }
  });

  it("le nettoyage Cypress reste NON destructif (ne supprime pas auth.users)", () => {
    // Le nettoyage côté spec doit continuer à ARCHIVER ; la suppression des
    // comptes/orgs est le rôle du balayage SQL (jamais du client).
    const cleanup = read("cypress/support/e2eCleanup.ts");
    expect(cleanup).not.toMatch(/auth\/v1\/admin|delete\s+from\s+auth\.users/i);
  });
});
