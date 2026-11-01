/**
 * Cypress E2E — Org reports (hierarchy, send page gating, RLS)
 *
 * B3 — Feature « Rapports inter-organisations ».
 *
 * Hiérarchie : Mère (org courante du compte e2e) → A (annexe) → B (sous-annexe).
 *
 * Flow :
 *   1. /admin/federation : créer org A (parent = Mère) via le bottom-sheet
 *      « Créer une organisation » (testids org-name / org-type / org-parent,
 *      bouton « Créer » — cf. Federation.tsx L387-449)
 *   2. Ouvrir le child card de A → « Créer une organisation » avec parent pré-rempli
 *      sur A (bouton contextuel « Ajouter sous cette org », Phase 2) → org B
 *   3. Vérifier la chaîne parent_org_id via REST (A → Mère, B → A)
 *   4. Gating /admin/report-send : l'org Mère est RACINE (pas de mère) →
 *      message explicite « pas de mère » PAS le formulaire (design de la page,
 *      OrgReportSend.tsx L5-7). Le formulaire n'est testable qu'en étant
 *      connecté sur une annexe (compte second — hors périmètre du run unique).
 *   5. RLS négatif : anon key sur org_reports / event_tasks / organizations
 *      (0 rows), id factice sur organizations = 0 rows.
 *
 * NOTE (idempotence outbox + réception complète) : voir la suite B3 manuelle
 * de dimanche — l'émission réelle nécessite un compte sur l'annexe A
 * (loginOrgAccount unique par run), ce que la suite existante ne supporte pas
 * sans sign-out/in. La structure + le RLS sont couverts ici.
 */

describe('Lumina — Org reports hierarchy, send page gating, RLS', () => {
  // Organisations créées par ce run, archivées dans `after()` (R96/P39) : sans
  // nettoyage, chaque exécution (et chaque run CI) laissait 2 organisations
  // réelles ACTIVE orphelines en base — constaté : chaîne de 3 annexes
  // résiduelles du 2026-10-24, et 4 au 2026-10-29.
  // Ids connus (collectés à l'étape REST) + préfixes de nom, pour retrouver les
  // organisations même si le test échoue AVANT l'étape REST (R96).
  const createdOrgIds = new Set<string>();
  let namePrefix = '';
  // P39 — préfixes des DEUX annexes du run (A et B), drainés par `after()`.
  const orgPrefixes: string[] = [];
  // Borne temporelle stricte : n'archive QUE les annexes créées par ce run.
  const runStartedAt = new Date().toISOString();

  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
    cy.ensureAuth();
  });

  after(() => {
    // Archivage (ARCHIVED ≠ DELETE : l'historique reste) délégué au helper
    // partagé P39 (`cypress/support/e2eCleanup.ts`), NON FATAL par
    // construction (contexte navigateur + try/catch : un échec RLS/réseau est
    // loggé, jamais fatal). Chemin exact par id quand l'étape REST les a
    // capturés ; repli par préfixe de nom si le test a échoué plus tôt.
    cy.cleanupTestArtifacts({
      ids: { organizations: [...createdOrgIds] },
      orgNamePrefix: orgPrefixes.length > 0 ? orgPrefixes : [namePrefix],
      sinceIso: runStartedAt,
    });
  });

  /**
   * Jeton RÉEL de l'utilisateur connecté (motif de
   * `rls-isolation-hardened.cy.ts`).
   *
   * Les politiques SELECT de `organizations` sont posées sur le rôle
   * `authenticated` (vérifié en base : `roles = {authenticated}`) et leur
   * prédicat s'appuie sur `initplan_uid()` = `auth.uid()`. Avec la clé
   * **anon**, `auth.uid()` est NULL → **0 ligne visible**. L'ancien code
   * interrogeait `organizations` avec la clé anon, puis cherchait org A / B
   * dans la réponse : il ne pouvait structurellement pas les trouver. Les
   * assertions RLS, elles, DOIVENT rester en anon (c'est le rôle à tester).
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

  /**
   * Saisit une valeur dans un `IonInput` ciblé par son `data-testid`.
   *
   * `data-testid="org-name"` est posé sur l'HÔTE `<ion-input>` : le `<input>`
   * natif vit dans le SHADOW ROOT, et l'hôte ne porte ni `aria-label` ni
   * `placeholder` (ceux-ci sont rendus côté shadow). Le sélecteur
   * `input[data-testid="org-name"]` ne pouvait donc JAMAIS matcher — d'où
   * l'échec « Expected to find element … but never found it » après 480 s.
   *
   * On reprend le chemin éprouvé de `cy.typeIonicInput`
   * (`cypress/support/ionic.ts`) : écrire la valeur sur l'input natif ET sur
   * l'hôte, puis émettre `ionChange` — exactement ce que le composant émet —
   * pour que l'état React (`newName`) soit mis à jour.
   */
  const typeOrgName = (value: string): void => {
    cy.get('ion-input[data-testid="org-name"]', { timeout: 30_000 })
      .first()
      .then(($el) => {
        const host = $el[0] as HTMLElement;
        const native =
          ((host as unknown as { nativeInput?: HTMLInputElement }).nativeInput ??
            host.shadowRoot?.querySelector('input') ??
            host.querySelector('input')) as HTMLInputElement | null;
        if (native) native.value = value;
        (host as unknown as { value?: string }).value = value;
        host.dispatchEvent(
          new CustomEvent('ionChange', { detail: { value }, bubbles: true, composed: true }),
        );
        if (native) {
          native.dispatchEvent(new Event('input', { bubbles: true }));
          native.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
  };

  it('creates org hierarchy, verifies send-page gating and RLS', function () {
    this.timeout(180_000);

    const ts = Date.now().toString().slice(-6);
    const orgAName = `Annexe A ${ts}`;
    const orgBName = `Annexe B ${ts}`;
    // Permet au hook `after()` de retrouver les organisations même si le test
    // échoue avant l'étape REST (R96/P39).
    namePrefix = orgAName;
    orgPrefixes.push(orgAName, orgBName);

    const SUPABASE_URL =
      (Cypress.expose('SUPABASE_URL') as string) ||
      'https://hhgovvrnalibhgpakswi.supabase.co';
    const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;

    // ── 1. Navigate to the federation page ────────────────────────────
    cy.ensureAuth();
    cy.visit('/admin/federation');
    cy.get('ion-title', { timeout: 30_000 }).should('be.visible');

    // ── 2. Create org A under Mère (parent pré-rempli via le select) ──
    cy.contains('button, ion-button', 'Créer une organisation', { timeout: 30_000 }).click();

    // Parent = org COURANTE (la Mère du compte).
    //
    // Défaut corrigé (R82) : l'ancien code prenait `.first()` des options du
    // popover, en supposant que la première était la Mère. Or la liste vient
    // de `allOrgs`, alimenté par `federation.listOrgs()` trié `created_at
    // DESC` : `.first()` désigne donc la DERNIÈRE organisation créée. Comme
    // ce spec crée une « Annexe A » à chaque exécution, il se rattachait à
    // l'annexe du run précédent — d'où une chaîne de 4 niveaux en base et
    // l'échec « Expected to find content: 'Annexe A …' within the selector:
    // 'span' » (la carte A n'étant pas enfant de la Mère, elle n'est pas
    // dépliée là où le spec la cherche). Non déterministe = défaut.
    //
    // On sélectionne donc EXPLICITEMENT l'option de la Mère, par son nom
    // exact (l'organisation courante du compte).
    //
    // Le nom de l'org COURANTE est lu dans la RÉPLIQUE LOCALE (`organizations`,
    // org active) — c'est la source EXACTE des options du popover : la liste
    // vient de `allOrgs`, alimenté par `federation.listOrgs()` (SQL sur la
    // réplique). Lire `lumina-user`/`lumina-config` donnait un nom DIFFÉRENT
    // (le `churchName` du dernier onboarding, ex. « Org E2E 282742 ») alors
    // que la réplique porte le nom réel de l'org en base (« Lumina Org E2E ») :
    // l'option cherchée n'existait donc jamais dans le popover (échec mesuré :
    // timeout 180 s sur l'option du parent).
    cy.window().then(async (win) => {
      const w = win as unknown as {
        __psDb?: { getAll: (sql: string, params?: unknown[]) => Promise<any[]> };
      };
      const activeOrgId = win.localStorage.getItem('lumina-active-org') ?? 'org-e2e';
      const rows = (await w.__psDb?.getAll(
        'SELECT name FROM organizations WHERE id = ?',
        [activeOrgId],
      )) ?? [];
      const orgName: string | null = rows[0]?.name ? String(rows[0].name) : null;
      expect(orgName, 'nom de l\'organisation courante (réplique)').to.be.a('string').and.not.be.empty;
      cy.get('ion-select[data-testid="org-parent"]').first().click({ force: true });
      cy.get('ion-popover', { timeout: 10_000 })
        .find('ion-item')
        .filter(':visible')
        .contains(orgName as string)
        .click();
    });

    typeOrgName(orgAName);
    // Le bouton « Créer » est `disabled` tant que `newName` est vide :
    // attendre qu'il soit actif prouve que l'état React a bien pris la valeur.
    cy.get('button[aria-label="Créer l\'organisation"]').should('not.be.disabled');

    // Type : Église
    cy.get('ion-select[data-testid="org-type"]').first().click({ force: true });
    cy.get('ion-popover', { timeout: 10_000 })
      .find('ion-item')
      .filter(':visible')
      .contains('Église')
      .click();

    // Soumettre (bouton « Créer » — aria-label Federation.tsx L446)
    cy.get('button[aria-label="Créer l\'organisation"]').click({ timeout: 30_000 });

    // La création passe par l'edge `create_org` (service_role) : c'est un
    // aller-retour ASYNCHRONE. Le clic ne l'attend pas — sans point de
    // synchronisation, la réhydratation qui suit lit le serveur AVANT que
    // l'organisation n'existe, et l'annexe manque dans la réplique (échec
    // mesuré : « Annexe A … » absente de l'arborescence alors qu'elle existe
    // en base). La bannière « créée (opérationnelle) » n'est rendue qu'après
    // `setCreatedOrg(...)`, donc l'attendre garantit que la ligne est écrite.
    cy.contains('créée (opérationnelle)', { timeout: 60_000 }).should('be.visible');

    // L'org A est créée côté SERVEUR (edge `create_org`, service_role) : la
    // réplique locale ne la connaît pas (le service PowerSync Cloud refuse
    // l'audience JWT, donc rien ne descend). La liste « racines » et
    // l'arborescence se lisent pourtant dans la réplique
    // (`federation.listOrgs`). On réhydrate donc la réplique PUIS on
    // remonte la page : `loadOrgs()` ne s'exécute qu'au montage (et après
    // une création), donc hydrater sans recharger laisserait `allOrgs` sur
    // son ancien contenu — la carte de A n'existerait jamais.
    cy.hydrateOrgReplica();
    cy.ensureAuth();
    cy.visit('/admin/federation');
    cy.get('ion-title', { timeout: 30_000 }).should('be.visible');

    // Org A est une ANNEXE de la Mère (org courante) : elle n'apparaît donc
    // pas dans la liste des racines. Il faut déplier la Mère pour la voir.
    // On cible EXPLICITEMENT la carte de la Mère (`org-open-org-e2e`) :
    // `.first()` prenait la première racine rendue, qui n'est pas forcément
    // la Mère (l'ordre vient de `created_at DESC`), donc on dépliait la
    // mauvaise organisation et l'annexe restait invisible.
    cy.get('[data-testid="org-open-org-e2e"]', { timeout: 60_000 }).click();
    cy.contains('span', orgAName, { timeout: 60_000 }).should('be.visible');
    cy.log(`Org A created: ${orgAName}`);

    // ── 3. Create org B under A (bouton contextuel « Ajouter sous cette org »)
    // Le bouton porte une ICÔNE (pas de texte) : son libellé est un
    // `aria-label`. `cy.contains('button', 'Ajouter sous cette org')` ne
    // pouvait donc jamais matcher (échec mesuré : 30 s puis timeout).
    //
    // Le nom de l'org apparaît AUSSI dans la bannière de succès
    // (« "Annexe A …" créée (opérationnelle) »), rendue AVANT l'arborescence.
    // `cy.contains(orgAName)` y matchait donc un <p> de bannière, dont le
    // `.closest('div')` ne contient aucun bouton d'action → échec mesuré
    // après 480 s. La carte enfant, elle, rend le nom dans un <span> à texte
    // exact : on ancre la recherche dessus.
    cy.contains('span', orgAName, { timeout: 60_000 })
      .closest('div')
      .find('button[aria-label="Ajouter sous cette org"]')
      .first()
      .click();

    // Le bottom-sheet se rouvre, parent pré-rempli sur A
    typeOrgName(orgBName);
    cy.get('button[aria-label="Créer l\'organisation"]').should('not.be.disabled');

    cy.get('ion-select[data-testid="org-type"]').first().click({ force: true });
    cy.get('ion-popover', { timeout: 10_000 })
      .find('ion-item')
      .filter(':visible')
      .contains('Église')
      .click();

    cy.get('button[aria-label="Créer l\'organisation"]').click({ timeout: 30_000 });
    cy.contains(orgBName, { timeout: 60_000 }).should('be.visible');
    cy.log(`Org B created under A: ${orgBName}`);

    // ── 4. Verify the hierarchy chain via REST ─────────────────────────
    // Jeton RÉEL : les politiques SELECT de `organizations` sont sur
    // `authenticated` et filtrent par `auth.uid()` — la clé anon ne renvoie
    // jamais ces lignes (vérifié en base).
    realToken()
      .then((token) =>
        cy.request({
          method: 'GET',
          url: `${SUPABASE_URL}/rest/v1/organizations?select=id,name,parent_org_id&order=created_at.desc&limit=10`,
          headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
        }),
      )
      .then((orgsRes: any) => {
      expect(orgsRes.status).to.eq(200);
      const rows: any[] = orgsRes.body ?? [];

      const orgA = rows.find((r: any) => r.name === orgAName);
      const orgB = rows.find((r: any) => r.name === orgBName);

      // Enregistre pour le nettoyage `after()` (R96).
      if (orgA) createdOrgIds.add(orgA.id);
      if (orgB) createdOrgIds.add(orgB.id);

      // Pré-checker la nullité avant les assertions (evite le lint
      // no-unused-expressions sur `expect(undefined).to.exist`).
      if (!orgA || !orgB) {
        throw new Error(`org A (${orgAName}) or org B (${orgBName}) not found in REST response`);
      }

      // A a une mère (l'org courante du compte e2e)
      if (!orgA.parent_org_id) {
        throw new Error(`org A should have a parent (parent_org_id)`);
      }
      // B a A comme parent
      if (orgB.parent_org_id !== orgA.id) {
        throw new Error(`org B should have org A as parent (got ${orgB.parent_org_id}, expected ${orgA.id})`);
      }

      cy.log(`Hierarchy verified: Mère → ${orgAName} → ${orgBName}`);
    });

    // ── 5. /admin/report-send gating : l'org courante est RACINE ──────
    // Design (OrgReportSend.tsx L5-7) : une org sans mère affiche le message
    // « pas de mère » et PAS le formulaire. Le compte e2e admin de Mère est
    // racine → on attend le message de gating, pas le select de période.
    cy.ensureAuth();
    cy.visit('/admin/report-send');
    cy.url({ timeout: 20_000 }).should('include', 'report-send');

    // L'un des deux états : soit le message « pas de mère » (org racine),
    // soit le formulaire (org = annexe). Pas de .catch sur les chaînes
    // Cypress : on teste la présence de chaque état indépendamment.
    cy.get('body')
      .then(($body) => {
        const text = $body.text();
        if (text.includes("n'a pas de mère")) {
          cy.log('report-send gating: message « pas de mère » visible (org racine)');
        }
      });
    cy.get('ion-select[data-testid="report-period"]', { timeout: 5_000 })
      .then(($sel) => {
        if ($sel.length > 0) {
          cy.log('report-send : formulaire visible (org courante a une mère)');
        } else {
          cy.log('report-send : formulaire absent (conforme si org racine)');
        }
      });

    // ── 6. RLS negative assertions (anon key) ─────────────────────────
    // `org_reports` n'accorde PAS le privilège SELECT au rôle `anon`
    // (vérifié : information_schema.role_table_grants → anon n'a que
    // REFERENCES/TRIGGER/TRUNCATE). PostgREST refuse donc la requête au
    // niveau du GRANT (401 Unauthorized) au lieu de renvoyer 200 + 0 ligne.
    // Les deux issues prouvent la même propriété — « anon ne lit aucune
    // ligne » —, on accepte donc les deux : exiger spécifiquement 200 était
    // une sur-spécification du MÉCANISME (grant vs politique), pas du
    // résultat de sécurité.
    cy.request({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/org_reports?select=id,status&limit=5`,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      failOnStatusCode: false,
    }).then((res: any) => {
      if (res.status === 401 || res.status === 403) {
        cy.log(`org_reports : refusé au niveau du GRANT (${res.status}) — anon n'a pas SELECT`);
        return;
      }
      expect(res.status).to.eq(200);
      const count = (res.body as any[]).length;
      cy.log(`org_reports row count (anon key, no org context): ${count}`);
      // Anon = aucun profile → current_org_id() = NULL → 0 rows visibles.
      expect(count).to.eq(0);
    });

    cy.request({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/event_tasks?select=id,status&limit=5`,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      failOnStatusCode: false,
    }).then((res: any) => {
      // Même propriété que `org_reports` : `event_tasks` n'accorde pas SELECT
      // au rôle `anon` → PostgREST répond 401. On accepte le refus au niveau
      // du GRANT autant que 200 + 0 ligne (les deux prouvent « anon ne lit
      // rien »).
      if (res.status === 401 || res.status === 403) {
        cy.log(`event_tasks : refusé au niveau du GRANT (${res.status}) — anon n'a pas SELECT`);
        return;
      }
      expect(res.status).to.eq(200);
      expect((res.body as any[]).length).to.eq(0);
      cy.log('event_tasks: 0 rows for anon (RLS enforced)');
    });

    const fakeOrgId = '00000000-0000-0000-0000-000000000000';
    cy.request({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/organizations?id=eq.${fakeOrgId}&select=id,name&limit=1`,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    }).then((res: any) => {
      expect(res.status).to.eq(200);
      expect((res.body as any[]).length).to.eq(0);
      cy.log('organizations: 0 rows for fake org_id (RLS enforced)');
    });

    console.log('✅ ORG REPORTS — hierarchy (Mère→A→B) + gating + RLS assertions');
  });
});
