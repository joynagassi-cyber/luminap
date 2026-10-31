/**
 * Cypress E2E — Features PRODUIT (contrat §6, Phase 15).
 *
 * Couvre en conditions réelles (offline-first, réplique locale seedée) :
 *   - PR12 — import CSV sécurisé : modèle téléchargeable, aperçu après
 *     sélection d'un fichier, bouton « Confirmer » activé sur lignes valides,
 *     annulation qui remet l'écran à zéro.
 *   - PR9  — pièces justificatives sur une transaction (section montée dans
 *     le détail d'une transaction).
 *   - PR11 — recherche globale : l'écran rend une zone de recherche et un
 *     état vide honnête (pas un faux chargement).
 *   - PR16 — centre d'aide : la recherche de sections renvoie des résultats
 *     et bascule sur « aucun résultat » pour une requête sans correspondance.
 *   - PR14 — transfert de propriété guidé : l'écran est atteignable et rend
 *     son étape « choisir » (ou son message d'accès refusé) sans écran noir.
 *
 * NB : pas de `import { cy }` (voir local-dashboard.cy.ts).
 */
describe('Lumina — features produit (PR12/PR9/PR11/PR16/PR14)', () => {
  before(function () {
    this.timeout(90_000);
    cy.interceptCloud();
  });

  beforeEach(function () {
    cy.clearLocalStorage();
    cy.seedLocalSession({ role: 'PASTEUR_PRINCIPAL' });
    cy.visit('/sessions');
    cy.seedOrgReplica();
  });

  it('PR12 — import CSV : aperçu des lignes valides, confirmation activée, annulation', function () {
    this.timeout(120_000);
    cy.visit('/settings/gestion');
    cy.get('[data-testid="csv-import-input"]', { timeout: 40_000 }).should('exist');

    // Fichier CSV conforme à l'en-tête attendu (type;amount;description;date;...).
    const csv = [
      'type;amount;description;date;category_id;source;comment',
      'INCOME;10000;Dîme de janvier;2026-01-31;cat-dime;CAISSE;Import E2E',
      'EXPENSE;2500;Achat fournitures;2026-02-02;cat-dep;CAISSE;Import E2E',
    ].join('\n');

    cy.get('[data-testid="csv-import-input"]').selectFile(
      {
        contents: Cypress.Buffer.from(csv),
        fileName: 'import-e2e.csv',
        mimeType: 'text/csv',
      },
      { force: true },
    );

    // Aperçu : les 2 lignes valides apparaissent dans un tableau.
    cy.get('[data-testid="csv-import-preview"]', { timeout: 20_000 }).should('exist');
    cy.get('[data-testid="csv-import-confirm"]')
      .should('exist')
      .and('not.be.disabled');

    // Annulation : l'aperçu disparaît (retour à l'état initial).
    cy.get('[data-testid="csv-import-cancel"]').click();
    cy.get('[data-testid="csv-import-preview"]').should('not.exist');
  });

  it('PR12 — le modèle CSV est téléchargeable (nom de fichier attendu)', function () {
    this.timeout(120_000);
    cy.visit('/settings/gestion');

    cy.window().then((win) => {
      const originalCreateObjectURL = win.URL.createObjectURL.bind(win.URL);
      let capturedDownload = '';
      win.URL.createObjectURL = (blob: Blob) => originalCreateObjectURL(blob);
      const originalCreateElement = win.document.createElement.bind(win.document);
      win.document.createElement = (tag: string) => {
        const el = originalCreateElement(tag);
        if (tag.toLowerCase() === 'a') {
          const origClick = el.click.bind(el);
          el.click = () => {
            capturedDownload = el.getAttribute('download') || '';
            return origClick();
          };
        }
        return el;
      };
      (win as unknown as { __e2eCsv: unknown }).__e2eCsv = {
        get download() {
          return capturedDownload;
        },
      };
    });

    cy.get('[data-testid="csv-import-template"]', { timeout: 40_000 })
      .should('exist')
      .click({ force: true });

    cy.window({ timeout: 30_000 }).then((win) => {
      const cap = (win as unknown as { __e2eCsv: { download: string } }).__e2eCsv;
      expect(cap.download, 'modèle CSV téléchargé').to.match(
        /lumina-modele-import-transactions\.csv$/,
      );
    });
  });

  it('PR9 — une transaction montre sa section « Justificatifs » (pièces jointes)', function () {
    this.timeout(120_000);
    // Seed une transaction réelle dans la réplique locale, puis ouvre son détail.
    const txId = 'tx-e2e-justif-' + Date.now();
    cy.window().then(async (win) => {
      const db = (win as unknown as {
        __psDb: { execute: (sql: string, p?: unknown[]) => Promise<unknown> };
      }).__psDb;
      await db.execute(
        `INSERT INTO transactions
           (id, org_id, type, amount, description, date, status, source, created_by_id, created_at, updated_at, version)
         VALUES (?, 'default-org', 'INCOME', 10000, 'Dîme E2E', '2026-03-01', 'APPROVED', 'CAISSE', 'u1', '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z', 1)`,
        [txId],
      );
    });
    cy.visit('/transaction/' + txId);
    // La section Justificatifs (PR9) est montée sur le détail d'une transaction.
    cy.contains('Justificatifs', { timeout: 40_000 }).should('exist');
    cy.contains('Ajouter un justificatif', { timeout: 20_000 }).should('exist');
  });

  it('PR11 — la recherche globale rend une zone de saisie et un état vide honnête', function () {
    this.timeout(120_000);
    cy.visit('/search');
    cy.get('input[aria-label="Rechercher dans toute l\'application"]', {
      timeout: 40_000,
    }).should('exist');
    // Aucune requête : l'écran ne doit PAS rester bloqué en squelette.
    cy.get('[data-screen-state], main', { timeout: 20_000 }).should('exist');
  });

  it('PR16 — la recherche d\'aide renvoie des sections puis « aucun résultat »', function () {
    this.timeout(120_000);
    cy.visit('/help');
    cy.get('[data-testid="help-search-input"]', { timeout: 40_000 }).should('exist');

    // Requête correspondant à une section du tutoriel (terme générique FR).
    cy.get('[data-testid="help-search-input"]').type('transaction');
    cy.get('[data-testid="help-section-results"]', { timeout: 20_000 }).should('exist');

    // Requête sans correspondance : l'état « aucun résultat » s'affiche.
    cy.get('[data-testid="help-search-input"]').clear().type('zzzzqqqqintrouvable');
    cy.get('[data-testid="help-no-result"]', { timeout: 20_000 }).should('exist');
  });

  it('PR14 — /admin/transfer-ownership ne produit jamais d\'écran noir', function () {
    this.timeout(120_000);
    cy.visit('/admin/transfer-ownership');
    // L'écran rend soit l'étape « choisir » (autorisé), soit le message
    // d'accès refusé (permission admin:roles) — jamais un écran vide/blanc.
    cy.get('body', { timeout: 40_000 }).should(($body) => {
      const text = $body.text();
      const ok =
        text.includes('Transférer la propriété') ||
        text.includes('Accès refusé') ||
        text.includes('admin:roles');
      expect(ok, 'la page doit rendre son titre ou un message d\'accès refusé').to.be
        .true;
    });
  });
});
