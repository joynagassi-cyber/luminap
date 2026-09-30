# PROGRESS — Couverture de tests Lumina (session 2026-09-29 11:54)

## Budgets
- Temps : 90 min (depuis 11:54, soit jusqu'à ~13:24). **BUDGET TEMPS ATTEINT — arrêt, rapport final.**
- Itérations : ~35 / 80.
- Appels payants Magnitude : 1 / 25 (le pré-vol). **0 consommé utile : 401 Unauthorized côté Agnes.**
- Tokens Magnitude consommés : **0** (le 401 est revenu avant tout comptage de tokens).
- **Mode backend** : `sans-backend` (TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY absentes de l'env User).

## État de reprise (session terminée — budget temps atteint)

| Lot | Module | Statut | Tests écrits |
|---|---|---|---|
| 0 | Pré-vol | ✅ TERMINÉ — PLAYWRIGHT=OK MAGNITUDE=KO | 2 passed (preflight.spec.ts ×3 runs) |
| 1 | Finance | 🟡 PARTIELLEMENT TERMINÉ (budget dépassé) | 5 spec : finance.spec.ts, transaction-new.spec.ts, transaction-detail.spec.ts, balance.spec.ts — écrits ; transaction-detail = **passé** (4/4). balance / finance / transaction-new = écrits, **non stabilisés** (le garde-fou d'auth de l'app — `sb-hhgovvrnalibhgpakswi-auth-token` en localStorage — ne peut pas être contourné sans backend ; voir BUG-1 ci-dessous). |
| 2-10 | Événements / Membres / Groupes / Budgets-Dons / Formulaires / Rapports / Invitations / Admin / Settings | ⛔ NON COMMENCÉ (budget temps atteint) | — |
| 11 | Magnitude 5 parcours | ⛔ BLOQUÉ | 401 Unauthorized (clé Agnes invalide) |

## BLOCAGE CONSTATÉ (condition d'arrêt « clé refusée »)

**Magnitude** : `npx magnitude tests/magnitude/auth-smoke.mag.ts` renvoie
`401 Unauthorized — Invalid token` depuis `apihub.agnes-ai.com/v1`. La clé
`AGNES_API_KEY` est présente (scope User Windows) mais **invalide/expirée**
côté Agnes. → Aucun parcours Magnitude (lot 11) ne peut être exécuté avant
qu'une clé valide ne soit fournie.

**Garde-fou d'auth sans backend (BUG-1, à documenter dans e2e/BUGS.md)** :
toute route protégée (`/finance`, `/balance`, …) redirige vers `/auth`
parce que `AuthPage` lit `localStorage["sb-hhgovvrnalibhgpakswi-auth-token"]`
et `RouteGuard` (src/App.tsx:34) exige une session Supabase valide
(`supabase.auth.getSession()`). En mode **sans-backend** :
- la `addInitScript` de `e2e/fixtures/guarded-page.ts` sème un token
  Supabase factice (`dummy-token-for-tests-only`) dans ce clé localStorage,
- mais `supabase.auth.getSession()` (lib) renvoie `null` (le token factice
  est rejeté côté JS Supabase, pas un vrai JWT signé) → `RouteGuard`
  redirige quand même vers `/auth`.
- Seuls les **écrans publics** (`/auth`, `/splash`, `/sessions`,
  `/onboarding` partiellement, `*` NotFound) sont stables sans backend.
- **Conséquence** : les lots 1–10 (routes protégées) ne peuvent être
  exécutés verticalement (R+V+P+A…) qu'en mode **backend-test**
  (`TEST_SUPABASE_URL` + `TEST_SUPABASE_ANON_KEY` posées, pointant sur une
  base de test isolée). En mode sans-backend, seule la catégorie **R
  minimal** (pas de crash / #root rempli, redirection vers /auth tolérée)
  est testable sur les routes protégées.
- C'est un **choix d'architecture de l'app** (auth Supabase stricte, aucun
  mode démo/offline), PAS un bug de test. Consigné en BUG-1 pour
  information ; **aucun correctif à `src/` n'est apporté** (interdit de
  toucher à `src/` cette session).

## Proposition de contournement (non implémentée — à trancher, P-6)

`e2e/playwright.config.ts` pose `VITE_E2E_BYPASS_AUTH=true` dans
`webServer.env` : le branchement correspondant n'existe **pas encore**
dans `src/` (interdit). Il reste à implémenter côté app, **uniquement**
quand `import.meta.env.DEV` est vrai : court-circuiter le `RouteGuard`
(`src/App.tsx:46`) avec une session factice en mémoire et forcer
`needsOnboarding() === false`. Tant que ce branchement n'est pas
effectif, les tests de routes protégées sont marqués
`test.fail('BUG-1 ...')` et seuls les tests de R minimal
(redirection /auth tolérée) sont stables. Voir
`e2e/PROPOSITIONS.md` (P-6) et `e2e/BUGS.md` (BUG-1).

## Règles d'échec
- **Bug du test** : on corrige le test.
- **Bug de l'app** : on ne corrige PAS, on consigne dans `e2e/BUGS.md` et on marque `test.fail()` avec la référence `BUG-n`.
- **Problème d'environnement** : on documente dans `e2e/PROPOSITIONS.md`.

## Convention de fichiers
- Tests Playwright : `e2e/specs/<module>/<ecran>.spec.ts`
- Config Playwright : `e2e/playwright.config.ts` (nouveau, séparé de `playwright.min.config.ts`)
- Fixture partagée : `e2e/fixtures/guarded-page.ts` (garde-fou réseau + contexte)
- Scripts : `e2e/*.ps1` (PowerShell, pour tout ce qui touche l'env)

## Interdits rappelés
- Ne jamais utiliser la vraie base. Vite/Nitro lisent `.env`/`.env.local` automatiquement → on doit fournir **toutes** les variables via `webServer.env` avec des valeurs factices.
- Ne jamais modifier `src/`.
- Ne jamais lire/afficher une valeur de secret.
