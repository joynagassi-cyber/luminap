/**
 * Labo Design — garde de compilation (dev uniquement).
 *
 * Le panneau Labo et ses IDs de seed NE DOIVENT JAMAIS apparaître dans le
 * bundle de production. Ce module fournit deux garde-fous :
 *
 * 1. `isLaboEnabled()` — retourne `true` UNIQUEMENT en mode développement
 *    (`import.meta.env.DEV`). En production, tout le code du Labo est court-
 *    circuité et exclu du bundle par l'arbre de dépendances (tree-shaking)
 *    quand les appelants gardent `if (isLaboEnabled()) { … }` autour de leurs
 *    imports dynamiques.
 *
 * 2. `assertLaboAbsentFromBuild()` — test d'intégration à appeler dans le CI
 *    pour échouer si "Labo" ou des IDs de seed fuient dans le build.
 */

export const LABO_SEED_IDS = [
  "labo-seed-org-neuve",
  "labo-seed-org-normale",
  "labo-seed-5000-tx",
  "labo-seed-noms-longs",
  "labo-seed-montant-geant",
] as const;

/**
 * Le Labo est actif uniquement en développement. En production (`build`),
 * cette fonction retourne toujours `false`.
 */
export function isLaboEnabled(): boolean {
  return typeof import.meta !== "undefined" && Boolean(import.meta.env.DEV);
}

/**
 * Vérifie qu'aucune référence au Labo ou aux IDs de seed n'est présente dans
 * le contenu fourni (ex. le HTML du bundle ou les assets statiques).
 * Retourne `true` si tout est propre, `false` si une fuite est détectée.
 */
export function assertLaboAbsentFromBuild(content: string): boolean {
  const patterns = [/labo/i, ...LABO_SEED_IDS.map((id) => new RegExp(id, "i"))];
  const leaks = patterns.filter((p) => p.test(content));
  return leaks.length === 0;
}
