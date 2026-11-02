/**
 * Versionnage du schéma de synchronisation — R106.
 *
 * Défaut visé : `resolveRoute()` sait produire `update-required` (contrôle
 * `clientSchemaVersion < minSchemaVersion`) et `App.tsx` rend bien
 * `UpdateRequiredScreen`. Mais AUCUNE source ne fournissait jamais ces deux
 * valeurs → la branche de garde était du CODE MORT (même classe que R105/R107 :
 * filet déclaré, jamais alimenté). Un APK ancien dont le schéma PowerSync est
 * incompatible ne recevait donc aucun message « mettez à jour ».
 *
 * Politique : FAIL-OPEN. Tant que la version minimale n'est pas fournie
 * explicitement (env `VITE_MIN_SCHEMA_VERSION`), aucune contrainte n'est
 * appliquée — le comportement reste identique à avant. Un client n'est averti
 * que lorsqu'une version minimale est réellement déclarée.
 */

/**
 * Version du schéma local que CETTE version de l'app comprend.
 *
 * À incrémenter quand la forme des données locales change de façon
 * incompatible (nouvelle table obligatoire, colonne renommée, etc.).
 */
export const CLIENT_SCHEMA_VERSION = 2;

/**
 * Parse une version minimale. Retourne `undefined` si la valeur est absente,
 * vide ou invalide — un `minSchemaVersion` inconnu ne doit JAMAIS bloquer
 * l'app (fail-open).
 */
export function parseMinSchemaVersion(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "string" && raw.trim() === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

/**
 * Version minimale exigée par la configuration. Source actuelle : la variable
 * d'environnement `VITE_MIN_SCHEMA_VERSION` (servie par la config de build).
 * Retourne `undefined` si non définie → aucune contrainte.
 */
export function resolveMinSchemaVersion(): number | undefined {
  try {
    return parseMinSchemaVersion(import.meta.env.VITE_MIN_SCHEMA_VERSION);
  } catch {
    return undefined;
  }
}

/**
 * Décide si une mise à jour est requise. Fonction PURE, donc testable sans
 * navigateur ni réseau. Fail-open : sans version minimale, jamais de blocage.
 */
export function isUpdateRequired(
  clientVersion: number = CLIENT_SCHEMA_VERSION,
  minVersion: number | undefined = resolveMinSchemaVersion(),
): boolean {
  return minVersion !== undefined && clientVersion < minVersion;
}
