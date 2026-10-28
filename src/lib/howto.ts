/**
 * « Comment faire ? » — catalogue de parcours guidés + recherche locale.
 *
 * ── Pourquoi un catalogue séparé du Tutoriel ─────────────────────────────────
 * `src/pages/Tutorial.tsx` contient `SECTIONS: SectionData[]` (19 sections). On
 * aurait voulu s'en servir comme unique source. Vérification faite : une section
 * porte `paragraphs`, `tips`, `warnings`, `faqs`, `errors` — de la PROSE qui
 * explique *ce qu'est* une fonctionnalité, jamais une suite ordonnée d'étapes.
 * Un parcours « comment faire » a besoin d'étapes numérotées et d'une route.
 *
 * Les deux contenus sont donc réellement différents et ne peuvent pas être
 * fusionnés sans dégrader l'un ou l'autre. Le lien est conservé par
 * `sectionId` : chaque parcours renvoie vers sa section du Tutoriel pour
 * l'explication complète. Une seule documentation, deux formats.
 *
 * ── Aucun modèle de langage ──────────────────────────────────────────────────
 * La recherche est un filtrage local (normalisation + appariement de radical).
 * Coût zéro, fonctionne hors ligne, résultat déterministe et testable. C'est le
 * « 20 % gratuit » décrit dans `docs/ROADMAP.md` §5 : il répond au problème
 * « je me perds dans l'application » avant d'engager le moindre appel LLM.
 *
 * ── Instrumentation ─────────────────────────────────────────────────────────
 * `logHowToSearch` conserve les 200 dernières recherches (requête, nombre de
 * résultats) dans un tampon local. But : mesurer la demande réelle avant de
 * décider si l'assistant conversationnel se justifie (`ROADMAP.md` §6.9).
 * Ce n'est PAS un dispositif de télémétrie : rien ne quitte l'appareil. Pour
 * agréger entre appareils il faudrait une table dédiée — hors périmètre v1,
 * et documenté comme tel.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface HowToStep {
  /** Action courte, à l'impératif. Ex. « Ouvrir la page Invitations ». */
  label: string;
  /** Précision facultative affichée sous l'étape. */
  detail?: string;
}

export interface HowTo {
  /** Identifiant stable (sert de clé React et de cible d'ancre). */
  id: string;
  /** La question telle que l'utilisateur la pose. */
  question: string;
  /** Une phrase de réponse, pour les listes. */
  summary: string;
  /**
   * Termes de recherche. Inclure le vocabulaire RÉEL de l'utilisateur
   * (« offrande », « cotisation », « caisse »), pas seulement le jargon interne.
   */
  keywords: string[];
  /** Étapes ordonnées du parcours. */
  steps: HowToStep[];
  /** Route de destination. Doit exister dans `ROUTE_REGISTRY` (test dédié). */
  route?: string;
  /** Libellé du bouton d'action. Par défaut « Ouvrir la page ». */
  routeLabel?: string;
  /** Section correspondante du Tutoriel (`SECTIONS[].id`). */
  sectionId?: string;
  /** Pièges connus, affichés en encart d'avertissement. */
  pitfalls?: string[];
}

export interface HowToMatch {
  howto: HowTo;
  /** Score de pertinence (décroissant). */
  score: number;
  /**
   * `true` quand le résultat vient du repli « au moins un mot » : aucun parcours
   * ne contenait TOUS les mots de la requête. L'UI le signale pour ne pas faire
   * croire à une correspondance exacte.
   */
  approximate: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation et appariement
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minuscules + suppression des diacritiques + espaces normalisés.
 *
 * Indispensable en contexte béninois : les utilisateurs écrivent « evenement »
 * ou « évènement », « categorie » ou « catégorie ». Sans cette étape, la moitié
 * des requêtes ne trouve rien.
 */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Découpe une chaîne normalisée en mots. */
function words(input: string): string[] {
  const n = normalize(input);
  return n.length === 0 ? [] : n.split(" ");
}

/**
 * Radical approximatif : les 5 premiers caractères.
 *
 * Justification mesurée sur les paires réelles du domaine :
 *   inviter / invitation → « invit »
 *   cotiser / cotisation → « cotis »
 *   evenement / evenements → « evene »
 * En dessous de 5 caractères on garde le mot entier, sinon « de » et « du »
 * se confondraient avec tout.
 */
export function stem(word: string): string {
  return word.length >= 5 ? word.slice(0, 5) : word;
}

interface Haystack {
  question: string[];
  keywords: string[];
  summary: string[];
  steps: string[];
  pitfalls: string[];
  /** Tous les mots, pour le test d'appartenance « ET ». */
  all: Set<string>;
}

function buildHaystack(h: HowTo): Haystack {
  const question = words(h.question);
  const keywords = h.keywords.flatMap(words);
  const summary = words(h.summary);
  const steps = h.steps.flatMap((s) => [...words(s.label), ...words(s.detail ?? "")]);
  const pitfalls = (h.pitfalls ?? []).flatMap(words);
  const all = new Set(
    [...question, ...keywords, ...summary, ...steps, ...pitfalls].map(stem),
  );
  return { question, keywords, summary, steps, pitfalls, all };
}

/** Poids par zone : ce que l'utilisateur a tapé a plus de valeur dans un mot-clé. */
const WEIGHT = {
  question: 10,
  keywords: 6,
  summary: 3,
  steps: 2,
  pitfalls: 1,
} as const;

function fieldScore(field: string[], key: string, rawToken: string, weight: number): number {
  let hits = 0;
  for (const w of field) {
    if (stem(w) === key || w.includes(rawToken)) hits += 1;
  }
  return hits === 0 ? 0 : weight * Math.min(hits, 3);
}

function scoreHaystack(hs: Haystack, token: string): number {
  const key = stem(token);
  return (
    fieldScore(hs.question, key, token, WEIGHT.question) +
    fieldScore(hs.keywords, key, token, WEIGHT.keywords) +
    fieldScore(hs.summary, key, token, WEIGHT.summary) +
    fieldScore(hs.steps, key, token, WEIGHT.steps) +
    fieldScore(hs.pitfalls, key, token, WEIGHT.pitfalls)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recherche
// ─────────────────────────────────────────────────────────────────────────────

const HAYSTACKS = new WeakMap<HowTo, Haystack>();

function haystackOf(h: HowTo): Haystack {
  let hs = HAYSTACKS.get(h);
  if (!hs) {
    hs = buildHaystack(h);
    HAYSTACKS.set(h, hs);
  }
  return hs;
}

/**
 * Recherche un parcours.
 *
 * Stratégie en deux temps :
 *  1. **ET strict** — tous les mots de la requête doivent apparaître. Précis.
 *  2. Si rien : **OU pondéré** — au moins un mot, marqué `approximate`. Utile
 *     quand l'utilisateur tape une phrase longue (« comment je fais pour
 *     ajouter un membre qui vient d'arriver »).
 *
 * Une requête vide renvoie `[]` : c'est à l'UI de proposer des suggestions.
 */
export function searchHowtos(query: string, catalogue: readonly HowTo[] = HOWTOS): HowToMatch[] {
  const tokens = words(query);
  if (tokens.length === 0) return [];

  const keys = tokens.map(stem);

  const strict: HowToMatch[] = [];
  const loose: HowToMatch[] = [];

  for (const howto of catalogue) {
    const hs = haystackOf(howto);
    const allPresent = keys.every((k) => hs.all.has(k));
    let score = 0;
    for (const t of tokens) score += scoreHaystack(hs, t);
    if (score === 0) continue;

    if (allPresent) strict.push({ howto, score, approximate: false });
    else loose.push({ howto, score, approximate: true });
  }

  // À score égal, l'ordre du catalogue (curé) fait foi : tri stable garanti.
  const byScore = (a: HowToMatch, b: HowToMatch) => b.score - a.score;
  return strict.length > 0 ? strict.sort(byScore) : loose.sort(byScore).slice(0, 3);
}

/** Parcours proposés quand le champ est vide. */
export function featuredHowtos(limit = 6, catalogue: readonly HowTo[] = HOWTOS): HowTo[] {
  return catalogue.slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Instrumentation locale (mesure de la demande)
// ─────────────────────────────────────────────────────────────────────────────

export const HOWTO_LOG_KEY = "lumina.howto.searches.v1";
const LOG_LIMIT = 200;

export interface HowToSearchLogEntry {
  query: string;
  results: number;
  at: string;
}

function storage(): Storage | null {
  try {
    // `localStorage` est absent en environnement node (tests) → no-op explicite.
    if (typeof globalThis.localStorage === "undefined") return null;
    return globalThis.localStorage;
  } catch {
    // Navigation privée / stockage refusé : l'instrumentation ne doit jamais
    // faire échouer une recherche.
    return null;
  }
}

/** Enregistre une recherche. Ne lève jamais. */
export function logHowToSearch(query: string, results: number): void {
  const s = storage();
  if (!s) return;
  try {
    const raw = s.getItem(HOWTO_LOG_KEY);
    const log: HowToSearchLogEntry[] = raw ? JSON.parse(raw) : [];
    log.push({ query: query.trim().slice(0, 120), results, at: new Date().toISOString() });
    s.setItem(HOWTO_LOG_KEY, JSON.stringify(log.slice(-LOG_LIMIT)));
  } catch {
    // tampon corrompu ou quota dépassé : on repart proprement au prochain appel
    try {
      s.removeItem(HOWTO_LOG_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Relit le journal local. Ne lève jamais. */
export function readHowToSearchLog(): HowToSearchLogEntry[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(HOWTO_LOG_KEY);
    return raw ? (JSON.parse(raw) as HowToSearchLogEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Synthèse exploitable : total, et surtout les requêtes SANS résultat — c'est
 * là que se trouve le signal (« les utilisateurs cherchent quelque chose qui
 * n'existe pas encore »).
 */
export function summarizeHowToSearches(log: readonly HowToSearchLogEntry[] = readHowToSearchLog()) {
  const byQuery = new Map<string, number>();
  const zeroResult = new Map<string, number>();
  for (const e of log) {
    const q = normalize(e.query);
    if (q.length === 0) continue;
    byQuery.set(q, (byQuery.get(q) ?? 0) + 1);
    if (e.results === 0) zeroResult.set(q, (zeroResult.get(q) ?? 0) + 1);
  }
  const top = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return { total: log.length, topQueries: top(byQuery), topZeroResult: top(zeroResult) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ordre volontaire : du plus fréquent au plus rare. `featuredHowtos` en prend
 * les premiers — donc l'ordre EST l'ordre de suggestion.
 */
export const HOWTOS: readonly HowTo[] = [
  {
    id: "enregistrer-transaction",
    question: "Comment enregistrer une dépense ou une recette ?",
    summary: "Créer une transaction, puis la faire approuver.",
    keywords: [
      "transaction", "depense", "recette", "offrande", "achat", "payer",
      "sortie", "entree", "argent", "saisir", "ajouter",
    ],
    steps: [
      { label: "Ouvrir l'onglet Finances" },
      { label: "Toucher le bouton « Transaction »", detail: "Il se trouve en bas de l'écran." },
      { label: "Choisir la catégorie et la caisse" },
      { label: "Saisir le montant en francs CFA", detail: "Nombre entier, sans virgule." },
      { label: "Enregistrer" },
      { label: "Faire approuver la transaction", detail: "Un trésorier ou un administrateur doit l'approuver." },
    ],
    route: "/transaction/new",
    routeLabel: "Enregistrer une transaction",
    sectionId: "transactions",
    pitfalls: [
      "Une transaction APPROUVÉE ne peut plus être modifiée : vérifiez le montant avant validation.",
      "Le solde d'une caisse est calculé à partir des transactions, il ne se saisit jamais directement.",
    ],
  },
  {
    id: "faire-versement",
    question: "Comment faire un versement entre caisses ?",
    summary: "Transférer un montant d'une caisse vers une autre, en une seule opération.",
    keywords: [
      "versement", "transfert", "transférer", "caisse", "solde", "deposer",
      "envoyer", "mouvement",
    ],
    steps: [
      { label: "Ouvrir Finances → Versement" },
      { label: "Choisir la caisse source", detail: "Celle qui donne." },
      { label: "Choisir la caisse de destination" },
      { label: "Saisir le montant" },
      { label: "Valider" },
    ],
    route: "/versement",
    routeLabel: "Faire un versement",
    sectionId: "versement",
    pitfalls: [
      "Le solde de la caisse source doit être suffisant — sinon l'opération est refusée.",
      "Un versement est atomique : les deux caisses bougent ensemble, ou pas du tout.",
    ],
  },
  {
    id: "creer-evenement",
    question: "Comment planifier un événement avec un budget ?",
    summary: "Créer un événement, lui donner un budget par poste, puis suivre les dépenses.",
    keywords: [
      "evenement", "culte", "conference", "semaine", "priere", "planifier",
      "organiser", "budget", "activite", "programme", "fete",
    ],
    steps: [
      { label: "Ouvrir Événements" },
      { label: "Toucher « Nouvel événement »" },
      { label: "Renseigner le nom, la date de début et la date de fin" },
      { label: "Saisir le budget prévisionnel global" },
      { label: "Enregistrer" },
      { label: "Ouvrir l'événement pour ajouter les postes budgétaires", detail: "Dîme, offrande, frais de fonctionnement, mission…" },
      { label: "Ajouter la liste d'achats", detail: "Article, quantité, prix, fournisseur." },
    ],
    route: "/event/new",
    routeLabel: "Créer un événement",
    sectionId: "evenements",
    pitfalls: [
      "Un événement démarre au statut « Planifié » ; le passage à « En cours » puis « Terminé » est contrôlé.",
      "Supprimer un événement ne supprime pas les transactions liées.",
      "Un événement annulé ne doit plus générer de transactions.",
    ],
  },
  {
    id: "inviter-membre",
    question: "Comment inviter quelqu'un à rejoindre l'organisation ?",
    summary: "Émettre un code ou un QR code d'invitation. Fonctionne hors ligne.",
    keywords: [
      "inviter", "invitation", "code", "qr", "qr code", "rejoindre", "nouveau",
      "membre", "acces", "recruter", "ajouter",
    ],
    steps: [
      { label: "Ouvrir Invitations → Émettre" },
      { label: "Choisir le rôle cible", detail: "Ce que la personne pourra faire une fois entrée." },
      { label: "Choisir la portée", detail: "Toute l'organisation, un groupe, un événement." },
      { label: "Ajuster la validité", detail: "Par défaut : 7 jours et 1 seule utilisation." },
      { label: "Générer le code" },
      { label: "Partager le QR code ou le code à la personne" },
      { label: "La personne réclame l'invitation depuis « Invitations → Réclamer »" },
    ],
    route: "/invitation/emit",
    routeLabel: "Émettre une invitation",
    sectionId: "membres",
    pitfalls: [
      "Une invitation est valable 7 jours et 1 utilisation par défaut ; ces deux valeurs se règlent à l'émission.",
      "Un code révoqué ou épuisé ne peut plus être utilisé — il faut en émettre un nouveau.",
      "L'émission fonctionne hors ligne ; la confirmation de la réclamation, non.",
    ],
  },
  {
    id: "reclamer-invitation",
    question: "J'ai reçu un code d'invitation, comment l'utiliser ?",
    summary: "Saisir le code ou scanner le QR code pour rejoindre l'organisation.",
    keywords: [
      "reclamer", "reclamation", "code", "invitation", "scanner", "qr",
      "rejoindre", "entrer", "accepter", "invite",
    ],
    steps: [
      { label: "Ouvrir Invitations → Réclamer" },
      { label: "Scanner le QR code, ou saisir le code à la main" },
      { label: "Confirmer" },
      { label: "Attendre la synchronisation", detail: "La confirmation nécessite une connexion internet." },
    ],
    route: "/invitation/claim",
    routeLabel: "Réclamer une invitation",
    sectionId: "membres",
    pitfalls: [
      "Un code expiré (7 jours par défaut), révoqué ou déjà utilisé est refusé.",
      "Sans réseau, la réclamation reste en attente : elle se confirmera à la reconnexion.",
    ],
  },
  {
    id: "gerer-invitations",
    question: "Comment voir ou révoquer les invitations en cours ?",
    summary: "Lister les invitations émises, leur état et leurs utilisations.",
    keywords: [
      "invitation", "revoquer", "annuler", "expirer", "liste", "suivi",
      "code", "utilisations", "gerer",
    ],
    steps: [
      { label: "Ouvrir Invitations → Gérer" },
      { label: "Repérer l'invitation dans la liste", detail: "Statut : Active ou Révoquée." },
      { label: "Toucher « Révoquer »", detail: "Le code cesse immédiatement de fonctionner." },
    ],
    route: "/invitation/manage",
    routeLabel: "Gérer les invitations",
    sectionId: "membres",
    pitfalls: [
      "Révoquer est irréversible : le code ne peut pas être réactivé.",
      "Les invitations déjà réclamées ne sont pas annulées par une révocation.",
    ],
  },
  {
    id: "assigner-role",
    question: "Comment donner un rôle à un membre ?",
    summary: "Attribuer un rôle qui détermine les actions autorisées.",
    keywords: [
      "role", "roles", "permission", "permissions", "admin", "administrateur",
      "tresorier", "secretaire", "ancien", "diacre", "pasteur", "droits",
      "nommer", "designer", "acces",
    ],
    steps: [
      { label: "Ouvrir Administration → Rôles" },
      { label: "Chercher le membre" },
      { label: "Choisir le rôle à attribuer" },
      { label: "Confirmer" },
    ],
    route: "/admin/roles",
    routeLabel: "Gérer les rôles",
    sectionId: "roles",
    pitfalls: [
      "Une organisation doit toujours conserver au moins un propriétaire (org_admin) actif : le retrait du dernier est refusé. Un rôle et un propriétaire sont deux choses différentes.",
      "Un rôle ne donne jamais de droit en dehors des organisations auxquelles on appartient.",
      "Certaines actions restent réservées : retirez un rôle avant de retirer un membre.",
    ],
  },
  {
    id: "creer-organisation",
    question: "Comment créer une nouvelle organisation ?",
    summary: "Créer l'organisation, ses unités, puis inviter ses membres.",
    keywords: [
      "organisation", "org", "creer", "nouvelle", "eglise", "antenne",
      "campus", "filiale", "structure", "departement",
    ],
    steps: [
      { label: "Ouvrir Administration → Organisations" },
      { label: "Toucher « Nouvelle organisation »" },
      { label: "Renseigner le nom et le type", detail: "Église, école, ONG, entreprise, institution." },
      { label: "Valider" },
      { label: "Créer les unités organisationnelles", detail: "Départements, groupes, antennes." },
      { label: "Inviter les membres", detail: "Voir « Comment inviter quelqu'un »." },
    ],
    route: "/admin",
    routeLabel: "Administration",
    sectionId: "parametres",
    pitfalls: [
      "La toute première organisation ne peut pas être créée depuis l'interface : elle est initialisée par l'administrateur de la plateforme.",
      "Les données sont cloisonnées par organisation : rien n'est visible depuis une autre.",
    ],
  },
  {
    id: "unites-organisation",
    question: "Comment organiser les départements et les groupes ?",
    summary: "Structurer l'organisation en unités hiérarchiques.",
    keywords: [
      "unite", "unites", "departement", "groupe", "groupes", "antenne",
      "hierarchie", "structure", "org unit", "equipe",
    ],
    steps: [
      { label: "Ouvrir Administration → Unités" },
      { label: "Ajouter une unité et choisir son unité parente" },
      { label: "Renseigner le nom et la description" },
      { label: "Enregistrer" },
    ],
    route: "/admin/units",
    routeLabel: "Gérer les unités",
    sectionId: "groupes",
    pitfalls: [
      "Une unité ne peut pas devenir sa propre ancêtre : les cycles sont refusés.",
      "Désactiver une unité plutôt que la supprimer, pour conserver l'historique.",
    ],
  },
  {
    id: "cotisation-groupe",
    question: "Comment gérer les cotisations d'un groupe ?",
    summary: "Enregistrer les cotisations dues et payées par les membres d'un groupe.",
    keywords: [
      "cotisation", "cotisations", "groupe", "cotiser", "paiement", "du",
      "membre", "tontine", "contribution",
    ],
    steps: [
      { label: "Ouvrir Groupes, puis le groupe concerné" },
      { label: "Ouvrir l'onglet Cotisations" },
      { label: "Sélectionner le culte concerné" },
      { label: "Marquer les membres ayant payé" },
    ],
    route: "/groups",
    routeLabel: "Ouvrir les groupes",
    sectionId: "groupes",
    pitfalls: [
      "Un culte est verrouillé après 30 jours : les cotisations payées ne peuvent plus être modifiées.",
      "Le montant minimum et l'immutabilité après verrouillage sont contrôlés par le système.",
    ],
  },
  {
    id: "saisie-rapide",
    question: "Comment saisir rapidement les cotisations d'un culte ?",
    summary: "Écran de saisie dédié pour enregistrer les paiements d'un culte.",
    keywords: [
      "saisie", "rapide", "culte", "cotisation", "dimanche", "paiement",
      "encaisser", "guichet", "vite",
    ],
    steps: [
      { label: "Ouvrir Cotisations" },
      { label: "Choisir le culte du jour" },
      { label: "Toucher « Saisie rapide »" },
      { label: "Cocher les membres au fur et à mesure" },
    ],
    route: "/cotisations",
    routeLabel: "Ouvrir les cotisations",
    sectionId: "caisses",
    pitfalls: [
      "Après 30 jours, le culte est verrouillé et la saisie n'est plus possible.",
    ],
  },
  {
    id: "budget",
    question: "Comment créer un budget et suivre les écarts ?",
    summary: "Définir un budget par période et par poste, puis le comparer au réalisé.",
    keywords: [
      "budget", "budgets", "poste", "prevision", "previsionnel", "ecart",
      "conseil", "annuel", "trimestre", "ligne",
    ],
    steps: [
      { label: "Ouvrir Finances → Budgets" },
      { label: "Toucher « Nouveau budget »" },
      { label: "Choisir la période" },
      { label: "Ajouter les postes budgétaires" },
      { label: "Suivre l'écart prévu / réalisé", detail: "Le réalisé vient des transactions, pas d'une saisie manuelle." },
    ],
    route: "/budgets",
    routeLabel: "Ouvrir les budgets",
    sectionId: "bilan",
    pitfalls: [
      "Le réalisé est calculé : vous ne pouvez pas le corriger à la main, il faut corriger la transaction.",
      "Clôturer un budget le rend non modifiable.",
    ],
  },
  {
    id: "rapport",
    question: "Comment générer un rapport pour le conseil ?",
    summary: "Produire un rapport d'activité ou financier, puis l'envoyer.",
    keywords: [
      "rapport", "rapports", "conseil", "bilan", "synthese", "export",
      "envoyer", "pdf", "assemblee", "compte rendu",
    ],
    steps: [
      { label: "Ouvrir Rapports" },
      { label: "Choisir le type de rapport et la période" },
      { label: "Générer" },
      { label: "Exporter ou envoyer", detail: "Voir Administration → Envoi de rapport." },
    ],
    route: "/reports",
    routeLabel: "Ouvrir les rapports",
    sectionId: "rapports",
    pitfalls: [
      "Un rapport reflète l'état de la synchronisation au moment où il est généré : vérifiez que tout est synchronisé avant.",
    ],
  },
  {
    id: "membre-ajouter",
    question: "Comment ajouter un membre qui vient d'arriver ?",
    summary: "Enregistrer une personne puis lui donner accès.",
    keywords: [
      "membre", "membres", "ajouter", "nouveau", "personne", "fidele",
      "enregistrer", "arrivant", "nouveau venu", "inscrire",
    ],
    steps: [
      { label: "Ouvrir Membres" },
      { label: "Vérifier que la personne n'existe pas déjà", detail: "Chercher par nom avant d'ajouter." },
      { label: "Toucher « Ajouter un membre »" },
      { label: "Renseigner le nom et les informations de contact" },
      { label: "Enregistrer" },
      { label: "Émettre une invitation", detail: "Un membre n'a pas d'accès à l'application tant qu'il n'a pas réclamé son invitation." },
    ],
    route: "/members",
    routeLabel: "Ouvrir les membres",
    sectionId: "membres",
    pitfalls: [
      "Ajouter un membre ne crée pas de compte : c'est l'invitation qui donne l'accès.",
    ],
  },
  {
    id: "donnees-absentent",
    question: "Mes données n'apparaissent pas, que faire ?",
    summary: "Vérifier la synchronisation et l'organisation active.",
    keywords: [
      "donnees", "absent", "vide", "affiche pas", "disparu", "synchronisation",
      "sync", "bug", "erreur", "chargement", "reseau", "hors ligne",
    ],
    steps: [
      { label: "Vérifier l'organisation active", detail: "Le sélecteur en haut de l'écran." },
      { label: "Vérifier la connexion réseau" },
      { label: "Ouvrir Paramètres → Santé", detail: "Affiche l'état de la synchronisation." },
      { label: "Attendre la fin de la synchronisation", detail: "Les données arrivent par lots après une reconnexion." },
    ],
    route: "/settings/health",
    routeLabel: "Vérifier la synchronisation",
    sectionId: "erreurs",
    pitfalls: [
      "Une liste vide juste après l'ouverture peut simplement signifier que le contexte d'organisation n'est pas encore résolu.",
      "Ne désinstallez pas l'application : les données locales non synchronisées seraient perdues.",
    ],
  },
  {
    id: "modifier-profil",
    question: "Comment modifier mon nom ou mon mot de passe ?",
    summary: "Mettre à jour son profil personnel.",
    keywords: [
      "profil", "nom", "mot de passe", "password", "modifier", "compte",
      "avatar", "photo", "personnel", "moi",
    ],
    steps: [
      { label: "Ouvrir Paramètres → Profil" },
      { label: "Modifier les champs souhaités" },
      { label: "Enregistrer" },
    ],
    route: "/settings/profil",
    routeLabel: "Ouvrir mon profil",
    sectionId: "parametres",
  },
  {
    id: "archives",
    question: "Comment retrouver une donnée archivée ?",
    summary: "Consulter et restaurer les éléments sortis de la vue courante.",
    keywords: [
      "archive", "archives", "restaurer", "retrouver", "supprime", "historique",
      "ancien", "passe", "recuperer",
    ],
    steps: [
      { label: "Ouvrir Archives" },
      { label: "Filtrer par type et par période" },
      { label: "Ouvrir l'élément pour le consulter" },
      { label: "Restaurer si nécessaire" },
    ],
    route: "/archives",
    routeLabel: "Ouvrir les archives",
    sectionId: "archives",
    pitfalls: [
      "Restaurer ne recrée pas les liens supprimés : vérifiez les rattachements après restauration.",
    ],
  },
];
