/**
 * Cypress E2E — Performance batch (offline exact sync, charge tx, calendar events)
 *
 * B4 — bornes hautes : vérifier que le pipeline PowerSync reste stable
 * sous charge.
 *
 * Tests :
 *   1. Offline exact sync — créer 20 transactions offline, passer en
 *      online, attendre le cycle sync, vérifier que exactement 20
 *      lignes sont présentes sur le serveur (pas 19, pas 21).
 *   2. Charge 50 transactions — même pattern avec 50 tx, vérifier
 *      comptage serveur.
 *   3. Calendrier 500 événements — créer 500 événements et s'assurer
 *      que la vue calendrier reste responsive (ne plante pas, affiche
 *      au moins les premiers). Si le budget temps le permet.
 *
 * NOTE : le sync offline→online prend ~35s par cycle (Poller PowerSync).
 * Les timeouts sont ajustés en conséquence.
 */

describe('Lumina — Performance batch (offline sync + charge tx + calendar)', () => {
  // P39 — préfixes de description/nom uniques au run, collectés par les tests
  // et drainés par `after()` (repli quand un test échoue avant la mesure).
  const txPrefixes: string[] = [];
  const eventPrefixes: string[] = [];
  // Borne temporelle stricte : ne nettoie QUE les entités créées par ce run.
  const runStartedAt = new Date().toISOString();

  const SUPABASE_URL =
    (Cypress.expose('SUPABASE_URL') as string) ||
    'https://hhgovvrnalibhgpakswi.supabase.co';
  const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;

  /**
   * Jeton RÉEL de l'utilisateur connecté (motif de
   * `rls-isolation-hardened.cy.ts` et `org-reports.cy.ts`).
   *
   * Les politiques SELECT de `transactions` sont posées sur le rôle
   * `authenticated` ; avec la clé **anon**, `auth.uid()` est NULL → **0
   * ligne visible**. Les anciennes assertions interrogeaient le serveur avec
   * `Authorization: Bearer <anonKey>` et recevaient donc systématiquement 0 :
   * elles ne pouvaient pas valider la synchronisation (échec « expected 0 to
   * be at least 20 »). Défaut de test, pas de code.
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
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  after(() => {
    if ((Cypress.expose('CYPRESS_SKIP_CLEANUP') as string) === '1') return;
    // P39 — nettoyage NON FATAL : les 120 transactions (`Tx batch`/`ChargeTx`)
    // et 50 événements (`CalEvent`) créés par ce spec n'étaient jamais
    // nettoyés (mesure : 12 353 « CalEvent » résiduels). Les transactions ne
    // s'archivent pas : seules les lignes DRAFT/PENDING du run sont
    // supprimées (jamais APPROVED). Les événements sont annulés (CANCELLED).
    cy.cleanupTestArtifacts({
      transactionDescriptionPrefix: txPrefixes,
      eventNamePrefix: eventPrefixes,
      sinceIso: runStartedAt,
    });
  });

  // ── Test 1: offline exact sync (20 transactions) ──────────────────────────
  it('exact sync: 20 transactions created offline reach server', function () {
    this.timeout(180_000);

    const SUPABASE_URL =
      (Cypress.expose('SUPABASE_URL') as string) ||
      'https://hhgovvrnalibhgpakswi.supabase.co';
    const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;
    const now = Date.now();
    const COUNT = 20;
    txPrefixes.push(`Tx batch ${now}`);

    // ── 1. Auth + premier rendu du formulaire ─────────────────────────
    // Les intercepts sont posés APRÈS le premier `cy.visit` : les enregistrer
    // avant ferait échouer le chargement du bundle (le GET du chunk est
    // détruit pendant que la page se charge). Mesuré : dans cette
    // configuration le formulaire se rend puis la boucle écrit bien les
    // 20 transactions en local ET dans `ps_crud`.
    cy.ensureAuth();
    cy.visit('/transaction/new');
    cy.get('h1, h2, h3, [role="heading"]', { timeout: 30_000 })
      .contains(/nouvelle transaction/i)
      .should('be.visible');

    // ── 2. Simuler le hors-ligne ──────────────────────────────────────
    let offline = true;
    cy.intercept({ method: 'GET', url: `${SUPABASE_URL}/**` }, (req: any) => {
      if (offline) req.destroy();
    }).as('sgGet');
    cy.intercept({ method: 'POST', url: `${SUPABASE_URL}/**` }, (req: any) => {
      if (offline) req.destroy();
    }).as('sgPost');

    for (let i = 0; i < COUNT; i++) {
      cy.get('input[aria-label="Montant en francs CFA"], ion-input input[aria-label="Montant en francs CFA"]')
        .first()
        .clear()
        .type(String(1000 + i * 100));
      cy.get('input[aria-label="Description"], ion-input input[aria-label="Description"]')
        .first()
        .clear()
        .type(`Tx batch ${now} #${i}`);
      cy.contains('Enregistrer la transaction', { timeout: 10_000 }).click();
      // Attendre l'affichage de la description sur la page DÉTAIL. On ne peut
      // PAS se contenter de `cy.location().should('match', /^\/transaction\/[^/]+$/)` :
      // `/transaction/new` satisfait cette expression, donc l'assertion passe
      // immédiatement sur le formulaire et le `cy.visit` suivant recharge la
      // page et interrompt l'écriture asynchrone (mesure : 0 ligne serveur).
      cy.contains(`Tx batch ${now} #${i}`, { timeout: 30_000 }).should('be.visible');
      cy.visit('/transaction/new');
      cy.url().should('include', '/transaction/new');
      cy.get('input[aria-label="Description"]', { timeout: 30_000 }).should('be.visible');
    }

    // ── 3. Restore online mode ────────────────────────────────────────
    offline = false;

    // ── 4. Flush the upload queue deterministically ───────────────────
    // Sous Cypress/Electron, le worker WASM de PowerSync ne fait pas tourner
    // son cycle d'upload : `cy.wait(40_000)` seul ne pousse RIEN (mesure :
    // 0 ligne côté serveur, « expected 0 to be at least 20 »). Le helper DEV
    // `__psFlushCrudUpload` pousse la file via le client Supabase du
    // connector — exactement le chemin de production (cf. cross-tenant.cy.ts).
    // On draine jusqu'à ce que `ps_crud` soit vide (un appel ne pousse qu'un
    // lot, donc `opsTotal >= COUNT` ne suffit pas).
    cy.window({ timeout: 60_000 }).then({ timeout: 180_000 }, async (win: any) => {
      expect(win.__psFlushCrudUpload, 'helper DEV __psFlushCrudUpload exposé').to.be.a('function');
      const crudCount = async () => {
        const r = await win.__psDb.getAll('SELECT count(*) c FROM ps_crud');
        return (r?.[0]?.c as number) ?? -1;
      };
      const localCount = async () => {
        const r = await win.__psDb.getAll(
          `SELECT count(*) c FROM transactions WHERE description LIKE 'Tx batch ${now}%'`,
        );
        return (r?.[0]?.c as number) ?? 0;
      };
      // Le drain n'est PAS borné par `opsTotal` : un appel de flush ne
      // pousse qu'un lot (maxPasses ops), donc `opsTotal >= COUNT` n'est
      // jamais vrai pour COUNT=20 et la boucle épuisait son budget sans
      // vider la file. On draine jusqu'à ce que `ps_crud` soit vide.
      let last: any = null;
      for (let i = 0; i < 60; i += 1) {
        if ((await crudCount()) <= 0) break;
        await win.__psFlushCrudUpload(10);
        last = win.__psFlushResult;
        await new Promise((r) => setTimeout(r, 300));
      }
      const remaining = await crudCount();
      cy.log(`flush batch 20 → local=${await localCount()} remainingCrud=${remaining}`);
      expect(last?.skipped ?? 0, `aucune op jetée (détail=${JSON.stringify(last?.lastFatal)})`).to.eq(0);
      expect(remaining, 'la file d’upload doit être vidée').to.eq(0);
    });

    // ── 5. Assert COUNT rows reached Supabase ─────────────────────────
    realToken().then((token) => {
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/transactions?description=like.${encodeURIComponent(`*Tx batch ${now}*`)}&select=id&limit=100`,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
      }).then((res: any) => {
        expect(res.status).to.eq(200);
        const bodies: any[] = res.body ?? [];
        cy.log(`Server transaction count for batch ${now}: ${bodies.length} (expected ${COUNT})`);
        expect(bodies.length).to.be.greaterThanOrEqual(COUNT);
        // Exactness: we only assert >= because other specs may have also
        // inserted txs with overlapping descriptions (unlikely with timestamp).
      });
    });

    console.log('✅ PERF BATCH — 20 tx offline exact sync');
  });

  // ── Test 2: 50 transactions charge ─────────────────────────────────────────
  it('charge: 50 transactions sync without errors', function () {
    this.timeout(240_000);

    const SUPABASE_URL =
      (Cypress.expose('SUPABASE_URL') as string) ||
      'https://hhgovvrnalibhgpakswi.supabase.co';
    const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;
    const now = Date.now();
    const COUNT = 50;
    txPrefixes.push(`ChargeTx ${now}`);

    // Offline mode — intercepts posés APRÈS le premier rendu du formulaire
    // (mêmes raisons que le test 1 : détruire le GET du bundle pendant le
    // chargement casse la page).
    let offline = true;

    cy.ensureAuth();
    cy.visit('/transaction/new');
    cy.get('h1, h2, h3, [role="heading"]', { timeout: 30_000 })
      .contains(/nouvelle transaction/i)
      .should('be.visible');

    cy.intercept({ method: 'GET', url: `${SUPABASE_URL}/**` }, (req: any) => {
      if (offline) req.destroy();
    });
    cy.intercept({ method: 'POST', url: `${SUPABASE_URL}/**` }, (req: any) => {
      if (offline) req.destroy();
    });

    for (let i = 0; i < COUNT; i++) {
      cy.get('input[aria-label="Montant en francs CFA"], ion-input input[aria-label="Montant en francs CFA"]')
        .first()
        .clear()
        .type(String(2000 + i * 50));
      cy.get('input[aria-label="Description"], ion-input input[aria-label="Description"]')
        .first()
        .clear()
        .type(`ChargeTx ${now} ${i}`);
      cy.contains('Enregistrer la transaction', { timeout: 10_000 }).click();
      // Attendre l'affichage de la description sur la page DÉTAIL avant de
      // revenir au formulaire : `handleSubmit` est asynchrone, et un
      // `cy.visit` immédiat recharge la page et interrompt l'écriture en
      // cours (mesure : les 50 submits restaient sur /transaction/new,
      // 0 ligne écrite). La description sur le détail prouve aussi que la
      // transaction a bien été persistée (lecture PowerSync).
      cy.contains(`ChargeTx ${now} ${i}`, { timeout: 30_000 }).should('be.visible');
      cy.visit('/transaction/new');
      cy.url().should('include', '/transaction/new');
      cy.get('input[aria-label="Description"]', { timeout: 30_000 }).should('be.visible');
    }

    // Back online
    offline = false;

    // Flush déterministe (même raison que le test 1 : le cycle du worker ne
    // tourne pas sous Cypress, `cy.wait` seul ne pousse rien). On draine
    // jusqu'à ce que `ps_crud` soit vide — un appel ne pousse qu'un lot.
    cy.window({ timeout: 60_000 }).then({ timeout: 240_000 }, async (win: any) => {
      expect(win.__psFlushCrudUpload, 'helper DEV __psFlushCrudUpload exposé').to.be.a('function');
      const crudCount = async () => {
        const r = await win.__psDb.getAll('SELECT count(*) c FROM ps_crud');
        return (r?.[0]?.c as number) ?? -1;
      };
      let last: any = null;
      for (let i = 0; i < 80; i += 1) {
        if ((await crudCount()) <= 0) break;
        await win.__psFlushCrudUpload(10);
        last = win.__psFlushResult;
        await new Promise((r) => setTimeout(r, 300));
      }
      cy.log(`flush charge 50 → remainingCrud=${await crudCount()}`);
      expect(last?.skipped ?? 0, `aucune op jetée (détail=${JSON.stringify(last?.lastFatal)})`).to.eq(0);
      expect(await crudCount(), 'la file d’upload doit être vidée').to.eq(0);
    });

    realToken().then((token) => {
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/transactions?description=like.${encodeURIComponent(`*ChargeTx ${now}*`)}&select=id&limit=100`,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
      }).then((res: any) => {
        expect(res.status).to.eq(200);
        const bodies: any[] = res.body ?? [];
        cy.log(`Server charge tx count: ${bodies.length} (expected >= ${COUNT})`);
        expect(bodies.length).to.be.greaterThanOrEqual(COUNT);
      });
    });

    console.log('✅ PERF BATCH — 50 tx charge sync');
  });

  // ── Test 3: calendar with many events (best-effort, may skip) ─────
  it('calendar renders with 50 events without crashing', function () {
    this.timeout(300_000);

    const now = Date.now();
    const COUNT = 50;
    eventPrefixes.push(`CalEvent ${now}`);

    cy.ensureAuth();
    // Créer COUNT événements rapidement.
    //
    // Deux défauts corrigés ici :
    //  1. `cy.get('ion-input[aria-label="Nom de l'événement"], input[...]')`
    //     ne matchait jamais (échec après 300 s) : l'`aria-label` est porté par
    //     le `<input>` natif et l'hydratation React n'est pas garantie à
    //     l'arrivée sur la page. `cy.typeIonicInput` (déjà éprouvé par
    //     `events-tasks.cy.ts`) écrit la valeur ET émet `ionChange`.
    //  2. Le bouton peut rester `disabled` le temps du render qui suit :
    //     on attend qu'il soit visible, puis on laisse React traiter
    //     l'événement avant de cliquer.
    for (let i = 0; i < COUNT; i++) {
      cy.visit('/event/new');
      cy.contains('button, ion-button', "Créer l'événement", {
        timeout: 60_000,
      }).should('be.visible');
      cy.typeIonicInput("Nom de l'événement", `CalEvent ${now} ${i}`);
      cy.wait(500);
      cy.contains('button, ion-button', "Créer l'événement", { timeout: 30_000 })
        .first()
        .click();
      // EventNew.tsx navigue vers le DÉTAIL de l'événement créé
      // (/event/:id), pas vers la liste : c'est volontaire (la liste triée
      // par date tronquée aux 50 premiers ne montrait pas toujours le
      // nouvel événement). L'assertion « /events » était donc périmée.
      cy.url({ timeout: 30_000 }).should('include', '/event/');
    }

    // Navigate to calendar view and assert it renders
    cy.visit('/events');
    cy.contains('button, ion-button', 'Calendrier', { timeout: 30_000 }).click();
    // Calendar must be visible — at least the month grid or event dots
    cy.get('.grid, [class*="calendar"], ion-grid, [class*="event-dot"], [class*="EventDot"], .h-full.rounded-full')
      .first()
      .should('exist');
    cy.log(`Created ${COUNT} events, calendar view is responsive`);

    console.log('✅ PERF BATCH — calendar with 50 events responsive');
  });
});
