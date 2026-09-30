# Pré-vol — Lumina E2E (session 2026-09-29)

Horodatage : 11:55 → 12:44 (50 min).

## Verdict

```
PLAYWRIGHT=OK MAGNITUDE=KO
```

## Détail des mesures

| Mesure | Valeur | Origine |
|---|---|---|
| `npx playwright test --config=e2e/playwright.config.ts e2e/specs/preflight/preflight.spec.ts` | **2 passed** (run 1 froid 5,5 s ; runs 2-3 chauds 2,9–3,9 s ; 0 `pageerror`) | Mesuré (e2e/specs/preflight/preflight.spec.ts, 12:38) |
| `npx magnitude tests/magnitude/auth-smoke.mag.ts` (1 appel payant) | **ÉCHEC — 401 Unauthorized** (clé Agnes invalide/rejetée par `apihub.agnes-ai.com`) | Mesuré (task `bfo8ob30q`, 12:41) |
| TTFB HTTP `/auth` (Vite) | **0,08 s** | Mesuré (e2e-min/measure-auth-load.ps1, run 1) |
| Temps de montage React **froid** (run 1 pré-vol) | **5,5 s** | Mesuré |
| Temps de montage React **chaud** (runs 2-3) | **2,9–3,9 s** | Mesuré |

## Cause du KO Magnitude

La clé `AGNES_API_KEY` est **présente** dans l'environnement utilisateur
Windows (vérifiée sans afficher sa valeur), mais le serveur
`https://apihub.agnes-ai.com/v1` renvoie **401 Unauthorized** :
« Invalid token ». C'est une **clé invalide, expirée ou révoquée** —
pas un problème de configuration côté test. Le test `auth-smoke` n'a
jamais pu être exécuté (0 token consommé).

## Constatations

- **Serveur de dev** : `http://localhost:8080` en écoute (Vite 8.2.2).
- **Aucune valeur de secret n'a été affichée, lue ni journalisée** dans
  cette session.
- **Mode backend** : `sans-backend` — `TEST_SUPABASE_URL` et
  `TEST_SUPABASE_ANON_KEY` absentes de l'environnement utilisateur
  Windows.
- **`auth-negative.mag.ts`** est **restauré** (présent dans
  `tests/magnitude/` — plus de `.disabled`).

## Écart à corriger (n° 1 des décisions requises)

La clé Agnes doit être **renouvelée ou remplacée** (voir
`e2e/REPORT_FINAL.md` § 5). En l'état, aucun appel payant Magnitude
ne peut aboutir avant cette décision.

## Fichiers créés / modifiés (session)

| Fichier | Statut | Rôle |
|---|---|---|
| `e2e/playwright.config.ts` | **modifié** | `webServer.env` avec 4 valeurs factices (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_POWERSYNC_URL, VITE_ONESIGNAL_APP_ID) conformément à l'interdit n° 4. `testDir: './specs'`. |
| `e2e/fixtures/guarded-page.ts` | **modifié** | Garde-fou réseau complet (abort + message explicite), `waitUntil: "commit"` + MutationObserver sur `#root`, jamais de sleep fixe. |
| `e2e/specs/preflight/preflight.spec.ts` | **modifié** | 3 runs Playwright (froid + 2 chauds), `#root` rempli, 0 `pageerror`. |
| `e2e/ENV_NAMES.md` | **modifié** | Ajout `CAPACITOR_BUILD` (ligne 10 de `vite.config.ts`). |
| `e2e-min/preflight-mag.ps1` | nouveau | Ligne de commande Magnitude isolé. |
| `e2e/PREFLIGHT.md` | **modifié** | Verdict mis à jour. |

## Reprise

Étape suivante : lot 1 — Finance (spéc déjà écrit, exécution bloquée
par le KO Magnitude tant que la clé n'est pas renouvelée). Les lots
Playwright (1-10) peuvent se lancer immédiatement ; seuls les
journeys Magnitude du lot 11 restent bloqués.
