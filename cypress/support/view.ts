/**
 * Ciblage de la page Ionic ACTIVE.
 *
 * Ionic conserve chaque page visitée montée dans `ion-router-outlet` et la
 * masque (`ion-page-hidden` + `aria-hidden`). Deux pièges en découlent, et
 * ils faisaient échouer des specs alors que l'app fonctionnait :
 *
 *   1. `ion-app` porte aussi la classe `ion-page` : un sélecteur
 *      `.ion-page:not(.ion-page-hidden)` matche l'application entière, donc
 *      `cy.contains(...)` fouille aussi les pages cachées.
 *   2. La page affichée est le DERNIER `div.ion-page` non masqué du
 *      routeur (elle peut garder la classe transitoire
 *      `ion-page-invisible` sans être invisible pour l'utilisateur).
 *
 * `activePage()` renvoie un CLICHÉ de cette page : il ne doit être appelé
 * qu'une fois la navigation terminée, sinon il peut capturer la page
 * précédente. Pour attendre l'arrivée d'un contenu, utiliser
 * `activePageShouldContain()`, qui ré-évalue la requête à chaque tentative.
 */

const visiblePages = ($pages: JQuery<HTMLElement>): HTMLElement[] =>
  $pages
    .toArray()
    .filter(
      (el) =>
        !el.classList.contains("ion-page-hidden") &&
        (el as HTMLElement).checkVisibility?.() !== false,
    );

const lastVisiblePage = ($pages: JQuery<HTMLElement>): HTMLElement | null => {
  const visible = visiblePages($pages);
  return visible.length > 0 ? (visible[visible.length - 1] as HTMLElement) : null;
};

/** Cliché de la page Ionic actuellement affichée. */
export const activePage = (): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.get("div.ion-page", { timeout: 60_000 }).then(($pages) => {
    const page = lastVisiblePage($pages);
    expect(page, "page Ionic active").to.not.be.null;
    return cy.wrap(page as HTMLElement);
  });

/**
 * Attend que la page active contienne `text` dans un élément `selector`.
 * Ré-évalue la requête à chaque tentative : c'est la seule forme fiable
 * juste après une navigation.
 */
export const activePageShouldContain = (
  selector: string,
  text: string,
): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.get("div.ion-page", { timeout: 60_000 }).should(($pages) => {
    // Pendant une transition, la page entrante et la sortante peuvent être
    // toutes deux « visibles » : on cherche dans l'ensemble des pages
    // visibles, jamais dans une page masquée.
    const pages = visiblePages($pages);
    expect(pages.length, "au moins une page visible").to.be.greaterThan(0);
    const found = pages.some((page) =>
      Array.from(page.querySelectorAll(selector)).some((el) =>
        (el.textContent || "").includes(text),
      ),
    );
    expect(found, `"${text}" présent dans la page active (${selector})`).to.be.true;
  });
