// @ts-nocheck
/**
 * Captures d'écran pour le tutoriel — `pnpm capture:screens`.
 *
 * ── Ce que ce spec produit ──────────────────────────────────────────────────
 * Un PNG par écran de `src/lib/screenManifest.ts`, nommé `<id>.png`. Le nom est
 * l'`id` du manifeste, ce qui permet au tutoriel de retrouver l'image sans
 * table de correspondance : `public/captures/<id>.png`.
 *
 * ── Pourquoi un spec séparé des tests ───────────────────────────────────────
 * C'est un OUTIL, pas un test. Il ne vérifie rien et n'échoue pas quand un
 * écran est vide : il photographie. Le séparer évite que `pnpm test` dépende
 * d'un compte de test et d'un navigateur.
 *
 * ── Aucun secret dans le dépôt ──────────────────────────────────────────────
 * Les identifiants viennent de `Cypress.expose()` (`cypress.config.ts`), donc
 * de variables d'environnement : `CYPRESS_TEST_EMAIL` / `CYPRESS_TEST_PASSWORD`.
 * Les valeurs par défaut sont des comptes de test déjà présents dans le dépôt
 * (`lumina-org-e2e@lumina.dev`), jamais un compte réel.
 *
 * ── Anti-écran-trompeur ─────────────────────────────────────────────────────
 * Si `cy.visit()` retombe sur `/auth`, c'est que la session n'a pas tenu : on
 * NE capture PAS (une capture de la page de connexion étiquetée « Membres »
 * serait un mensonge dans le tutoriel). L'écran est marqué « ignoré » dans le
 * rapport final, avec sa raison.
 *
 * Usage :
 *   pnpm capture:screens                      # tout
 *   CAPTURE_ONLY=finance,groups pnpm capture:screens
 *   CYPRESS_BASE_URL=http://localhost:8080 pnpm capture:screens
 */

import { SCREEN_MANIFEST } from "../../src/lib/screenManifest";

/** Filtre optionnel : `CAPTURE_ONLY=finance,groups`. */
function selected() {
  const only = (Cypress.env("CAPTURE_ONLY") || "").trim();
  if (!only) return SCREEN_MANIFEST;
  const wanted = new Set(only.split(",").map((s) => s.trim()));
  return SCREEN_MANIFEST.filter((s) => wanted.has(s.id));
}

/**
 * Attend que la page soit stable avant de photographier.
 * - le splash statique est retiré du DOM par `is-hydrated` (CSS) ;
 * - l'overlay de récupération ne doit pas être présent (sinon c'est lui qu'on
 *   photographierait, pas la page demandée).
 */
function settle() {
  cy.get(".splash-splash-html", { timeout: 20000 }).should("not.be.visible");
  cy.get("#lumina-boot-recovery").should("not.exist");
  // Laisse le temps aux requêtes PowerSync de peupler les listes.
  cy.wait(900);
}

describe("Captures — écrans publics", () => {
  it("capture les écrans accessibles sans session", () => {
    const report = { captured: [] as string[], skipped: [] as string[] };

    cy.wrap(selected().filter((s) => !s.requiresAuth)).each((screen) => {
      cy.intercept("POST", "**/token**").as("token");

      cy.visit(screen.route, { failOnStatusCode: false });
      settle();

      cy.location("pathname").then((pathname) => {
        // `/auth` est une cible légitime ici, mais pas pour les autres écrans.
        if (pathname !== screen.route && screen.route !== "/auth") {
          report.skipped.push(`${screen.id} → redirigé vers ${pathname}`);
          return;
        }
        cy.screenshot(screen.id, { capture: "viewport", overwrite: true });
        report.captured.push(screen.id);
      });
    });

    cy.then(() => {
      cy.log(`capturés : ${report.captured.length} | ignorés : ${report.skipped.length}`);
      cy.writeFile("cypress/captures-report.json", report);
    });
  });
});

describe("Captures — écrans authentifiés", () => {
  it("capture les écrans derrière la connexion", () => {
    const report = { captured: [] as string[], skipped: [] as string[] };

    cy.loginOrgAccount();

    cy.wrap(selected().filter((s) => s.requiresAuth)).each((screen) => {
      // Le token Supabase peut expirer entre deux `visit` : on le réaffirme.
      cy.ensureAuth();

      cy.visit(screen.route, { failOnStatusCode: false });
      settle();

      cy.location("pathname").then((pathname) => {
        if (pathname !== screen.route) {
          report.skipped.push(`${screen.id} → redirigé vers ${pathname}`);
          return;
        }
        cy.screenshot(screen.id, { capture: "viewport", overwrite: true });
        report.captured.push(screen.id);
      });
    });

    cy.then(() => {
      cy.log(`capturés : ${report.captured.length} | ignorés : ${report.skipped.length}`);
      cy.writeFile("cypress/captures-report-auth.json", report);
    });
  });
});
