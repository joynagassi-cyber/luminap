/**
 * Cypress E2E — Kill switches de fonctionnalités (PR7, Phase 11).
 *
 * Prouve BOUT EN BOUT que `src/lib/featureFlags.ts` coupe RÉELLEMENT une
 * fonctionnalité visible dans l'UI, et que la réactiver la fait réapparaître.
 * On n'utilise AUCUN mock de composant : le drapeau est posé par le mécanisme
 * RÉEL de production — la surcharge locale `localStorage['lumina-flags']`
 * (`FLAGS_STORAGE_KEY`, JSON `{ "<nom>": false }`), lue par `localFlags()` à
 * chaque rendu (fail-open : drapeau absent = fonctionnalité ACTIVE).
 *
 * Fonctionnalité témoin : la RECHERCHE GLOBALE (PR11) — la loupe de
 * l'en-tête (`TopHeader`, `button[aria-label="Rechercher"]`), gardée par
 * `isFeatureEnabled("global-search")`. C'est le point d'entrée visible de la
 * feature sur toutes les pages (l'écran `/search` lui-même n'est pas
 * supprimé : seul l'accès depuis l'en-tête est coupé).
 *
 * NON-VACUITÉ : retirer la garde `isFeatureEnabled("global-search")` de
 * `TopHeader` fait ÉCHOUER le cas « OFF » (le bouton réapparaît). Vérifié
 * localement, non conservé dans le commit.
 *
 * Offline-first (cf. `local-dashboard.cy.ts`) : `cy.interceptCloud()` +
 * `cy.seedLocalSession()` — aucune dépendance cloud, aucun état serveur.
 *
 * NB : pas de `import { cy }` (voir le commentaire de `local-dashboard.cy.ts`).
 */

describe('Lumina — kill switches PR7 (drapeau OFF masque la fonctionnalité)', () => {
  before(function () {
    this.timeout(90_000);
    cy.interceptCloud();
  });

  beforeEach(function () {
    cy.clearLocalStorage();
    cy.seedLocalSession();
  });

  /** Écrit la surcharge locale du kill switch, ou la retire (fail-open). */
  function setGlobalSearchFlag(value: boolean | undefined) {
    return cy.window().then((win) => {
      if (value === undefined) {
        win.localStorage.removeItem('lumina-flags');
      } else {
        win.localStorage.setItem(
          'lumina-flags',
          JSON.stringify({ 'global-search': value }),
        );
      }
    });
  }

  it('drapeau `global-search: false` → la loupe de recherche est ABSENTE de l\'en-tête', function () {
    this.timeout(120_000);
    setGlobalSearchFlag(false);
    cy.visit('/dashboard');

    // L'en-tête est bien monté (témoin indépendant du drapeau) : sans lui,
    // l'absence de la loupe ne prouverait rien.
    cy.get('button[aria-label="Paramètres"]', { timeout: 40_000 }).should(
      'exist',
    );
    cy.get('button[aria-label="Notifications"]').should('exist');

    // La fonctionnalité pilotée par le drapeau est neutralisée.
    cy.get('button[aria-label="Rechercher"]').should('not.exist');
  });

  it('drapeau absent (fail-open) → la loupe EST rendue et mène à /search', function () {
    this.timeout(120_000);
    setGlobalSearchFlag(undefined);
    cy.visit('/dashboard');

    cy.get('button[aria-label="Paramètres"]', { timeout: 40_000 }).should(
      'exist',
    );

    // Fail-open : aucune surcharge → fonctionnalité ACTIVE.
    cy.get('button[aria-label="Rechercher"]', { timeout: 20_000 })
      .should('be.visible')
      .click();

    cy.location('pathname', { timeout: 20_000 }).should('eq', '/search');
    cy.get('input[aria-label="Rechercher dans toute l\'application"]', {
      timeout: 20_000,
    }).should('exist');
  });

  it('drapeau OFF puis RÉACTIVÉ → la loupe disparaît puis réapparaît (sans redéploiement)', function () {
    this.timeout(120_000);

    // 1. OFF : la loupe est absente.
    setGlobalSearchFlag(false);
    cy.visit('/dashboard');
    cy.get('button[aria-label="Paramètres"]', { timeout: 40_000 }).should(
      'exist',
    );
    cy.get('button[aria-label="Rechercher"]').should('not.exist');

    // 2. Réactivation locale (l'appareil change de drapeau) + rechargement :
    //    la fonctionnalité revient sans rebuild.
    setGlobalSearchFlag(true);
    cy.reload();
    cy.get('button[aria-label="Rechercher"]', { timeout: 40_000 }).should(
      'exist',
    );
  });
});
