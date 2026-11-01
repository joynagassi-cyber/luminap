/**
 * Cypress — CAPTURE D'ÉCRANS (documentation utilisateur).
 *
 * Visite chaque écran de l'application au format MOBILE (390×844) et
 * enregistre une capture PNG par écran, avec des données de démonstration
 * réalistes (cf. `cy.seedDemoOrg()` dans cypress/support/visualSeed.ts).
 *
 * Les captures alimentent :
 *   - le tutoriel de l'app (images annotées, cf. public/tutorial) ;
 *   - le PDF « chaque écran : à quoi il sert » (docs/agent/…).
 *
 * Ce spec n'est PAS une suite d'assertions produit : il ne doit pas échouer
 * pour un écran vide. Il exige seulement qu'un écran soit rendu (marqueur
 * `data-screen-state`) avant la capture. Lancer avec :
 *
 *   CYPRESS_BASE_URL=http://localhost:8080 \
 *     npx cypress run --spec cypress/e2e/screenshots.cy.ts --browser electron
 */
interface ScreenDef {
  /** Nom de fichier de la capture (slug). */
  slug: string;
  /** Route à visiter (les `:id` sont remplacés par des ids seedés). */
  path: string;
  /** Titre humain (repris dans le PDF). */
  title: string;
  /** Fonctionnalité de rattachement (pour regrouper dans le PDF). */
  feature: string;
}

const DEMO_GROUP = "demo-group-jeunesse";
const DEMO_TX = "demo-tx-1";
const DEMO_EVENT = "demo-event-retraite";
const DEMO_MEMBER = "demo-mem-1";
const DEMO_CULTE = "demo-event-culte";
const DEMO_BUDGET = "demo-budget-2026";
const DEMO_CAMPAIGN = "demo-campaign-construction";
const DEMO_FORM = "demo-form-visite";

const SCREENS: ScreenDef[] = [
  // ── Démarrage / accès ────────────────────────────────────────────────
  { slug: "01-splash", path: "/splash", title: "Écran de démarrage (splash)", feature: "Démarrage & accès" },
  { slug: "02-welcome", path: "/welcome", title: "Écran d'accueil", feature: "Démarrage & accès" },
  { slug: "03-auth", path: "/auth", title: "Connexion / inscription", feature: "Démarrage & accès" },
  { slug: "04-onboarding", path: "/onboarding", title: "Onboarding guidé", feature: "Démarrage & accès" },
  { slug: "05-sessions", path: "/sessions", title: "Sessions / choix d'organisation", feature: "Démarrage & accès" },
  { slug: "06-org-setup", path: "/org-setup", title: "Création de l'organisation", feature: "Démarrage & accès" },

  // ── Tableau de bord ──────────────────────────────────────────────────
  { slug: "07-dashboard", path: "/dashboard", title: "Tableau de bord", feature: "Tableau de bord" },
  { slug: "08-notifications", path: "/notifications", title: "Notifications", feature: "Tableau de bord" },
  { slug: "09-search", path: "/search", title: "Recherche", feature: "Tableau de bord" },
  { slug: "10-tutoriel", path: "/tutoriel", title: "Tutoriel", feature: "Tableau de bord" },

  // ── Finances ─────────────────────────────────────────────────────────
  { slug: "11-finance", path: "/finance", title: "Grand livre (finances)", feature: "Finances" },
  { slug: "12-transaction-new", path: "/transaction/new", title: "Nouvelle transaction", feature: "Finances" },
  { slug: "13-transaction-detail", path: `/transaction/${DEMO_TX}`, title: "Détail d'une transaction", feature: "Finances" },
  { slug: "14-transaction-edit", path: `/transaction/${DEMO_TX}/edit`, title: "Modifier une transaction", feature: "Finances" },
  { slug: "15-transaction-group-new", path: `/groups/${DEMO_GROUP}/transaction/new`, title: "Transaction d'un groupe", feature: "Finances" },
  { slug: "16-balance", path: "/balance", title: "Bilan", feature: "Finances" },
  { slug: "17-versement", path: "/versement", title: "Versement entre caisses", feature: "Finances" },
  { slug: "18-saisie-rapide", path: `/saisie-rapide/${DEMO_GROUP}`, title: "Saisie rapide", feature: "Finances" },
  { slug: "19-budgets", path: "/budgets", title: "Budgets", feature: "Finances" },
  { slug: "20-budget-detail", path: `/budgets/${DEMO_BUDGET}`, title: "Détail d'un budget", feature: "Finances" },
  { slug: "21-giving", path: "/giving", title: "Dons & campagnes", feature: "Finances" },
  { slug: "22-giving-campaign", path: `/giving/campaigns/${DEMO_CAMPAIGN}`, title: "Détail d'une campagne", feature: "Finances" },
  { slug: "23-cotisations", path: "/cotisations", title: "Cotisations", feature: "Finances" },

  // ── Groupes & membres ────────────────────────────────────────────────
  { slug: "24-groups", path: "/groups", title: "Groupes", feature: "Groupes & membres" },
  { slug: "25-group-detail", path: `/groups/${DEMO_GROUP}`, title: "Détail d'un groupe", feature: "Groupes & membres" },
  { slug: "26-group-cotisation", path: `/groups/${DEMO_GROUP}/cotisation`, title: "Cotisation de groupe", feature: "Groupes & membres" },
  { slug: "27-members", path: "/members", title: "Membres", feature: "Groupes & membres" },
  { slug: "28-member-detail", path: `/membre/${DEMO_MEMBER}`, title: "Détail d'un membre", feature: "Groupes & membres" },
  { slug: "29-membres-en-avance", path: "/membres-en-avance", title: "Membres en avance", feature: "Groupes & membres" },

  // ── Événements ───────────────────────────────────────────────────────
  { slug: "30-events", path: "/events", title: "Événements", feature: "Événements" },
  { slug: "31-event-new", path: "/event/new", title: "Nouvel événement", feature: "Événements" },
  { slug: "32-event-detail", path: `/event/${DEMO_EVENT}`, title: "Détail d'un événement", feature: "Événements" },
  { slug: "33-event-edit", path: `/event/${DEMO_EVENT}/edit`, title: "Modifier un événement", feature: "Événements" },
  { slug: "34-culte-detail", path: `/culte/${DEMO_CULTE}`, title: "Détail d'un culte", feature: "Événements" },

  // ── Rapports & archives ──────────────────────────────────────────────
  { slug: "35-reports", path: "/reports", title: "Rapports", feature: "Rapports & archives" },
  { slug: "36-report-builder", path: "/report-builder", title: "Générateur de rapports", feature: "Rapports & archives" },
  { slug: "37-archives", path: "/archives", title: "Archives (corbeille)", feature: "Rapports & archives" },
  { slug: "38-history", path: "/history", title: "Historique", feature: "Rapports & archives" },
  { slug: "39-trace", path: "/trace", title: "Journal d'audit", feature: "Rapports & archives" },

  // ── Formulaires ──────────────────────────────────────────────────────
  { slug: "40-forms", path: "/forms", title: "Formulaires", feature: "Formulaires" },
  { slug: "41-form-fill", path: `/form/fill/${DEMO_FORM}`, title: "Remplir un formulaire", feature: "Formulaires" },
  { slug: "42-form-submissions", path: `/forms/${DEMO_FORM}/submissions`, title: "Soumissions d'un formulaire", feature: "Formulaires" },
  { slug: "43-custom-fields", path: "/custom-fields", title: "Champs personnalisés", feature: "Formulaires" },

  // ── Invitations ──────────────────────────────────────────────────────
  { slug: "44-invitation-emit", path: "/invitation/emit", title: "Émettre une invitation", feature: "Invitations" },
  { slug: "45-invitation-claim", path: "/invitation/claim", title: "Rejoindre par code", feature: "Invitations" },
  { slug: "46-invitation-manage", path: "/invitation/manage", title: "Gérer les invitations", feature: "Invitations" },

  // ── Administration ───────────────────────────────────────────────────
  { slug: "47-admin", path: "/admin", title: "Administration", feature: "Administration" },
  { slug: "48-admin-federation", path: "/admin/federation", title: "Fédération", feature: "Administration" },
  { slug: "49-admin-federation-tree", path: "/admin/federation/tree", title: "Arbre de fédération", feature: "Administration" },
  { slug: "50-admin-units", path: "/admin/units", title: "Unités / annexes", feature: "Administration" },
  { slug: "51-admin-report-send", path: "/admin/report-send", title: "Envoyer un rapport", feature: "Administration" },
  { slug: "52-admin-reports", path: "/admin/reports", title: "Rapports reçus", feature: "Administration" },
  { slug: "53-admin-roles", path: "/admin/roles", title: "Rôles & permissions", feature: "Administration" },
  { slug: "54-admin-transfer-ownership", path: "/admin/transfer-ownership", title: "Transfert de propriété", feature: "Administration" },

  // ── Aide & réglages ──────────────────────────────────────────────────
  { slug: "55-help", path: "/help", title: "Centre d'aide", feature: "Aide & réglages" },
  { slug: "56-settings", path: "/settings", title: "Réglages", feature: "Aide & réglages" },
  { slug: "57-settings-profil", path: "/settings/profil", title: "Profil", feature: "Aide & réglages" },
  { slug: "58-settings-theme", path: "/settings/theme", title: "Thème", feature: "Aide & réglages" },
  { slug: "59-settings-personnalisation", path: "/settings/personnalisation", title: "Personnalisation", feature: "Aide & réglages" },
  { slug: "60-settings-features", path: "/settings/features", title: "Fonctionnalités", feature: "Aide & réglages" },
  { slug: "61-settings-notifications", path: "/settings/notifications", title: "Réglages des notifications", feature: "Aide & réglages" },
  { slug: "62-settings-gestion", path: "/settings/gestion", title: "Gestion", feature: "Aide & réglages" },
  { slug: "63-settings-about", path: "/settings/about", title: "À propos", feature: "Aide & réglages" },
  { slug: "64-settings-health", path: "/settings/health", title: "Santé de l'application", feature: "Aide & réglages" },
];

describe("Lumina — captures d'écran (documentation)", () => {
  before(function () {
    this.timeout(180_000);
    cy.interceptCloud();
    cy.viewport(390, 844);
    cy.seedLocalSession({ role: "PASTEUR_PRINCIPAL" });
    // Boot + seed de l'organisation de démonstration (une seule fois : la
    // réplique SQLite persiste entre les tests).
    cy.visit("/sessions");
    cy.seedDemoOrg();
  });

  beforeEach(function () {
    this.timeout(120_000);
    cy.viewport(390, 844);
    // Cypress isole chaque test (localStorage vidé) : on rejoue la session et
    // on re-pose le marqueur de réplique prête (la base SQLite, elle, persiste).
    cy.seedLocalSession({ role: "PASTEUR_PRINCIPAL" });
    cy.window().then((w) => {
      try {
        w.localStorage.setItem("__e2e-ps-ready", "1");
      } catch {
        /* storage indisponible */
      }
    });
  });

  for (const screen of SCREENS) {
    it(`${screen.slug} — ${screen.title}`, function () {
      this.timeout(90_000);
      cy.visit(screen.path);
      // Laisse le lazy-load, les gardes de route et les animations se
      // stabiliser avant la capture.
      cy.get("[data-screen-state]", { timeout: 30_000 }).should(
        "have.length.gte",
        1,
      );
      // Attend que l'écran ait du contenu VISIBLE (texte ou élément de
      // formulaire) : `cy.visit()` résout avant la transition de page
      // Ionic (slide-in ~300 ms) et une capture trop tôt photographie le
      // fond vide. On attend donc un corps non trivial, puis un délai
      // court pour laisser l'animation se terminer.
      cy.document({ timeout: 30_000 }).should((doc) => {
        const text = (doc.body.innerText || "").replace(/\s+/g, "");
        const controls = doc.querySelectorAll(
          "input, textarea, select, ion-input, ion-select, button, [role='button'], svg, canvas, img",
        ).length;
        expect(
          text.length > 20 || controls > 3,
          `contenu rendu sur ${screen.path}`,
        ).to.equal(true);
      });
      // Attend la FIN de la transition de page Ionic : pendant l'animation
      // d'entrée, la page porte `ion-page-invisible` / une opacité < 1. Or
      // `cy.screenshot()` FIGE les animations CSS : capturer en pleine
      // transition fige une image à opacité ~0 (écran uniforme). On attend
      // donc que la dernière page soit pleinement opaque avant de capturer.
      cy.get("div.ion-page", { timeout: 30_000 })
        .last()
        .should("not.have.class", "ion-page-invisible")
        .and(($page) => {
          const opacity = parseFloat(
            getComputedStyle($page[0] as HTMLElement).opacity || "1",
          );
          expect(opacity, `page pleinement opaque sur ${screen.path}`).to.be.greaterThan(
            0.99,
          );
        });
      // L'animation de transition Ionic (`ion-router-outlet`) est pilotée par
      // la Web Animations API sur le CONTENEUR : la page peut être opaque
      // (opacity:1) alors que le conteneur est encore translaté/atténué. On
      // laisse donc en plus un délai fixe après la fin de la transition pour
      // que le rendu soit totalement stabilisé avant la capture.
      cy.wait(1500);
      // `capture: "viewport"` — indispensable : le shell Ionic (`ion-app`)
      // utilise un positionnement fixe avec le défilement DANS `ion-content`.
      // Une capture `fullPage` ne voit alors qu'une page vide (le corps ne
      // grandit pas). La capture viewport montre l'écran tel qu'un
      // utilisateur le voit sur un téléphone.
      cy.screenshot(screen.slug, {
        overwrite: true,
        capture: "viewport",
      });
    });
  }
});
