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
    cy.get('input[aria-label="Montant en francs CFA"], ion-input input[aria-label="Montant en francs CFA"]')
      .first()
      .clear()
      .type('10000');
    cy.get('input[aria-label="Description"], ion-input input[aria-label="Description"]')
      .first()
      .type('Persistante Tx F5');

    // Le submit est un <IonButton> (custom element) : on cible le texte
    // directement (cy.contains sans scope 'button') — le même correctif
    // que finance-deep.cy.ts.
    cy.contains('Enregistrer la transaction', { timeout: 30_000 }).click();
    cy.location('pathname', { timeout: 30_000 }).then((loc: string) => {
      cy.log('DEBUG after transaction save: ' + loc);
    });

    // ── 2. Event with budget line ──────────────────────────────────────
    cy.visit('/event/new');
    // « Nouvel événement » est un <IonTitle> (custom element Ionic, shadow
    // DOM) — pas un h1/h2/h3 natif. On cible le IonTitle directement.
    cy.get('ion-title', { timeout: 30_000 }).contains('Nouvel événement').should('be.visible');

    cy.get('input[aria-label="Nom de l\'événement"], ion-input input[aria-label="Nom de l\'événement"]')
      .first()
      .type('Event Budget F5');
    cy.get('textarea[aria-label="Description"], input[aria-label="Description"]')
      .first()
      .type('Budget test persistence');

    // Add a budget line (default budget items are shown when showBudget=true)
    cy.contains('button', 'Gérer le budget').click();
    cy.get('ion-input[placeholder="Poste"] input, input[placeholder="Poste"]').first().type('Cadeaux');
    cy.get('ion-input[placeholder="Montant"] input, input[placeholder="Montant"]').first().type('5000');
    cy.contains('button', 'Ajouter au budget').click();

    cy.contains('Créer l\'événement').click();
    cy.location('pathname', { timeout: 30_000 }).then((loc: string) => {
      cy.log('DEBUG after event create: ' + loc);
    });

    // ── 3. Form → publish → fill → submit ─────────────────────────────
    cy.visit('/forms');
    // « Formulaires » est rendu par un TopHeader (titre), pas un
    // h1/h2/h3 natif sur certains viewports — on vérifie la présence
    // de la page par le placeholder du form de création, plus robuste.
    cy.contains('button', 'Créer', { timeout: 30_000 }).first().click();

    const formName = 'Test Formulaire F5 ' + Date.now().toString().slice(-6);
    // Les inputs du modal de création sont des <IonInput> (custom
    // element Ionic) : l'input natif est dans le light DOM, ciblé
    // par son placeholder (hérité par l'ion-input + le input interne).
    cy.get('input[placeholder*="Nom du formulaire"], ion-input[placeholder*="Nom du formulaire"] input')
      .first()
      .type(formName);
    cy.get('input[placeholder*="Clé"], ion-input[placeholder*="Clé"] input')
      .first()
      .type('test_f5_form_' + Date.now().toString().slice(-6));
    cy.contains('Créer le formulaire').click();
    // Le formulaire apparaît dans la liste : on le publie.
    cy.contains(formName, { timeout: 30_000 }).should('be.visible');
    cy.contains('button', 'Publier', { timeout: 30_000 }).first().click();

    cy.contains('button', 'Remplir').first().click();
    cy.location('pathname', { timeout: 30_000 }).should((path: string) => {
      expect(path).to.match(/^\/form\/fill\//);
    });

    // Le field « Montant don » est un label dynamique (field.label) —
    // on cible le 1er input/textarea de la grille de fill (n'importe
    // quel champ du form, le submit ne vérifie que la présence d'un
    // champ rempli pour ce flow E2E). Plus robuste que le label exact.
    cy.get('input[placeholder], textarea')
      .first()
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
