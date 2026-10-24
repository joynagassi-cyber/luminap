# Lumina (luminap) — mémoire projet

Front-first : Vite + React + TypeScript + Ionic, Supabase + PowerSync
directement côté navigateur (plus de `server/`, cf. AGENTS.md).
Docs de session : `docs/agent-session/` (FEATURES, DOMAINE, JOURNAL,
DECISIONS, RISQUES, PROPOSITIONS, RUNBOOK, RAPPORT_FINAL).

## Commandes vérifiées
- Unitaires : `npx vitest run` → 1104/1104 (67 fichiers).
- **Types : `npx tsc --noEmit` NE VÉRIFIE RIEN** (`tsconfig.json` racine a
  `"files": []`). Le contrôle réel (celui de la CI) est **`npx tsc -b`**.
  Erreur de type réelle (variable non définie) passée inaperçue avec
  `--noEmit`, détectée par `tsc -b`.
- E2E : serveur Vite **et** `Xvfb :99` requis ; lancer Cypress **détaché**
  (`setsid nohup … &`) sinon SIGSEGV `exit 139` avec log vide.
- E2E : binaire Cypress dans `/workspace/.cypress-cache` → toujours passer
  `CYPRESS_CACHE_FOLDER=/workspace/.cypress-cache` (sinon « Cypress
  executable not found »).
- E2E : `cypress run --spec` accepte une liste séparée par des virgules.
- Lint : `npx eslint .` doit rester à 0 erreur (les specs Cypress utilisent
  la syntaxe Chai → exception `no-unused-expressions` dans `eslint.config.js`).
- Audit : `pnpm audit --audit-level=critical` → 0 critique (`dompurify`
  surchargé via `pnpm-workspace.yaml`, **pas** `package.json` avec pnpm 11).

## Découvertes structurantes (2026-10-23)
- **La CI était rouge en permanence sur `main`** : job `unit` sans
  `.env.local` (→ `src/lib/auth.ts` lève à l'import), 9 faux positifs lint,
  1 vuln critique `dompurify`. Corrigé ; `CI Pipeline` = 6/6 jobs verts.
- **Le job E2E de `ci.yml` est illusoire** : 1 seul spec en
  `continue-on-error: true`, suite complète skippée sans secret
  `E2E_TEST_EMAIL`. `cypress.yml` et `android-debug.yml` sont rouges à chaque
  push (build Android : namespace manquant dans `@capacitor/storage`).
- **La RLS inter-tenant tient** (vérifié par appels REST avec un compte
  non-admin) : triggers `guard_profile_role_immutable` /
  `guard_profile_role_insert` / `trg_guard_profile_org`. Ne pas conclure à
  une escalade sans rejouer avec un compte **non-admin** (piège du faux
  positif : un admin légitime obtient 200).
- **Cypress 16 `testIsolation`** efface `localStorage` entre chaque `it()` →
  un spec qui se contente de `loginOrgAccount()` perd la session ; utiliser
  `cy.ensureAuth()`.
- `sessions.cy.ts` lit la réplique **locale** PowerSync : sans sync actif, il
  reste rouge même si la base contient les liens (défaut d'environnement).

## Pièges durables
- Pages Ionic restent montées et masquées → utiliser les helpers
  `activePage()` / `activePageShouldContain()` (`cypress/support/view.ts`),
  jamais un `cy.contains` global sur un élément de page.
- Ionic : cliquer l'hôte `ion-select`, l'option vit dans `ion-popover`.
- Cypress : construire les requêtes dans `cy.then()` (exécution synchrone).
- Pile z (App.css M15) : nav 40 < overlays 50 < float 60 < toasts 70.
- `Xvfb`/serveur Vite absents ⇒ Cypress `exit 139` muet (cause n° 1).

## Défauts produit (2026-10-23) — détail dans `.openhands/memory/2026-10-23.md`
- **R60 (corrigé)** : un `return` anticipé **avant** un hook (`useTransactions`)
  fait varier le nombre de hooks entre rendus → ErrorBoundary. Règle : aucun
  `return` conditionnel avant le dernier hook d'une fonction.
- **R58 (corrigé)** : `<Navigate>` en **enfant** d'un `<Route>` est ignoré par
  React Router → écran blanc. Utiliser `element={<Navigate …/>}`.
- **R59 (OUVERT, gravité haute)** : navigation vers une route **paramétrée**
  (`/groups/:id`, `/event/:id`) depuis une liste → page entrante en
  `ion-page-invisible` = **écran noir**, alors que l'accès direct rend bien.
  Méthode qui tranche : `cy.window()` + dump des `div.ion-page` avec
  `getComputedStyle(x).opacity`.
- Suite Cypress complète ≈ 39 min ; Vite + `Xvfb :99` obligatoires.

## Pièges de test (2026-10-24)
- **Assertions REST en Cypress : jeton RÉEL, jamais la clé anon** (les policies
  SELECT sont sur `authenticated` + `auth.uid()` ; en anon `auth.uid()` est NULL
  → 0 ligne). Helper `realToken()` (lit `sb-*-auth-token`).
- **Spec offline→online** : 3 prérequis indissociables — intercept avec
  `req.continue()` en ligne, intercept `OPTIONS` (préflight), et forcer
  `lumina-user` + `lumina-active-org` (sinon `getOrganizationId()` →
  `__no_org__` et l'upload échoue **en silence**).
- **Ionic** : `cy.typeIonicInput(ariaLabel, valeur)` (écrire sur l'`<input>`
  natif ne propage pas `ionChange`) ; attendre le bouton visible avant clic.
- **Sélecteurs** : titre de page = `<p>` de `TopHeader` (pas de `h1`) ; options
  Ionic dans `ion-popover`, visibles après clic sur le `ion-select`.
- **`tsc -b` (CI) ne couvre que `src/`** : `cypress/` a 13 erreurs de type
  invisibles (R84). Vérifier : `npx tsc -p cypress/tsconfig.json`.
- **`org_family`** : vue `security_invoker=true` → périmètre exact du compte ;
  ne pas conclure à une fuite sans comparer à `organizations` sous même jeton.
- **`members`** = adhérents (ids **texte**), distincts des UUID `profiles` :
  ne permet pas de résoudre le nom d'un profil (R80).

## Défauts produit majeurs (2026-10-24) — R87 corrigé, R89 diagnostiqué
- **R87 (corrigé, 1 ligne)** : `/finance` affichait TOUJOURS « Aucune
  transaction ». Cause : `ResourceService.toTableName()`
  (`src/capabilities/resource/index.ts`) n'avait pas `Transaction` dans son
  `tableMap` → repli `toLowerCase()` = `transaction` (singulier) ≠ table
  PowerSync `transactions`. Erreur SQL **avalée** par le `.catch()` de
  `Finance.tsx`. **Le mock de `resource.test.ts` renvoyait `[]` pour une table
  inconnue**, masquant le défaut : tester le **SQL émis**, pas seulement le
  résultat.
- **R89 (le plus grave, partiellement corrigé)** : la sync est rompue **dans
  les deux sens**. Détecté en croisant code ↔ base : serveur = 964 events,
  108 profils, **0 transaction**.
  - 89.a (non corrigé) : `23503` sur `transactions_category_id_fkey`. Le pack
    client (`src/packs/church/index.ts:53`) sème `cat-dime`/`cat-offrande`…, le
    serveur n'a que `cat-1…cat-9` → **chaque transaction est jetée**.
  - 89.b (non corrigé) : `PSYNC_S2305` « Too many parameter query results
    (limit of 1000) » — le filtre `org_id IN (SELECT org_id FROM profiles …)`
    des Sync Streams est plafonné à 1000 → **rien ne descend**.
  - 89.c (**corrigé**) : `logOpOutcome(…, true, …)` était appelé même quand
    toutes les ops étaient jetées (`FATAL-SKIP` = `continue`, sans `throw`), et
    `fatalSkipped` restait à 0 → **perte de données invisible**. Correctif :
    compteurs `pushedOps`/`skippedOps`, `__psFlushResult.{skipped,ok}`.
- **Outils de diagnostic décisifs** : `window.__psFlushCrudUpload()` (flush
  indépendant du worker WASM gelé en headless), `window.__psDb`,
  `window.__psSupabaseClient`, `window.__psFlushResult`. Vérifier l'arrivée
  réelle par `select count(*)` côté serveur (MCP Supabase `execute_sql`).
- **Piège Cypress** : `cy.loginOrgAccount()` navigue → toute capture `console`
  posée avant un `cy.visit` est perdue. Poser la capture APRÈS la dernière
  navigation.
- **Classe de défaut R88** : 23 `.catch(() => {})` dans `src/pages/` →
  « état vide silencieux » (l'utilisateur croit qu'il n'y a rien). Inventaire
  dans `docs/agent-session/RISQUES.md`.
- **Non-régression** : ne jamais conclure à une régression E2E sans comparer
  à `origin/main` **intact** dans un `git worktree add --detach` séparé.
