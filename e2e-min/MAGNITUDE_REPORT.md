# Rapport Magnitude — installation & passage du test de fumée minimal (Agnes 3.0 Flash)

## 1. Statut

**RÉUSSI** — le test de fumée `tests/magnitude/auth-smoke.mag.ts` passe avec le LLM
Agnes 3.0 Flash sur l'endpoint OpenAI-compatible fourni par l'utilisateur.

- **Appel payant consommé** : **1 / 3** autorisé (le 1er run avec config `llm` réussie).
- **Échecs non payants** : 2 (chargement de fichier + config `llm` au mauvais endroit,
  0 token LLM consommé).
- **Fenêtre d'exécution du test** : ~12 s (2 600 tokens in / 187 out).

## 2. Résultats de la phase A (mesures sans LLM, run 1)

| Mesure | Valeur |
|---|---|
| Serveur Vite démarre et répond sur 8080 | Vite v8.2.2 « ready in 65,4 s » (mesuré) |
| `/auth` HTTP 200 | **8,31 s** (mesuré, `curl.exe --max-time 90`) |
| `/dashboard` HTTP 200 | **6,02 s** (mesuré) |
| `page.goto("/auth", { waitUntil: "commit" })` | **3,16 s** (mesuré, Playwright) |
| `#root` rempli sur /auth | **14,1 s** après le goto (mesuré) |
| Total du test de diagnostic Playwright | **23,9 s** (< seuil de 30 s → phase A validée) |
| Requêtes sans réponse après 14 s | **15 pends** — 9 lazy-chunks `src/pages/*.tsx` +
  6 modules `.vite/deps` / `@powersync/web` / `worker.js` |

**Conclusion (mesurée, certitude haute)** : le blocage historique du test de fumée
Playwright vient de `waitUntil: "load"` qui restait en suspens à cause des
lazy-chunks React + modules PowerSync qui retiennent l'événement `load`. Avec
`waitUntil: "commit"` + `expect(page.locator("#root")).not.toBeEmpty({ timeout: 30000 })`,
le test passe en 24 s. C'est cette approche qu'adopte le test Magnitude (via le
`webServer` implicite de `magnitude.config.ts`).

## 3. Versions

| Élément | Valeur |
|---|---|
| Node | v22.20.0 |
| npm | 11.12.1 |
| `magnitude-test` | **0.3.13** (devDependency, installé `--legacy-peer-deps`) |
| `magnitude-core` | 0.3.1 (dépendance transitive) |
| LLM | **Agnes 3.0 Flash** (`agnes-3.0-flash`), provider `openai-generic`,
  endpoint `https://apihub.agnes-ai.com/v1` (fourni par l'utilisateur) |
| Navigateur | Playwright (dépendance de `magnitude-core`) — Chromium de Playwright
  (pas le Chrome système ; l'option `launchOptions` / `channel` n'a pas été mesurée
  dans cette version, **à vérifier** si le Chrome système est souhaité) |

## 4. Fichiers créés / modifiés

| Chemin | Statut | Rôle |
|---|---|---|
| `e2e-min/it10-server-start.sh` | nouveau (run 1) | Démarre `vite` en background sur 8080. |
| `e2e-min/logs/vite-stdout.log` | nouveau (run 1, log serveur) | Log du serveur Vite. |
| `e2e-min/diag-load.spec.ts` | nouveau (run 1) | Test de diagnostic sans LLM : `goto /auth`,
  `waitUntil: "commit"`, mesure de `#root`, liste des pends. |
| `e2e-min/LOOP_LOG.md` | nouveau | Journal de boucle (sans secret, les clés ne sont
  **jamais** écrites). |
| `e2e-min/run-magnitude.ps1` | nouveau (run 2) | Pose les variables `AGNES_API_KEY` /
  `AGNES_BASE_URL` / `AGNES_MODEL` dans l'env PowerShell, lance `npx magnitude`,
  les retire ensuite (par sécurité). **Le seul endroit où la clé API apparaît** —
  jamais dans un fichier de test ni de config. |
| `tests/magnitude/magnitude.config.ts` | **modifié** (run 1 : port 5173 → 8080 ;
  run 2 : ajout du client `llm` global) | Config Magnitude + client LLM Agnes. |
| `tests/magnitude/example.mag.ts` | créé par `npx magnitude init` (run 1),
  **supprimé** au run 2 | Exemple généré ; supprimé pour ne lancer que le test
  de fumée (le test fourni par le CLI ne passait pas sans clé Anthropic, et son
  objectif n'était pas aligné avec le périmètre). |
| `tests/magnitude/auth-smoke.mag.ts` | nouveau (run 1), corrigé au run 2 | Test de
  fumée : ouvre `/auth` (2 étapes), **sans option `llm`** (celle-ci n'est acceptée
  que sur la config globale en v0.3.13). |
| `package.json` | **modifié** (2 lignes ajoutées par `npm i`, 1 ligne ajoutée
  manuellement) | Ajout de `magnitude-test` en devDependency + script `e2e:mag`
  (`"e2e:mag": "magnitude"`). |
| `package-lock.json` | **modifié** (par `npm i --save-dev magnitude-test
  --legacy-peer-deps`) | 810 paquets ajoutés, 107 modifiés. C'est `package-lock.json`
  (pas `pnpm-lock.yaml`) qui est touché ; non corrigé conformément au README. |

### Diff de `package.json` (extrait pertinent)

```diff
     "e2e:smoke": "npx cypress run --spec cypress/e2e/simple-check.cy.ts",
     "e2e:full": "bash scripts/run-cypress.sh",
     "e2e:min": "playwright test --config=playwright.min.config.ts",
+    "e2e:mag": "magnitude",
     "debug": "bash scripts/logcat-debug.sh",
...
+    "magnitude-test": "^0.3.13",
...
```

## 5. Configuration LLM (fournisseur, modèle, variable de clé — sans valeur)

| Élément | Valeur |
|---|---|
| **Fournisseur LLM** | `openai-generic` (endpoint OpenAI-compatible) |
| **Modèle** | `agnes-3.0-flash` (fourni par l'utilisateur) |
| **Endpoint** | `https://apihub.agnes-ai.com/v1` (fourni par l'utilisateur) |
| **Variable de clé** | `AGNES_API_KEY` (posée par `e2e-min/run-magnitude.ps1`,
  jamais écrite dans un fichier de test ou de config) |
| **Variables d'env du test** | `AGNES_API_KEY`, `AGNES_BASE_URL` (repli :
  l'URL fournie), `AGNES_MODEL` (repli : `agnes-3.0-flash`) — les replis non
  sensibles (URL + nom de modèle) servent en cas d'env vide ; `apiKey` reste `''`
  si l'env n'est pas posé. |
| **Température** | 0,2 (défaut du runner Magnitude) |
| **Température effective** | 0,2 (pas de surcharge dans la config) |

## 6. Cause d'échec initiale (run 1, BLOQUÉ) et résolution

**Cause mesurée (run 1)** : `ANTHROPIC_API_KEY` absente de l'environnement global —
`magnitude-core` jette `"No LLM configured or available from environment"` et refuse
de démarrer. Aucune exécution payante n'avait lieu.

**Résolution (run 2)** : l'utilisateur a fourni une clé Agnes + un endpoint
OpenAI-compatible. La config `llm:` a été ajoutée dans
`tests/magnitude/magnitude.config.ts` avec `provider: 'openai-generic'`, et la
clé est injectée via `AGNES_API_KEY` dans `e2e-min/run-magnitude.ps1` (unique
endroit où la clé apparaît).

## 7. Ce qui est écarté / ce qui reste

- **Écarté** : le serveur Vite ne répond pas → **non** (mesuré : 8,3 s pour /auth).
- **Écarté** : la page /auth ne charge pas → **non** (mesuré : `#root` rempli en 14 s).
- **Écarté** : le test Magnitude est mal écrit → **non** (2 étapes, sous le
  plafond de 3).
- **Écarté** : l'installation de `magnitude-test` est cassée → **non** (`npm i`
  exit 0, paquets résolus).
- **Non mesuré** : si Magnitude pointe sur le **Chrome système** plutôt que le
  Chromium de Playwright — la version installée (0.3.13) n'expose pas de
  `channel: "chrome"` explicite dans les types publics ; `BrowserOptions`
  accepte `launchOptions?: LaunchOptions` (Playwright) mais **ce n'est pas
  documenté dans `magnitude-test`** ; **à vérifier** si le Chrome système est
  requis.
- **Non mesuré** : si le test est **stable** sur 3 runs (1 run vert suffit au
  livrable, mais la répétabilité n'a pas été validée).

## 8. Commande exacte pour relancer le test

```powershell
# 1) Vérifier que le serveur Vite est sur 8080 (sinon : e2e-min/it10-server-start.sh)
netstat -ano | findstr :8080

# 2) Lancer le test Magnitude avec le LLM Agnes (injecte la clé, nettoie après)
powershell -NoProfile -ExecutionPolicy Bypass -File e2e-min\run-magnitude.ps1
```
ou, si la clé `AGNES_API_KEY` est déjà dans l'environnement global :
```powershell
npx magnitude
```
ou via le script npm :
```powershell
npm run e2e:mag
```

### Remarques post-run
- **Le test ne se connecte JAMAIS** : il n'ouvre que `/auth` (page publique de
  connexion), aucun identifiant, aucune donnée réelle, aucun parcours métier.
- **La clé API est dans `e2e-min/run-magnitude.ps1` uniquement** — ne pas copier
  ce fichier dans un repository public. Pour un usage en CI, la clé doit être
  fournie par un secret de CI (ex. GitHub Actions `secrets.AGNES_API_KEY`) et
  posée dans `env.AGNES_API_KEY` du job.
- **Le rapport final de la boucle est dans `e2e-min/LOOP_LOG.md`** ; les détails
  du run 2 (itérations 1-6) y sont consignés.
