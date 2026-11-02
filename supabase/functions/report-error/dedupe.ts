/**
 * Helper PUR de déduplication de l'edge function `report-error`.
 *
 * POURQUOI CE FICHIER EXISTE
 *   La déduplication « serveur » s'appuyait UNIQUEMENT sur l'API de recherche
 *   GitHub (`/search/issues`) : une Issue créée n'y devient visible qu'après
 *   quelques secondes d'indexation. Deux rapports de MÊME signature reçus dans
 *   cette fenêtre (boucle de crash, rafale de rechargements) créaient donc
 *   DEUX Issues — mesuré : #307 ET #308 pour la même signature.
 *
 *   Le verrou réel est désormais une réservation ATOMIQUE en base
 *   (`claim_error_report`, migration 20261101000003) : la clé primaire
 *   `(dedupe_key, window_start)` rend deux créations concurrentes impossibles.
 *   La recherche GitHub reste un SECOND filet (issues pré-existantes, avant
 *   l'introduction de la table).
 *
 * Ce module n'importe RIEN (ni Deno, ni npm) : il est exécuté par l'edge
 * function Deno ET par les tests vitest côté dépôt.
 */

/** Préfixe des clés de déduplication (distingue du bucket de rate-limiting). */
export const DEDUPE_KEY_PREFIX = "sig";

/**
 * Forme canonique d'une signature de déduplication : `sig:<repo>:<signature>`.
 * Le dépôt est inclus car une même signature peut viser deux dépôts distincts
 * (l'allowlist en autorise plusieurs) — les signatures ne doivent pas
 * s'entre-dédupliquer.
 *
 * Retourne `null` si l'entrée est inexploitable (signature absente) : la
 * déduplication est alors impossible et la création reste fail-open.
 */
export function dedupeKey(
  repo: string,
  signature: string | undefined | null,
): string | null {
  const sig = (signature ?? "").trim();
  if (!sig) return null;
  return `${DEDUPE_KEY_PREFIX}:${repo}:${sig}`;
}
