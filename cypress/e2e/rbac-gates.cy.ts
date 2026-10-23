/**
 * Cypress E2E — Gardes d'accès (RBAC) et identité utilisateur
 *
 * Couvre deux régressions critiques de la session 2026-10-22 :
 *   - R38 : `lumina-user` doit porter l'id RÉEL de l'utilisateur connecté
 *     (et non rester absent → repli factice `local-user`), sans quoi
 *     `federation.canAccess` est toujours faux.
 *   - R39 : une action autorisée (FAB « Créer un groupe ») doit être
 *     visible DÈS LA PREMIÈRE visite, sans rechargement, même si le cache
 *     d'accès a été résolu avant la fin de la 1re synchronisation.
 *
 * Le compte de test est PASTEUR_PRINCIPAL (autorise `group:create`).
 */
import { activePageShouldContain } from '../support/view';

describe('Lumina — Gardes d\'accès (RBAC)', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
    cy.ensureAuth();
  });

  it('R38 — `lumina-user` porte l\'id réel du profil connecté', function () {
    this.timeout(120_000);
    cy.visit('/groups');
    cy.wait(3000);
    cy.window().then((win: any) => {
      const raw = win.localStorage.getItem('lumina-user');
      expect(raw, 'lumina-user doit être écrit au login').to.be.a('string');
      const user = JSON.parse(raw as string);
      expect(user.id, 'id doit être un UUID, pas "local-user"').to.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-/,
      );
      expect(user.id).not.to.eq('local-user');
      expect(user.role, 'le rôle doit être un rôle réel').to.be.a('string').and.not.be.empty;
      expect(user.org?.id, 'org.id doit être renseigné').to.be.a('string').and.not.be.empty;
    });
  });

  it('R39 — le FAB « Créer un groupe » est visible sans rechargement', function () {
    this.timeout(120_000);
    // Cypress 16 `testIsolation` efface localStorage avant chaque `it()` :
    // le `cy.ensureAuth()` du `before()` ne couvre que le 1er test. Sans
    // cette ligne, le RouteGuard rebat sur /auth et « Groupes » n'existe
    // dans aucune page active.
    cy.ensureAuth();
    cy.visit('/groups');
    // La pile de pages Ionic garde les pages précédentes montées : un
    // `cy.get('h1')` peut matcher le titre d'une page MASQUÉE et échouer
    // (« not visible »). On asserte dans la page ACTIVE.
    activePageShouldContain('h1, h2, h3', 'Groupes');
    // Aucun cy.reload() : la résolution doit se corriger seule à la fin
    // de la synchronisation PowerSync.
    cy.get('button[aria-label="Créer un groupe"]', { timeout: 45_000 }).should(
      'exist',
    );
  });
});
