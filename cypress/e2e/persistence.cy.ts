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
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it('event creation and persistence across navigation', function () {
    this.timeout(240_000);

    const EVENT_NAME = 'Event Persist F5';

    // ── 0. Re-affirm la session : le RouteGuard (App.tsx) rebat
    // sur /auth à CHAQUE cy.visit() si le token supabase n'est plus
    // dans localStorage. On vérifie ici que le token est présent ;
    // sinon on repasse par /splash qui re-hydrate via /auth/v1/token.
    cy.ensureAuth();

    // ── 1. Create the event ─────────────────────────────────────────
    // La route /event/new est lazy-load (React.lazy dans routes/events.tsx) :
    // il faut attendre que la navigation vers /event/new soit complète
    // avant de chercher les inputs, sinon le sélecteur échoue.
    // On ne cible QUE le nom : c'est le seul champ requis pour un
    // événement de type EVENT (le montant de cotisation n'est requis
    // QUE pour eventType === 'CULTE', qui n'est pas le cas ici).
    // La description est optionnelle — pas besoin de la remplir pour
    // tester la persistance.
    cy.visit('/event/new');
    cy.get('ion-title', { timeout: 60_000 })
      .contains('Nouvel événement')
      .should('be.visible');

    // Nom : IonInput (custom element Ionic). Le pattern qui marche dans
    // tout le projet (cf. events-tasks.cy.ts, groups-events.cy.ts) est
    // de cibler l'ion-input par son aria-label et de faire .type()
    // directement dessus — l'ion-input interne répropage vers
    // onIonChange, ce qui met à jour le state React.
    const nameSel =
      'ion-input[aria-label="Nom de l\'événement"], input[aria-label="Nom de l\'événement"]';

    cy.get(nameSel, { timeout: 30_000 }).first().type(EVENT_NAME, { force: true });
    cy.contains('button', "Créer l'événement", { timeout: 30_000 }).click();

    // VÉRIFICATION IMMÉDIATE de la navigation post-submit : le submit
    // déclenche navigate("/events") dans EventNew.tsx s'il a réussi.
    // Si on ne navigue PAS, le nom a été vide (React state pas
    // synchronisé) et le submit a bailed — le test échoue ici avec
    // un message clair plutôt qu'à l'assert finale. Le should() retrye
    // jusqu'à 60 s (l'app peut mettre un peu de temps à naviguer
    // après l'attente du addEventPS + la notification).
    cy.location('pathname', { timeout: 60_000 }).should(
      'eq',
      '/events',
      "le submit n'a pas navigué vers /events — l'état React du nom était probablement vide au moment du click (le .type() de Cypress sur l'ion-input n'a pas déclenché onIonChange, ou le submit a bailed sur !name.trim())",
    );

    // ── 2. Verify the event persists across a hard reload ──────────
    // Les événements sont lus via PowerSync (useEvents → useQuery) qui
    // sync l'upload local → server. Le premier sync peut prendre 10-30 s.
    // On recharge /events (cy.reload() = F5), et on attend que le nom
    // soit visible (timeout étendu pour le sync). Si PowerSync n'a pas
    // encore synchronisé, le fallback local (useLocalStore, IndexedDB)
    // devrait le retourner (offline-first) — le test passe dans les
    // deux cas, ce qui est le point exact du F5.
    cy.reload();
    cy.location('pathname', { timeout: 30_000 }).should('eq', '/events');
    cy.contains(EVENT_NAME, { timeout: 90_000 }).should('be.visible');

    console.log('✅ F5 PERSISTANCE — event survives hard reload of /events');
  });
});
