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

## Session 3 (2026-10-23) — défauts produit & méthode
- **R60 (corrigé)** : un `return` anticipé du cache **avant** un `useQuery`
  dans `useTransactions()` faisait varier le nombre de hooks entre rendus →
  ErrorBoundary « Impossible d'afficher cette page » sur
  `/transaction/:id/edit`. Règle : aucun `return` conditionnel avant le
  dernier hook d'une fonction.
- **R58 (corrigé)** : un `<Navigate>` placé en **enfant** d'un `<Route>`
  est ignoré par React Router → `path="/"` matche sans rien rendre (écran
  blanc, PWA sans barre d'adresse). Utiliser `element={<Navigate …/>}`.
- **R59 (OUVERT, gravité haute)** : navigation vers une route **paramétrée**
  (`/groups/:id`, `/event/:id`) depuis une liste → la page entrante reste
  `ion-page-invisible` (`opacity: 0`) = **écran noir permanent**, alors que
  l'**accès direct** à la même URL rend correctement (`opacity: 1`).
  Éliminés par expérience : identité `<IonPage>`, `<div>` du `LazyRoute`,
  squelette de chargement, préchargement du chunk. Piste : transition
  `ion-router-outlet` (`ionNavDidChange`). ~5 sondes Cypress pour le
  démontrer — `cy.window()` + dump des `div.ion-page` avec
  `getComputedStyle(x).opacity` est la méthode qui tranche.
- **Suite Cypress complète** : ~39 min pour 27 specs / 70 tests. Le
  serveur Vite **doit tourner** et `Xvfb :99` doit être actif.
- **Sauvegardes** : plan gratuit Supabase ⇒ pas de sauvegarde classique ni
  de PITR. Alternative = `supabase db dump` (schéma + `--data-only`) vers
  `/workspace/backups/`.

## Pièges de test (mesurés 2026-10-24)
- **Assertions REST dans un spec Cypress : utiliser le JETON RÉEL, jamais
  la clé anon.** Les policies SELECT sont sur le rôle `authenticated` avec
  `auth.uid()` ; en anon, `auth.uid()` est NULL → **0 ligne**, donc toute
  assertion « au moins N lignes » échoue à tort. Helper `realToken()`
  (lit `sb-*-auth-token` dans localStorage), présent dans
  `rls-isolation-hardened.cy.ts`, `org-reports.cy.ts`, `performance-batch.cy.ts`.
- **Spec offline→online : 3 prérequis indissociables** (motif de
  `cloud-sync.cy.ts`, qui passe) : (1) handler d'intercept avec
  `req.continue()` en mode online, sinon Cypress mange la requête et le
  client reçoit une réponse CORS invalide ; (2) intercept `OPTIONS` pour le
  préflight ; (3) forcer `lumina-user` + `lumina-active-org` (sinon
  `getOrganizationId()` → `__no_org__` et la file d'upload PowerSync échoue
  en silence). `performance-batch.cy.ts` n'a aucun des trois (R83).
- **Ionic : remplir un champ = `cy.typeIonicInput(ariaLabel, valeur)`** puis
  attendre le bouton visible avant de cliquer (le state React arrive après
  le premier render). Écrire sur l'`<input>` natif ne propage pas
  `ionChange`.
- **Sélecteurs d'UI réels** : le titre de page vient de `TopHeader` (un
  `<p>`, pas un `<h1/h2/h3>`) ; les fonctions d'agrégation du ReportBuilder
  sont des `IonSelectOption` (le select de fonction est le **dernier**
  `ion-select` de la page) ; les options Ionic vivent dans `ion-popover` et
  ne sont visibles qu'après clic sur le `ion-select`.
- **`tsc -b` (CI) ne vérifie que `src/`** : `cypress/` porte 13 erreurs de
  type invisibles (R84, P34). Pour vérifier : `npx tsc -p cypress/tsconfig.json`.
- **`org_family`** est une vue `security_invoker=true` (respecte la RLS) :
  elle expose exactement le périmètre du compte. Ne pas conclure à une fuite
  à partir du nombre d'organisations exposées — comparer au périmètre de
  `organizations` sous le même jeton.
- **`members`** est une entité métier (adhérents) avec des ids **texte**
  distincts des UUID de `profiles` : elle ne permet PAS de résoudre le nom
  d'un profil (R80).


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
