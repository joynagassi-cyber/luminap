/**
 * Utilitaires de ciblage de la vue ACTIVE.
 *
 * Ionic garde les pages déjà visitées montées dans le DOM et les masque
 * (`ion-page-hidden`, `aria-hidden="true"`). Un `cy.contains(...)` global
 * peut donc tomber sur un élément d'une vue cachée : il existe, mais
 * `checkVisibility()` est faux — le test échoue alors que l'écran affiché
 * à l'utilisateur est correct.
 *
 * `activeView()` restreint les requêtes à la vue réellement visible.
 */
export const activeView = (): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.get('.ion-page:not(.ion-page-hidden), ion-page:not(.ion-page-hidden)', {
    timeout: 60_000,
  }).filter((_, el) => (el as HTMLElement).checkVisibility?.() !== false);
