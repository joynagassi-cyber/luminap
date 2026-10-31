/**
 * Cypress E2E — Features de robustesse / intégrité (contrat §6, Phase 15).
 *
 * Couvre, en conditions réelles (offline-first, réplique locale seedée) :
 *   - PR13 — gel de période comptable : la clôture PERSISTE (round-trip
 *     clôturer → statut → rouvrir). Régression historique : `setOrgSetting`
 *     faisait un `INSERT ... ON CONFLICT` sur une VUE PowerSync
 *     (« cannot UPSERT a view ») → le réglage n'était jamais enregistré et le
 *     bouton semblait inerte.
 *   - PR8 — approbation en deux étapes (maker-checker) : la bascule PERSISTE.
 *     Même bug de persistance que PR13, même table `org_settings`.
 *   - PR15 — statistiques d'usage (page Santé) : le bloc existe et reste honnête
 *     (« aucune donnée » n'est PAS « zéro »).
 *   - PR2 — export/sauvegarde : le bouton JSON est activé dès que la réplique
 *     est prête et déclenche bien un téléchargement.
 *   - PR1 — journal d'audit consultable : /trace rend son état vide honnête.
 *
 * NB : pas de `import { cy }` — `cy` est global dans le runner (voir
 * local-dashboard.cy.ts pour le détail du piège de bundling).
 */
describe('Lumina — features de robustesse (PR8/PR13/PR15/PR2/PR1)', () => {
  before(function () {
    this.timeout(90_000);
    cy.interceptCloud();
  });

  beforeEach(function () {
    cy.clearLocalStorage();
    cy.seedLocalSession({ role: 'PASTEUR_PRINCIPAL' });
    // Boot de l'app puis seed de la réplique : les pages gardées par
    // `isPowerSyncReadyNow()` rendent alors leur UI réelle hors-ligne.
    cy.visit('/sessions');
    cy.seedOrgReplica();
  });

  /**
   * Interroge `org_settings` jusqu'à ce que `predicate(rows)` soit vrai (les
   * handlers d'écriture sont `async` fire-and-forget : une lecture immédiate
   * après le clic courtise la course). Échoue explicitement après ~12 s.
   */
  function pollOrgSetting(
    win: Window,
    key: string,
    predicate: (rows: Array<{ value: string }>) => boolean,
  ): Cypress.Chainable<Array<{ value: string }>> {
    const db = (win as unknown as {
      __psDb: { getAll: (sql: string, p?: unknown[]) => Promise<Array<{ value: string }>> };
    }).__psDb;
    return cy.wrap(
      (async () => {
        for (let i = 0; i < 48; i += 1) {
          const rows = await db.getAll(
            'SELECT value FROM org_settings WHERE key = ?',
            [key],
          );
          if (predicate(rows)) return rows;
          await new Promise((r) => setTimeout(r, 250));
        }
        throw new Error(`org_settings.${key} non persisté après 12 s`);
      })(),
      { timeout: 20_000 },
    ) as unknown as Cypress.Chainable<Array<{ value: string }>>;
  }

  it('PR13 — clôturer puis rouvrir la période persiste (round-trip org_settings)', function () {
    this.timeout(120_000);
    cy.visit('/settings/gestion');
    cy.get('[data-testid="period-lock-card"]', { timeout: 40_000 }).should('exist');
    // Attendre la fin de la 1re lecture (R52 : squelette, pas « aucune clôture »).
    cy.get('[data-testid="period-lock-status"]', { timeout: 40_000 }).should('exist');

    // Clôture au 2026-06-30 (dans le passé → aucune écriture future bloquée par
    // accident dans ce spec, mais la valeur doit bien se persister). Input
    // contrôlé React : on passe par le setter natif + event `input` (un simple
    // `.val()` ne met pas l'état React à jour).
    cy.get('[data-testid="period-lock-date"]').then(($input) => {
      const el = $input[0] as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(el, '2026-06-30');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    cy.get('[data-testid="period-lock-set"]').click({ force: true });

    // Le statut se met à jour après la relecture du hook → point de synchro.
    cy.get('[data-testid="period-lock-status"]', { timeout: 20_000 }).should(
      'contain.text',
      '30/06/2026',
    );

    // La persistance réelle : la ligne doit exister dans org_settings.
    cy.window({ timeout: 30_000 }).then((win) =>
      pollOrgSetting(win, 'period_locked_until', (rows) => rows.length > 0).then(
        (rows) => {
          expect(
            JSON.parse(rows[0].value),
            'clôture persistée (bug « cannot UPSERT a view »)',
          ).to.eq('2026-06-30');
        },
      ),
    );

    // Rouvrir : la ligne disparaît, le statut repasse à « aucune période clôturée ».
    cy.get('[data-testid="period-lock-clear"]').click({ force: true });
    cy.get('[data-testid="period-lock-status"]', { timeout: 20_000 }).should(
      'contain.text',
      'Aucune période clôturée',
    );
  });

  it('PR8 — la bascule maker-checker persiste dans org_settings', function () {
    this.timeout(120_000);
    cy.visit('/settings/gestion');
    cy.get('[data-testid="maker-checker-toggle"]', { timeout: 40_000 })
      .should('exist')
      // `!makerChecker.loaded` désactive la bascule tant que le réglage n'est
      // pas lu : on attend qu'elle devienne active.
      .and('not.be.disabled');

    cy.get('[data-testid="maker-checker-toggle"]').click({ force: true });

    cy.window({ timeout: 30_000 }).then((win) =>
      pollOrgSetting(win, 'maker_checker_enabled', (rows) => rows.length > 0).then(
        (rows) => {
          expect(
            JSON.parse(rows[0].value),
            'réglage maker-checker persisté (bug « cannot UPSERT a view »)',
          ).to.eq(true);
        },
      ),
    );
  });

  it('PR15 — la page Santé expose le bloc de statistiques d\'usage', function () {
    this.timeout(120_000);
    cy.visit('/settings/health');
    cy.get('[data-testid="health.usage-block"]', { timeout: 40_000 }).should('exist');
    // Le bloc est soit une liste, soit l'état vide honnête — jamais absent.
    cy.get('body').should(($body) => {
      const hasList = $body.find('[data-testid="health.usage-list"]').length > 0;
      const hasEmpty = $body.find('[data-testid="health.usage-empty"]').length > 0;
      expect(
        hasList || hasEmpty,
        "le bloc d'usage doit afficher une liste OU un état vide explicite",
      ).to.be.true;
    });
  });

  it('PR2 — l\'export JSON est activé quand la réplique est prête et télécharge un fichier', function () {
    this.timeout(120_000);
    cy.visit('/settings/gestion');

    // Stub `URL.createObjectURL` + interception de `document.createElement('a')`
    // (motif forms-v2 T5) : capte le nom du fichier téléchargé sans dépendre
    // d'une API download de Cypress.
    cy.window().then((win) => {
      const originalCreateObjectURL = win.URL.createObjectURL.bind(win.URL);
      let capturedDownload = '';
      let capturedType = '';
      win.URL.createObjectURL = (blob: Blob) => {
        capturedType = blob.type;
        return originalCreateObjectURL(blob);
      };
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
      (win as unknown as { __e2eBackup: unknown }).__e2eBackup = {
        get download() {
          return capturedDownload;
        },
        get type() {
          return capturedType;
        },
      };
    });

    cy.get('[data-testid="backup-export-json"]', { timeout: 40_000 })
      .should('exist')
      .and('not.be.disabled');
    cy.get('[data-testid="backup-export-json"]').click();

    cy.window({ timeout: 30_000 }).then((win) => {
      const cap = (win as unknown as {
        __e2eBackup: { download: string; type: string };
      }).__e2eBackup;
      expect(cap, 'capteur download posé').to.exist;
      expect(cap.download, 'fichier de sauvegarde .json').to.match(
        /lumina-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/,
      );
      expect(cap.type).to.match(/json/);
    });
  });

  it('PR1 — le journal d\'audit /trace rend un état vide honnête (pas un faux chargement)', function () {
    this.timeout(120_000);
    cy.visit('/trace');
    cy.get('[data-screen-state]', { timeout: 40_000 }).should(
      'have.attr',
      'data-screen-state',
      'ready',
    );
    // Les filtres d'entité existent et l'état vide est explicite.
    cy.contains('Transaction', { timeout: 20_000 }).should('exist');
  });
});
