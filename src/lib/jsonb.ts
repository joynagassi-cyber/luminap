/**
 * Normalisation des colonnes `jsonb` PostgreSQL stockées en `text` côté
 * PowerSync (schéma local SQLite).
 *
 * Le client sérialise la valeur avant de la mettre dans l'outbox. Envoyée
 * telle quelle, la chaîne `"[]"` devient un jsonb de type **string**
 * (`"\"[]\""`) et non un tableau : c'est le « double encodage ». Mesuré en
 * base : `events.budget_items` 158 lignes string contre 147 tableaux,
 * `invitations.grants_payload` 8 string contre 2 tableaux. À la relecture,
 * `JSON.parse` renvoie une chaîne et le premier `.map()` de l'UI lève
 * (`form.fields.map is not a function`), ce qui fait tomber l'écran.
 *
 * Les deux helpers ci-dessous tolèrent les deux formes, pour les écritures
 * futures comme pour les lignes historiques déjà corrompues.
 */

/** Colonnes `jsonb` (nom PG → nom local PowerSync identique) à convertir à l'upload. */
export const JSONB_COLUMNS: Record<string, string[]> = {
  events: ["budget_items"],
  form_definitions: ["fields"],
  form_submissions: ["data"],
  invitations: ["grants_payload", "tags_payload"],
  org_reports: ["content"],
  report_definitions: ["filters"],
  custom_field_definitions: ["options"],
  audit_entries: ["before_state", "after_state"],
};

/**
 * Convertit une valeur texte destinée à une colonne `jsonb` en valeur
 * structurée. Idempotent : une valeur déjà tableau/objet est inchangée.
 * Une chaîne non-JSON (valeur scalaire légitime, ex. « Bonjour ») est
 * conservée telle quelle — la convertir en `[]` perdrait la donnée.
 */
export function coerceJsonbValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed === null || typeof parsed !== "object" ? value : parsed;
  } catch {
    return value;
  }
}

/** Applique `coerceJsonbValue` à chaque colonne jsonb d'une ligne d'outbox. */
export function coerceJsonbColumns(
  table: string,
  opData: Record<string, unknown>,
): Record<string, unknown> {
  const columns = JSONB_COLUMNS[table];
  if (!columns) return opData;
  let changed = false;
  const out: Record<string, unknown> = { ...opData };
  for (const col of columns) {
    if (!(col in out)) continue;
    const coerced = coerceJsonbValue(out[col]);
    if (coerced !== out[col]) {
      out[col] = coerced;
      changed = true;
    }
  }
  return changed ? out : opData;
}

/**
 * Décode une valeur lue depuis le stockage local, en tolérant le double
 * encodage historique (jusqu'à 2 niveaux de `JSON.parse`). `fallback` est
 * renvoyé si la valeur est absente ou d'un type inattendu — une donnée
 * illisible ne doit jamais faire planter l'écran.
 */
export function parseJsonbValue<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined || raw === "") return fallback;
  let value: unknown = raw;
  for (let i = 0; i < 3 && typeof value === "string"; i++) {
    try {
      value = JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  if (value === null || value === undefined) return fallback;
  if (fallback === null) return value as T;
  if (typeof value !== typeof fallback) return fallback;
  // `typeof` ne distingue pas un tableau d'un objet : un objet rendu là où
  // un tableau est attendu ferait lever le `.map()` appelant — c'est
  // exactement le plantage qu'on cherche à éviter.
  if (Array.isArray(fallback) !== Array.isArray(value)) return fallback;
  return value as T;
}
