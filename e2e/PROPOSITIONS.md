# PROPOSITIONS — Lumina E2E (session 2026-09-29)

Propositions d'amélioration des sélecteurs / du testable, pour des écrans
où les sélecteurs actuels (rôles/ARIA) sont fragiles ou absents. Rien
d'apporté ici ne touche `src/` (interdit) : ce sont des **suggestions de
`data-testid`** à implémenter par l'équipe app pour durcir la suite E2E.

## P-1 — `data-testid` sur les FAB de `/finance` (Finance.tsx)

Les deux boutons d'action flottants (« Nouvelle entrée » INCOME /
« Nouvelle dépense » EXPENSE, `src/pages/Finance.tsx:355-369`) n'ont qu'un
`aria-label`. En e2e, `getByRole('button', { name: 'Nouvelle entrée' })`
fonctionne mais est fragile (texte modifiable). Proposition :

```tsx
<button data-testid="finance-fab-income" aria-label="Nouvelle entrée" ...>
<button data-testid="finance-fab-expense" aria-label="Nouvelle dépense" ...>
```

Le test `e2e/specs/finance/finance.spec.ts` (§ P) passerait alors par
`page.getByTestId('finance-fab-income')`.

## P-2 — `data-testid` sur le bouton de suppression de `/sessions`

`src/pages/Sessions.tsx` : liste des comptes persistés avec bouton de
suppression par compte (aucun `aria-label` stable repéré). Proposition :
`data-testid="session-delete-${id}"` sur chaque bouton, et
`data-testid="session-list-empty"` sur l'état vide, pour que le test
`/sessions` (lot non exécuté) puisse distinguer « pas de session » de
« session X » sans texte.

## P-3 — Route `/` : `data-testid` sur la redirection

`src/App.tsx` (RouteGuard) redirige `/` → `/splash`. Aucun repère
visuel à assert ; proposer un `data-testid="root-redirect-marker"`
inutile ici — à la place, le test `/` doit simplement vérifier
`page.waitForURL('/splash')` (déjà fait, `e2e/specs/preflight/preflight.spec.ts`).

## P-4 — `aria-label` manquant sur `/balance` (Bilan)

`src/pages/Balance.tsx` : le titre visible est « Bilan financier » (h1),
mais le `TopHeader` affiche « Bilan ». En mode sans-backend le h1
n'apparaît pas (redirection /auth, BUG-1). Si l'appliance voulait
permettre un test R minimal sur `/balance` sans authentification,
proposer un `data-testid="balance-page-root"` sur le conteneur racine du
composant, testable indépendamment de l'auth.

## P-5 — `test.fail()` vs `test.skip()` pour les tests bloqués sans backend

Plusieurs tests de lot (V/E/N/F/A sur routes protégées) ne sont
**exécutables qu'en mode backend-test**. Actuellement marqués
`test.fail('BUG-1 ...')` (ex. `e2e/specs/finance/transaction-new.spec.ts`).
Si la base de test (`TEST_SUPABASE_URL` + compte authentifié) est
provisionnée, ces `test.fail()` deviennent des tests verts normaux —
**recommandation** : basculer `test.fail(...)` → `test.skip(condition,
raison)` avec `condition = !process.env.TEST_SUPABASE_URL`, pour que la
suite reste « green » en mode sans-backend (skip) et s'exécute en
mode backend-test (pas de skip), sans changer le code de test.

## P-6 — Garde-fou réseau + token factice

`e2e/fixtures/guarded-page.ts` sème déjà un token Supabase factice en
localStorage (`sb-hhgovvrnalibhgpakswi-auth-token`) via `addInitScript`,
mais le `RouteGuard` (`src/App.tsx:46`) refuse toujours, parce que
`supabase.auth.getSession()` valide le JWT côté client (pas juste la
présence en localStorage). Proposition d'app (à trancher avec BUG-1) :
ajouter un branchement `VITE_E2E_BYPASS_AUTH === 'true'` (DEV only) qui
court-circuite le RouteGuard sans backend. **Variable posée dans
`e2e/playwright.config.ts`** (`webServer.env`) mais **le branchement
correspondant dans `src/` n'existe pas encore** (interdit de modifier
`src/` cette session) — il reste à implémenter côté app, **uniquement**
quand `import.meta.env.DEV` est vrai, en fournissant une session
factice en mémoire (pas de persistance localStorage) et en forçant
`needsOnboarding() === false`.
