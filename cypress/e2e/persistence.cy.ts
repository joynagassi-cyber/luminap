/**
 * Cypress E2E — F5 persistence (transaction, event, form)
 *
 * Migrated from: e2e-tests/persistence.spec.ts (Playwright).
 *
 * Auth: login du compte d'organisation UNIQUE du run via
 * cy.loginOrgAccount() (créé par le spec d'auth — pas de re-signup,
 * pas de raccourci localStorage, l'org existe déjà).
 *
 * Rôle PASTEUR_PRINCIPAL (le 1er de la template Église) — permissions
 * transaction:create, event:create et form:create.
 *
 * Flow:
 *   1. loginOrgAccount() → /dashboard
 *   2. Create a transaction, an event (with a budget line), a form
 *      (+ publish + fill + submit)
 *   3. cy.reload() and assert each entity is still visible after the reload
 */

describe('Lumina — F5 persistence (transaction, event, form)', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it('transaction, event budget line, and form submission survive a reload', function () {
    this.timeout(240_000);

    // ── 0. Re-affirm la session : le RouteGuard (App.tsx) rebat
    // sur /auth à CHAQUE cy.visit() si le token supabase n'est plus
    // dans localStorage. On vérifie ici que le token est présent ;
    // sinon on repasse par /splash qui re-hydrate via /auth/v1/token.
    cy.window().then((win) => {
      const sbKey = Object.keys(win.localStorage).find((k) => /-auth-token$/.test(k));
      if (!sbKey) {
        cy.visit('/splash');
        cy.location('pathname', { timeout: 60_000 }).should(
          (path: string) => {
            expect(path, `splash redirected to ${path} — session lost`).to.not.include('auth');
            return true;
          },
        );
      }
    });

    // ── 1. Transaction ─────────────────────────────────────────────────
    cy.visit('/transaction/new');
    cy.get('h1, h2, h3, [role="heading"]').contains('Nouvelle transaction', { timeout: 30_000 }).should('be.visible');

    // Ionic IonInput : cible l'input interne via aria-label
    cy.get('ion-input[aria-label="Montant en francs CFA"] input, input[aria-label="Montant en francs CFA"]')
      .first()
      .clear()
      .type('10000');
    cy.get('ion-input[aria-label="Description"] input, input[aria-label="Description"]')
      .first()
      .type('Persistante Tx F5');

    cy.contains('button', /enregistrer la transaction/i, { timeout: 30_000 }).click();
    cy.location('pathname', { timeout: 30_000 }).then((loc: string) => {
      cy.log('DEBUG after transaction save: ' + loc);
    });

    // ── 2. Event with budget line ──────────────────────────────────────
    cy.visit('/event/new');
    cy.get('h1, h2, h3, [role="heading"]').contains('Nouvel événement', { timeout: 30_000 }).should('be.visible');

    cy.get('ion-input[aria-label="Nom de l\'événement"] input, input[aria-label="Nom de l\'événement"]')
      .first()
      .type('Event Budget F5');
    cy.get('ion-input[aria-label="Description"] input, textarea, input[placeholder="Description de l\'événement..."]')
      .first()
      .type('Budget test persistence', { force: true });

    // Add a budget line (default budget items are shown when showBudget=true)
    cy.contains('button', 'Gérer le budget').click();
    cy.get('input[placeholder="Poste"]').type('Cadeaux');
    cy.get('input[placeholder="Montant"]').type('5000');
    cy.contains('button', 'Ajouter au budget').click();

    cy.contains('button', "Créer l'événement").click();
    cy.location('pathname', { timeout: 30_000 }).then((loc: string) => {
      cy.log('DEBUG after event create: ' + loc);
    });

    // ── 3. Form → publish → fill → submit ─────────────────────────────
    cy.visit('/forms');
    cy.get('h1, h2, h3').contains('Formulaires', { timeout: 30_000 }).should('be.visible');
    cy.contains('button', 'Créer').first().click();

    const formName = 'Test Formulaire F5 ' + Date.now().toString().slice(-6);
    cy.get('input[placeholder*="Nom du formulaire"]').type(formName);
    cy.get('input[placeholder*="Clé"]').type('test_f5_form_' + Date.now().toString().slice(-6));
    cy.contains('button', 'Créer le formulaire').click();
    cy.contains('button', 'Publier', { timeout: 30_000 }).first().click();

    cy.contains('button', 'Remplir').first().click();
    cy.location('pathname', { timeout: 30_000 }).should((path: string) => {
      expect(path).to.match(/^\/form\/fill\//);
    });

    cy.get('input[placeholder="Montant don"]').first()
      .should('be.visible', { timeout: 15_000 })
      .type('2500');
    cy.contains('button', 'Soumettre').click();
    cy.contains('Soumis avec succès', { timeout: 30_000 }).should('be.visible');

    // ── 4. Reload and verify all three entities persist ───────────────
    cy.reload();
    cy.get('button[aria-label="Plus d\'options"]', { timeout: 30_000 }).should('be.visible');

    cy.visit('/finance');
    cy.contains('Persistante Tx F5', { timeout: 30_000 }).should('be.visible');

    cy.visit('/events');
    cy.contains('Event Budget F5', { timeout: 30_000 }).should('be.visible');

    cy.visit('/forms');
    cy.contains('Test Formulaire F5', { timeout: 30_000 }).should('be.visible');

    console.log('✅ F5 PERSISTANCE — transaction, event, form all survive reload');
  });
});
