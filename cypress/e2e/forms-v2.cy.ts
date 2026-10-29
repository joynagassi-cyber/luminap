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
  // Identifiant de l'organisation E2E (compte `lumina-org-e2e@lumina.dev`,
  // org créée au signup du 1er run). Sert aux vérifications REST du setup.
  const ORG_E2E_ID = 'org-e2e';

  // P39 — borne temporelle stricte : seules les soumissions créées APRÈS cet
  // instant sont purgées. Le formulaire `E2e Forms v2` est une fixture
  // PARTAGÉE (réutilisée d'un run à l'autre) : on ne l'archive pas, on purge
  // uniquement ses soumissions du run courant.
  const runStartedAt = new Date().toISOString();

  const SUPABASE_URL =
    (Cypress.expose('SUPABASE_URL') as string) ||
    'https://hhgovvrnalibhgpakswi.supabase.co';
  const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;

  /**
   * Jeton RÉEL de l'utilisateur connecté (motif de
   * `rls-isolation-hardened.cy.ts`). Les politiques de `form_definitions`
   * filtrent par `is_org_member(auth.uid(), org_id)` : avec la clé anon,
   * `auth.uid()` est NULL et la requête ne renvoie jamais la ligne.
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
    // Le flux de création (clic Créer → nom → clé → 6× Ajouter →
    // Créer le formulaire → vérif <p>) dépasse 120s sur une machine
    // lente. Le hook timeout doit couvrir l'agrégat du cycle.
    this.timeout(300_000);
    cy.loginOrgAccount();
  });

  // ── Setup : formulaire E2E partagé (DRAFT, 6 champs dont currency) ───
  //
  // Le setup passe par la couche UI de l'app (pas d'insert direct : l'app
  // est offline-first PowerSync/Supabase). Il est rendu DÉTERMINISTE :
  //  - la présence/absence du formulaire est vérifiée par l'API REST avec
  //    le JETON RÉEL de l'utilisateur (les politiques de `form_definitions`
  //    filtrent par `is_org_member(auth.uid(), org_id)` — la clé anon ne
  //    renvoie rien), et non par un snapshot des `<p>` de /forms ;
  //  - l'état final est prouvé par un rechargement complet de /forms, puis
  //    par une nouvelle vérification REST.
  //
  // Pourquoi : la version précédente lisait `cy.get('p')` une seule fois
  // après `cy.visit('/forms')`. La page n'a AUCUN skeleton et monte un
  // `TopHeader` (donc des `<p>` : titre, sous-titre, nom d'org, badges) qui
  // satisfait `cy.get('p')` AVANT que les cartes de formulaires (rendues
  // après le chargement PowerSync) n'existent. La vérification tombait donc
  // sur une page vide, concluait « absent », et les 6 tests échouaient sur
  // « Formulaire « E2e Forms v2 » absent de /forms » alors que la ligne
  // était bien en base (mesuré : 1 ligne `E2e Forms v2` en base).
  before(function () {
    this.timeout(600_000);
    cy.loginOrgAccount();
    cy.ensureAuth();

    const apiForm = () =>
      realToken().then((token) =>
        cy.request({
          method: 'GET',
          url: `${SUPABASE_URL}/rest/v1/form_definitions?org_id=eq.${ORG_E2E_ID}&name=eq.${encodeURIComponent(FORM_NAME)}&select=id,status`,
          headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
        }),
      );

    apiForm().then((res: any) => {
      expect(res.status).to.eq(200);
      const existing = (res.body as any[])[0];

      if (existing) {
        cy.log('Formulaire e2e déjà présent — on normalise le status en DRAFT');
        return;
      }

      // Branche de création (UI). Le formulaire est créé DRAFT par défaut.
      cy.visit('/forms');
      cy.contains('h1, h2, h3', 'Formulaires', { timeout: 90_000 }).should('exist');
      cy.contains('button, ion-button', 'Créer').first().click({ force: true });
      cy.get('input[placeholder*="Nom du formulaire"]').type(FORM_NAME);
      cy.get('input[placeholder*="Clé"]').type(FORM_KEY);
      // 6× « Ajouter » : le 6e champ suit la rotation FIELD_TYPES
      // (texte, number, date, select, boolean, currency) → currency.
      for (let i = 0; i < 6; i += 1) {
        cy.contains('button, ion-button', 'Ajouter').click({ force: true });
      }
      cy.get('ion-button', { timeout: 30_000 })
        .then(($ion) => {
          const match = $ion
            .map((_, el) => (el.textContent || '').trim())
            .get()
            .findIndex((t) => t === 'Créer le formulaire');
          if (match === -1) {
            throw new Error('Bouton « Créer le formulaire » absent du modal');
          }
          return cy.wrap($ion.eq(match)).click({ force: true });
        });
      // Le formulaire est créé : on prouve l'état final en rechargeant
      // /forms et en y retrouvant la carte (rendu après le chargement).
      cy.contains('p', FORM_NAME, { timeout: 90_000 }).should('exist');
    });

    // Normalisation DRAFT : T6.2 publie le formulaire sans le remettre en
    // DRAFT, donc un run suivant doit pouvoir repartir d'un DRAFT pour que
    // T6.1 (« Modifier » présent) soit rejouable. La bascule passe par l'UI
    // (le repo local est la source de vérité PowerSync) et est scopée à la
    // carte du formulaire E2E.
    cy.visit('/forms');
    cy.contains('h1, h2, h3', 'Formulaires', { timeout: 90_000 }).should('exist');
    cy.contains('p', FORM_NAME, { timeout: 90_000 }).should('exist');
    cy.get('p')
      .filter((_, el) => (el.textContent || '').trim() === FORM_NAME)
      .first()
      .closest('div.rounded-xl')
      .then(($card) => {
        const texts = $card
          .find('button, ion-button')
          .map((_, el) => (el.textContent || '').trim())
          .get();
        if (texts.includes('Brouillon')) {
          cy.wrap($card).contains('button, ion-button', 'Brouillon').click({ force: true });
          cy.wrap($card)
            .contains('button, ion-button', 'Publier', { timeout: 60_000 })
            .should('exist');
        }
      });

    // État final prouvé côté serveur : le formulaire existe et est DRAFT.
    apiForm().then((res: any) => {
      expect(res.status).to.eq(200);
      const row = (res.body as any[])[0];
      if (!row) {
        throw new Error(`Formulaire « ${FORM_NAME} » absent de Supabase après le setup`);
      }
      expect(row.status, 'status du formulaire e2e après le setup').to.eq('DRAFT');
    });
  });

  // ── Helper : naviguer vers /forms puis ouvrir le fill du form E2E ──
  // Carte (div) du formulaire E2E dans /forms. Le ciblage par INDEX
  // était FAUX : `findFormIndex` indexe les `<p>` de TOUTE la page
  // (titres de section, libellés de modèles pré-remplis, compteurs…)
  // alors que les boutons « Remplir » / « Soumissions » / « Modifier »
  // forment une collection DISTINCTE (une action-bar par carte). On part
  // donc du `<p>` du nom et on remonte à sa carte (`closest`).
  function e2eFormCard() {
    // `cy.get('p')` est un SNAPSHOT : la page monte le `TopHeader` (des `<p>` :
    // titre, sous-titre, nom d'org) avant que les cartes de formulaires
    // (rendues après le chargement PowerSync) n'existent, donc la recherche
    // échouait systématiquement sur « absent de /forms ».
    // `cy.contains` RETENTE jusqu'à ce que le nom apparaisse, puis `closest`
    // remonte à la carte. C'est le même correctif que dans le `before()`.
    cy.contains('p', FORM_NAME, { timeout: 90_000 })
      .should('exist')
      .closest('div.rounded-xl')
      .as('formCard');
    return cy.get('@formCard');
  }

  function openFill() {
    cy.ensureAuth();
    cy.visit('/forms');
    e2eFormCard()
      .contains('button, ion-button', 'Remplir')
      .click({ force: true });
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
    cy.contains('button, ion-button', 'Soumettre', { timeout: 90_000 }).first().click();
    cy.contains('Soumis avec succès', { timeout: 90_000 }).should('exist');
  });

  it('T7 — a non-numeric currency entry ("abc") is rejected by validation', function () {
    this.timeout(180_000);
    openFill();
    cy.get('input[inputmode="decimal"]').type('abc');
    cy.contains('button, ion-button', 'Soumettre').first().click();
    // La validation est rejetée (bannière d'erreur de FormFill —
    // le bloc `errors.length > 0` style data-expense) ET la
    // confirmation « Soumis avec succès ! » n'apparaît PAS.
    cy.get('input[inputmode="decimal"]').should('have.value', 'abc');
    // Le bloc d'erreur porte le message (le contenu dépend du
    // label du champ — on n'assert PAS le texte exact, on assert
    // que le bloc data-expense est présent).
    cy.get('div[style*="data-expense"]', { timeout: 30_000 }).should('exist');
    // La confirmation ne doit PAS exister. cy.contains ne traverse
    // pas les <script> ni les <style> — plus fiable qu'un scan
    // querySelectorAll('*') qui peut matcher le texte dans un
    // bundle inline.
    cy.contains('Soumis avec succès', { timeout: 30_000 }).should('not.exist');
  });

  // ── T5 : vue tableau des soumissions + exports ───────────────────────
  it('T5 — the submissions page renders a database-style table with export buttons', function () {
    this.timeout(180_000);
    cy.ensureAuth();
    cy.visit('/forms');
    // Le bouton « Soumissions » (FormBuilder.tsx) navigue vers
    // /forms/:id/submissions — même pattern que openFill, le IDX+1e
    // bouton de l'action bar (ordre DOM = ordre des cartes).
    e2eFormCard()
      .contains('button, ion-button', 'Soumissions')
      .click({ force: true });
    cy.location('pathname', { timeout: 90_000 }).should('match', /^\/forms\/[^/]+\/submissions$/);

    // La soumission du test T7.1 doit apparaître (sync PowerSync
    // locale + cloud upsert — timeout généreux). Le tableau HTML
    // (role="table" — FormSubmissions.tsx §T5) est présent avec
    // ses colonnes de métadonnées.
    cy.get('table[role="table"]', { timeout: 90_000 }).should('exist');
    // Colonne « Date » (5e colonne de métadonnées — FormSubmissions.tsx
    // §COLUMNS : { key: 'submittedAt', label: 'Date' }). Les assertions
    // sont partielles (cy.contains) : le suffixe de tri « ↑/↓ » est
    // compatible (sous-chaîne).
    cy.contains('th', 'Soumetteur').should('exist');
    cy.contains('th', 'Date').should('exist');
    cy.contains('th', 'Statut').should('exist');
    cy.contains('th', 'Rejeté par').should('exist');
    cy.contains('th', 'Raison du rejet').should('exist');
    // Colonne « Soumetteur » : on assert la VALEUR de la cellule (pas
    // juste l'en-tête) — le défaut historique affichait l'ID du
    // soumetteur (UUID Supabase) plutôt que son nom. La source de
    // vérité du nom est le localStorage lumina-user (écrit par le
    // post-login de loginOrgAccount, profil complet) : on lit le
    // nom attendu côté window sans hardcoder le compte.
    cy.window().then((win) => {
      const raw = win.localStorage.getItem('lumina-user');
      if (raw === null) {
        throw new Error('lumina-user devrait être persisté par loginOrgAccount');
      }
      const user = JSON.parse(raw);
      const expectedName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (expectedName === '') {
        throw new Error('nom du compte : firstName/lastName manquants dans localStorage lumina-user');
      }
      // La 1re <td> de chaque ligne du tableau = colonne « Soumetteur ».
      cy.get('table[role="table"] td', { timeout: 90_000 })
        .first()
        .invoke('text')
        .then((txt) => {
          if (txt.trim() !== expectedName) {
            throw new Error(`valeur de la cellule « Soumetteur » : attendu « ${expectedName} », reçu « ${txt.trim()} »`);
          }
        });
    });
    // Colonne du champ currency du formulaire : le montant stocké
    // (1500) est formaté Intl fr-FR XOF → « 1 500 » (séparateur de
    // milliers = espace fine U+00A0, code devise absente si XOF).
    // Le regex accepte l'espace ASCII ET l'espace fine U+00A0.
    cy.get('td', { timeout: 90_000 }).contains(/1[  ]?500/).should('exist');

    // Garanti que la soumission T7.1 est synchronisée (PowerSync
    // local-first : la sync cloud est asynchrone, le rechargement de
    // la page /forms/:id/submissions peut arriver avant la sync →
    // filtered.length === 0 → boutons disabled). Attendre un <td>
    // dans le tableau avant d'asserter les boutons.
    cy.get('table[role="table"] td', { timeout: 90_000 }).should('exist');
    // Boutons d'export (disabled si filtered.length === 0 — après
    // le submit T7.1, au moins une soumission est filtrée, ils
    // sont actifs).
    // Les boutons d'export sont des IonButton (Ionic 9 = Shadow DOM) :
    // cy.contains('button, ion-button', ...) ne les capte pas. On cible ion-button
    // et on vérifie l'attribut disabled sur l'ion-button lui-même.
    cy.get('ion-button', { timeout: 30_000 }).then(($ion) => {
      const texts = $ion
        .map((_, el) => (el.textContent || '').trim())
        .get();
      expect(
        texts,
        'boutons ion-button d export absents de la page',
      ).to.include('Exporter CSV');
      expect(texts).to.include('Exporter Excel');
      // Le disabled est sur l ion-button (pas sur le <button> interne
      // Shadow DOM).
      cy.wrap($ion)
        .filter((_, el) => (el.textContent || '').trim() === 'Exporter CSV')
        .should('not.have.attr', 'disabled');
      cy.wrap($ion)
        .filter((_, el) => (el.textContent || '').trim() === 'Exporter Excel')
        .should('not.have.attr', 'disabled');
    });
  });

  it('T5 — clicking « Exporter CSV » triggers a .csv file download', function () {
    this.timeout(180_000);
    cy.ensureAuth();
    cy.visit('/forms');
    e2eFormCard()
      .contains('button, ion-button', 'Soumissions')
      .click({ force: true });
    cy.location('pathname').should('match', /^\/forms\/[^/]+\/submissions$/);
    // Le bouton « Exporter CSV » est un IonButton (Ionic 9 = Shadow
    // DOM) : cy.contains('button, ion-button', ...) ne le capte pas. On cible
    // ion-button et on vérifie l absence de l attribut disabled.
    cy.get('table[role="table"] td', { timeout: 90_000 }).should('exist');
    cy.get('ion-button', { timeout: 30_000 }).then(($ion) => {
      cy.wrap($ion)
        .filter((_, el) => (el.textContent || '').trim() === 'Exporter CSV')
        .should('not.have.attr', 'disabled');
    });

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

    cy.get('ion-button', { timeout: 30_000 }).then(($ion) => {
      cy.wrap($ion)
        .filter((_, el) => (el.textContent || '').trim() === 'Exporter CSV')
        .click({ force: true });
    });
    // Le blob click + createObjectURL se fait synchrone dans le
    // handler React — on laisse 1 tick passer pour que
    // l'assertion voie l'état.
    cy.wait(1_500);
    cy.window().then((win) => {
      const cap = (win as any).__e2eCaptured;
      if (cap === undefined) {
        throw new Error('capteur download non posé');
      }
      if (!/soumissions_.*\.csv$/.test(String(cap.download))) {
        throw new Error(`a.download : attendu /soumissions_.*\\.csv$/, reçu « ${cap.download} »`);
      }
      if (!/text\/csv/.test(String(cap.type))) {
        throw new Error(`content-type du Blob : attendu text/csv, reçu « ${cap.type} »`);
      }
    });
  });

  // ── T6 : édition DRAFT des formulaires ───────────────────────────────
  it('T6 — a DRAFT form offers a « Modifier » button that opens a prefilled modal', function () {
    this.timeout(180_000);
    cy.ensureAuth();
    cy.visit('/forms');
    e2eFormCard()
      .contains('button, ion-button', 'Modifier')
      .click({ force: true });
    // Le formulaire de setup est DRAFT (créé DRAFT par défaut —
    // le bouton « Publier » bascule PUBLISHED/DRAFT ; ici on ne
    // publie PAS tant que le test T6.2 n'arrive pas, il reste
    // DRAFT). Bouton « Modifier » présent et pré-remplit le
    // modal (le modal de création est réutilisé — le titre
    // « Modifier le formulaire » + bouton « Enregistrer »).
    cy.contains('h2', 'Modifier le formulaire', { timeout: 90_000 }).should('exist');
    cy.contains('button, ion-button', 'Enregistrer').should('exist');
    // Le champ currency du form est pré-rempli (copy des fields
    // du state partagé — pas de mutation, openEditModal). Le
    // champ currency est le 6e <select> du modal (rotation
    // FIELD_TYPES : texte, number, date, select, boolean, currency).
    cy.get('ion-select').eq(5).should('have.prop', 'value', 'currency');
    // Fermeture (on ne sauvegarde PAS : version++ ne doit PAS se
    // produire — c'est le 2e test T6 qui le vérifie après le
    // passage en PUBLISHED).
    cy.contains('button, ion-button', 'Annuler').click();
  });

  it('T6 — a PUBLISHED form has NO « Modifier » button (edits forbidden)', function () {
    this.timeout(180_000);
    cy.ensureAuth();
    cy.visit('/forms');
    // Le statut du formulaire E2E peut être DRAFT (premier run, ou
    // run précédent qui a remis en DRAFT) OU PUBLISHED (run précédent
    // qui n'a pas réinitialisé). On normalise l'état : si le bouton
    // « Brouillon » est présent sur la carte (status PUBLISHED), on
    // clique pour revenir en DRAFT. Sinon on clique « Publier ».
    // Ciblage SCOPÉ À LA CARTE. Le commentaire précédent annonçait
    // l'intention, mais le code interrogeait `cy.get('button')` sur
    // TOUT le DOM : un autre formulaire DRAFT/PUBLISHED de l'org faisait
    // échouer ce test (mesuré : 133 boutons inspectés).
    e2eFormCard().then(($card) => {
      const texts = $card
        .find('button, ion-button')
        .map((_, el) => (el.textContent || '').trim())
        .get();
      if (texts.includes('Brouillon')) {
        // Déjà PUBLISHED : on remet en DRAFT pour que le test T6.1
        // puisse tourner idempotement au run suivant.
        cy.wrap($card).contains('button, ion-button', 'Brouillon').click({ force: true });
        cy.wrap($card)
          .contains('button, ion-button', 'Publier', { timeout: 60_000 })
          .should('exist');
      }
      cy.wrap($card).contains('button, ion-button', 'Publier').click({ force: true });
    });
    // Le status badge passe à « PUBLISHED ».
    cy.contains('PUBLISHED', { timeout: 90_000 }).should('exist');
    // Le bouton « Modifier » DOIT être absent (la condition
    // `form.status === "DRAFT"` du rendu — FormBuilder.tsx §modifier
    // button). On scope la vérification aux boutons de la CARTE du
    // formulaire E2E (pas à tous les boutons de /forms — un autre
    // formulaire DRAFT de l'org aurait son propre « Modifier »).
    e2eFormCard().should(($card) => {
      const texts = $card
        .find('button, ion-button')
        .map((_, el) => (el.textContent || '').trim())
        .get();
      expect(
        texts,
        'un bouton « Modifier » est présent sur un formulaire PUBLISHED — T6 a échoué',
      ).not.to.include('Modifier');
    });
    // Le bouton de bascule repasse « Brouillon » (revert possible).
    cy.contains('button, ion-button', 'Brouillon').should('exist');
  });

  // Idempotence inter-runs : T6.2 laisse le formulaire en PUBLISHED.
  // Ce hook after remet le formulaire en DRAFT pour que le run
  // suivant (T6.1 : « Modifier » présent, T6.2 : « Publier » présent)
  // fonctionne sans erreur.
  after(function () {
    this.timeout(120_000);
    cy.ensureAuth();
    cy.visit('/forms');
    cy.get('button', { timeout: 90_000 }).then(($btns) => {
      const texts = $btns.map((_, el) => (el.textContent || '').trim()).get();
      if (texts.includes('Brouillon')) {
        // Le formulaire est PUBLISHED : on remet en DRAFT.
        cy.contains('button, ion-button', 'Brouillon').click({ force: true });
        cy.contains('button, ion-button', 'Publier', { timeout: 60_000 }).should('exist');
      }
    });
    // P39 — nettoyage NON FATAL (cypress/support/e2eCleanup.ts) : purge les
    // soumissions créées par ce run pour la fixture `E2e Forms v2`. Sans lui,
    // chaque exécution laissait une soumission de test de plus (mesure :
    // 1 « E2e Forms v2 » en base, une soumission par run). Le formulaire
    // lui-même est conservé (fixture partagée, non archivée).
    cy.cleanupTestArtifacts({
      formSubmissionFormNamePrefix: [FORM_NAME],
      sinceIso: runStartedAt,
    });
  });
});
