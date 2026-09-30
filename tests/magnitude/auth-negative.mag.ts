import { test } from 'magnitude-test';

// CONSOLE NEGATIVE CONTROL — Magnitude
// Objectif : vérifier que le modèle ne passe pas n'importe quoi. Ce test
// attend une chose FAUSSE et évidente sur /auth (un bandeau vert «
// Paiement réussi » n'existe pas sur cette page). Le test DOIT échouer.
// S'il passe, le LLM est en train de valider n'importe quoi et le
// test de fumée (auth-smoke.mag.ts) n'est pas fiable.
//
// Le LLM Agnes est configuré globalement dans magnitude.config.ts.

test('negative: a green "Paiement réussi" banner on /auth', { url: '/auth' }, async (agent) => {
  await agent.act('navigate to /auth');
  await agent.check('a green banner saying "Paiement réussi" is visible on the page');
});
