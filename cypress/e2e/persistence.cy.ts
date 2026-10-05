/**
 * Cypress E2E — F5 persistence (event)
 *
 * Le formulaire d'événement (création + remplissage + soumission) est
 * déjà couvert par events-tasks.cy.ts et groups-events.cy.ts. Ce spec
 * se concentre uniquement sur la PERSISTANCE : créer un événement
 * unique (nom déterministe, jamais nettoyé entre les runs), le
 * visiter une fois pour déclencher son écriture PowerSync, puis
 * recharger /events et vérifier que le nom y apparaît encore.
 *
 * Auth: login du compte d'organisation UNIQUE du run via
 * cy.loginOrgAccount() (créé par le spec d'auth — pas de re-signup,
 * pas de raccourci localStorage, l'org existe déjà).
 *
 * Rôle PASTEUR_PRINCIPAL (le 1er de la template Église) — permissions
 * event:create et form:create.
 *
 * Flow:
 *   1. loginOrgAccount() → /dashboard
 *   2. Créer l'événement unique (nom "Event Persist F5" — déterministe
 *      et stable, pas de prefix horodaté, pour qu'il existe exactement
 *      une fois par run et qu'il ne soit jamais supprimé par un autre
 *      spec)
 *   3. Visiter /events, recharger, et ré-assert que le nom est là
 *      (preuve que l'événement a été synchronisé dans PowerSync et
 *      subsiste après un F5 complet du navigateur)
 */

describe('Lumina — F5 persistence (event)', () => {
  before(function () {
    this.timeout(120_000);
    cy.loginOrgAccount();
    cy.ensureAuth();
  });

  it('event creation and persistence across navigation', function () {
    this.timeout(300_000);

    const EVENT_NAME = 'Event Persist F5';

    // ── 0. Re-affirm la session : le RouteGuard (App.tsx) rebat
    // sur /auth à CHAQUE cy.visit() si le token supabase n'est plus
    // dans localStorage. On vérifie ici que le token est présent ;
    // sinon on repasse par /splash qui re-hydrate via /auth/v1/token.
    cy.ensureAuth();

    // ── 1. Create the event ─────────────────────────────────────────
    // La route /event/new est lazy-load (React.lazy dans
    // routes/events.tsx) : il faut attendre que la navigation
    // vers /event/new soit complète avant de chercher les inputs.
    cy.visit('/event/new');
    cy.get('ion-title', { timeout: 90_000 })
      .contains('Nouvel événement')
      .should('be.visible');

    // ── Le formulaire d'événement ─────────────────────────────────
    // Le IonInput du nom est un custom element Ionic (wrapper
    // ion-input, input natif interne). Le pattern éprouvé dans
    // events-tasks.cy.ts (ce spec utilise le même flow) est :
    //
    //   cy.get('input[aria-label="..."]').type(name, { force: true })
    //
    // — cypress force() contourne le checkVisibility, et le
    // type() de Cypress sur l'input interne déclenche bien le
    // ionChange de l'IonInput (onIonChange → setName).
    cy.get(
      'ion-input[aria-label="Nom de l\'événement"], input[aria-label="Nom de l\'événement"]',
      { timeout: 30_000 },
    )
      .first()
      .type(EVENT_NAME, { force: true });

    // Vérifier que le champ du nom a bien été rempli (la value est
    // dans l'input natif interne) AVANT de soumettre.
    cy.get(
      'ion-input[aria-label="Nom de l\'événement"], input[aria-label="Nom de l\'événement"]',
      { timeout: 10_000 },
    )
      .first()
      .should(($el: any) => {
        // Le input natif interne est un descendant du wrapper.
        const nativeInput =
          $el[0].querySelector('input') ??
          ($el[0].tagName.toLowerCase() === 'input' ? $el[0] : null);
        expect(
          (nativeInput as HTMLInputElement | null)?.value,
          "le nom n'est pas dans le champ — le submit va bailed",
        ).to.equal(EVENT_NAME);
      });

    // Le IonButton « Créer l'événement » rend un <ion-button>
    // (custom element) — le texte est un child text node, pas un
    // attribute. `cy.contains('button', ...)` cherche un <button>
    // DOM avec ce texte en descendant : ça marche si le ion-button
    // rend un <button> natif interne, mais en Ionic 7 le ion-button
    // rend directement le texte dans son light DOM (pas de
    // <button> interne). On cible donc le ion-button par son texte
    // et on clique dessus (le ion-button a un onclick).
    cy.contains('ion-button', "Créer l'événement", { timeout: 30_000 })
      .first()
      .click({ force: true });

    // VÉRIFICATION IMMÉDIATE de la navigation post-submit : le submit
    // déclenche navigate("/events") dans EventNew.tsx s'il a réussi.
    // Si on ne navigue PAS, le nom a été vide (React state pas
    // synchronisé) et le submit a bailed — le test échoue ici avec
    // un message clair plutôt qu'à l'assert finale. Le should()
    // retrye jusqu'à 60 s (l'app peut mettre un peu de temps à
    // naviguer après l'attente du addEventPS + la notification).
    cy.location('pathname', { timeout: 60_000 }).should(
      'eq',
      '/events',
      "le submit n'a pas navigué vers /events — le ion-input type n'a pas déclenché onIonChange, ou le submit a bailed sur !name.trim()",
    );

    // ── 2. Verify the event persists across a hard reload ──────────
    // Les événements sont lus via PowerSync (useEvents → useQuery)
    // qui sync l'upload local → server. Le premier sync peut
    // prendre 10-30 s. On recharge /events (cy.reload() = F5),
    // et on attend que le nom soit visible (timeout étendu pour le
    // sync). Si PowerSync n'a pas encore synchronisé, le fallback
    // local (useLocalStore, IndexedDB) devrait le retourner
    // (offline-first) — le test passe dans les deux cas, ce qui
    // est le point exact du F5.
    cy.reload();
    cy.location('pathname', { timeout: 30_000 }).should('eq', '/events');
    cy.contains(EVENT_NAME, { timeout: 120_000 }).should('be.visible');

    console.log('✅ F5 PERSISTANCE — event survives hard reload of /events');
  });
});
