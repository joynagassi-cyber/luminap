/**
 * Cypress — neutralise la remontée d'erreurs vers le dépôt PUBLIC.
 *
 * DÉFENSE EN PROFONDEUR (audit 2026-11-01). La chaîne « erreur client →
 * edge function `report-error` → GitHub Issue label `openhands` » crée de
 * VRAIES Issues sur le dépôt public `joynagassi-cyber/luminap`. Une exécution
 * Cypress de la CI (serveur `vite dev` sur `localhost:8080`) a ainsi généré
 * ~58 Issues de bruit « Tâche longue détectée ».
 *
 * Deux gardes existent déjà :
 *   1. CLIENT — `isTransmissionAllowed()` exige un build de production ET un
 *      `MODE` non-développement (un `vite dev` en CI, où `NODE_ENV=production`
 *      hérité rend `import.meta.env.PROD === true`, est désormais refusé) ;
 *   2. SERVEUR — l'edge function refuse tout rapport `environment` non-production.
 *
 * Cette interception est la 3e couche : même si une garde amont régressait,
 * aucun test ne peut atteindre l'endpoint depuis la CI. Le POST est stubbé
 * localement (réponse `{ ok: true }`) — le comportement applicatif reste
 * identique (le transport lit `data.ok`), mais rien ne quitte le navigateur.
 */
beforeEach(() => {
  cy.intercept(
    { method: 'POST', url: '**/functions/v1/report-error**' },
    { statusCode: 200, body: { ok: true, skipped: 'cypress-no-error-reporting' } },
  ).as('reportErrorBlocked');
});
