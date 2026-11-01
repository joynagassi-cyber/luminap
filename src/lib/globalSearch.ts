/**
 * PR11 — Recherche globale (cœur PUR, sans React ni I/O).
 *
 * Objectif : retrouver n'importe quel enregistrement (membre, groupe, événement,
 * mouvement, document, formulaire) depuis un seul endroit, à partir des
 * collections DÉJÀ lues par le data layer (aucun index serveur, aucune nouvelle
 * table : l'index est construit en mémoire sur la réplique locale).
 *
 * Ce module est volontairement PUR (aucun hook, aucun accès réseau) pour être
 * testable de façon déterministe :
 *   - `normalizeText` : minuscules + repli des accents (é→e, ç→c…) + espaces
 *     réduits → « ecole » trouve « École » ;
 *   - `scoreMatch` / `searchRecords` : classement exact > préfixe > sous-chaîne,
 *     départage par récence (`date`), résultat BORNÉ et stable ;
 *   - `toSearchRecords` : adapte les collections du data layer en enregistrements
 *     cherchables porteurs d'un lien profond (`route`) vers la fiche.
 *
 * Aucune dépendance UI : la page `Search` et le hook `useGlobalSearch` s'appuient
 * uniquement sur ces fonctions.
 */

/** Catégories d'enregistrements couvertes par la recherche globale. */
export type SearchKind =
  | "member"
  | "group"
  | "event"
  | "transaction"
  | "document"
  | "form";

/** Libellés français affichés par catégorie (badge de résultat). */
export const SEARCH_KIND_LABELS: Readonly<Record<SearchKind, string>> = {
  member: "Membre",
  group: "Groupe",
  event: "Événement",
  transaction: "Mouvement",
  document: "Document",
  form: "Formulaire",
};

/** Nombre maximal de résultats renvoyés par défaut (borne dure). */
export const DEFAULT_SEARCH_LIMIT = 20;

/** Un enregistrement cherchable : tout ce qu'il faut pour afficher et router. */
export interface SearchRecord {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  /** Date ISO utilisée pour le départage par récence (facultatif). */
  date?: string | null;
  /** Lien profond vers la fiche de l'enregistrement. */
  route: string;
}

/** Résultat classé : l'enregistrement + son score de pertinence. */
export interface SearchResult extends SearchRecord {
  score: number;
}

/** Options de recherche (borne injectable pour les tests). */
export interface SearchOptions {
  limit?: number;
}

// Poids de correspondance : exact > préfixe > sous-chaîne.
const MATCH_NONE = 0;
const MATCH_SUBSTRING = 1;
const MATCH_PREFIX = 2;
const MATCH_EXACT = 3;

// Le titre pèse plus lourd que le sous-titre : un titre correspondant domine
// toujours une correspondance de sous-titre (score max de sous-titre = 3,
// score min de titre = 10).
const TITLE_WEIGHT = 10;

/**
 * Normalise un texte pour la comparaison : repli des accents (NFD + suppression
 * des diacritiques), minuscules, espaces réduits. `null`/`undefined` → "".
 */
export function normalizeText(input: string | null | undefined): string {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score d'un champ face à une requête DÉJÀ normalisée.
 * Renvoie 0 (aucune correspondance), 1 (sous-chaîne), 2 (préfixe) ou 3 (exact).
 */
export function scoreMatch(
  normalizedQuery: string,
  text: string | null | undefined,
): number {
  const normalized = normalizeText(text);
  if (!normalizedQuery || !normalized) return MATCH_NONE;
  if (normalized === normalizedQuery) return MATCH_EXACT;
  if (normalized.startsWith(normalizedQuery)) return MATCH_PREFIX;
  if (normalized.includes(normalizedQuery)) return MATCH_SUBSTRING;
  return MATCH_NONE;
}

/** Score global d'un enregistrement (titre pondéré + sous-titre). */
function recordScore(normalizedQuery: string, record: SearchRecord): number {
  const title = scoreMatch(normalizedQuery, record.title) * TITLE_WEIGHT;
  const subtitle = scoreMatch(normalizedQuery, record.subtitle);
  return title + subtitle;
}

/** Timestamp de récence (date illisible → 0, donc classée en dernier). */
function recency(record: SearchRecord): number {
  if (!record.date) return 0;
  const t = Date.parse(record.date);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Ordre déterministe : score décroissant, puis récence décroissante, puis
 * titre puis id croissants (départage stable, jamais dépendant de l'ordre
 * d'entrée).
 */
function compareResults(a: SearchResult, b: SearchResult): number {
  if (b.score !== a.score) return b.score - a.score;
  const ra = recency(a);
  const rb = recency(b);
  if (rb !== ra) return rb - ra;
  const byTitle = a.title.localeCompare(b.title, "fr");
  if (byTitle !== 0) return byTitle;
  return a.id.localeCompare(b.id);
}

/**
 * Recherche classée et BORNÉE. Une requête vide (ou blanche) ne renvoie rien :
 * c'est un état neutre, jamais un verdict.
 */
export function searchRecords(
  query: string,
  records: readonly SearchRecord[],
  options: SearchOptions = {},
): SearchResult[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const limit = options.limit ?? DEFAULT_SEARCH_LIMIT;
  const scored: SearchResult[] = [];
  for (const record of records) {
    const score = recordScore(normalizedQuery, record);
    if (score > MATCH_NONE) scored.push({ ...record, score });
  }
  scored.sort(compareResults);
  return scored.slice(0, Math.max(0, limit));
}

// ============================================================
// Adaptation data layer → enregistrements cherchables
// ============================================================

/**
 * Formes structurelles minimales acceptées. Les lignes PowerSync sont en
 * `snake_case` ; le repli local (IndexedDB) est en `camelCase` — les deux sont
 * tolérés pour que la recherche fonctionne dans tous les modes du data layer.
 * Les lignes sont typées `unknown` (les interfaces PS n'ont pas de signature
 * d'index) et relues champ par champ via `str()`.
 */
export interface SearchCollections {
  members?: readonly unknown[];
  groups?: readonly unknown[];
  events?: readonly unknown[];
  transactions?: readonly unknown[];
  documents?: readonly unknown[];
  forms?: readonly unknown[];
}

/** Relit une ligne de collection comme un objet de champs accessibles. */
function asRow(row: unknown): Record<string, unknown> {
  return (row ?? {}) as Record<string, unknown>;
}

/** Premier champ texte non vide parmi les candidats. */
function str(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return "";
}

function idOf(row: Record<string, unknown>): string {
  return str(row.id);
}

/** Ajoute l'enregistrement si son identifiant est exploitable. */
function push(
  out: SearchRecord[],
  record: SearchRecord | null,
): void {
  if (record && record.id) out.push(record);
}

/**
 * Construit la liste d'enregistrements cherchables à partir des collections
 * lues par le data layer. Chaque enregistrement porte son lien profond.
 */
export function toSearchRecords(collections: SearchCollections): SearchRecord[] {
  const out: SearchRecord[] = [];

  for (const raw of collections.members ?? []) {
    const row = asRow(raw);
    const firstName = str(row.first_name, row.firstName);
    const lastName = str(row.last_name, row.lastName);
    const title = `${firstName} ${lastName}`.trim();
    push(out, {
      kind: "member",
      id: idOf(row),
      title: title || "Membre",
      subtitle: str(row.email, row.phone),
      date: str(row.joined_at, row.joinedAt, row.created_at, row.createdAt) || null,
      route: `/membre/${idOf(row)}`,
    });
  }

  for (const raw of collections.groups ?? []) {
    const row = asRow(raw);
    push(out, {
      kind: "group",
      id: idOf(row),
      title: str(row.name) || "Groupe",
      subtitle: "Groupe",
      date: str(row.created_at, row.createdAt) || null,
      route: `/groups/${idOf(row)}`,
    });
  }

  for (const raw of collections.events ?? []) {
    const row = asRow(raw);
    push(out, {
      kind: "event",
      id: idOf(row),
      title: str(row.name) || "Événement",
      subtitle: str(row.description),
      date: str(row.start_date, row.startDate, row.created_at, row.createdAt) || null,
      route: `/event/${idOf(row)}`,
    });
  }

  for (const raw of collections.transactions ?? []) {
    const row = asRow(raw);
    const type = str(row.type);
    const isIncome = type === "INCOME" || type === "ENTREE";
    push(out, {
      kind: "transaction",
      id: idOf(row),
      title: str(row.description, row.person_name, row.personName) || "Mouvement",
      subtitle: isIncome ? "Entrée" : "Sortie",
      date: str(row.date, row.created_at, row.createdAt) || null,
      route: `/transaction/${idOf(row)}`,
    });
  }

  for (const raw of collections.documents ?? []) {
    const row = asRow(raw);
    push(out, {
      kind: "document",
      id: idOf(row),
      title: str(row.title) || "Document",
      subtitle: str(row.purpose),
      date: str(row.created_at, row.createdAt) || null,
      route: "/archives",
    });
  }

  for (const raw of collections.forms ?? []) {
    const row = asRow(raw);
    push(out, {
      kind: "form",
      id: idOf(row),
      title: str(row.name) || "Formulaire",
      subtitle: str(row.description, "Formulaire"),
      date: str(row.created_at, row.createdAt, row.updated_at, row.updatedAt) || null,
      route: `/forms/${idOf(row)}/submissions`,
    });
  }

  return out;
}
