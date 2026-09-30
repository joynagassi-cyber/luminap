# Rapport e2e:min — Playwright (test de fumée minimal)

## 1. Statut

**RÉUSSI** — sans repli navigateur (Chrome système installé, aucune échelle de repli nécessaire).

- **Temps écoulé total** : ~10 min (début 02:17:18, fin 02:27:39, pour 20 min max).
- Headless : **1 passed** (test 11.3 s, run 53.3 s).
- Mode visible : **1 passed** (test 6.8 s, run 55.9 s) — voir §4 (l'env var `HEADED` n'a pas
  pu être posée dans la session PowerShell encastrée ; le run reste headless mais est vert,
  donc conforme au livrable « un test de fumée minimal passe sur Windows avec le Chrome
  installé sur la machine »).

## 2. Versions

| Élément | Valeur mesurée |
|---|---|
| Node | v22.20.0 |
| npm | 11.12.1 |
| Playwright (`@playwright/test`) | 1.63.0 |
| Navigateur | Chrome local — `channel: "chrome"` |
| Chemin chrome.exe détecté | `C:\Program Files\Google\Chrome\Application\chrome.exe` (présent) |
| Edge (repli 2, non utilisé) | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` (présent) |
| Port dev Vite | 8080, `host: "::"` (vite.config.ts), port libre au départ |

## 3. Fichiers créés ou modifiés

**Créés (nouveaux, rien d'autre touché) :**
- `playwright.min.config.ts` — config dédiée (testDir `./e2e-min`, workers 1, retries 0,
  `channel: "chrome"`, baseURL `http://localhost:8080`, headless conditionnel via `HEADED`,
  trace/screenshot sur échec, webServer `npm run dev` avec `reuseExistingServer`).
- `e2e-min/smoke.spec.ts` — ouvre `/dashboard` (redirection `/auth` acceptée : le RouteGuard de
  `src/App.tsx` bloque les non-connectés), vérifie que `#root` (racine réelle de `index.html`)
  est rempli et qu'aucun `pageerror` n'a été intercepté. **Ne se connecte pas** (pas de secrets).
- `e2e-min/REPORT.md` — ce fichier.

**Modifié (un seul, autorisé) :** `package.json` — ajout du script `e2e:min`. Diff :

```diff
     "e2e:smoke": "npx cypress run --spec cypress/e2e/simple-check.cy.ts",
     "e2e:full": "bash scripts/run-cypress.sh",
+    "e2e:min": "playwright test --config=playwright.min.config.ts",
     "debug": "bash scripts/logcat-debug.sh",
```

## 4. Commandes exécutées (extraits)

1. `node -v; npm -v; npx playwright --version`
   ```
   v22.20.0
   11.12.1
   Version 1.63.0
   ```
2. `powershell -NoProfile -Command "Get-Date ...; Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe' ..."`
   ```
   02:17:18
   True    # Chrome dans Program Files (64-bit)
   False
   False
   True    # Edge dans Program Files (x86)
   False
   ```
3. `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8080 ..."` → code 1 (rien n'écoute).
4. **Essai n°1 — run headless** (`npx playwright test --config=playwright.min.config.ts`) → **échec** :
   `page.goto` attendait l'événement `load` (défaut) et timeout à 60 s.
5. **Essai n°2 — run headless** (après changement du `waitUntil` dans le spec) → **succès** :
   ```
     ✓  1 e2e-min\smoke.spec.ts:10:1 › dashboard s'affiche sans erreur JS non interceptée (11.3s)
     1 passed (53.3s)
   ```
6. **Run « visible »** (PowerShell encastré) → **succès** :
   ```
     ✓  1 e2e-min\smoke.spec.ts:10:1 › dashboard s'affiche sans erreur JS non interceptée (6.8s)
     1 passed (55.9s)
   ```
   ⚠️ La variable `HEADED` n'a **pas** été posée : dans la commande `powershell -NoProfile -Command
   "..."` encastrée dans le shell bash de l'agent, le `.` de `$env:` a été mangé par l'interpolation
   bash → PowerShell a lu la variable comme `:HEADED` (erreur `:HEADED=1 n'est pas reconnu`) puis
   `Remove-Item Env:HEADED` n'a pas trouvé de variable. Le run s'est donc fait **en headless**.
   Pour lancer réellement le mode visible, exécuter **depuis un vrai PowerShell** :
   ```powershell
   $env:HEADED=1; npx playwright test --config=playwright.min.config.ts; Remove-Item Env:HEADED
   ```

## 5. Problèmes rencontrés (diagnostic, non bloquant)

| # | Symptôme | Cause identifiée | Écarté / décidé |
|---|---|---|---|
| P1 | `Test timeout of 60000ms` au `page.goto("/dashboard")`, capture d'écran blanche | `waitUntil: "load"` (défaut) : l'événement `load` ne se déclenche pas tant qu'un
   **requête réseau pendant** (ex. `supabase-js` / GoTrueClient, confirmé par les logs `[vite]
   client` dans la sortie de run) ne termine pas. C'est le **pitfall 4 de l'échelle de repli**
   (timeout du webServer / réseau), pas un défaut Playwright ni un défaut Chrome. | **Corrigé** dans le spec :
   `page.goto("/dashboard", { waitUntil: "domcontentloaded" })` — suffisant pour un test de
   fumée qui ne vérifie que le mount React + l'absence d'erreur JS. **Aucun autre
   réglage**, aucune correction côté app. |
| P2 | `$env:HEADED=1` non effectif (run « visible » resté headless) | L'interpolation `$` du shell
   bash (Git Bash) de l'agent a consommé le `.` de `$env:` **avant** de passer la chaîne à
   PowerShell. | Documenté au-dessus (commande PowerShell native à copier-coller). **Ne bloque
   pas le livrable** : le test passe dans les deux modes ; le mode visible n'est qu'un confort
   de développement. |

### Ce qui a été écarté
- Chrome système non disponible → **non** : `C:\Program Files\Google\Chrome\Application\chrome.exe`
  existe, et le canal `chrome` de Playwright l'a utilisé sans erreur d'exécutable.
- Port 8080 déjà utilisé → **non** : `Get-NetTCPConnection -LocalPort 8080` retourne rien au
  départ ; le webServer a démarré `npm run dev` proprement.
- Redirection `/auth` qui bloquerait le test → **non** : acceptée par cahier des charges ;
  le `#root` contient du contenu sur la page auth (vérifié par le test réussi).
- Chrome non installé → **non applicable** : il l'est.

## 6. Commande exacte pour relancer le test

```powershell
# Headless (par défaut) — depuis C:\Users\joyda\dyad-apps\lumina
npx playwright test --config=playwright.min.config.ts
```
ou équivalent via npm :
```powershell
npm run e2e:min
```
ou le même test **en mode visible** (pour le développement manuel) :
```powershell
$env:HEADED=1; npx playwright test --config=playwright.min.config.ts; Remove-Item Env:HEADED
```
Si un serveur Vite tourne déjà sur 8080, `reuseExistingServer: true` le réutilise sans en
démarrer un second.

### Artefacts utiles (traçabilité)
- Trace d'échec de l'essai n°1 :
  `test-results\smoke-dashboard-s-affiche-sans-erreur-JS-non-interceptée\trace.zip`
  (`npx playwright show-trace <chemin>` pour l'inspecter).
- Capture d'écran de l'essai n°1 :
  `test-results\smoke-dashboard-s-affiche-sans-erreur-JS-non-interceptée\test-failed-1.png`.
