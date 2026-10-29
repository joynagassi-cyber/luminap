/**
 * Garde anti-dérive P39 (Phase 12) — chaque spec Cypress qui CRÉE des données
 * réelles dans l'organisation de test doit être auto-nettoyant.
 *
 * Pourquoi une garde statique plutôt qu'une exécution Cypress :
 *   - la suite Cypress n'est pas exploitable en CI (R98/E2) ;
 *   - le défaut visé n'est pas « un test échoue » mais « un spec crée des
 *     lignes réelles et ne les nettoie jamais » — la base de test ne converge
 *     pas (mesure 2026-10-29 : 291 groupes « Jeunesse », 267 « Event Persist
 *     F5 », 12 353 « CalEvent », 285 membres « E2e », 4 annexes). C'est
 *     entièrement visible dans le dépôt : un spec sans `after()` appelant
 *     `cy.cleanupTestArtifacts(...)` est un offenseur ;
 *   - déterministe, hors-ligne, instantané (lecture de fichiers).
 *
 * La garde vérifie trois choses :
 *   1. le helper partagé existe et expose la commande + le registre d'ids ;
 *   2. la commande est enregistrée dans `cypress/support/e2e.ts` ;
 *   3. chaque spec de la liste des « créateurs de données » appelle
 *      `cy.cleanupTestArtifacts(` depuis un hook `after(`.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const repoRoot = resolve(__dirname, "../../..");

const helperPath = resolve(repoRoot, "cypress/support/e2eCleanup.ts");
const supportEntry = resolve(repoRoot, "cypress/support/e2e.ts");

/**
 * Specs qui créent des entités RÉELLES (groupes, événements, membres,
 * organisations, formulaires, transactions…) et DOIVENT se nettoyer.
 * Liste dérivée de la mission P39 + du grep des créations (`cy.contains('Créer')`,
 * POST REST, `addTransactionPS`).
 */
const CLEANING_SPECS = [
  "org-reports.cy.ts",
  "groups-events.cy.ts",
  "events-tasks.cy.ts",
  "persistence.cy.ts",
  "performance-batch.cy.ts",
  "members.cy.ts",
  "forms-v2.cy.ts",
  // Élargissements mesurés (mêmes créations réelles, jamais nettoyées).
  "cloud-sync.cy.ts",
  "cross-tenant.cy.ts",
  "comprehensive-flow.cy.ts",
  "forms-fields.cy.ts",
];

const specPath = (name: string) => resolve(repoRoot, "cypress/e2e", name);
const read = (path: string) => readFileSync(path, "utf8");

describe("P39 — helper de nettoyage E2E partagé", () => {
  it("le helper existe et expose la commande + le registre d'ids", () => {
    expect(existsSync(helperPath), "cypress/support/e2eCleanup.ts existe").toBe(
      true,
    );
    const src = read(helperPath);
    expect(src).toContain('Cypress.Commands.add("cleanupTestArtifacts"');
    expect(src).toContain("export function trackTestArtifact");
    expect(src).toContain("export function resetTrackedArtifacts");
    // Non fatal : le corps de la commande enveloppe tout dans try/catch.
    expect(src).toContain("try {");
    expect(src).toContain("catch");
    // Archivage (jamais de suppression destructive pour les entités archivable).
    expect(src).toContain('status: "ARCHIVED"');
    // Les événements n'ont pas d'ARCHIVED : leur statut terminal est CANCELLED.
    expect(src).toContain('status: "CANCELLED"');
  });

  it("la commande est enregistrée dans le support Cypress", () => {
    const src = read(supportEntry);
    expect(src, "import du helper dans cypress/support/e2e.ts").toContain(
      "import './e2eCleanup'",
    );
  });
});

describe("P39 — chaque spec créateur de données se nettoie (after + cleanupTestArtifacts)", () => {
  for (const spec of CLEANING_SPECS) {
    it(`${spec} archive ses artefacts dans un hook after()`, () => {
      const path = specPath(spec);
      expect(existsSync(path), `${spec} existe`).toBe(true);
      const src = read(path);
      expect(
        src,
        `${spec} doit appeler cy.cleanupTestArtifacts(...)`,
      ).toContain("cy.cleanupTestArtifacts(");
      expect(src, `${spec} doit déclarer un hook after(`).toContain("after(");
    });
  }

  it("aucun spec nettoyeur n'utilise de suppression destructive globale", () => {
    for (const spec of CLEANING_SPECS) {
      const src = read(specPath(spec));
      // Interdit un `DELETE` REST sans filtre (balayage global).
      expect(
        /\/rest\/v1\/[a-z_]+\?[^'`]*method: 'DELETE'|method: "DELETE"/.test(src),
        `${spec} : suppression REST détectée — vérifier qu'elle est ciblée`,
      ).toBe(false);
    }
  });
});
