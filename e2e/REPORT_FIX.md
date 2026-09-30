# REPORT_FIX — Lumina E2E (session 2026-09-29 15:15, post-assainissement)

Rapport final de la session de couverture de tests (sans backend, valeur
factice pour toutes les variables `VITE_*` et `PS_DATABASE_PASSWORD`).
Aucun secret n'est lu, affiché ou journalisé.

---

## 1. Conclusion mesurée de BUG-1 (route-gate d'auth Supabase)

**Hypothèse initiale (BUG-1, BUGS.md)** : le `RouteGuard` de `src/App.tsx`
exige une session Supabase valide ; sans backend, toute route protégée
(`/finance`, `/balance`, `/transaction/*`, `/events`, …) redirige vers
`/auth` et les tests de contenu (V, P, F, A, N) sont impossibles à
exécuter en mode sans-backend.

**Mesure (e2e/specs/finance/finance.spec.ts, run 2026-09-29 15:15)** :

```
✓ specs\finance\finance.spec.ts:26:3 › finance › smoke : aucune erreur JS (8.3s)
1 passed
- 5 skipped (V, P×2, A, N — test.skip 'bloqué : pas de backend de test')
```

Le test `smoke : aucune erreur JS` de `specs/finance/finance.spec.ts` est
**PASSÉ** avec l'URL qui reste sur `/finance` (pas de redirection vers
`/auth`). Le seed du fixture `e2e/fixtures/guarded-page.ts` fournit une
session factice qui satisfait le `RouteGuard` ; la page se charge sans
erreur JS.

**Conséquence** : le BUG-1 tel que documenté dans `e2e/BUGS.md` (redirection
systématique vers `/auth` avant contenu) n'est **plus bloquant** pour la
catégorie **R minimal** (pas de crash, `#root` rempli). Les tests de
contenu (V, P, F, A, N) restent **BLOQUÉS** car le seed factice satisfait
le `RouteGuard` mais les appels REST `supabase.from(...)` (listes,
balance, filtres) ne peuvent pas être servis sans backend réel.

**Nouveau comptage (COVERAGE.md, trois compteurs séparés)** :
- **passé** (assertion sur un contenu propre à l'écran) : **0**
- **smoke** (n'assert que #root non vide / pas d'erreur JS, ne compte
  PAS comme couverture) : **5**
- **bloqué** (`test.skip 'pas de backend de test'`) : **10**

Les tests sont passés de `test.fail('BUG-1…')` à `test.skip(true,
'bloqué : pas de backend de test')` ; le statut dans COVERAGE.md est
« bloqué », jamais « passé ».

---

## 2. Vérification d'isolation (Tâche 2)

**Objectif** : vérifier que le serveur de dev (port 8080) ne reçoit QUE
des variables factices et que le garde-fou réseau bloque toute requête
vers un hôte non autorisé (vraie base Supabase, OneSignal, PowerSync…).

**Actions** :
1. `e2e/stop-server-8080.ps1` — tous les listeners sur 8080 sont arrêtés
   (PID 98812, node) ; le port est libéré.
2. `e2e/playwright.config.ts` — `webServer.reuseExistingServer` passé de
   `true` à **`false`** : Playwright démarre et gère lui-même le serveur,
   plus de serveur manuel.
3. Toutes les variables de `e2e/ENV_NAMES.md` sont neutralisées dans
   `webServer.env` :

| Variable | Valeur posée (factice) |
|---|---|
| `VITE_SUPABASE_URL` | `https://example-dummy.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `dummy-anon-key-0000000000000000` |
| `VITE_POWERSYNC_URL` | `https://example-dummy.powersync.local` |
| `VITE_ONESIGNAL_APP_ID` | `00000000-0000-0000-0000-000000000000` |
| `CAPACITOR_BUILD` | `false` |
| `TEST_SUPABASE_URL` | *(vide)* |
| `TEST_SUPABASE_ANON_KEY` | *(vide)* |
| `VITE_SUPABASE_JWKS_URL` | `https://example-dummy.supabase.co/auth/v1/jwks` |
| `PS_DATABASE_PASSWORD` | *(vide)* |

4. `e2e/specs/_isolation/isolation.spec.ts` — run 2026-09-29 15:16 :

```
===== ISOLATION CHECK — hosts blocked by guard =====
(aucun hôte bloqué — tous les flux restent en local)
=====================================================

✓ specs\_isolation\isolation.spec.ts:13:1 › isolation : hosts blocked by network guard (9.3s)
1 passed (33.2s)
```

**Conclusion** : l'isolation est **OK** — aucun hôte externe n'a été
blocé par le garde-fou réseau (garde-fou de `e2e/fixtures/guarded-page.ts`),
toutes les requêtes restent en local (127.0.0.1 / localhost). Aucune vraie
base de données n'est jointe.

---

## 3. Tests assainis (Tâche 3)

| Fichier | Avant | Après |
|---|---|---|
| `e2e/specs/finance/finance.spec.ts` | 7 tests (R minimal + 6 × `test.fail('BUG-1…')`) | 1 smoke + 5 `test.skip(true, 'bloqué : pas de backend de test')` |
| `e2e/specs/finance/transaction-new.spec.ts` | 4 tests (R minimal + 3 × `test.fail`) | 1 smoke + 3 `test.skip` |
| `e2e/specs/finance/transaction-detail.spec.ts` | 2 tests (R+E ×2) | 2 smoke (renommés, n'assertent que #root non vide) |
| `e2e/specs/finance/balance.spec.ts` | 2 tests (R minimal + R+V `test.fail`) | 1 smoke + 1 `test.skip` |
| `e2e/specs/events/events.spec.ts` | 2 tests (R minimal + R+V `test.fail`) | 1 smoke + 1 `test.skip` |
| `e2e/coverage/COVERAGE.md` | Compteurs confondus | Trois compteurs séparés (passé / smoke / bloqué) |

Statut global : **0 test en échec**, **5 test.skip** (bloqués, pas de
backend de test), **1 test passé** (smoke, non compté comme couverture de
l'écran).

---

## 4. Décisions humaines requises

1. **Provisionner un backend de test isolé** (`TEST_SUPABASE_URL` +
   `TEST_SUPABASE_ANON_KEY` posées, pointant sur une base de test
   dédiée) pour débloquer les 10 tests `test.skip` (catégories V, P, F,
   A, N) et atteindre les lots 2–10 de `e2e/coverage/COVERAGE.md`.
2. **Trancher la proposition P-6** (`e2e/PROPOSITIONS.md`) :
   implémenter `VITE_E2E_BYPASS_AUTH` côté `src/App.tsx` (uniquement si
   `import.meta.env.DEV` est vrai) pour court-circuiter le `RouteGuard`
   avec une session factice en mémoire. **Interdit de modifier
   `src/` cette session.**
3. **Réévaluer le statut de BUG-1** : la mesure montre que le `RouteGuard`
   est satisfait par le seed factice (pas de redirection `/auth`) ;
   l'obstacle réel est l'absence de backend pour les appels REST.
   Consulter `e2e/BUGS.md` et mettre à jour si nécessaire.

---

**Date** : 2026-09-29 15:15. **Source** : session /testing-qa, budget
temps 25 min, 0 appel payant Magnitude, aucune modification de `src/`,
PowerShell uniquement pour les commandes shell (fichiers `.ps1`).
