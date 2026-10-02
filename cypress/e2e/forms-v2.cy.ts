/**
 * Cypress E2E — Forms v2 (plan docs/plans/2026-10-01-forms-v2.md).
 *
 * Périmètre couvert (cloud, session réelle via cy.loginOrgAccount()) :
 *   1. T7 — rendu du champ currency dans FormFill : input préfixé « $ »,
 *      « 1,500 » (séparateur de milliers FR) est stocké en 1500,
 *      « abc » est rejeté par la validation.
 *   2. T5 — vue TABLEAU des soumissions (FormSubmissions) : en-têtes de
 *      métadonnées + boutons « Exporter CSV » / « Exporter Excel » ; le
 *      bouton Export CSV déclenche un téléchargement du fichier .csv.
 *   3. T6 — édition des formulaires DRAFT : bouton « Modifier » présent
 *      sur un DRAFT (le modal s'ouvre pré-rempli), ABSENT sur un
 *      PUBLISHED (modifications interdites).
 *
 * Prérequis : cy.signupOrgAccount() a tourné au préalable dans le run
 * (pattern déterministe du projet — loginOrgAccount() charge les
 * credentials du compte org UNIQUE ; voir cypress/support/e2e.ts).
 *
 * Idempotence : le formulaire E2E (nom + clé fixes) est créé via la
 * couche UI de l'app (pas d'insert direct en base — l'app est
 * offline-first PowerSync/Supabase, pas de session DB côté test).
 *
 * Navigations : depuis /forms, le « Remplir » d'un formulaire navigue
 * vers /form/fill/:id ; le « Soumissions » navigue vers
 * /forms/:id/submissions (voir FormBuilder.tsx §boutons de carte).
 */

describe('Lumina — Forms v2 (currency, table view, DRAFT edit)', () => {
  // ── Setup : formulaire E2E partagé (DRAFT, 6 champs dont currency) ───
  const FORM_NAME = 'E2e Forms v2';
  const FORM_KEY = 'e2e_forms_v2';
  // Le label par défaut du type currency est « Montant (FCFA) »
  // (FormBuilder.tsx:27 — FIELD_TYPES). On n'assert PAS le label par
  // défaut si l'org a déjà créé le formulaire avec un label différent
  // (idempotence) : on retrouve l'input par inputMode="decimal"
  // (seul le champ currency porte cet attribut — le 6e du modal,
  // rotation FIELD_TYPES[5]).
  const CURRENCY_LABEL = 'Montant (FCFA)';

  before(function () {
    this.timeout(120_000);
    cy.loginOrgAccount();
  });

  before(function () {
    this.timeout(120_000);
    cy.ensureAuth();
    cy.visit('/forms');
    cy.contains('h1, h2, h3', 'Formulaires', { timeout: 90_000 }).should('exist');

    // Idempotence : on ne crée le formulaire E2E que s'il n'existe
    // pas déjà (nom en texte normalisé dans un <p> de carte —
    // FormBuilder.tsx : <p className="text-text-primary text-sm font-semibold">).
    // Le pattern du projet (signupOrgAccount) : cy.get('button').then($btns =>
    // { check textContent }) — on fait pareil pour les <p> ici.
    cy.get('p', { timeout: 90_000 }).then(($ps) => {
      const present = $ps
        .map((_, el) => (el.textContent || '').trim())
        .get()
        .some((t) => t === FORM_NAME);
      if (present) {
        cy.log('Formulaire e2e déjà présent — pas de création');
        return;
      }
      cy.contains('button', 'Créer').first().click({ force: true });
      // Les placeholders réels du modal (FormBuilder.tsx:390/401) :
      // « Nom du formulaire * » et « Clé (ex: demande_cotisation) * ».
      cy.get('input[placeholder*="Nom du formulaire"]').type(FORM_NAME);
      cy.get('input[placeholder*="Clé"]').type(FORM_KEY);
      // Le 1er « Ajouter » du modal crée FIELD_TYPES[0] = « texte »
      // (rotation par index — FormBuilder.tsx §addFieldInline) ; le
      // label par défaut est « Nouveau champ texte ».
      // Le 2e « Ajouter » crée FIELD_TYPES[1] = « number ».
      // Le 3e « Ajouter » crée FIELD_TYPES[2] = « date ».
      // Le 4e « Ajouter » crée FIELD_TYPES[3] = « select ».
      // Le 5e « Ajouter » crée FIELD_TYPES[4] = « boolean ».
      // Le 6e « Ajouter » crée FIELD_TYPES[5] = « currency »
      // (label par défaut « Nouveau champ currency »). On s'arrête
      // donc au 6e champ, sans passer par le <select> de type
      // (plus de 6 champs = rotation complète du cycle — inutile).
      cy.contains('button', 'Ajouter').click({ force: true });
      cy.contains('button', 'Ajouter').click({ force: true });
      cy.contains('button', 'Ajouter').click({ force: true });
      cy.contains('button', 'Ajouter').click({ force: true });
      cy.contains('button', 'Ajouter').click({ force: true });
      cy.contains('button', 'Ajouter').click({ force: true });
      cy.contains('button', 'Créer le formulaire').click();
      cy.contains('p', FORM_NAME, { timeout: 90_000 }).should('exist');
    });
  });

  // ── Helper : naviguer vers /forms puis ouvrir le fill du form E2E ──
  // Recherche l'index du <p> du FORM_NAME parmi les <p> de /forms
  // (ordre des cartes = ordre du DOM). Utilise .map().get() pour
  // convertir en array plain (le pattern du projet).
  function findFormIndex($ps: JQuery) {
    return $ps
      .map((_, el) => (el.textContent || '').trim())
      .get()
      .findIndex((t) => t === FORM_NAME);
  }

  function openFill() {
    cy.ensureAuth();
    cy.visit('/forms');
    cy.get('p', { timeout: 90_000 }).then(($ps) => {
      const idx = findFormIndex($ps);
      // La carte du formulaire contient ses boutons d'action
      // (Modifier / Remplir / Soumissions / Publier) dans un
      // <div className="flex flex-wrap gap-2"> : on repère la
      // « Remplir » de la carte courante (IDX = position du
      // formulaire dans la liste des <p>).
      if (idx === -1) {
        throw new Error(`Formulaire « ${FORM_NAME} » absent de /forms après le setup`);
      }
      // Un bouton « Remplir » par carte — on clique le IDX+1e.
      cy.contains('button', 'Remplir').then(($btns) => {
        ($btns as any).eq(idx).click({ force: true });
      });
    });
    cy.location('pathname', { timeout: 90_000 }).should('match', /^\/form\/fill\/[^/]+$/);
  }

  // ── T7 : currency dans FormFill ──────────────────────────────────────
  it('T7 — the currency field renders with a $ prefix and accepts "1,500"', function () {
    this.timeout(180_000);
    openFill();
    // Préfixe « $ » (span adjacent au input, rendu dédié T7 —
    // FormFill.tsx §case currency). Le span est le préfixe de la
    // valeur de saisie du champ (inputMode="decimal").
    cy.contains('span', '$', { log: false, timeout: 90_000 }).should('exist');
    // Champ : input texte + inputMode="decimal" (pas de
    // type="number" — le parsing FR/US est fait par
    // parseCurrencyAmount côté submit).
    const input = cy.get('input[inputmode="decimal"]');
    input.should('exist').type('1,500');
    // Soumission : le champ required est rempli → pas d'erreur,
    // confirmation « Soumis avec succès ! ». Le montant est
    // normalisé en 1500 (séparateur de milliers FR) par
    // parseCurrencyAmount avant la create du formSubmissionRepo
    // (vérification via la vue tableau au test T5 ci-dessous).
    cy.contains('button', 'Soumettre', { timeout: 90_000 }).first().click();
    cy.contains('Soumis avec succès', { timeout: 90_000 }).should('exist');
  });

  it('T7 — a non-numeric currency entry ("abc") is rejected by validation', function () {
    this.timeout(180_000);
    openFill();
    cy.get('input[inputmode="decimal"]').type('abc');
    cy.contains('button', 'Soumettre').first().click();
    // La validation est rejetée (bannière d'erreur de FormFill —
    // le bloc `errors.length > 0` style data-expense) ET la
    // confirmation « Soumis avec succès ! » n'apparaît PAS.
    cy.get('input[inputmode="decimal"]').should('have.value', 'abc');
    // Le bloc d'erreur porte le message (le contenu dépend du
    // label du champ — on n'assert PAS le texte exact, on assert
    // que le bloc data-expense est présent).
    cy.get('div[style*="data-expense"]', { timeout: 30_000 }).should('exist');
    // La confirmation ne doit PAS exister.
    cy.window().then((win) => {
      const hasSuccess = Array.from(win.document.querySelectorAll('*'))
        .some((el) => (el.textContent || '').includes('Soumis avec succès'));
      expect(
        hasSuccess,
        '« Soumis avec succès ! » affiché malgré une saisie « abc » — la validation du champ currency a échoué',
      ).to.be.false;
    });
  });

  // ── T5 : vue tableau des soumissions + exports ───────────────────────
  it('T5 — the submissions page renders a database-style table with export buttons', function () {
    this.timeout(180_000);
    cy.ensureAuth();
    cy.visit('/forms');
    // Le bouton « Soumissions » (FormBuilder.tsx) navigue vers
    // /forms/:id/submissions — même pattern que openFill, le IDX+1e
    // bouton de l'action bar (ordre DOM = ordre des cartes).
    cy.get('p', { timeout: 90_000 }).then(($ps) => {
      const idx = findFormIndex($ps);
      cy.contains('button', 'Soumissions').then(($btns) => {
        ($btns as any).eq(idx).click({ force: true });
      });
    });
    cy.location('pathname', { timeout: 90_000 }).should('match', /^\/forms\/[^/]+\/submissions$/);

    // La soumission du test T7.1 doit apparaître (sync PowerSync
    // locale + cloud upsert — timeout généreux). Le tableau HTML
    // (role="table" — FormSubmissions.tsx §T5) est présent avec
    // ses colonnes de métadonnées.
    cy.get('table[role="table"]', { timeout: 90_000 }).should('exist');
    cy.contains('th', 'Soumetteur').should('exist');
    cy.contains('th', 'Statut').should('exist');
    cy.contains('th', 'Rejeté par').should('exist');
    cy.contains('th', 'Raison du rejet').should('exist');
    // Colonne du champ currency du formulaire : le montant stocké
    // (1500) est formaté Intl fr-FR XOF → « 1 500 » (virgule
    // absente, espace de milliers FR) dans le <td> (pas dans le
    // th — la valeur est dans le body de la table).
    cy.get('td', { timeout: 90_000 }).contains(/1[  ]?500/).should('exist');

    // Boutons d'export (disabled si filtered.length === 0 — après
    // le submit T7.1, au moins une soumission est filtrée, ils
    // sont actifs).
    cy.contains('button', 'Exporter CSV').should('not.be.disabled');
    cy.contains('button', 'Exporter Excel').should('not.be.disabled');
  });

  it('T5 — clicking « Exporter CSV » triggers a .csv file download', function () {
    this.timeout(180_000);
    cy.ensureAuth();
    cy.visit('/forms');
    cy.get('p', { timeout: 90_000 }).then(($ps) => {
      const idx = findFormIndex($ps);
      cy.contains('button', 'Soumissions').then(($btns) => {
        ($btns as any).eq(idx).click({ force: true });
      });
    });
    cy.location('pathname').should('match', /^\/forms\/[^/]+\/submissions$/);
    cy.contains('button', 'Exporter CSV').should('not.be.disabled');

    // Cypress 16 : pas d'API `cy.on('download')` (supprimé) — on
    // stub `URL.createObjectURL` côté window AVANT le clic, on
    // capte le nom de fichier (`a.download` relu côté DOM après
    // le click), et on assert le content-type du Blob (text/csv)
    // via le stub. C'est le pattern UI-only robuste pour les
    // exports côté client (URL.createObjectURL + a.click()).
    cy.window().then((win) => {
      const originalCreateObjectURL = win.URL.createObjectURL.bind(win.URL);
      let capturedDownload = '';
      let capturedType = '';
      win.URL.createObjectURL = (blob: Blob) => {
        capturedType = blob.type;
        return originalCreateObjectURL(blob);
      };
      // Le handler exportCSV (FormSubmissions.tsx) crée le <a>
      // via document.createElement('a') puis a.click() : on
      // intercepte au niveau DOM pour capter `a.download` avant
      // le click.
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
      // Sauvegarde pour le then() final (closure partagée).
      (win as any).__e2eCaptured = {
        get download() {
          return capturedDownload;
        },
        get type() {
          return capturedType;
        },
      };
    });

    cy.contains('button', 'Exporter CSV').click();
    // Le blob click + createObjectURL se fait synchrone dans le
    // handler React — on laisse 1 tick passer pour que
    // l'assertion voie l'état.
    cy.wait(1_500);
    cy.window().then((win) => {
      const cap = (win as any).__e2eCaptured;
      expect(cap, 'capteur download non posé').to.not.be.undefined;
      expect(cap.download, 'a.download').to.match(/soumissions_.*\.csv$/);
      expect(cap.type, 'content-type du Blob').to.match(/text\/csv/);
    });
  });

  // ── T6 : édition DRAFT des formulaires ───────────────────────────────
  it('T6 — a DRAFT form offers a « Modifier » button that opens a prefilled modal', function () {
    this.timeout(180_000);
    cy.ensureAuth();
    cy.visit('/forms');
    cy.get('p', { timeout: 90_000 }).then(($ps) => {
      const idx = findFormIndex($ps);
      cy.contains('button', 'Modifier').then(($btns) => {
        ($btns as any).eq(idx).click({ force: true });
      });
    });
    // Le formulaire de setup est DRAFT (créé DRAFT par défaut —
    // le bouton « Publier » bascule PUBLISHED/DRAFT ; ici on ne
    // publie PAS tant que le test T6.2 n'arrive pas, il reste
    // DRAFT). Bouton « Modifier » présent et pré-remplit le
    // modal (le modal de création est réutilisé — le titre
    // « Modifier le formulaire » + bouton « Enregistrer »).
    cy.contains('h2', 'Modifier le formulaire', { timeout: 90_000 }).should('exist');
    cy.contains('button', 'Enregistrer').should('exist');
    // Le champ currency du form est pré-rempli (copy des fields
    // du state partagé — pas de mutation, openEditModal). Le
    // champ currency est le 6e <select> du modal (rotation
    // FIELD_TYPES : texte, number, date, select, boolean, currency).
    cy.get('select').eq(5).should('have.value', 'currency');
    // Fermeture (on ne sauvegarde PAS : version++ ne doit PAS se
    // produire — c'est le 2e test T6 qui le vérifie après le
    // passage en PUBLISHED).
    cy.contains('button', 'Annuler').click();
  });

  it('T6 — a PUBLISHED form has NO « Modifier » button (edits forbidden)', function () {
    this.timeout(180_000);
    cy.ensureAuth();
    cy.visit('/forms');
    // Publier le formulaire E2E (bascule DRAFT → PUBLISHED — le
    // bouton « Publier » s'affiche tant que le status est DRAFT ;
    // après le test T6.1 il a été réouvert annulés, il reste
    // DRAFT ici).
    cy.get('p', { timeout: 90_000 }).then(($ps) => {
      const idx = findFormIndex($ps);
      cy.contains('button', 'Publier').then(($btns) => {
        ($btns as any).eq(idx).click({ force: true });
      });
    });
    // Le status badge passe à « PUBLISHED » (le label badge du
    // FormBuilder est le raw status string — la carte porte le
    // texte « PUBLISHED » en <span> de badge).
    cy.contains('PUBLISHED', { timeout: 90_000 }).should('exist');
    // Le bouton « Modifier » DOIT être absent (la condition
    // `form.status === "DRAFT"` du rendu — FormBulder.tsx
    // §modifier button).
    cy.get('button', { timeout: 90_000 }).then(($btns) => {
      const texts = $btns.map((_, el) => (el.textContent || '').trim()).get();
      expect(
        texts,
        'un bouton « Modifier » est présent sur un formulaire PUBLISHED — T6 a échoué',
      ).not.to.include('Modifier');
    });
    // Le bouton de bascule repasse « Brouillon » (revert possible).
    cy.contains('button', 'Brouillon').should('exist');
  });
});
