/**
 * Politique d'environnement de la remontée d'erreurs — logique PURE, partagée
 * par l'edge function `report-error` (Deno) et les tests vitest du dépôt.
 *
 * POURQUOI CE FICHIER EXISTE
 *   Le client refuse déjà de transmettre hors production (`isTransmissionAllowed`
 *   → `import.meta.env.PROD`). Mais cette garde est INCONTOURNABLE : un client
 *   périmé (ancien bundle, APK non mis à jour, serveur de dev lancé par la CI
 *   Cypress `pnpm run dev`) continue d'appeler l'endpoint public. Mesuré
 *   (2026-11-01) : la CI Cypress (PR #200) a créé ~58 Issues « Tâche longue
 *   détectée (NNN ms) » depuis `environment: development`, polluant le dépôt
 *   public et déclenchant autant de tentatives de correction autonome OpenHands.
 *
 *   La garde doit donc exister AUSSI côté serveur, à l'unique point de passage
 *   autoritaire. Un rapport étiqueté comme non-production n'ouvre jamais
 *   d'Issue.
 *
 * FAIL-OPEN VOLONTAIRE : un rapport dont l'environnement est absent ou vide est
 * ACCEPTÉ (clients plus anciens, environnements non navigateur). On ne bloque
 * que les étiquettes explicitement non-production.
 */

/** Étiquettes d'environnement considérées comme non-production. */
export const NON_PRODUCTION_ENVIRONMENTS: ReadonlySet<string> = new Set([
  "development",
  "dev",
  "local",
  "localhost",
  "test",
  "testing",
  "ci",
  "preview",
]);

/**
 * Un rapport provient-il d'un environnement NON-production ?
 * Retourne `false` (accepté) si l'étiquette est absente ou vide.
 */
export function isNonProductionReport(report: {
  environment?: string | null;
}): boolean {
  const env = (report.environment ?? "").trim().toLowerCase();
  if (!env) return false;
  return NON_PRODUCTION_ENVIRONMENTS.has(env);
}
