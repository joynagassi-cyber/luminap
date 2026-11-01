/**
 * Cypress E2E — PR6 « écran mise à jour requise » (contrat §6 / Phase 15).
 *
 * Défaut visé (R106) : `resolveRoute()` savait produire `update-required` et
 * `App.tsx` rendait `UpdateRequiredScreen`, mais AUCUNE source ne fournissait
 * jamais `clientSchemaVersion` / `minSchemaVersion` → la branche de garde était
 * du CODE MORT. Un APK ancien dont le schéma PowerSync est incompatible ne
 * recevait donc aucun message « mettez à jour ».
 *
 * Ce spec prouve la DÉCISION RÉELLE de bout en bout :
 *   (a) version cliente incompatible → l'app affiche l'écran « Mise à jour
 *       requise » (ancre `data-screen-state`, libellé visible), jamais d'écran
 *       noir, et AUCUN contenu applicatif (pas de BottomNav) ;
 *   (b) version compatible (aucune contrainte déclarée) → l'écran « Mise à
 *       jour requise » n'apparaît PAS et le dashboard est accessible.
 *
 * MÉCANISME DE FORÇAGE (le VRAI, pas un mock de composant) :
 *   `schemaVersion.ts::resolveMinSchemaVersion()` lit
 *   `import.meta.env.VITE_MIN_SCHEMA_VERSION`. En dev, Vite ne fait pas
 *   d'« inlining » statique : il sert chaque module ESM avec un préambule
 *   `import.meta.env = {…}` REGÉNÉRÉ à chaque requête (donc un `import.meta.env`
 *   runtime). On intercepte donc la requête du module
 *   `/src/lib/schemaVersion.ts` et on injecte la clé dans ce préambule — c'est
 *   exactement l'environnement que le module lit au chargement. Aucune logique
 *   produit n'est modifiée, aucun composant n'est mocké : c'est le même chemin
 *   de code qu'un build déployé avec `VITE_MIN_SCHEMA_VERSION=…`.
 *   (Lancer ce spec contre `npm run dev`, PAS un build de production : en build
 *   la valeur est figée à la compilation et ne serait pas interceptable.)
 *
 * NB : pas de `import { cy }` — `cy` est global dans le runner (voir
 * local-dashboard.cy.ts pour le détail du piège de bundling).
 */

const SCHEMA_MODULE_URL = '**/src/lib/schemaVersion.ts*';

/** Vrai dès que le module `schemaVersion.ts` a réellement été servi/intercepté. */
let schemaIntercepted = false;

/**
 * Réécrit le préambule `import.meta.env` du module `schemaVersion.ts` servi par
 * Vite pour forcer `VITE_MIN_SCHEMA_VERSION`. `minVersion = undefined` (cas
 * « compatible ») laisse le module INTACT → aucune contrainte (fail-open).
 */
function forceMinSchemaVersion(minVersion: number | undefined) {
  schemaIntercepted = false;
  cy.intercept(SCHEMA_MODULE_URL, (req) => {
    // Le module est mis en cache par le navigateur : la 2e requête (déclenchée
    // par le `cy.visit('/')` interne de `cy.seedLocalSession()`) serait un
    // `304 Not Modified` SANS corps — l'app réutiliserait alors le module
    // d'origine et notre injection serait ignorée. On retire les en-têtes
    // conditionnels pour forcer un `200` frais à CHAQUE requête.
    delete req.headers['if-none-match'];
    delete req.headers['if-modified-since'];
    req.continue((res) => {
      const body = typeof res.body === 'string' ? res.body : '';
      if (!body.includes('import.meta.env = {')) {
        throw new Error(
          'update-required: préambule `import.meta.env = {` introuvable dans ' +
            "le module schemaVersion.ts servi — le serveur n'est pas le dev " +
            'server Vite (un build de production fige la valeur et rend ce ' +
            'spec inexploitable).',
        );
      }
      if (minVersion !== undefined) {
        res.body = body.replace(
          'import.meta.env = {',
          `import.meta.env = {"VITE_MIN_SCHEMA_VERSION":"${minVersion}",`,
        );
      }
      schemaIntercepted = true;
    });
  });
}

/**
 * Prouve que l'interception a bien eu lieu (sinon le test serait vacuous) et
 * attend que le shell applicatif soit prêt (bridge de boot).
 */
function waitForAppReady() {
  cy.get('#root[data-app-ready="true"]', { timeout: 60_000 }).should('exist');
  cy.then(() => {
    expect(
      schemaIntercepted,
      'le module schemaVersion.ts a bien été servi et intercepté',
    ).to.eq(true);
  });
}

describe('Lumina — PR6 écran « mise à jour requise » (version de schéma)', () => {
  before(function () {
    this.timeout(90_000);
    cy.interceptCloud();
  });

  it('version cliente incompatible → écran « mise à jour requise », jamais noir, aucun contenu app', function () {
    this.timeout(90_000);
    // CLIENT_SCHEMA_VERSION = 2 ; on exige 999 → 2 < 999 → incompatibilité.
    forceMinSchemaVersion(999);
    cy.clearLocalStorage();
    cy.seedLocalSession();
    cy.visit('/dashboard');
    waitForAppReady();

    // (a) L'écran d'état dédié est rendu (ancre `data-screen-state`) avec son
    //     libellé — jamais d'écran muet.
    cy.get('[data-screen-state="error"]', { timeout: 30_000 }).should('be.visible');
    cy.contains('Mise à jour requise', { timeout: 15_000 }).should('be.visible');
    cy.contains('button', 'Recharger', { timeout: 15_000 }).should('be.visible');

    // (b) Pas d'écran noir : la page a du contenu réel.
    cy.expectNoBlankScreen();

    // (c) L'app N'A PAS continué : le contenu applicatif est REMPLACÉ par la
    //     garde (le dashboard n'a pas rendu son shell).
    cy.get('[data-testid="bottom-nav"]').should('not.exist');
    cy.contains('Derniers mouvements').should('not.exist');
  });

  it("version cliente compatible → PAS d'écran « mise à jour requise », dashboard accessible", function () {
    this.timeout(90_000);
    // minVersion laissée non définie → module INTACT → aucune contrainte
    // (fail-open). Le dashboard doit donc s'afficher normalement.
    forceMinSchemaVersion(undefined);
    cy.clearLocalStorage();
    cy.seedLocalSession();
    cy.visit('/dashboard');
    waitForAppReady();

    // Le dashboard rend son shell réel (HeroCard + BottomNav).
    cy.get('button[aria-label="Voir les détails de la caisse principale"]', {
      timeout: 40_000,
    }).should('be.visible');
    cy.get('[data-testid="bottom-nav"]', { timeout: 15_000 }).should('exist');

    // L'écran de garde NE doit PAS apparaître.
    cy.contains('Mise à jour requise').should('not.exist');
  });
});
