# BUGS — Lumina E2E (session 2026-09-29)

Bugs de l'application (pas des tests) constatés durant la session de
couverture de tests. Aucun correctif n'est apporté à `src/` (interdit).

## BUG-1 — **RÉFUTÉ** (initialement diagnostiqué : guard d'auth strict bloque les routes protégées)

**Verdict** : le diagnostic initial était incorrect. La vraie cause est
deux-fold, tous deux côté **fixture** (pas de l'app) :

1. **Clé de stockage obsolète** : la fixture injectait la session sous
   `sb-hhgovvrnalibhgpakswi-auth-token` (durcie), alors que l'app dérive
   la clé de `VITE_SUPABASE_URL` (factice en e2e) :
   `sb-${new URL(baseUrl).hostname.split('.')[0]}-auth-token`
   (`node_modules/@supabase/supabase-js/dist/index.mjs:635`)
   → en e2e, la clé correcte est `sb-example-auth-token`. Le seed de la
   fixture était lu sous une clé que l'app ne consultait jamais.

2. **Session incomplète** : `@supabase/auth-js`
   (`GoTrueClient.js:4041`, `_isValidSession`) exige
   `'access_token' in s && 'refresh_token' in s && 'expires_at' in s`.
   La fixture seed ne fournissait pas `refresh_token` → session
   considérée invalide → `getSession()` renvoyait `null` →
   RouteGuard (`src/App.tsx:30-56`) redirigeait vers `/auth`.

**Correction apportée (côté fixture, `e2e/` uniquement)** :
- Clé dérivée de `VITE_SUPABASE_URL_e2e` (même source que le serveur
  Vite, sans duplication de valeur) —
  `e2e/fixtures/guarded-page.ts:88-90`.
- `refresh_token` ajouté au seed factice —
  `e2e/fixtures/guarded-page.ts:103`.
- Isolation renforcée : `reuseExistingServer: false`, toutes les
  variables de `e2e/ENV_NAMES.md` neutralisées dans `webServer.env`.

**Conséquence** : les routes protégées (`/finance`, `/events`,
`/balance`, `/transaction/new`, …) sont désormais accessibles en mode
sans-backend. Le seed de session factice suffit à tromper le
RouteGuard ; le fallback local de PowerSync
(`src/lib/dataLayer.ts:295-323`, source: "indexeddb") sert les
données de cache local quand le backend n'est pas prêt. Les appels
REST vers l'hôte factice échouent proprement — le garde-fou réseau
du fixture autorise l'hôte factice (`e2e/fixtures/guarded-page.ts:32-68`).

**Proposition initiale (`VITE_E2E_BYPASS_AUTH`)** : plus nécessaire —
le seed de session factice fait exactement ce que la variable aurait
fait, sans modifier `src/`.

**Date** : 2026-09-29. **Source** : session e2e Lumina (run 15:15 +
16:45), correction de la fixture, run 16:45 (12 passed / 1 failed).

## BUG-2 — `navigate(-1)` inopérant en mode sans-backend (limitation de conception test, pas de l'app)

**Écran concerné** : `/transaction/new` — test N (« Annuler » ramène
sur /finance).

**Symptôme** : après `goto('/transaction/new')` + clic « Retour »
(`navigate(-1)`, `src/pages/TransactionNew.tsx:196`), l'URL reste
`/transaction/new` et ne devient jamais `/finance`.

**Message d'erreur exact (run 16:45, 2026-09-29)** :
```
Expected pattern: /\/finance/
Received string:  "about:blank"
Timeout: 60000ms
```
(`test-results\finance-transaction-new-tr-8f969-nnuler-...` — Playwright
n'a jamais vu de navigation ; le page n'a pas rechargé, l'URL initiale
avant la SPA transition est `about:blank`.)

**Cause** : `playwright.page.goto('/transaction/new')` initialise
l'URL du context à `about:blank` puis navigue vers `/transaction/new`
(une seule entrée d'historique). `navigate(-1)` (Ionic Router,
côté client) ne trouve PAS d'entrée précédente vers `/finance` —
il y en a zéro. La navigation SPA ne produit aucun `load` event ;
l'URL ne change pas. C'est une **limitation de conception du test**
(le test `goto` directement `/transaction/new` sans passer par
`/finance` d'abord), pas un bug de l'app.

**Classification** : `bloqué-réel` (message d'erreur exact ci-dessus
comme preuve — jamais une supposition). Le test N de
`transaction-new.spec.ts` est conservé avec son `throw` explicite
(documentant le bloqué) — il échoue volontairement au run, c'est le
comportement attendu.

**Proposition (à trancher)** : réécrire le test N en naviguant
d'abord vers `/finance` (via BottomNav), PUIS vers
`/transaction/new`, puis cliquer « Retour » → `navigate(-1)` ramène
bien sur `/finance`. Ce test n'est PAS exécuté dans cette session
(limitation du budget) — il reste dans `bloqué-réel` jusqu'à ce
qu'un humain décide de réécrire le parcours.

**Date** : 2026-09-29. **Source** : run e2e 16:45,
`test-results/finance-transaction-new-tr-8f969-...`.

## BUG-2 — **RÉFUTÉ / reclassé note d'ergonomie** (test N réécrit → passé)

**Verdict** : le test N de `transaction-new.spec.ts` a été réécrit pour
suivre le vrai parcours utilisateur : `goto /finance` → clic sur FAB
« Nouvelle entrée » (Finance.tsx:351) → `/transaction/new?type=INCOME`
→ clic « Retour » (TransactionNew.tsx:196, `navigate(-1)`) →
`toHaveURL(/\/finance/)`. **Résultat du run 19:33** : 3 passed /
1 failed (le seul échec est le test E, pas le N — voir BUG-3).

Le blocage initial était un **artefact du test** (le `goto` direct
vers `/transaction/new` ne créait pas d'entrée d'historique vers
`/finance`). En suivant le parcours utilisateur réel, `navigate(-1)`
ramène bien sur `/finance` comme prévu. L'app n'a pas de bug de
navigation.

**Note d'ergonomie (gravité faible)** : un lien profond direct vers
`/transaction/new` (sans passer par `/finance`) rend « Retour »
no-op (l'URL reste `/transaction/new`). C'est le comportement normal
d'un `navigate(-1)` — mais si un utilisateur arrive sur
`/transaction/new` par un lien externe (ex. favoris, partage de
URL), « Retour » ne le ramène nulle part. **Proposition (non
implémentée, à trancher)** : utiliser `navigate(-1)` si l'historique
contient `/finance`, sinon `navigate('/finance')` (fallback explicite).
C'est un raffinement UX mineur — pas un bug bloquant.

**Date** : 2026-09-29. **Source** : run e2e 19:33,
`test-results/finance-transaction-new-...`.

## BUG-3 — Note d'ergonomie (test E — `fill` ne déclenche pas `onIonChange`), gravité faible

**Écran concerné** : `/transaction/new` — test E (« montant nul
refusé »).

**Symptôme** : `amountInput.fill('0')` puis
`pressSequentially('0', {delay:200})` (les deux méthodes Playwright)
ne déclenchent PAS `onIonChange` sur l'IonInput (Web Component Ionic).
Le `value={amount}` contrôlé (TransactionNew.tsx:238) réconcilie la
valeur, mais le hook `handleAmountChange` (TransactionNew.tsx:92-96)
n'est pas appelé, `fieldErrors.amount` reste vide, le
`<p id="tx-amount-error">` (TransactionNew.tsx:251-257) n'est jamais
monté. Le test échoue avec
`Expected: visible — Timeout: 10000ms — element(s) not found`.

**Cause** : IonInput est un Web Component avec sa propre gestion de
valeur. `fill()` et `pressSequentially()` de Playwright ne passent
pas par les événements clavier natifs que IonInput attend pour
déclencher `onIonChange`. C'est une **limitation d'ergonomie du
framework Ionic + Playwright** (pas un bug de l'app) — l'app valide
bien à la saisie quand l'utilisateur tape (le code est correct,
TransactionNew.tsx:84-90, 239-241).

**Message d'erreur exact (run 19:43, 2026-09-29)** :
```
Locator: getByText('Le montant doit être supérieur à 0')
Expected: visible
Timeout: 10000ms
Error: element(s) not found
```

**Classification** : `échec-test` (la méthode de test est inadéquate
pour les Web Components Ionic) + `note d'ergonomie` (aucun moyen
simple en Playwright de tester la validation d'un IonInput en
mode sans-backend sans modifier `src/`). Le test E reste en échec
dans la matrice COVERAGE.md (catégorie `échec-test`) — à trancher
par un humain : soit modifier le test pour simuler une vraie frappe
(`keyboard.type`), soit ignorer le test E jusqu'à ce qu'un moyen
soit trouvé.

**Date** : 2026-09-29. **Source** : run e2e 19:43,
`test-results/finance-transaction-new-transaction-new-E-montant-nul-refusé`.
