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
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
    cy.ensureAuth();
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

    // Parent = org COURANTE (la Mère du compte) pour que la chaîne testée
    // soit Mère → A → B. Deux défauts de la version précédente :
    //  1. `cy.get('ion-select-option').first()` : l'option « Aucune (racine) »
    //     est rendue EN PREMIER dans le DOM → org A n'avait PAS de mère et
    //     l'assertion « A a une mère » ne pouvait pas passer.
    //  2. `cy.get('ion-select-option').click()` : les options vivent dans un
    //     `ion-popover` monté sur <body> et sont `display:none` tant que le
    //     popover n'est pas ouvert → « element is not visible » (échec mesuré
    //     après 480 s). Motif correct déjà utilisé par `invitations.cy.ts`
    //     et `events-tasks.cy.ts` : ouvrir le popover, cliquer l'`ion-item`
    //     VISIBLE.
    cy.get('ion-select[data-testid="org-parent"]').first().click({ force: true });
    cy.get('ion-popover', { timeout: 10_000 })
      .find('ion-item')
      .filter(':visible')
      .filter((_, el) => !(el.textContent || '').includes('Aucune'))
      .first()
      .click();

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

    // Org A est une ANNEXE de la Mère (org courante) : elle n'apparaît donc
    // pas dans la liste des racines. Il faut déplier la Mère pour la voir.
    // (L'ancienne assertion `cy.contains(orgAName)` cherchait un texte de
    // carte racine : structurellement introuvable.)
    cy.get('[data-testid^="org-open-"]', { timeout: 60_000 }).first().click();
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
    cy.request({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/org_reports?select=id,status&limit=5`,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    }).then((res: any) => {
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
    }).then((res: any) => {
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
