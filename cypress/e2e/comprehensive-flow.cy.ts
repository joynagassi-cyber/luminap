/**
 * Cypress E2E — Comprehensive navigation & finance flow
 *
 * Migrated from: e2e-tests/comprehensive-flow.spec.ts (Playwright).
 *
 * No cloud intercept: real Supabase session via cy.loginOrgAccount()
 * (le compte d'organisation UNIQUE du run — créé par le spec d'auth,
 * partagé sur tous les specs, login direct → /dashboard).
 */

import { activePageShouldContain } from '../support/view';

describe('Lumina — comprehensive navigation & finance flow', () => {

  /**
   * Sélecteur de la page Ionic ACTIVE. La pile garde les pages
   * précédentes montées : `.ion-page-hidden` = page retirée,
   * `.ion-page-invisible` = page en cours de transition (opacité 0).
   * Sans ces exclusions, un sélecteur global matche le titre/le bouton
   * d'une page MASQUÉE et Cypress échoue avec « element is not visible »
   * (motif d'échec de la 1re exécution de ce spec).
   *
   * Le sélecteur est préfixé dans chaque requête plutôt que chaîné après
   * un `cy.get(...).last()` : pendant une transition Ionic, TOUTES les
   * pages peuvent être invisibles un instant, ce qui vide le sujet et
   * casse le chaînage. Une requête unique re-interrogée par Cypress
   * jusqu'à trouver l'élément est la seule forme fiable.
   */
  // Convention du dépôt (cypress/support/view.ts) : la page affichée est
  // le dernier `div.ion-page:not(.ion-page-hidden)`. `ion-page-invisible`
  // est une classe de TRANSITION qui peut persister sans que la page soit
  // invisible pour l'utilisateur — ne pas l'exclure (le faire vidait le
  // sujet pendant les transitions).
  const PAGE = 'div.ion-page:not(.ion-page-hidden)';
  const BTNS = `${PAGE} button, ${PAGE} ion-button`;

  // P39 — borne temporelle stricte du nettoyage (run courant uniquement).
  const runStartedAt = new Date().toISOString();

  after(() => {
    // Nettoyage NON FATAL (cypress/support/e2eCleanup.ts) : supprime la
    // transaction « E2E Comprehensive Tx » créée par ce run (DRAFT/PENDING
    // uniquement — jamais APPROVED). Sans lui, chaque exécution laissait une
    // transaction réelle de plus en base.
    cy.cleanupTestArtifacts({
      transactionDescriptionPrefix: ['E2E Comprehensive Tx'],
      sinceIso: runStartedAt,
    });
  });

  /** Clic sur un bouton de la page ACTIVE (Cypress ré-essaie la requête). */
  const clickInPage = (label: string | RegExp) =>
    cy.contains(BTNS, label, { timeout: 30_000 }).first().click({ force: true });

  /** Bouton « Ouvrir le menu » de la page ACTIVE. */
  const openMenu = () =>
    cy
      .get(`${PAGE} button[aria-label="Ouvrir le menu"]`, { timeout: 30_000 })
      .last()
      .click({ force: true });

it('navigates Settings, Balance, History, Events, and Transaction edit', function () {
    this.timeout(180_000);

    // `cy.session()` (ensureAuth) restaure le token mais PAS l'URL : sans
    // ce visit, la page reste vierge et le 1er cy.get() cherche le menu
    // sur `about:blank`.
    cy.ensureAuth();
    cy.visit('/dashboard');

    // ── Open More menu → Settings hub → Gestion ────────────────────────
    // Le hub /settings n'est qu'une liste de sections : « Actualiser
    // les données » (loadInitialData) et les actions (Bilan financier,
    // Historique…) vivent dans /settings/gestion (SettingsGestion.tsx).
    openMenu();
    clickInPage('Paramètres');
    activePageShouldContain('h1, h2, h3', 'Paramètres');
    clickInPage('Gérer');
    cy.location('pathname').should('eq', '/settings/gestion');

    // Refresh data
    clickInPage('Actualiser les données');

    // ── Financial report → Balance ─────────────────────────────────────
    clickInPage('Bilan financier');
    activePageShouldContain('h1, h2, h3', 'Bilan financier');
    cy.location('pathname').should('include', 'balance');

    // Toggle period
    // Ces boutons sont dans la page ACTIVE mais Cypress les juge non
    // visibles (`checkVisibility()`) à cause des pages Ionic empilées :
    // `force` — les assertions d'état qui suivent restent strictes.
    clickInPage('Année');
    clickInPage('Mois');
    cy.contains(BTNS, 'Mois', { timeout: 30_000 }).should('exist');

    // Summary stat cards
    // « Entrées » / « Sorties » sont des libellés de cartes de statistiques
    // (<p> dans Balance.tsx), PAS des boutons : on vérifie leur présence.
    cy.contains(`${PAGE} p`, 'Entrées', { timeout: 30_000 }).should('exist');
    cy.contains(`${PAGE} p`, 'Sorties', { timeout: 30_000 }).should('exist');

    // Export PDF
    clickInPage('Exporter le rapport');
    // Le menu de format est rendu INLINE dans la page (Balance.tsx:347,
    // état `showExport`) — pas un overlay. On clique donc dans la page
    // active. Le téléchargement déclenché par exportPDF() n'est pas
    // vérifié ici (couvert par reports-budgets.cy.ts) : on valide le
    // parcours d'ouverture du menu et le choix du format.
    cy.contains(`${PAGE} button`, /^PDF/, { timeout: 30_000 })
      .first()
      .click({ force: true });

    // ── History ────────────────────────────────────────────────────────
    openMenu();
    clickInPage('Historique');
    // Assertion d'URL (résultat métier) : la page History n'a PAS de
    // <h1> — son titre est un <p> rendu par TopHeader (défaut
    // d'accessibilité relevé dans RISQUES.md), donc une assertion sur
    // un titre échouerait à tort.
    cy.location('pathname', { timeout: 30_000 }).should('eq', '/history');

    clickInPage('Ce mois');
    clickInPage('Cette année');
    clickInPage('Tout');
    // (Pas de bouton « Retour » sur /history : c'est une page de premier
    // niveau atteinte par le menu, pas une sous-page — l'ancien spec
    // supposait à tort une pile de navigation.)

    // ── Events ─────────────────────────────────────────────────────────
    openMenu();
    clickInPage('Événements');
    cy.location('pathname', { timeout: 30_000 }).should('eq', '/events');

    // (Le badge de sync global [data-testid="sync-indicator"] a été retiré
    //    de l'app — le statut de connexion reste visible dans
    //    Settings → Profil (ligne « Synchronisation : Connecté / Hors ligne »).)

    // ── Direct balance navigation ──────────────────────────────────────
    cy.ensureAuth();
    cy.visit('/balance');
    activePageShouldContain('h1, h2, h3', /Bilan financier|Solde|Balance/i);

    // ── Transaction edit : on crée d'abord une transaction réelle via
    //    /transaction/new, puis on ouvre son edit par son vrai id. L'ancienne
    //    version hardcodait /transaction/1/edit sur un seed qui n'existe pas
    //    (l'org est vrac au boot), et le edit ne montrait qu'un écran vide.
    // Les inputs de TransactionNew.tsx sont des <IonInput> (Ionic custom
    // elements) : l'input natif à l'intérieur hérite de l'aria-label mais
    // le sélecteur `input[aria-label=...]` ne matche PAS le custom
    // element lui-même. On cible l'input natif directement via la
    // placeholder (héritée par ion-input + l'input interne) ou via
    // l'aria-label de l'ion-input.
    cy.ensureAuth();
    cy.visit('/transaction/new');
    // Pattern éprouvé par finance-deep.cy.ts : montant + description
    // suffisent — Catégorie / Source / Caisse ont des valeurs par défaut
    // valides. (Manipuler les ion-select écrase ces défauts avec le 1er
    // choix — souvent un libellé vide — et la validation refuse alors
    // l'enregistrement.)
    cy.get('input[placeholder="0"]').first().clear().type('7500');
    cy.get('input[placeholder="Ex: Dîme du mois"]')
      .first()
      .type('E2E Comprehensive Tx');

    cy.contains(BTNS, 'Enregistrer la transaction', { timeout: 30_000 })
      .first()
      .click({ force: true });
    cy.location('pathname', { timeout: 30_000 }).should('include', '/transaction/');
    cy.location('pathname').should('not.include', '/new');

    // ── Transaction edit (id réel de la transaction créée) ────────────
    // La detail page est /transaction/:id (non /edit) ; on en dérive l'id
    // pour naviguer vers /transaction/:id/edit.
    cy.url({ timeout: 30_000 }).then((url) => {
      const id = url.split('/transaction/')[1]?.split('/')[0];
      expect(id, 'id transaction dans l\'URL').to.be.a('string');
      cy.ensureAuth();
      cy.visit(`/transaction/${id}/edit`);
      activePageShouldContain('h1, h2, h3', 'Modifier');
      // La page d'édition charge la transaction en asynchrone : cliquer
      // « Sauvegarder » avant le remplissage laisse le montant vide, la
      // validation bloque et l'URL ne change jamais. On attend donc que
      // le champ Montant soit réellement pré-rempli (condition déterministe,
      // pas d'attente arbitraire).
      cy.get(`${PAGE} input[placeholder="0"]`, { timeout: 30_000 }).should(
        ($i) => {
          expect(String($i.val()).replace(/\D/g, '')).to.not.equal('');
        },
      );
      clickInPage('Sauvegarder');
      cy.location('pathname', { timeout: 30_000 }).should('eq', `/transaction/${id}`);
    });

    clickInPage('Sortie');
    clickInPage('Entrée');
    clickInPage('Sortie');

    // ── Back to Finance ────────────────────────────────────────────────
    cy.get('div.ion-page:not(.ion-page-hidden) [data-testid="nav-tab-finance"]')
      .first()
      .click({ force: true });
    activePageShouldContain('h1, h2, h3', 'Grand livre');
  });
});
