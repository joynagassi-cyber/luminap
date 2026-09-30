import { test } from 'magnitude-test';

// Magnitude auth smoke test
// Test visuel minimal : ouvre /auth (page publique de connexion) et vérifie
// qu'un champ de type email ou identifiant est visible. 2 étapes.
// NE SE CONNECTE PAS — pas de secret, pas de donnée réelle.
// Le LLM Agnes est configuré globalement dans magnitude.config.ts.

test('auth page shows an identifier field', { url: '/auth' }, async (agent) => {
  await agent.act('wait for the login form to be visible');
  await agent.check('an email or username input field is visible');
});
