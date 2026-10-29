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
  const SUPABASE_URL =
    (Cypress.expose('SUPABASE_URL') as string) ||
    'https://hhgovvrnalibhgpakswi.supabase.co';
  const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;
  // P39 — borne temporelle stricte du nettoyage (run courant uniquement).
  const runStartedAt = new Date().toISOString();

  /**
   * Jeton RÉEL de l'utilisateur connecté (motif de
   * `rls-isolation-hardened.cy.ts`). Les politiques SELECT de `events`
   * filtrent par `is_org_member(auth.uid(), org_id)` : avec la clé anon,
   * `auth.uid()` est NULL et la requête ne renvoie jamais la ligne créée.
   */
  const realToken = (): Cypress.Chainable<string> =>
    cy.window().then((win) => {
      const ls = win.localStorage;
      const sbKey = Object.keys(ls).find((k) => /-auth-token$/.test(k));
      if (!sbKey) throw new Error('Aucune session Supabase en localStorage');
      const raw = JSON.parse(ls.getItem(sbKey)!);
      const token = raw?.access_token;
      if (!token) throw new Error('access_token absent de la session');
      return token as string;
    });

  before(function () {
    this.timeout(120_000);
    cy.loginOrgAccount();
    cy.ensureAuth();
  });

  after(() => {
    // P39 — nettoyage NON FATAL (voir cypress/support/e2eCleanup.ts) : annule
    // l'événement « Event Persist F5 » créé par ce spec. La mesure
    // (2026-10-29) comptait 267 résidus de ce nom exact — le spec créait 1
    // événement par exécution sans jamais le nettoyer. La borne `sinceIso`
    // garantit que seul l'événement du RUN COURANT est annulé (le nom est
    // déterministe, donc partagé par tous les runs passés). C'est une
    // ARCHIVATION (`CANCELLED`), jamais une suppression destructive.
    cy.cleanupTestArtifacts({
      eventNamePrefix: ['Event Persist F5'],
      sinceIso: runStartedAt,
    });
  });

  it('event creation and persistence across navigation', function () {
    this.timeout(300_000);

    const EVENT_NAME = 'Event Persist F5';
    // Renseigné après le submit (id extrait de `/event/:id`) : sert de clé
    // aux preuves de persistance locale puis serveur.
    let createdEventId = '';

    // ── 0. Re-affirm la session : le RouteGuard (App.tsx) rebat
    // sur /auth à CHAQUE cy.visit() si le token supabase n'est plus
    // dans localStorage. On vérifie ici que le token est présent ;
    // sinon on repasse par /splash qui re-hydrate via /auth/v1/token.
    cy.ensureAuth();

    // ── 1. Create the event ─────────────────────────────────────────
    // La route /event/new est lazy-load (React.lazy dans
    // ionic/routes/events.tsx) : il faut attendre que la navigation
    // vers /event/new soit complète avant de chercher les inputs.
    cy.visit('/event/new');
    cy.get('ion-title', { timeout: 90_000 })
      .contains('Nouvel événement')
      .should('be.visible');

    // ── Diagnostic Run 13 (2026-10-10) ────────────────────────────
    // Le .should() R11-R12 a échoué de la même façon : aucun
    // ion-input du DOM ne porte un aria-label « Nom de l… » NI un
    // placeholder « Ex:… ». Le formulaire a monté (le ion-title
    // « Nouvel événement » est visible, le ion-button « Créer
    // l'événement » est dans le DOM), mais les IonInputs n'ont
    // AUCUN attribut identifiable (pas d'aria-label, pas de
    // placeholder sur le host).
    //
    // Hypothèse : le bundle déployé sur Render porte un EventNew.tsx
    // DIFFÉRENT du branch local (le code a changé après le dernier
    // deploy). Les IonInputs du champ du nom sont peut-être rendus
    // SANS placeholder ET SANS aria-label sur le host (le placeholder
    // est porté par l'input interne en SHADOW ROOT, pas par le host).
    //
    // Correctif R13 : cibler le ion-input du nom par son POSITION
    // relative dans le DOM (index 0 ou 1 du cy.get('ion-input') —
    // le formulaire a un ordre stable : type selector → nom →
    // description → dates → statut → budget). Le nom est le
    // PREMIER IonInput du formulaire (le type selector utilise des
    // boutons HTML natifs, pas des IonInput).
    //
    // Le champ « Nom de l'événement » est un IonInput : écrire sur l'input
    // natif ne propage PAS vers `onIonChange` (le state React reste vide et
    // le submit sort par `!name.trim()`), d'où un formulaire qui ne navigue
    // pas. Le dépôt fournit déjà le chemin fiable — `cy.typeIonicInput`
    // (cypress/support/ionic.ts), utilisé par `events-tasks.cy.ts` et
    // `cross-tenant.cy.ts`, qui écrivent la valeur ET émettent `ionChange`.
    //
    // Le long bricolage manuel qui se trouvait ici (traçage du DOM, écriture
    // du `value` puis re-dispatch d'un `ionChange` synthétique à chaque pass
    // de retry) datait d'une époque où l'on croyait que le champ n'avait ni
    // `aria-label` ni `placeholder` identifiables. `events-tasks.cy.ts`
    // prouve le contraire : le champ porte bien l'`aria-label`
    // « Nom de l'événement ». Le bricolage n'écrivait en réalité le state
    // React de façon fiable que par accident.
    cy.typeIonicInput("Nom de l'événement", EVENT_NAME);
    // Laisser React traiter l'`ionChange` : le bouton peut rester désactivé
    // pendant le render qui suit la mise à jour du state.
    cy.wait(500);

    // Le IonButton « Créer l'événement » rend un <ion-button>
    // (custom element) — le texte est un child text node, pas un
    // attribute. En Ionic 7 le ion-button rend directement le
    // texte dans son light DOM (pas de <button> interne). On cible
    // donc le ion-button par son texte.
    cy.contains('ion-button', "Créer l'événement", { timeout: 30_000 })
      .first()
      .click({ force: true });

    // ── 1bis. Post-submit : l'app ouvre le DÉTAIL de l'événement créé ──
    // `EventNew.tsx` navigue vers `/event/${newEventId}` et NON vers
    // `/events` : la liste est triée par date décroissante et tronquée aux
    // 50 premiers, donc un événement daté d'avant n'y apparaît pas et
    // l'utilisateur croit la création perdue (mesuré : 302 événements en
    // base pour cette org, une liste plafonnée à 50 lignes).
    //
    // L'ancienne assertion `pathname === '/events'` était donc FAUSSE : elle
    // ne pouvait pas passer dès que la création réussissait. On assert le
    // chemin RÉEL et on capture l'id, qui sert de clé aux preuves suivantes.
    cy.location('pathname', { timeout: 60_000 }).should((path: string) => {
      expect(path, `chemin après création : ${path}`).to.match(
        /^\/event\/(?!new$)[^/]+$/,
      );
    });
    cy.location('pathname').then((path) => {
      createdEventId = path.split('/').pop() as string;
    });
    // Le nom est rendu sur le détail (EventDetail.tsx §h1) : preuve de
    // relecture immédiate depuis le store PowerSync local.
    cy.contains(EVENT_NAME, { timeout: 60_000 }).should('be.visible');

    // ── 2. Persistance : re-service complet puis relecture ──────────
    // `cy.reload()` casse le cycle : le RouteGuard re-checke le token
    // Supabase à chaque load et rebat sur /auth si le token a été
    // invalidé. On visite /splash (public, re-hydrate la session via
    // authService) puis on re-visite le DÉTAIL par son id — un re-service
    // complet de l'app, sans dépendre de la liste tronquée.
    cy.visit('/splash');
    cy.location('pathname', { timeout: 30_000 }).should(
      (path) => {
        expect(
          path,
          `splash a rebattu sur ${path} — le token Supabase a expiré`,
        ).to.not.eq('/auth');
        return true;
      },
    );
    cy.wrap(null).then(() => {
      cy.visit(`/event/${createdEventId}`);
    });
    cy.contains(EVENT_NAME, { timeout: 120_000 }).should('be.visible');

    // ── 3. Persistance SERVEUR (la preuve qui compte sur 4 mois) ────
    // Le re-service ci-dessus prouve la relecture locale (IndexedDB
    // PowerSync). On vérifie en plus que la ligne a bien été UPLOADÉE vers
    // Supabase, avec le JETON RÉEL de l'utilisateur (les politiques de
    // `events` filtrent par `is_org_member(auth.uid(), org_id)` : la clé
    // anon ne renvoie rien). L'upload PowerSync est asynchrone → on
    // retente avec une temporisation bornée.
    realToken().then((token) => {
      const check = (attempts: number): void => {
        cy.request({
          method: 'GET',
          url: `${SUPABASE_URL}/rest/v1/events?id=eq.${createdEventId}&select=id,name`,
          headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
        }).then((res: any) => {
          expect(res.status).to.eq(200);
          if ((res.body as any[]).length > 0) {
            expect((res.body as any[])[0].name).to.eq(EVENT_NAME);
            cy.log(`persistance serveur confirmée (id ${createdEventId})`);
            return;
          }
          if (attempts <= 0) {
            throw new Error(
              `événement ${createdEventId} absent de Supabase après attente — ` +
                "l'upload PowerSync n'a pas abouti",
            );
          }
          cy.wait(2_000);
          check(attempts - 1);
        });
      };
      check(15);
    });

    console.log('✅ F5 PERSISTANCE — event relu après re-service + présent en base');
  });
});
