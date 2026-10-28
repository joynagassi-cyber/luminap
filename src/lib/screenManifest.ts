/**
 * Manifeste des écrans — source unique pour les captures et le tutoriel.
 *
 * ── Pourquoi ce fichier existe ───────────────────────────────────────────────
 * Les utilisateurs finaux de Lumina ne sont pas techniciens. Un parchemin de
 * texte (« ouvrez Finances, touchez le bouton ») ne suffit pas : ils doivent
 * VOIR l'écran pour reconnaître où ils sont. Ce manifeste est le pont unique
 * entre trois choses qui sinon divergent :
 *
 *   1. la liste des écrans réellement capturables (routes vérifiées) ;
 *   2. les captures produites par `cypress/e2e/screenshots.cy.ts` ;
 *   3. les parcours « Comment faire ? » de `src/lib/howto.ts`.
 *
 * Une seule déclaration, donc : pas de capture orpheline, pas de tutoriel qui
 * renvoie vers un écran inexistant, pas de route morte.
 *
 * ── Ce qui est vérifié, et ce qui ne l'est pas ───────────────────────────────
 * `route` et `title` sont **relevés dans le code** (constante `ROUTE_REGISTRY`
 * et en-tête réel de la page), pas inventés. Un test le vérifie : chaque route
 * doit exister dans `ROUTE_REGISTRY` ET dans `src/ionic/routes/*.tsx`.
 *
 * En revanche, `hint` est une **intention de cadrage**, pas une description
 * pixel : elle dit ce qu'un utilisateur doit reconnaître sur l'écran, et sert
 * de point de départ à l'annotation. La position exacte des éléments n'est
 * connue qu'après la capture — je ne peux pas la deviner ici sans navigateur.
 *
 * ── Routes dynamiques ────────────────────────────────────────────────────────
 * Les routes à paramètre (`/transaction/:id`) ne peuvent pas être visitées
 * sans identifiant réel. Elles sont listées dans `DYNAMIC_SCREENS` pour la
 * documentation, et volontairement absentes du manifeste capturable : mieux
 * vaut zéro capture qu'une capture d'écran d'erreur.
 */

export interface ScreenEntry {
  /** Identifiant stable. Sert AUSSI de nom de fichier : `<id>.png`. */
  id: string;
  /** Route Ionic exacte, validée contre `ROUTE_REGISTRY`. */
  route: string;
  /** Titre réellement affiché par la page (relevé dans le code). */
  title: string;
  /** À quoi sert cet écran, en une phrase de langage courant. */
  purpose: string;
  /** Ce qu'un utilisateur non technique doit y reconnaître. */
  hint: string;
  /** Faut-il une session ? `false` = capturable sans connexion. */
  requiresAuth: boolean;
  /** Parcours « Comment faire ? » concernés (`HOWTOS[].id`). */
  howto?: string[];
  /** Section du Tutoriel (`SECTIONS[].id`). */
  sectionId?: string;
}

/**
 * Écrans capturables sans paramètre. Ordre = ordre de lecture du tutoriel.
 */
export const SCREEN_MANIFEST: readonly ScreenEntry[] = [
  // ── Entrée dans l'application ────────────────────────────────────────────
  {
    id: "splash",
    route: "/splash",
    title: "Écran de démarrage",
    purpose: "Logo Lumina pendant le chargement.",
    hint: "Logo centré, nom « Lumina », sous-titre. Indicateur Sync/Offline en haut à droite.",
    requiresAuth: false,
    sectionId: "overview",
  },
  {
    id: "auth",
    route: "/auth",
    title: "Connexion",
    purpose: "Se connecter ou créer un compte.",
    hint: "Champs email et mot de passe, bouton de connexion, lien d'inscription.",
    requiresAuth: false,
    howto: [],
    sectionId: "overview",
  },

  // ── Cœur de l'application ────────────────────────────────────────────────
  {
    id: "dashboard",
    route: "/dashboard",
    title: "Lumina (tableau de bord)",
    purpose: "Vue d'ensemble : soldes, raccourcis, activité récente.",
    hint: "En-tête « Lumina », cartes de synthèse, barre de navigation en bas.",
    requiresAuth: true,
    howto: [],
    sectionId: "dashboard",
  },
  {
    id: "finance",
    route: "/finance",
    title: "Finance",
    purpose: "Toutes les transactions et les caisses.",
    hint: "En-tête « Finance », liste des transactions, bouton d'ajout.",
    requiresAuth: true,
    howto: ["enregistrer-transaction"],
    sectionId: "finance",
  },
  {
    id: "transaction-new",
    route: "/transaction/new",
    title: "Nouvelle transaction",
    purpose: "Saisir une dépense ou une recette.",
    hint: "Formulaire : type, catégorie, caisse, montant, date. Bouton d'enregistrement en bas.",
    requiresAuth: true,
    howto: ["enregistrer-transaction"],
    sectionId: "transactions",
  },
  {
    id: "versement",
    route: "/versement",
    title: "Versement",
    purpose: "Transférer un montant d'une caisse vers une autre.",
    hint: "Sélection caisse source, caisse de destination, montant.",
    requiresAuth: true,
    howto: ["faire-versement"],
    sectionId: "versement",
  },
  {
    id: "balance",
    route: "/balance",
    title: "Bilan",
    purpose: "Synthèse équilibrée des entrées et sorties.",
    hint: "En-tête « Bilan », totaux entrées / sorties, solde.",
    requiresAuth: true,
    howto: ["budget"],
    sectionId: "bilan",
  },
  {
    id: "budgets",
    route: "/budgets",
    title: "Budgets",
    purpose: "Budgets par période et écart prévu / réalisé.",
    hint: "En-tête « Budgets », liste des budgets, bouton de création.",
    requiresAuth: true,
    howto: ["budget"],
    sectionId: "bilan",
  },
  {
    id: "giving",
    route: "/giving",
    title: "Dons & Campagnes",
    purpose: "Campagnes de dons et leur suivi.",
    hint: "En-tête « Dons & Campagnes », cartes de campagne, progression.",
    requiresAuth: true,
    sectionId: "finance",
  },
  {
    id: "cotisations",
    route: "/cotisations",
    title: "Cotisations",
    purpose: "Cotisations par culte, et accès à la saisie rapide.",
    hint: "En-tête « Cotisations », liste des cultes, accès à la saisie rapide.",
    requiresAuth: true,
    howto: ["cotisation-groupe", "saisie-rapide"],
    sectionId: "caisses",
  },
  {
    id: "groups",
    route: "/groups",
    title: "Groupes",
    purpose: "Groupes de l'organisation et leurs membres.",
    hint: "En-tête « Groupes », liste des groupes, accès au détail.",
    requiresAuth: true,
    howto: ["cotisation-groupe"],
    sectionId: "groupes",
  },
  {
    id: "events",
    route: "/events",
    title: "Événements",
    purpose: "Événements planifiés et leur budget.",
    hint: "En-tête « Événements », vues liste / calendrier, bouton « Nouvel événement ».",
    requiresAuth: true,
    howto: ["creer-evenement"],
    sectionId: "evenements",
  },
  {
    id: "event-new",
    route: "/event/new",
    title: "Nouvel événement",
    purpose: "Créer un événement avec dates et budget.",
    hint: "Formulaire : nom, date de début, date de fin, budget prévisionnel.",
    requiresAuth: true,
    howto: ["creer-evenement"],
    sectionId: "evenements",
  },
  {
    id: "members",
    route: "/members",
    title: "Membres",
    purpose: "Annuaire des membres de l'organisation.",
    hint: "En-tête « Membres », recherche, liste, bouton d'ajout.",
    requiresAuth: true,
    howto: ["membre-ajouter"],
    sectionId: "membres",
  },
  {
    id: "history",
    route: "/history",
    title: "Historique",
    purpose: "Journal des opérations passées.",
    hint: "En-tête « Historique », liste chronologique, filtres.",
    requiresAuth: true,
    sectionId: "historique",
  },
  {
    id: "reports",
    route: "/reports",
    title: "Rapports",
    purpose: "Rapports d'activité et financiers.",
    hint: "En-tête « Rapports », types de rapport, bouton de génération.",
    requiresAuth: true,
    howto: ["rapport"],
    sectionId: "rapports",
  },
  {
    id: "forms",
    route: "/forms",
    title: "Formulaires",
    purpose: "Formulaires personnalisés et leurs réponses.",
    hint: "En-tête « Formulaires », liste, bouton de création.",
    requiresAuth: true,
    sectionId: "formulaires",
  },
  {
    id: "trace",
    route: "/trace",
    title: "Trace d'activité",
    purpose: "Qui a fait quoi, et quand.",
    hint: "En-tête « Trace d'activité », liste horodatée des actions.",
    requiresAuth: true,
    sectionId: "trace",
  },
  {
    id: "archives",
    route: "/archives",
    title: "Archives",
    purpose: "Éléments sortis de la vue courante.",
    hint: "En-tête « Archives », filtres, liste des éléments archivés.",
    requiresAuth: true,
    howto: ["archives"],
    sectionId: "archives",
  },

  // ── Invitations ──────────────────────────────────────────────────────────
  {
    id: "invitation-emit",
    route: "/invitation/emit",
    title: "Créer une invitation",
    purpose: "Émettre un code ou un QR code pour faire entrer quelqu'un.",
    hint: "Choix du rôle, de la portée, de la validité, puis génération du code.",
    requiresAuth: true,
    howto: ["inviter-membre"],
    sectionId: "membres",
  },
  {
    id: "invitation-manage",
    route: "/invitation/manage",
    title: "Gestion des invitations",
    purpose: "Suivre et révoquer les invitations.",
    hint: "Liste des invitations, statut (Active / Révoquée), action de révocation.",
    requiresAuth: true,
    howto: ["gerer-invitations"],
    sectionId: "membres",
  },
  {
    id: "invitation-claim",
    route: "/invitation/claim",
    title: "Réclamer une invitation",
    purpose: "Saisir un code reçu pour rejoindre l'organisation.",
    hint: "Champ de saisie du code / scan du QR code, bouton de confirmation.",
    requiresAuth: false,
    howto: ["reclamer-invitation"],
    sectionId: "membres",
  },

  // ── Administration ───────────────────────────────────────────────────────
  {
    id: "admin",
    route: "/admin",
    title: "Administration centrale",
    purpose: "Point d'entrée des réglages d'organisation.",
    hint: "En-tête « Administration centrale », accès aux rôles, unités, invitations.",
    requiresAuth: true,
    howto: ["creer-organisation"],
    sectionId: "roles",
  },
  {
    id: "admin-roles",
    route: "/admin/roles",
    title: "Rôles",
    purpose: "Attribuer et retirer les rôles des membres.",
    hint: "Liste des membres avec leur rôle, sélecteur de rôle.",
    requiresAuth: true,
    howto: ["assigner-role"],
    sectionId: "roles",
  },
  {
    id: "admin-units",
    route: "/admin/units",
    title: "Unités",
    purpose: "Départements, groupes, antennes.",
    hint: "Arborescence des unités, bouton d'ajout, unité parente.",
    requiresAuth: true,
    howto: ["unites-organisation"],
    sectionId: "groupes",
  },

  // ── Aide ─────────────────────────────────────────────────────────────────
  {
    id: "help",
    route: "/help",
    title: "Aide",
    purpose: "Recherche « Comment faire ? » et liste des rôles.",
    hint: "Champ « Comment faire ? », questions fréquentes, bloc « Rôles disponibles ».",
    requiresAuth: true,
    sectionId: "faq",
  },
  {
    id: "tutoriel",
    route: "/tutoriel",
    title: "Tutoriel",
    purpose: "Documentation complète, section par section.",
    hint: "Sommaire des sections, contenu détaillé, schémas.",
    requiresAuth: true,
    sectionId: "overview",
  },

  // ── Paramètres ───────────────────────────────────────────────────────────
  {
    id: "settings",
    route: "/settings",
    title: "Paramètres",
    purpose: "Réglages du compte et de l'application.",
    hint: "En-tête « Paramètres », liste des sous-rubriques.",
    requiresAuth: true,
    sectionId: "parametres",
  },
  {
    id: "settings-profil",
    route: "/settings/profil",
    title: "Profil",
    purpose: "Nom, photo, mot de passe.",
    hint: "Champs du profil, bouton d'enregistrement.",
    requiresAuth: true,
    howto: ["modifier-profil"],
    sectionId: "parametres",
  },
  {
    id: "settings-theme",
    route: "/settings/theme",
    title: "Thème & apparence",
    purpose: "Clair / sombre et couleur de marque.",
    hint: "Sélecteur clair/sombre, choix de couleur.",
    requiresAuth: true,
    sectionId: "parametres",
  },
  {
    id: "settings-notifications",
    route: "/settings/notifications",
    title: "Notifications",
    purpose: "Activer ou désactiver les notifications.",
    hint: "Interrupteurs par type de notification.",
    requiresAuth: true,
    sectionId: "parametres",
  },
  {
    id: "settings-features",
    route: "/settings/features",
    title: "Features & navigation",
    purpose: "Choisir les onglets visibles dans la barre de navigation.",
    hint: "Liste des onglets avec interrupteurs.",
    requiresAuth: true,
    sectionId: "parametres",
  },
  {
    id: "settings-health",
    route: "/settings/health",
    title: "État du système",
    purpose: "Vérifier la synchronisation et l'état local.",
    hint: "Indicateurs de synchronisation, état de la base locale, dernière synchro.",
    requiresAuth: true,
    howto: ["donnees-absentent"],
    sectionId: "parametres",
  },
  {
    id: "settings-about",
    route: "/settings/about",
    title: "À propos",
    purpose: "Version de l'application et informations légales.",
    hint: "Numéro de version, liens.",
    requiresAuth: true,
    sectionId: "parametres",
  },
];

/**
 * Écrans à paramètre : non capturables sans données réelles. Documentés pour
 * que personne ne les cherche dans le dossier de captures.
 *
 * Pour les capturer, ajouter un cas dédié dans le spec avec un identifiant
 * extrait de la base (`cy.request` ou fixture).
 */
export const DYNAMIC_SCREENS: readonly { route: string; note: string }[] = [
  { route: "/transaction/:id", note: "Détail d'une transaction" },
  { route: "/transaction/:id/edit", note: "Modification d'une transaction" },
  { route: "/groups/:id", note: "Détail d'un groupe" },
  { route: "/groups/:id/cotisation", note: "Cotisations d'un groupe" },
  { route: "/groups/:id/transaction/new", note: "Transaction depuis un groupe" },
  { route: "/event/:id", note: "Détail d'un événement" },
  { route: "/event/:id/edit", note: "Modification d'un événement" },
  { route: "/membre/:id", note: "Fiche d'un membre" },
  { route: "/culte/:id", note: "Détail d'un culte" },
  { route: "/saisie-rapide/:id", note: "Saisie rapide d'un culte" },
  { route: "/budgets/:id", note: "Détail d'un budget" },
  { route: "/giving/campaigns/:id", note: "Détail d'une campagne" },
  { route: "/form/fill/:id", note: "Remplissage d'un formulaire" },
  { route: "/forms/:id/submissions", note: "Réponses d'un formulaire" },
  { route: "/admin/reports/:id", note: "Rapport d'administration" },
  { route: "/admin/organizations/:id", note: "Organisation (vue centrale)" },
];

/** Écrans nécessitant une session. */
export const AUTHENTICATED_SCREENS = SCREEN_MANIFEST.filter((s) => s.requiresAuth);

/** Écrans capturables sans session. */
export const PUBLIC_SCREENS = SCREEN_MANIFEST.filter((s) => !s.requiresAuth);

/** Retrouve un écran par identifiant. */
export function screenById(id: string): ScreenEntry | undefined {
  return SCREEN_MANIFEST.find((s) => s.id === id);
}

/**
 * Écrans illustrant un parcours « Comment faire ? ».
 *
 * Consommé par `HowToSearch` : quand la capture existe dans
 * `public/captures/<id>.png`, elle est affichée sous les étapes. Si elle
 * n'existe pas, l'image est simplement omise (aucune icône cassée).
 */
export function screensForHowto(howtoId: string): ScreenEntry[] {
  return SCREEN_MANIFEST.filter((s) => s.howto?.includes(howtoId));
}
