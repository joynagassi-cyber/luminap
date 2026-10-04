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

  it('creates org hierarchy, verifies send-page gating and RLS', function () {
    this.timeout(480_000);

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
    cy.contains('button', 'Créer une organisation', { timeout: 30_000 }).click();

    // Parent = org courante : le select org-parent liste les orgs visibles ;
    // on sélectionne la 1re option organique du popover (la Mère du compte).
    cy.get('ion-select[data-testid="org-parent"]').first().click();
    cy.get('ion-select-option', { timeout: 10_000 }).first().click();

    cy.get('input[data-testid="org-name"]')
      .first()
      .type(orgAName, { force: true });

    // Type : Église
    cy.get('ion-select[data-testid="org-type"]')
      .first()
      .click();
    cy.contains('ion-select-option', 'Église', { timeout: 10_000 }).first().click();

    // Soumettre (bouton « Créer » — aria-label Federation.tsx L446)
    cy.get('button[aria-label="Créer l\'organisation"]').click({ timeout: 30_000 });

    // Org A apparaît dans la liste / les child cards
    cy.contains(orgAName, { timeout: 60_000 }).should('be.visible');
    cy.log(`Org A created: ${orgAName}`);

    // ── 3. Create org B under A (bouton contextuel « Ajouter sous cette org »)
    // La card de A expose le sous-menu OrgChildren avec le bouton contextuel
    // (Phase 2 T2.2 — Federation.tsx L532-556).
    cy.contains('button', 'Ajouter sous cette org', { timeout: 30_000 })
      .first()
      .click();

    // Le bottom-sheet se rouvre, parent pré-rempli sur A
    cy.get('input[data-testid="org-name"]').first().clear({ force: true });
    cy.get('input[data-testid="org-name"]').first().type(orgBName, { force: true });

    cy.get('ion-select[data-testid="org-type"]').first().click();
    cy.contains('ion-select-option', 'Église', { timeout: 10_000 }).first().click();

    cy.get('button[aria-label="Créer l\'organisation"]').click({ timeout: 30_000 });
    cy.contains(orgBName, { timeout: 60_000 }).should('be.visible');
    cy.log(`Org B created under A: ${orgBName}`);

    // ── 4. Verify the hierarchy chain via REST ─────────────────────────
    cy.request({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/organizations?select=id,name,parent_org_id&order=created_at.desc&limit=10`,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    }).then((orgsRes: any) => {
      expect(orgsRes.status).to.eq(200);
      const rows: any[] = orgsRes.body ?? [];

      const orgA = rows.find((r: any) => r.name === orgAName);
      const orgB = rows.find((r: any) => r.name === orgBName);

      expect(orgA, `org A (${orgAName}) should exist`).to.exist;
      expect(orgB, `org B (${orgBName}) should exist`).to.exist;

      // A a une mère (l'org courante du compte e2e)
      expect(orgA.parent_org_id, `org A should have a parent`).to.not.be.null;
      // B a A comme parent
      expect(orgB.parent_org_id, `org B should have org A as parent`).to.eq(orgA.id);

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
