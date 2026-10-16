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
    // Pour confirmer, le .then() ci-dessous trace le DOM complet :
    // chaque ion-input (tag, index, attributes, .value), chaque
    // input/textarea natif, et le contenu du <ion-content>.
    cy.get('ion-input', { timeout: 30_000 })
      .then(($ions) => {
        // Trace diagnostic Run 13 : le contenu REEL du DOM.
        // Chaque ion-input (attributs + value wrapper + value interne).
        document.querySelectorAll('ion-input').forEach((el, i) => {
          const attrs = Array.from(el.attributes)
            .map((a) => `${a.name}=${JSON.stringify(a.value).slice(0, 60)}`)
            .join(' ');
          const inner = (el as any).shadowRoot?.querySelector('input');
          const innerPh = inner?.getAttribute('placeholder');
          const innerAl = inner?.getAttribute('aria-label');
          console.log(
            `[F5-PERSIST] ion-input[${i}] attrs=[${attrs}] ` +
              `wrapper.value=${JSON.stringify((el as any).value)} ` +
              `inner.placeholder=${JSON.stringify(innerPh)} ` +
              `inner.aria-label=${JSON.stringify(innerAl)}`,
          );
        });

        // Chaque input/textarea natif (light DOM).
        document.querySelectorAll('input, textarea').forEach((el, i) => {
          const e = el as HTMLInputElement;
          console.log(
            `[F5-PERSIST] native input[${i}] tag=${e.tagName.toLowerCase()} ` +
              `aria-label=${JSON.stringify(e.getAttribute('aria-label'))} ` +
              `placeholder=${JSON.stringify(e.placeholder ?? '')} ` +
              `value=${JSON.stringify(e.value)}`,
          );
        });

        // Le contenu du <ion-content> (premier 600 caractères).
        const content = document.querySelector('ion-content');
        if (content) {
          const html = content.innerHTML;
          console.log(
            `[F5-PERSIST] ion-content.length=${html.length} ` +
              `first600=${JSON.stringify(html.slice(0, 600))}`,
          );
        } else {
          console.log('[F5-PERSIST] ion-content absent du DOM');
        }

        // ── L'écriture du value : cibler le 1er ion-input du
        // formulaire (le champ du nom est le PREMIER IonInput —
        // le type selector et les autres champs sont soit des
        // boutons HTML natifs, soit des IonInputs qui viennent
        // APRÈS le nom dans l'ordre du formulaire).
        //
        // Si le 1er ion-input n'a pas le placeholder « Ex: »
        // (voir le trace ci-dessus), on essaie le 2e (le champ
        // du nom est parfois le 2e si un IonInput de type
        // selector précède).
        const firstInput = $ions[0] as HTMLElement;
        const secondInput = $ions.length > 1 ? ($ions[1] as HTMLElement) : null;

        // Trouver l'ion-input qui porte le placeholder « Ex: »
        // (sur le host OU dans la shadow root de l'input interne).
        const hasPlaceholder = (el: HTMLElement | null): boolean => {
          if (!el) return false;
          const ph = el.getAttribute('placeholder') ?? '';
          if (ph.startsWith('Ex:') || ph.startsWith('Ex’')) return true;
          // Le placeholder est parfois sur l'input interne (shadow).
          const inner = (el as any).shadowRoot?.querySelector('input');
          const innerPh = inner?.getAttribute?.('placeholder') ?? '';
          return innerPh.startsWith('Ex:') || innerPh.startsWith('Ex’');
        };

        let target: HTMLElement | null = null;
        if (hasPlaceholder(firstInput)) target = firstInput;
        else if (hasPlaceholder(secondInput)) target = secondInput;
        // Fallback R13 : si aucun placeholder « Ex: » n'est trouvé
        // (le DOM déployé diffère du branch local), on prend le
        // 1er ion-input (le formulaire a un ordre stable : le champ
        // du nom est le 1er IonInput — les boutons du type selector
        // sont en HTML natif, pas en IonInput).
        if (!target && $ions.length > 0) target = firstInput;

        if (!target) {
          // Le DOM n'est pas prêt (lazy-load en cours). Le should()
          // ci-dessous va retryer au pass suivant.
          return;
        }

        const ionInputEl = target;

        // L'input interne est en SHADOW ROOT (Stencil) :
        // `nativeInput` est la prop publique de l'IonInput.
        const nativeInput: HTMLInputElement | null =
          (ionInputEl as any).nativeInput ??
          ionInputEl.shadowRoot?.querySelector('input') ??
          ionInputEl.querySelector('input') ??
          null;

        // 1. Écrire la value sur l'input natif interne + sur
        //    le IonInput wrapper (synchronise this.value du
        //    Stencil state).
        if (nativeInput) nativeInput.value = EVENT_NAME;
        (ionInputEl as any).value = EVENT_NAME;

        // 2. Dispatcher ionChange sur le wrapper — avec
        // `detail.event` (l'adaptateur Stencil→React lit
        // `detail.event.target`).
        ionInputEl.dispatchEvent(
          new CustomEvent('ionChange', {
            detail: {
              value: EVENT_NAME,
              event: {
                target: nativeInput ?? ionInputEl,
                currentTarget: ionInputEl,
                type: 'ionChange',
                bubbles: true,
              },
            },
            bubbles: true,
            composed: true,
          }),
        );
      });

    // Vérifier que le IonInput ciblé porte la value. Retry 30 s :
    // le re-render React qui remplit le champ du nom peut ne pas
    // arriver au 1er pass du retry si le scheduler est en queue.
    //
    // Le should() relance cy.get à CHAQUE pass du retry : si le
    // .then() ci-dessus n'a pas écrit le value correctement (input
    // interne non monté au 1er pass), le pass suivant ré-écrit.
    //
    // ⚠️ IMPORTANT : le should() DOIT re-faire l'écriture du value
    // (pas seulement lire) : le .then() est exécuté une seule fois,
    // mais le should() retrye — si on ne ré-écrit pas à chaque
    // pass, le value reste vide (le host .value setter est passif).
    cy.get('ion-input', { timeout: 30_000 })
      .should(($ions) => {
        const firstInput = $ions[0] as HTMLElement;
        const secondInput = $ions.length > 1 ? ($ions[1] as HTMLElement) : null;

        const hasPlaceholder = (el: HTMLElement | null): boolean => {
          if (!el) return false;
          const ph = el.getAttribute('placeholder') ?? '';
          if (ph.startsWith('Ex:') || ph.startsWith('Ex’')) return true;
          const inner = (el as any).shadowRoot?.querySelector('input');
          const innerPh = inner?.getAttribute?.('placeholder') ?? '';
          return innerPh.startsWith('Ex:') || innerPh.startsWith('Ex’');
        };

        let target: HTMLElement | null = null;
        if (hasPlaceholder(firstInput)) target = firstInput;
        else if (hasPlaceholder(secondInput)) target = secondInput;
        if (!target && $ions.length > 0) target = firstInput;

        if (!target) {
          // Le DOM n'est pas prêt — le should() va retryer.
          console.log(
            `[F5-PERSIST] should() retry — ion-input[${$ions.length}] éléments, ` +
              `aucun ciblé (retry)`,
          );
          throw new Error(
            'IonInput introuvable au retry — le formulaire n’est pas encore monté',
          );
        }

        const ionInputEl = target;
        const nativeInput: HTMLInputElement | null =
          (ionInputEl as any).nativeInput ??
          ionInputEl.shadowRoot?.querySelector('input') ??
          ionInputEl.querySelector('input') ??
          null;

        // Ré-écrire le value à chaque pass du retry (le .then()
        // du bloc ci-dessus est exécuté UNE SEULE FOIS ; le
        // should() RETRY — il faut ré-écrire à chaque pass pour
        // que le value atterre quand l'input interne est monté).
        if (nativeInput) nativeInput.value = EVENT_NAME;
        (ionInputEl as any).value = EVENT_NAME;
        ionInputEl.dispatchEvent(
          new CustomEvent('ionChange', {
            detail: {
              value: EVENT_NAME,
              event: {
                target: nativeInput ?? ionInputEl,
                currentTarget: ionInputEl,
                type: 'ionChange',
                bubbles: true,
              },
            },
            bubbles: true,
            composed: true,
          }),
        );

        // Attendre le re-render React (asynchrone) — le should()
        // va relancer le callback au pass suivant du retry.
        // Le value doit être visible au pass suivant (le re-render
        // a le temps d'arriver entre les passes du retry).
        const v =
          (ionInputEl as any).value ??
          (ionInputEl as any)?.nativeInput?.value ??
          ionInputEl.shadowRoot?.querySelector('input')?.value;
        expect(
          v,
          `le IonInput ciblé porte ${JSON.stringify(v)} (attendu "${EVENT_NAME}") — ` +
            `l'écriture du value n'a pas abouti (input interne non monté ?)`,
        ).to.equal(EVENT_NAME);
      });

    // Le IonButton « Créer l'événement » rend un <ion-button>
    // (custom element) — le texte est un child text node, pas un
    // attribute. En Ionic 7 le ion-button rend directement le
    // texte dans son light DOM (pas de <button> interne). On cible
    // donc le ion-button par son texte.
    cy.contains('ion-button', "Créer l'événement", { timeout: 30_000 })
      .first()
      .click({ force: true });

    // VÉRIFICATION IMMÉDIATE de la navigation post-submit : le
    // submit déclenche navigate("/events") dans EventNew.tsx
    // s'il a réussi. Si on ne navigue PAS, le nom a été vide
    // (React state pas synchronisé) et le submit a bailed.
    // Le should() retrye jusqu'à 60 s (l'app peut mettre un peu
    // de temps à naviguer après l'attente du addEventPS + la
    // notification).
    cy.location('pathname', { timeout: 60_000 }).should(
      'eq',
      '/events',
      "le submit n'a pas navigué vers /events — le ion-input type n'a pas déclenché onIonChange, ou le submit a bailed sur !name.trim()",
    );

    // ── 2. Verify the event persists across a hard reload ──────────
    // Les événements sont lus via PowerSync (useEvents → useQuery)
    // qui sync l'upload local → server. Le premier sync peut
    // prendre 10-30 s.
    //
    // ⚠️ cy.reload() casse le cycle (2e run) : le RouteGuard
    // re-checke le token Supabase à chaque load. Si le token a
    // été invalidé par le 1er run, le guard rebat sur /auth.
    // Correctif déterministe : on visite /splash (public,
    // re-hydrate la session via authService.getSession() si le
    // token est expiré), on attend le retour sur /events, et on
    // assert le nom. C'est le même F5 (la page re-sert React
    // fresh), mais sans casser la session.
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
    cy.location('pathname', { timeout: 30_000 }).should('eq', '/events');
    cy.contains(EVENT_NAME, { timeout: 120_000 }).should('be.visible');

    console.log('✅ F5 PERSISTANCE — event survives re-served of /events');
  });
});
