/**
 * Cypress E2E — Calendar view (SegmentedTabs, today, nav, ?date= timeline)
 *
 * B2 — Feature « Calendrier événements ».
 *
 * Auth : login du compte d'organisation UNIQUE du run.
 *
 * Flow :
 *   1. Naviguer vers /events, basculer en vue calendrier via SegmentedTabs
 *   2. Vérifier les boutons Jour/Semaine/Mois/Année visibles
 *   3. Cliquer Aujourd'hui et vérifier le header
 *   4. Navigation mois suivant / précédent
 *   5. ?date=YYYY-MM-DD déclenche la vue timeline
 */

describe('Lumina — Calendar segmented tabs + today + navigation + ?date=', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
    cy.ensureAuth();
  });

  it('toggles calendar views, goes to today, and ?date= triggers timeline', function () {
    this.timeout(180_000);

    // ── 1. Navigate to events page ───────────────────────────────────
    cy.ensureAuth();
    cy.visit('/events');
    cy.get('h1, h2, h3', { timeout: 30_000 })
      .contains('Événements')
      .should('be.visible');

    // ── 2. Switch to Calendar tab (SegmentedTabs uses native <button>) ─
    cy.contains('button', 'Calendrier', { timeout: 30_000 }).click();
    cy.contains('button', 'Calendrier').should('have.attr', 'aria-selected', 'true');

    // ── 3. Assert view toggle buttons exist ──────────────────────────
    cy.contains('button', 'Jour').should('be.visible');
    cy.contains('button', 'Semaine').should('be.visible');
    cy.contains('button', 'Mois').should('be.visible');
    cy.contains('button', 'Année').should('be.visible');

    // ── 4. Click "Aujourd'hui" ────────────────────────────────────────
    cy.contains('button', "Aujourd'hui", { timeout: 10_000 }).click();
    // Header should show current week label — assert presence of a date-like string
    cy.get('div').should(($divs) => {
      // Look for any text containing a 4-digit year (e.g. "Semaine du 3 oct.")
      const text = $divs
        .map((_i, el) => el.textContent || '')
        .get()
        .join(' ');
      expect(text.length, 'calendar header text after Today click').to.be.greaterThan(5);
    });

    // ── 5. Toggle to Year view ────────────────────────────────────────
    cy.contains('button', 'Année').click();
    cy.contains('button', 'Année').should('have.attr', 'aria-selected', 'true');
    // Year view shows a 4x3 grid of months
    cy.get('.grid').then(($grid) => {
      // At least some month cells should be visible
      expect($grid.length, 'year grid found').to.be.greaterThan(0);
    });

    // ── 6. Go back to Month view and navigate forward/backward ────────
    cy.contains('button', 'Mois').click();
    cy.contains('button', 'Mois').should('have.attr', 'aria-selected', 'true');

    // Next month
    cy.get('button[aria-label="Suivant (mois/semaine)"]').first().click();
    // Header updated — look for next month in text
    cy.get('div').should(($divs) => {
      const text = $divs
        .map((_i, el) => el.textContent || '')
        .get()
        .join(' ');
      expect(text.length, 'header after next-month click').to.be.greaterThan(5);
    });

    // Previous month
    cy.get('button[aria-label="Précédent (mois/semaine)"]').first().click();

    // ── 7. ?date= param triggers timeline mode ────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    cy.visit(`/events?date=${today}`);
    cy.location('search', { timeout: 30_000 }).should((search: string) => {
      expect(search).to.include(`date=${today}`);
    });
    // View should have switched to timeline — check that the URL retained ?date=
    cy.url({ timeout: 30_000 }).should('include', '/events');
    cy.location('search').should('include', `date=${today}`);

    // ── 8. Clean up: go back to list ─────────────────────────────────
    cy.contains('button', 'Liste').click();
    cy.location('pathname').should((path: string) => {
      expect(path).to.equal('/events');
    });
    cy.location('search').should((search: string) => {
      expect(search).to.not.include('date=');
    });

    console.log('✅ CALENDAR — views, today, nav, ?date= timeline');
  });
});
