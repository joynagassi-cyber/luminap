# Mémoire projet — Lumina

## Environnement d'agent (contraintes lourdes, vérifiées)
- **Cypress ne tourne PAS en local** : binaire non installable (pas d'écran X,
  téléchargement bloqué). Toute validation E2E passe par la **CI**.
- **Accès DB possible** : Docker **est** installé (`sudo dockerd &` +
  `chmod 666 /var/run/docker.sock`) ; la chaîne Postgres passe par le **pooler**
  `aws-0-eu-west-2.pooler.supabase.com:5432` (l'hôte direct `db.<ref>…` **ne
  résout pas** dans le conteneur). Le MCP Supabase (`execute_sql`) reste la voie
  SQL la plus simple.
- **`PS_ADMIN_TOKEN` disponible** dans le coffre local `~/.ps-secrets` →
  `powersync deploy sync-config` **fonctionne** (E1 close le 2026-10-27).
- **`npx tsc --noEmit` à la racine ne vérifie RIEN** (tsconfig `"files": []`,
  sort toujours 0). Utiliser **`npx tsc -b`**.

## PowerSync (instance prod 6a9dd96302481fb31b945823)
- **Déployable depuis ce conteneur** : jeton admin dans `~/.ps-secrets`
  (`PS_ADMIN_TOKEN`, `PS_DATABASE_PASSWORD`) — **coffre local, jamais commité**.
  `powersync validate` puis `powersync deploy sync-config`.
- **Syntaxe sync-config** : PowerSync refuse les listes littérales
  `IN ('a','b')` → utiliser `OR` chaîné, ou `IN (sous-requête)`.
- **PIÈGE MAJEUR (R89.b)** : un stream qui filtre par **JOIN** sur la table
  parente crée **1 bucket par ligne enfant** → 1 requête de paramètre par ligne →
  `PSYNC_S2305 Too many parameter query results (limit of 1000)` dès que le
  nombre de lignes **enfant** dépasse 1000 (pas de rapport avec `profiles`).
  Correctif officiel : **dénormaliser `org_id`** sur la table enfant et clé la
  partition directement dessus (1 bucket / org).
- La CLI `powersync` **réécrit `service.yaml`** (`secret_ref` →
  `secret: !env …`) pendant les tests : vérifier `git status` et revertre si
  c'est incident.
- Client : `src/lib/powersync/schema.ts` doit porter **exactement** les colonnes
  serveur (mapping par nom).

## Base Supabase (hhgovvrnalibhgpakswi)
- **Instance de DÉVELOPPEMENT**, pas la production : `transactions = 0`,
  `documents = 0`, `versements = 0`. Écritures autorisées.
- 108 profils (87 `@lumina.dev`, 11 `@example.com`, 9 `@gmail.com`),
  47 `__no_org__`, 70 members, 42 invitations, 9 organisations (5 ACTIVE).
- `organizations.status` ∈ {ACTIVE, INACTIVE, ARCHIVED} ; archivage =
  `status='ARCHIVED'` + `archived_at/by` + `archive_reason` (≠ DELETE).
- **RLS sans politique = deny-all** : les advisors `rls_enabled_no_policy` sur
  `keep_alive` / `_jsonb_backfill_20261024` sont des **faux positifs** (R97).
- `organizations` : seule FK = `parent_org_id (ON DELETE SET NULL)` ; pas de FK
  depuis `profiles` / `org_memberships` / `org_admins` → suppression d'org =
  orphelins. **Archiver, ne pas supprimer.**
- `can_manage_invitations` = PASTEUR_PRINCIPAL / ANCIEN / TREASURIER (pas ADMIN).
- **FK `auth.users` (piège, R111)** : `profiles.id → auth.users(id)` ET
  `org_memberships.user_id → auth.users(id)`, **NON deferrable**. Tout profil
  doit donc porter un id de compte Auth réel. Or `claimInvitation`
  (`src/capabilities/invitation/index.ts`) crée un profil PENDING à
  `crypto.randomUUID()` → upload et règlement échouent en `23503` (parcours
  « rejoindre une org » inopérant, E4). Le flux légitime (compte Auth réel)
  fonctionne : claim CONFIRMED, profil+membership ACTIVE, sync filtrée OK.

## Pièges CI (constats mesurés)
- **La suite Cypress n'a JAMAIS été verte sur `main`** (20 runs en échec,
  2026-10-19 → 10-24). Mêmes 10 specs en échec, déterministe.
  **Ce n'est PAS la parallélisation** (réfuté par mesure en mono-conteneur,
  run `40080015253`). Cause = environnement E2E (PowerSync/contexte d'org) :
  cf. R53/R83/R72/R54. Ne pas se fier au rouge Cypress comme signal.
  **Nuance mesurée (2026-10-27)** : le job « E2E (Cypress) » de `ci.yml` peut
  passer sur une branche de correctif (constaté sur PR #52) — le rouge global
  dépend donc aussi du contenu testé.
- **Android Debug Build = échec pré-existant** (R90) : `@capacitor/cli` ^8.5.2
  vs `@capacitor/android` ^6.2.2. Non régression.
- CI Pipeline (`ci.yml`) et `tsc` sont, eux, fiables.
- Le spec `org-reports.cy.ts` **créait des organisations réelles sans nettoyage**
  (R96, corrigé : hook `after()` non fatal + repli par préfixe).

## Sauvegarde / restauration (procédure VÉRIFIÉE, 2026-10-24)
- `supabase db dump` **exige un daemon Docker** : s'il est arrêté, erreur
  `DockerRunError` (le socket disparaît). Le relancer : `sudo dockerd &` puis
  `sudo chmod 666 /var/run/docker.sock` (l'utilisateur n'a pas le socket).
  Docker **est** installé (`/usr/bin/docker`) — l'affirmation inverse est fausse.
- **Restaurer** un dump : exige l'**image Supabase**
  (`public.ecr.aws/supabase/postgres:17.6.1.166`, contient `pg_cron`) et le rôle
  **`supabase_admin`** sur la base **`postgres`**. Avec l'image vanilla ou
  `postgres`/`public` : **786 erreurs, 0 table** (`public` appartient à
  `supabase_admin` ; `pg_cron` n'existe que dans `postgres`).
- Créer le rôle `powersync_role` **avant** de rejouer le dump des données.
- Le dump `--data-only` couvre 29 tables (dont `auth.users`) ; les schémas
  `auth`/`storage` ne sont pas recréés (7 erreurs attendues, sans perte métier).
- Fidélité de contrôle : comparer les `count(*)` source/restauré (10/10 OK).
- Sauvegardes réelles : `/workspace/backups/` **hors dépôt** (données réelles,
  ne jamais commiter). `backup.yml` publie **uniquement** si chiffré.

## Boucle autonome « lumina-autonomous-hardening » (2026-10-26)
- Contrat 18 phases ; état dans `docs/agent/` (ex-`docs/agent-session`, renommé).
  `docs/agent/00-RECONCILIATION.md` mappe phase↔état réel. Ordre : 0 → 2 → 3 → 4…
- **Gates bloquants locaux** : `npx tsc -b --noEmit`, `pnpm exec vitest run`,
  `pnpm run lint`, `pnpm run build`. Cypress = **non bloquant** (env E2E indispo).
- **Parallélisation CI Cypress RÉFUTÉE comme cause du rouge** (run mono-conteneur
  = mêmes 10 specs). Cause réelle = environnement E2E (PowerSync/contexte org).
- Convention boucle : 1 PR par phase, tag `lumina-phase-NN-<nom>-20261026`,
  receipt `docs/agent/receipts/phase-NN/`, merge après gates verts (R90 Android
  rouge pré-existant toléré).
- Phases livrées : 0 (état), 2 (routage P0), 3 (anti-cycle org), 4 (RBAC
  `has_permission`).
- **DB dev** : migrations appliquées via MCP `apply_migration` (DDL) ; preuves en
  `BEGIN … ROLLBACK` (aucune donnée modifiée). `org_memberships.user_id` a une FK
  → `auth.users` (impossible d'insérer un user bidon pour tester).

## Conventions du dépôt
- Dépôt **PUBLIC** → ne jamais committer de secret ni d'artefact non chiffré.
- Docs de session dans `docs/agent-session/` (FEATURES, DOMAINE, JOURNAL,
  DECISIONS, RISQUES, PROPOSITIONS, RUNBOOK, RAPPORT_FINAL).
- Branche dédiée + PR, **jamais** de push forcé ni de réécriture d'historique.

## Boucle « lumina-autonomous-hardening » (contrat 18 phases)
- **Magasin d'état = `docs/agent/`** (ex-`docs/agent-session`, `git mv` fait le
  2026-10-26). Contient PROGRESS, ESCALATIONS, PREMORTEM, COVERAGE_MATRIX,
  PROPOSALS, `00-RECONCILIATION.md`, `deeplinks.matrix.json`,
  `permissions.matrix.json`, `receipts/`.
- **Contrat complet** = 1er message user de la conversation
  `6fe837fd3ccd441d81585a5f28d2847b` ; plan dérivé = `.agents_tmp/PLAN.md`
  (NON versionné — ne pas committer).
- **Réconciliation** : phases 3→9 déjà partiellement traitées par les sessions
  antérieures ; **seule la Phase 2 (routage/écrans noirs/deep links) manquait**.
- **Phase 2 livrée** : `src/lib/routeResolver.ts` = résolveur unique
  `resolveRoute(url, état)` → ensemble fini ; registre de 63 routes en données ;
  `isAllowedReturnTo` (anti redirection ouverte) ; `parseDeepLink` (web +
  `lumina://`). Écrans d'état dans `src/components/RouteStates.tsx`
  (`data-screen-state`). `src/lib/clientErrors.ts` (capture onerror/
  unhandledrejection, redaction PII, rechargement contrôlé chunk).
- **Gates fiables** : `npx tsc -b --noEmit`, `pnpm run lint`, `pnpm exec vitest run`,
  `pnpm run build`, + workflow **`CI Pipeline`**. `Android Debug Build` échoue
  toujours (R90, pré-existant) ; Cypress sur `main` rouge déterministe (R98/E2).
- **PRs** : #21 (état/réconciliation), #22 (routage Phase 2, empilée).

## Sécurité base (constats vérifiés)
- **Aucune fonction `RETURNS trigger` ni `settle_invitation_claim` ne doit être
  `EXECUTE`-able par `anon`/`authenticated`** : elles sont `SECURITY DEFINER` et
  à effet de bord (R103). Si un wrapper `SECURITY INVOKER` les appelle, le
  repasser en `SECURITY DEFINER` après le revoke.
- Les advisors `*_security_definer_function_executable` sur les helpers RLS
  (`is_org_member`, `has_permission`, `can_manage_invitations`, …) sont
  **attendus** : ils prennent l'uid en paramètre et sont appelés dans les
  policies — ne pas les révoquer.
- Tout export CSV doit passer par `src/lib/csv.ts` (injection de formule OWASP).
- `auth_leaked_password_protection` exige un plan **Pro** (non activable via API
  sur le plan courant) → R104.

## RBAC / gardes de route (constats mesurés, 2026-10-26)
- `resolveRoute()` (src/lib/routeResolver.ts) implémente 4 issues : render,
  redirect, **forbidden** (permission de route manquante), **update-required**
  (clientSchemaVersion < minSchemaVersion), **needs-membership** (isOrgMember
  false). Mais `App.tsx` ne passe QUE `{ isAuthenticated }` → forbidden,
  update-required et needs-membership sont **inertes** (R105/R106/R107). Les
  écrans existent (`RouteStates.tsx`) mais aucune branche ne les déclenche.
- `PERMISSION_MATRIX` (src/lib/rbac.ts) **n'inclut PAS** les rôles `ADMIN` ni
  `CENTRAL_ADMIN` (pourtant présents en base : 1 profil `ADMIN`). `admin:settings`
  n'est détenu QUE par PASTEUR_PRINCIPAL → câbler la garde fermerait `/admin`
  aux admins. Réconcilier avant (PR18/R16).
- `role_permissions` est une **vraie table DB** (migration
  `20261026000002_rbac_has_permission.sql`) ; toute évolution de la matrice TS
  doit être répercutée dans l'INSERT SQL **et** en base (le test
  `permissions.test.ts` vérifie l'égalité TS↔SQL).
- `can_manage_invitations` (SQL, prod) = PASTEUR_PRINCIPAL / ANCIEN /
  TREASURIER. Les permissions `invitation:create/manage/revoke` (exigées par
  ROUTE_REGISTRY) n'étaient détenues par **aucun** rôle canon → R105, corrigé.
- Helper utile : `getRolesWithPermission(permission)` (src/lib/rbac.ts).

## Piège git (constaté)
- Le remote `origin` contenait un token obsolète `ghu_…` → `git push` demande un
  mot de passe et **bloque**. Correctif : `git remote set-url origin
  "https://x-access-token:${GITHUB_TOKEN}@github.com/<owner>/<repo>.git"`.
- `gh` CLI n'est **pas authentifié** dans l'env ; utiliser `GH_TOKEN="$GITHUB_TOKEN" gh …`
  ou les outils MCP. Un PR créé par l'outil MCP arrive en **draft** → `gh pr ready`
  avant `gh pr merge`.

## Classe de défaut récurrente : « filet déclaré, jamais déclenché »
Cinq occurrences trouvées (R105/R106/R107/R108/R113) : une garde/écran est écrit
et documenté comme actif, mais son déclencheur n'est jamais alimenté.
- **R105** : `invitation:*` exigées par ROUTE_REGISTRY, détenues par aucun rôle.
  **Garde DÉJÀ en place** : `src/lib/__tests__/permissions.test.ts`
  (`describe("cohérence ROUTE_REGISTRY ↔ PERMISSION_MATRIX")`, ajouté PR #33) —
  vérifie que toute `route.permission` est détenue par ≥1 rôle. **Ne pas
  recréer** (j'ai ouvert puis fermé PR #70 pour ce doublon). Le test
  `route-registry-drift.test.ts` ne couvre QUE routes↔registre, pas les
  permissions : c'est ce qui m'avait induit en erreur.
- **R106/R107** : `resolveRoute` reçoit seulement `{isAuthenticated}`.
  **R106 CORRIGÉ** (phase 11, 2026-10-27) : `clientSchemaVersion`/
  `minSchemaVersion` alimentés via `src/lib/schemaVersion.ts` (fail-open tant que
  `VITE_MIN_SCHEMA_VERSION` n'est pas positionnée). **R107 reste bloqué** par la
  décision R109/R16 (modèle de rôles ADMIN).
- **R108** : `AppReadyBridge` posait `readyRef=true` AVANT d'armer le minuteur →
  `if(!readyRef.current)` toujours faux ; `BootRecoveryScreen` inatteignable. Un
  watchdog DANS l'arbre React ne peut pas détecter l'absence de montage.
  Corrigé : `src/lib/bootWatchdog.ts` armé avant `createRoot` dans `main.tsx`,
  surcouche HTML statique (`renderBootRecoveryOverlay`, `data-screen-state=error`).
- **R113** (P0) : hooks React après un `return` précoce (RouteGuard, CulteDetail)
  → ErrorBoundary remplace toute l'app. Corrigé PR #67 ; `react-hooks/rules-of-hooks`
  était à `warn` dans eslint.config.js → passé à `error`. Audit `eslint src/
  --rule rules-of-hooks:error` = 2 fichiers seulement (les deux de #67).
- **Garde structurelle (2026-10-27)** : `src/lib/__tests__/route-state-wiring.test.ts`
  (8 tests) verrouille la CAUSE : tout champ de `RouteState` doit être câblé dans
  `App.tsx` OU listé dans `PENDING_WIRING` (raison + id de risque) ; chaque
  `RouteOutcome` doit avoir un `case` rendu. Preuve : ajouter un champ fictif fait
  échouer le test. Méthode de détection : pour chaque garde, vérifier que la
  condition peut réellement devenir vraie, et que le déclencheur est alimenté.

## Gardes de test « sans identifiants » (pattern réutilisable)
- `docs/agent/rls-inventory.json` + `src/lib/__tests__/rls-inventory.test.ts` :
  fige l'inventaire RLS mesuré (43 tables) et fait échouer la CI si une table
  n'a ni RLS ni politique (sauf deny-all listé : `keep_alive`,
  `_jsonb_backfill_20261024`). Requête de régénération en tête du test.
- Tests jsdom : ajouter `// @vitest-environment jsdom` en 1re ligne ; l'import
  `from "fs"`/`resolve(__dirname,...)` fonctionne (pas besoin de fileURLToPath).
- `installChunkErrorRecovery` (clientErrors.ts) : recharge 1× par session via
  `sessionStorage['lumina-chunk-reloaded']` (anti-boucle) sur `vite:preloadError`.

## Dérive doc ↔ code : en-têtes de risque périmés (2026-10-27)
Le registre `docs/agent/RISQUES.md` garde parfois un **en-tête périmé**
(« OUVERT ») alors que le corps ET le code donnent le risque **corrigé** —
piège coûteux : on ré-investigue un défaut déjà réglé.
- Vérifié et corrigé (PR #71) : **R59** (écran noir route paramétrée) était en
  tête `OUVERT (HAUTE)` mais **CORRIGÉ** (fallback `lazy-route.tsx` ne rend plus
  `<IonPage>` ; `groups-events.cy.ts` 3/3) ; **R61** CORRIGÉ pour `/groups/:id`
  (19 pages restantes P35) ; **R74** partiel (icône `notifIconKey` corrigée +
  testée ; sémantique `action_type` = P-NEW-6).
- **Réflexe** : avant d'attaquer un risque « OUVERT », lire son **corps** et
  `grep` le code ; ne se fier ni à l'en-tête seul, ni à la mémoire.
- Légitimement ouverts (défaut/env) : R30 (sync Cypress), R33 (IonSelect),
  R72 (global hors DEV), R80 (`PS_ADMIN_TOKEN`), R107 (décision R109/R16),
  R109 (décision propriétaire).
- `App.tsx` (RouteGuard) câble `resolveRoute` avec seulement `isAuthenticated`,
  `activeOrgId`, `linkOrgId` (+ schéma via `schemaVersion.ts`). `isOrgMember`/
  `hasPermission` restent NON câblés (branches `needs-membership`/`forbidden`
  inertes) : c'est R107/R105, dépendant de la réconciliation des rôles ADMIN
  (R109/R16). Un câblage naïf de `hasPermission` enfermerait dehors les admins.

## RBAC organisationnel (session 11, mergé sur main)
- **`grants` est désormais org-scopé** : colonne `org_id NOT NULL`
  (migrations `20261027000010_grants_org_scope.sql`,
  `20261027000011_settle_propagate_org.sql`). Avant : aucune colonne `org_id`,
  une seule policy `USING (true)` → un grant `subject_type='user'` valait dans
  **toutes** les orgs (fuite inter-org) et toute session lisait tous les grants.
  Policies : `grants_insert_admin`, `grants_read_org`, `grants_update_admin`.
  `has_permission` contraint `g.org_id = p_org`.
- **Modèle de capacités** (`src/lib/capabilities.ts`) : 14 capacités couvrant les
  28 permissions de `PERMISSION_MATRIX` — **ne jamais inventer** une permission.
  `capabilitiesForRole` = ≥1 permission (affichage) ; `capabilityFullyGranted` =
  toutes. Couche d'écriture `src/lib/orgAdmin.ts` : le rôle s'écrit dans
  `org_memberships`, **jamais** `profiles.role` (D3).
- UI : page `/admin/roles` (`src/pages/OrgRoles.tsx`) + `CapabilityBanner`.
- Contrat figé : `docs/agent/CONTRAT_RBAC.md`.

### Pièges d'intégration RBAC (mesurés)
- **Worktrees git isolés n'ont pas `.env.local`** (gitignoré) → toute la suite
  vitest échoue (`VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes`).
  Ce n'est **pas** une régression : copier `.env.local` dans le worktree.
- **Ordre de merge imposé par les dépendances** : C consomme les fichiers de B
  (`capabilities.ts`, `orgAdmin.ts`, `useMyCapabilities.ts`) → C ne compile
  **pas** dans son worktree isolé ; le rebaser sur `main` **après** merge de B.
  Ordre correct : A → B → C.
- **Garde anti-dérive des routes** (`src/lib/__tests__/route-registry-drift.test.ts`) :
  toute route ajoutée à `ROUTE_REGISTRY` doit l'être aussi dans
  `cypress/e2e/zero-black-screen.cy.ts` **et** `docs/agent/deeplinks.matrix.json`
  (`routes_total`), sinon 2 tests échouent. Ici `/admin/roles` (64→65).

### Pièges de rendu React (mesurés, 2026-10-27)
- **Un hook après un `return` précoce = app entièrement cassée.** `RouteGuard`
  (`src/App.tsx`) et `CulteDetail.tsx` déclaraient des `useState`/`useEffect`
  APRÈS un `if (...) return` → `Rendered more hooks than during the previous
  render` → l'`ErrorBoundary` racine remplace **tout** l'arbre par « Une erreur
  inattendue s'est produite ». C'est la cause du « app not mounting » des E2E
  (R113). Régressions : `db4a367` (PR #47).
- **`react-hooks/rules-of-hooks` était forcé à `warn`** dans `eslint.config.js`
  → cette erreur **fatale** ne cassait pas la CI. Passé à `error` (exception
  `e2e/**` : le `use` des fixtures Playwright est un faux positif). Ne jamais
  rétrograder cette règle.
- **Reproduire le montage en local sans pnpm** : `./node_modules/.bin/vite`
  fonctionne directement (pnpm n'est pas installé). Les erreurs React sont
  relayées dans la sortie du dev server (`[vite] (client) [console.error]`).
- **Baseline Cypress `main` = 17/17 specs en échec (100 %)** avant ce correctif ;
  après : shard 1 → 82 passants (`zero-black-screen` 64/64), shard 2 → 36.
  Les échecs résiduels sont R53/R83/R98 (PowerSync) + R96 (hygiène de test).
