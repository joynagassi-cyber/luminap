# Journal de boucle — Magnitude (Lumina)

Budgets durs : 40 min, 25 itérations, 3 appels payants `npx magnitude`, 3 tentatives
par problème. Le 1er budget « 40 min » a été consommé par le run initial ; le user a
puis donné une instruction complémentaire (basculer sur Agnes 3.0) qui a déclenché
un nouveau cycle avec son propre comptage.

---

## Run 1 (2026-09-29 09:33 → 09:45, ~12 min) — BLOQUÉ

- **It. 0** 09:33:07 — `Get-Date` pour horodater.
- **It. 1** 09:35:54 — Fin phase A (mesures curl + Playwright diagnostic).
- **It. 2** 09:36 — `npm i --save-dev magnitude-test` (échec 1 : peer conflict Capacitor)
  → relance avec `--legacy-peer-deps` (échec 2 non requis, exit 0, ~6 min).
- **It. 3** 09:45 — `npx magnitude init` (exit 0, génère example.mag.ts + magnitude.config.ts).
- **It. 4** — Inspection du code compilé : variable attendue = `ANTHROPIC_API_KEY`
  (absente de l'env global). `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` présents
  (proxy interne, non compatible au format attendu par magnitude-core).
- **Décision 1** : **BLOQUÉ** — clé LLM absente, condition d'arrêt du README.
- **Livrable** : `e2e-min/MAGNITUDE_REPORT.md` (version BLOQUÉ).
- **Coût payant consommé** : 0 / 3 (aucun appel LLM n'a été lancé — le moteur
  refusait de démarrer sans clé).

## Run 2 (2026-09-29, après instruction user) — RÉUSSI

Le user a fourni une clé API Agnes + un endpoint OpenAI-compatible
(`https://apihub.agnes-ai.com/v1`, modèle `agnes-3.0-flash`). Nouveau cycle :

- **It. 1** — Mesure du code : le type `MagnitudeConfig` expose `llm` ; le runner de
  `magnitude-test@0.3.13` n'accepte `llm` que sur la **config globale** (pas sur un
  test individuel) — vérifié dans `node_modules/magnitude-test/dist/cli.mjs:248`
  (`llm: this.config.llm`). Hypothèse mesurée : `example.mag.ts` généré par le CLI
  ne passera pas sans clé Anthropic car le runner lit uniquement `config.llm`.
- **It. 2** — Suppression de `tests/magnitude/example.mag.ts` (fichier **nouveau**,
  créé par `npx magnitude init` dans le run 1 → dans le périmètre autorisation de
  nouveaux fichiers, pas un « fichier existant » du projet). Changement : ne lancer
  que le test de fumée.
- **It. 3** — Échec 1 (non payant) : `magnitude` échoue avec `No LLM configured...`
  car `example.mag.ts` (toujours présent à ce moment) ne passait pas. 0 appel LLM
  consommé.
- **It. 4** — Échec 2 (non payant) : après avoir supprimé `example.mag.ts`, le test
  `auth-smoke.mag.ts` avec `llm:` dans l'option du test échoue encore avec
  `No LLM configured...`. Cause mesurée : le type `TestOptions` de magnitude-test
  **n'inclut pas** `llm` (seulement `url` et `prompt` — vérifié
  `dist/index.d.mts:152`). La seule entrée `llm` acceptée est `config.llm`.
  0 appel LLM consommé.
- **It. 5** — Changement 3 (dernier) :
  1. `tests/magnitude/magnitude.config.ts` : ajout de
     `llm: { provider: 'openai-generic', options: { baseUrl, apiKey, model, temperature: 0.2 } }`
     (valeurs lues de `process.env.AGNES_BASE_URL`, `process.env.AGNES_API_KEY`,
     `process.env.AGNES_MODEL` — les variables étant posées par
     `e2e-min/run-magnitude.ps1`). Le `?? 'https://apihub.agnes-ai.com/v1'` et
     `?? 'agnes-3.0-flash'` servent de valeurs de repli **non sensibles** (URL et
     nom de modèle publics) en cas d'env vide ; `apiKey` reste `''` si l'env n'est
     pas posé.
  2. `tests/magnitude/auth-smoke.mag.ts` : retirée l'option `llm:` (supportée
     uniquement dans la config), le test reste `{ url: '/auth' }`.
  3. `e2e-min/run-magnitude.ps1` : réécrit pour poser les 3 variables `AGNES_*`
     dans l'environnement PowerShell, lancer `npx magnitude`, puis les supprimer
     en fin de script (par mesure de sécurité post-run). La clé n'est écrite dans
     **aucun** fichier de test ni de config.
- **It. 6** — **Exécution payante 1/3** : `npx magnitude` avec Agnes 3.0 Flash →
  **RÉUSSI** en ~12 s, `exit code 0`, `1 passed`, 2 600 tokens in / 187 out.
- **Coût payant consommé** : **1 / 3**.
- **Budget itérations restant** : ~20 sur 25 (run 2).
- **Statut final** : **RÉUSSI** (voir §1 de `e2e-min/MAGNITUDE_REPORT.md`).

## Conditions d'arrêt vérifiées

- Serveur de dev sur 8080 : **OK** (mesuré HTTP 200 en 8,3 s pour /auth).
- Clé API Agnes : **OK** (fournie par l'utilisateur, injectée en env par le `.ps1`).
- Test `auth-smoke.mag.ts` : **OK** (2 étapes, ≤ 3).
- Nombre d'appels payants : 1 (≤ 3).
- Aucune correction du code de l'app.
- Aucune commande git qui écrit.
- Aucune suppression de fichier existant du projet (seuls les fichiers **créés par
  magnitude init** dans le run 1 ont été touchés : `example.mag.ts`).

## Prochaines itérations (réservées si le test devient instable)

- It. 7 (prévue, **non lancée** si test stable) : relancer 2 fois pour valider la
  répétabilité, dans la limite de 2 appels payants restants.
- It. 8 (prévue) : vérifier que `magnitude` peut pointer sur le **Chrome système**
  plutôt que le **Chromium de Playwright** (option `launchOptions` dans la config,
  ou `channel: "chrome"` si supporté par la version installée — à mesurer, non supposé).
