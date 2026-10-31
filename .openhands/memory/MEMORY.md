# Mémoire projet — Lumina

## Environnement d'agent (contraintes lourdes, vérifiées)
- **Cypress TOURNE en local** (vérifié 2026-10-28) : binaire 16.0.0 présent,
  il manque seulement **Xvfb** → `sudo apt-get update && sudo apt-get install
  -y xvfb`, puis
  `xvfb-run -a node node_modules/cypress/bin/cypress run --spec cypress/e2e/<S>.cy.ts --browser electron --config video=false`
  avec `CYPRESS_BASE_URL=http://localhost:8080`. `pnpm` absent du PATH → lancer
  Vite via `node node_modules/vite/bin/vite.js` (le shim `.bin/vite` est un
  script shell, pas du JS). Reproduire un échec CI en local est donc possible.
- **Accès DB possible** : Docker **est** installé (`sudo dockerd &` +
  `chmod 666 /var/run/docker.sock`) ; la chaîne Postgres passe par le **pooler**
  `aws-0-eu-west-2.pooler.supabase.com:5432` (l'hôte direct `db.<ref>…` **ne
  résout pas** dans le conteneur). Le MCP Supabase (`execute_sql`) reste la voie
  SQL la plus simple.
- **`PS_ADMIN_TOKEN` disponible** dans le coffre local `~/.ps-secrets` →
  `powersync deploy sync-config` **fonctionne** (E1 close le 2026-10-27).
- **`npx tsc --noEmit` à la racine ne vérifie RIEN** (tsconfig `"files": []`,
  sort toujours 0). Utiliser **`npx tsc -b`**.
- **Délégation parallèle** : API Cloud `POST
  https://app.all-hands.dev/api/v1/app-conversations` (`Authorization: Bearer
  $OPENHANDS_API_KEY`) → renvoie un *start-task* ; poller
  `/app-conversations/start-tasks?ids=<id>` pour l'`app_conversation_id`.
  Aucun backend Agent Canvas local (localhost:8001 → HTTP 000).

## PowerSync (instance prod 6a9dd96302481fb31b945823)
- **P0 « écran muet » — audience JWT (R129/R132, 2026-10-29)** : l'instance
  rejette TOUT jeton utilisateur Supabase (`401 PSYNC_S2105 — Unexpected "aud"
  claim value: "authenticated"`). Cause : `client_auth.jwks_uri` explicite est
  enregistré **sans** `requiresAudience` → `KeyStore.verifyJwt` retombe sur
  `client_auth.audience` (= `additional_audiences`) ; le collecteur Supabase
  auto-dérivé (qui porte `requiresAudience: ["authenticated"]`) est **masqué**
  par le collecteur explicite (même URL, même `kid`). Correctif :
  `additional_audiences: ["authenticated"]` dans `service.yaml`. **Sonde
  décisive** (hors navigateur) : `POST /sync/stream` avec un JWT réel → 401
  avant, 200 après. Un corps JSON invalide renvoie 400 AVANT l'auth (donc un
  400 ne prouve rien). Effet produit : `_psReady=false` → pages gardées par
  `isPowerSyncReadyNow()` bloquées sur squelette perpétuel. Filet produit livré :
  `markPowerSyncUnavailable`/`useReplicaUnavailable` + `SyncUnavailableBanner`
  (borne 30 s, monté dans `App.tsx`).

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
- **PURGÉE le 2026-10-29** (phase 18, PR #119) : ne reste que **2 profils**
  (`lumina-org-e2e@lumina.dev`, `lumina-org-unconfigured@lumina.dev`), 3 orgs
  (`org-e2e`, `org-e2e-unconf`, `org-central`), 9 catégories canoniques,
  `role_permissions` (149), `keep_alive` (1). Tout le reste (events,
  notifications, groups, org_units, accounts, caisses, members, invitations,
  audits…) est à **0**.
- **Procédure de purge reproductible** (si besoin) : (1) `update groups set
  parent_group_id/responsable_member_id = null` ; (2) supprimer enfants→parents ;
  (3) `alter table public.org_admins disable trigger trg_org_admins_not_last`
  puis `delete` orgs/profils hors conservés puis `enable trigger` (la garde
  « dernier admin » bloque sinon `org-central`) ; (4) **re-supprimer
  `audit_entries`** (les triggers d'audit en régénèrent) avant
  `delete from auth.users …` (FK `audit_entries_user_id_fkey`) ; (5) restaurer
  les **9 catégories canoniques** (`20261026000006_seed_canonical_categories.sql`)
  — données de référence requises (R89.a).
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
- **Cypress TOURNE en local** (2026-10-29) : `sudo apt-get install -y xvfb` +
  `node node_modules/cypress/bin/cypress install`, puis
  `CYPRESS_BASE_URL=http://localhost:8080 xvfb-run -a node
  node_modules/cypress/bin/cypress run --browser electron --config video=false`
  (Vite à part : `node node_modules/vite/bin/vite.js --port 8080`). Mesure :
  139 tests / **113 passing / 21 failing** ; crawler P0 `zero-black-screen`
  **64/64**. **Mais** le worker WASM PowerSync ne se connecte pas en headless
  (R85) → tout test d'**upload réel** (`performance-batch`, `persistence`) est
  structurellement rouge ; `cloud-sync` passe mais est **tautologique**
  (`cy.request`). Correctif R83 testé → **réfuté**.
- **La suite Cypress n'a JAMAIS été verte sur `main`** (20 runs en échec,
  2026-10-19 → 10-24). Mêmes 10 specs en échec, déterministe.
  **Ce n'est PAS la parallélisation** (réfuté par mesure en mono-conteneur,
  run `40080015253`). Cause = environnement E2E (PowerSync/contexte d'org) :
  cf. R53/R83/R72/R54. Ne pas se fier au rouge Cypress comme signal.
  **Nuance mesurée (2026-10-27)** : le job « E2E (Cypress) » de `ci.yml` peut
  passer sur une branche de correctif (constaté sur PR #52) — le rouge global
  dépend donc aussi du contenu testé.
- **Android Debug Build = RÉPARÉ (R90, 2026-10-29, PR #129)** : le vrai blocage
  était `@capacitor/storage` (déprécié, sans `namespace`), PAS le module
  cordova. Migration → `@capacitor/preferences` + alignement Capacitor 7.6.9.
  3 derniers runs = `success`. Défaut résiduel corrigé : bloc `permissions:`
  absent → 403 « Resource not accessible by integration » sur le commentaire PR.
  **Ce job n'est plus un rouge toléré : tout échec est désormais un vrai signal.**
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
- **E3 RÉSOLUE (2026-10-29)** : `backup.yml` **est configuré** (secrets
  `SUPABASE_DB_URL` + `BACKUP_GPG_PASSPHRASE` présents) — preuve : run manuel
  `40813667253` → export + publication, artefact chiffré 3,9 Mo. **Piège** : un
  run peut être **vert avec l'export `skipped`** (secret absent) → vérifier
  l'étape « Export (schéma + données) », pas seulement la conclusion du run.

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
  `pnpm run build`, + workflow **`CI Pipeline`**. `Android Debug Build` = **VERT
  depuis R90/P35** (PR #129) ; Cypress sur `main` rouge déterministe (R98/E2).
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
**Variante mesurée (2026-10-29, R134/R136/R145)** : une garde STATIQUE peut être
VERTE sans rien vérifier — (a) si son extraction retourne un ensemble **vide**
(R134 : planchers de non-vacuité ajoutés) ; (b) si elle compare des **comptes**
au lieu de l'ensemble → une **substitution net-zéro** passe (R17, PR #145 :
empreinte SHA-256 de l'ensemble des noms de migrations + 4e test ; mutation
net-zéro : seule l'empreinte échoue, les comptages restent verts). Réflexe :
toute garde « compte/filtre » doit ancre l'**ensemble** ou un plancher.
Exemple sécurité : `powersync-dev-surface-guard.test.ts` (R136) verrouille que
la surface DEV (`__psSupabaseClient` = client Supabase écrivable) reste **après**
la garde `import.meta.env.DEV` et n'est écrite nulle part ailleurs.
- **R105** : `invitation:*` exigées par ROUTE_REGISTRY, détenues par aucun rôle.
  **Garde DÉJÀ en place** : `src/lib/__tests__/permissions.test.ts`
  (`describe("cohérence ROUTE_REGISTRY ↔ PERMISSION_MATRIX")`, ajouté PR #33) —
  vérifie que toute `route.permission` est détenue par ≥1 rôle. **Ne pas
  recréer** (j'ai ouvert puis fermé PR #70 pour ce doublon). Le test
  `route-registry-drift.test.ts` ne couvre QUE routes↔registre, pas les
  permissions : c'est ce qui m'avait induit en erreur.
- **R106/R107** : `resolveRoute` recevait seulement `{isAuthenticated}`.
  **R106 CORRIGÉ** (phase 11, 2026-10-27) : `clientSchemaVersion`/
  `minSchemaVersion` alimentés via `src/lib/schemaVersion.ts` (fail-open tant que
  `VITE_MIN_SCHEMA_VERSION` n'est pas positionnée). **R107 CORRIGÉ (2026-10-28,
  PR #95)** : `src/hooks/useOrgMembership.ts` alimente `isOrgMember`, **fail-open**
  (`not-member` seulement si `canAccessOrganization` est faux **ET**
  `db.currentStatus.hasSynced` — sinon `unknown` → `undefined`). Réévalué au
  changement d'org + à chaque fin de sync. **Piège de flux** : `/onboarding` et
  `/org-setup` doivent rester **exemptés** de `needs-membership` (ce sont les
  écrans qui confèrent l'appartenance) — exemption dans `routeResolver.ts`
  (`MEMBERSHIP_EXEMPT_ROUTES`).
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
- **Variantes « routage » (R49.b/R49.c, 2026-10-29, PR #147/#148)** :
  1. **route montée mais orpheline** — page + route OK, **aucun lien** n'y mène
     (`/admin/units`, `/admin/roles`). Fix : point d'entrée UI.
  2. **lien cassé** (P0 écran noir) — `navigate()` vers une route **inexistante**
     (`TransactionEdit` → `/transactions`, jamais montée ; le grand livre est
     `/finance`).
  **Garde** `src/lib/__tests__/route-reachability-guard.test.ts` (5) : sens 1
  (chaque route montée a un lien entrant) + sens 2 (chaque cible correspond à
  une route montée). **PIÈGE** : le catch-all `path="*"` valide toute cible →
  garde vacuе ; **exclure `*`**. Couvrir toutes les sources de cible :
  `navigate("…")`, `to=`/`href=`/`defaultHref=`, **`to:`/`href:` d'objet**,
  **`route:` (`features.ts`)**, **`navigate(cond ? "/a" : "/b")`**. Normaliser
  `:param` → préfixe et retirer `?query`/`#hash`.

## Gardes de test « sans identifiants » (pattern réutilisable)
- `docs/agent/rls-inventory.json` + `src/lib/__tests__/rls-inventory.test.ts` :
  fige l'inventaire RLS mesuré (43 tables) et fait échouer la CI si une table
  n'a ni RLS ni politique (sauf deny-all listé : `keep_alive`,
  `_jsonb_backfill_20261024`). Requête de régénération en tête du test.
- Tests jsdom : ajouter `// @vitest-environment jsdom` en 1re ligne ; l'import
  `from "fs"`/`resolve(__dirname,...)` fonctionne (pas besoin de fileURLToPath).
- `installChunkErrorRecovery` (clientErrors.ts) : recharge 1× par session via
  `sessionStorage['lumina-chunk-reloaded']` (anti-boucle) sur `vite:preloadError`.
- **Instantanés gelés + gardes « repo-side »** (2026-10-29) : quand la vérité
  (tracker de migrations, politiques RLS) **exige des identifiants absents en
  CI**, figer la mesure dans un JSON versionné (`docs/agent/*.json`) et écrire
  un test qui **échoue dès que le dépôt change** (nombre/forme de fichiers) →
  force à re-mesurer. Ex. : `migration-drift.json` + `migration-drift-guard`
  (R17, ratio 2/70 : tracker 70 versions vs 126 fichiers, 2 communes).
- **Toute garde statique doit porter une assertion de NON-VACUITÉ** (ex.
  « >20 balises scannées ») : sinon une extraction cassée fait passer le test
  silencieusement (la garde ne garde plus rien). Cf. `ionic-input-events-guard`.
- **Analyse de balise, pas de ligne** : pour détecter un attribut sur un tag JSX
  précis, extraire la **balise ouvrante** complète en gérant `>` dans `{}` —
  sinon faux positifs (`onIonInput` d'un `<IonInput>` frère compté pour un
  `<IonSelect>` voisin). Cf. `ReportBuilder.tsx`/`GivingCampaign.tsx`.
- **pnpm absent en local** (`bash: pnpm: command not found`, `corepack enable`
  insuffisant) ; `node_modules/.bin/vitest` et `npx tsc -b` marchent. Récupérer
  les comptages vitest/lint depuis les **logs CI** (`gh run`/API logs, zip).

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
  **Preuve de non-révocation** : `git log -S "<code fautif>" -- <fichier>` —
  s'il n'y a aucun revert après le commit du correctif, le code est en place.
- **Rectifié 2026-10-29 (PR #133/#134)** : R30 (sync Cypress) et R72 (global
  hors DEV) ne sont plus « ouverts » — les correctifs sont **dans le code**
  (`nav-bottom.cy.ts` : scoping + `{force:true}` ; `cross-tenant.cy.ts` :
  échec immédiat explicite) ; R82 l'est aussi (depuis `c11aad7`, jamais
  révoqué). Restent légitimement ouverts : R33 (IonSelect), R80
  (`PS_ADMIN_TOKEN`), R109 (décision propriétaire), R62/R16 (structurel : 2
  colonnes de rôle, 0 trigger).
- **Cypress en CI** tourne contre `pnpm run dev` (`CYPRESS_BASE_URL=
  http://localhost:8080`) → `import.meta.env.DEV` vrai, donc le global
  `__psSupabaseClient` EST publié : R72 ne concerne que les runs **locaux**
  contre un build prod.
- `App.tsx` (RouteGuard) câble `resolveRoute` avec `isAuthenticated`,
  `activeOrgId`, `linkOrgId`, `isOrgMember` (R107) + schéma via
  `schemaVersion.ts`. **Seul `hasPermission` reste NON câblé** (branche
  `forbidden` inerte) : c'est R105, dépendant de la réconciliation des rôles
  ADMIN (R109/R16). Un câblage naïf de `hasPermission` enfermerait dehors les
  admins.

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

## Cold-test & intégrité des données (mesurés, 2026-10-27)
- **Le gestionnaire de paquets est pnpm, pas npm.** `npm ci` **échoue**
  (ERESOLVE : `@capacitor/storage@^1.2.5` peer `@capacitor/core@^3` vs
  `@capacitor/core` récent). La CI et `backup.yml` utilisent
  `pnpm install --frozen-lockfile`. `pnpm-lock.yaml` (23/10) est à jour ;
  `package-lock.json` (30/09) est **périmé** mais suivi par erreur.
  `pnpm` n'est pas installé dans le conteneur : utiliser
  `./node_modules/.bin/vite` / `npx vitest` directement.
- **`Xvfb` est ABSENT de l'image** (`which Xvfb` vide) → Cypress local
  impossible sans `sudo apt-get install -y xvfb`. Cohérent avec E2/E2E CI.
- **Un runbook sans résultat attendu ne détecte rien.** Tester « à froid » =
  exécuter les commandes telles qu'écrites et **confronter au résultat
  annoncé**. C'est ce qui a révélé 2 défauts réels (npm ci, invariant jsonb).
- **Invariant d'intégrité jsonb (RUNBOOK)** : `select ... jsonb_typeof(col) =
  'string'` doit renvoyer **0** sur 9 colonnes. Il était à **88** sur
  `audit_entries.before_state` (rechute R65, non détectée car **non gardée en
  CI** — cf. R65.b).
- **Cause de la rechute R65** : `JSON.stringify(null)` renvoie la **chaîne**
  `"null"` (jsonb type string au lieu de NULL). `coerceJsonbValue` ne couvre
  pas ce cas (il ne convertit que les chaînes décodant vers object/array).
  Correctif : `serializeAuditState()` dans `audit.ts` (null → NULL).
- **Motif de rattrapage (R65/20261027000012)** : sauvegarde EXACTE dans une
  table `_jsonb_null_literal_<date>` (rollback exact) → conversion idempotente
  → rollback qui restaure puis supprime la table. Réutiliser ce motif.
- **Règle d'or** : ne jamais écrire « plus aucune écriture ne peut produire ce
  format » sans corriger TOUS les writers ; la migration R65 l'affirmait à tort.

## Piège CI majeur : Node 22 (CI) vs Node 24 (dev) — R114 (2026-10-27)
- **Tous les workflows GitHub Actions fixent `NODE_VERSION: '22'`** ; le
  conteneur de dev a Node **24**. Un builtin Node **expérimental** présent sous
  24 mais absent de `module.builtinModules` sous 22 casse la CI seulement.
- **Cas mesuré** : `import { DatabaseSync } from "node:sqlite"` (test Phase 8
  `org-isolation-intrusion.test.ts`) → sous Node 22, Vite refuse de bundler :
  `Cannot bundle Node.js built-in "node:sqlite"`. **La CI Pipeline était ROUGE
  sur `main`** (job Unit Tests), alors que le local passait (15/15).
- **Correctif réutilisable** : résoudre le builtin **à l'exécution** —
  `process.getBuiltinModule("node:sqlite")` (non bundlé par Vite) + garder un
  `import type` (effacé au build). Vérifié : suite complète **1452/1452 sous
  Node 22** (télécharger Node 22 dans `/tmp` pour reproduire :
  `https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.xz`).
- **Avant d'accuser une branche d'un rouge CI, vérifier `main`** : ici `main`
  était rouge depuis #73 (défaut hérité, pas une régression de la branche).

## Défauts pré-existants confirmés (ne pas re-diagnostiquer)
- ~~Android Debug Build = échec pré-existant~~ → **RÉPARÉ (R90, PR #129)** :
  vrai blocage = `@capacitor/storage` sans `namespace` ; Capacitor aligné 7.6.9.
- **Cypress = jamais vert** (R98) ; cause = environnement E2E, pas la
  parallélisation (réfuté par mesure).
- **CI Pipeline = désormais VERTE** après R114 (#77) — c'est le seul signal
  fiable du dépôt : ne jamais la laisser rouge.

## Pièges d'environnement de l'agent (2026-10-28, coûteux à découvrir)
- **Push Git : le jeton `ghu_` ne fonctionne PAS en basic-auth** (le remote a le
  jeton en *username* sans password → `git push` demande un mot de passe et
  **bloque jusqu'au timeout 120 s**). `git ls-remote` (lecture) passe, mais pas
  le push. **Solution** : pousser avec une URL explicite —
  `git push "https://x-access-token:${GITHUB_TOKEN}@github.com/<owner>/<repo>.git" <branche>`
  (et `GIT_TERMINAL_PROMPT=0` pour échouer vite). Ne pas persister le jeton.
- **Le jeton n'a PAS la permission `workflows`** : `gh api .../actions/permissions`
  → `403 Resource not accessible by integration`. Conséquence : les patches de
  workflow dans `patches/` (`backup-yml-faux-vert.patch`, `deadman-guard.yml`,
  `keep-alive-verifiable.yml`) **ne peuvent pas être poussés** par l'agent →
  escalade réelle (pas un manque d'effort). Le propriétaire doit les appliquer.
- **R88 corrigé (2026-10-27)** : `.catch()` vides = états vides silencieux.
  `captureClientError()` (dans `clientErrors.ts`) capture les erreurs **gérées**
  (`source:"handled"`) ; `LoadErrorBlock` (embarquable, sans IonPage) affiche
  l'erreur + réessai. `Finance` doit garder **un seul** `<IonPage>` (bug écran
  noir view-stack Ionic).

## Durcissement RPC — tester l'ÉTAT FINAL, pas un motif concaténé (R115, 2026-10-28)
- **Classe** : une migration qui **recrée** une fonction de trigger (ou
  `settle_invitation_claim`) hors du chemin de durcissement R103 **rouvre** la
  surface RPC. Un test qui **concatène** les migrations et cherche un motif
  *quelque part* est **aveugle à l'ordre**.
- **Instances mesurées** : `denorm_child_org_id`/`denorm_cascade_org_id`
  (`20261027000001`, créées après le balayage `20261026000005`) → exécutables par
  `anon`/`authenticated` ; `20261027000011` recrée `settle_invitation_claim`
  depuis le corps pré-R103 → garde `pg_trigger_depth()=0` **perdue**.
- **Exploitabilité** : `select public.denorm_cascade_org_id()` sous `anon` →
  `0A000: trigger functions can only be called as triggers` → **non exploitable**
  (faux positif, classe R97). Corrigé quand même (cohérence + avenir).
- **Correctif** : `20261028000001` (garde restaurée + balayage rejoué) → 0
  fonction de trigger exposée ; `anon_…` 3→1 (`keep_alive_ping` volontaire),
  `authenticated_…` 9→7.
- **Garde réutilisable** : `src/lib/__tests__/revoke-trigger-functions.test.ts`
  rejoue les migrations **dans l'ordre** (`create` / balayage générique /
  `revoke`) et évalue l'état final. **Ne pas se fier au test R103 existant** : il
  concatène et rate toute régression ultérieure.
- **Règle générale** : pour un invariant d'état DB (privilèges, RLS, colonnes),
  la garde doit modéliser l'**ordre** des migrations, pas le texte concaténé.

## Session 2026-10-28 (boucle autonome) — classe « filet déclaré jamais câblé » + audit produit
- **R120 (corrigé)** : câbler un filet (R107 → `needs-membership`) **expose** des
  écrans jamais atteints. `NeedsMembershipScreen` proposait « Retour à l'accueil »
  → `/dashboard`, qui n'est PAS exempté → boucle sans issue (toutes les routes
  `app` bloquées pour un non-membre, y compris `/settings/profil` = déconnexion).
  Correctif : bouton secondaire « Changer de compte » (`signOut` + `/sessions`,
  route publique), rendu **seulement si** `onSignOut` fourni. Exemptions
  `needs-membership` = `{/onboarding, /org-setup}` uniquement.
- **R121 (corrigé)** : 3 messages d'erreur **en chinois** dans l'UI française
  (`Versement.tsx:87`, `TransactionEdit.tsx:108/114`). Garde
  `src/lib/__tests__/no-cjk-strings.test.ts` (scan tout `src`, hors `__tests__`) ;
  **exclure `\uff00-\uffef`** (contient `＋` U+FF0B légitime du tutoriel).
- **R122 (corrigé)** : `Federation.tsx` — le sélecteur de re-parentage ne
  proposait que les **racines** (`rootOrgs`), alors que la création accepte
  `allOrgs` → impossible de déplacer une org sous une annexe. Correctif :
  `reparentTargets(orgId, rows)` (`src/lib/orgTree.ts`, toute org sauf self +
  descendants via `wouldCreateCycle`). C'est la **cause produit** du diagnostic
  R82 (sélecteur limité aux racines).
- **Classe réutilisable** : chercher les branches d'écran **mortes** — un
  `outcome` produit par un résolveur mais dont le bouton pointe vers une route
  elle-même bloquée. Tester que **chaque action** d'un écran d'état mène à une
  route **praticable** (`resolveRoute(path, {isOrgMember:false}).outcome==="render"`).
- **`/workspace/backups/`** : sauvegardes réelles hors dépôt (ne jamais commiter).
- **R123 (corrigé)** : `CentralAdmin.tsx` — l'action de statut était
  `SUSPENDED ? « Réactiver » : ACTIVE ? « Suspendre » : null` → une organisation
  **ARCHIVED** tombait dans la branche `null` (aucune action, irrécupérable),
  alors que `reactivateOrganization` existe (cycle de vie « archiver ≠
  supprimer » = réversible). **Et** `setOrganizationStatusPS(…,"ACTIVE")`
  (`dataLayer.ts`) ne nettoyait pas `archived_at/by/reason` → org restaurée
  marquée « archivée le … ». Correctif : bouton « Restaurer » + nettoyage des 6
  colonnes. Garde : `src/lib/__tests__/org-lifecycle-restore.test.ts`.
- **R124 (corrigé)** : `UpdateDialog` appelait `useUpdater()` **lui-même** en
  affirmant que l'état est « global » — or le hook gardait un `useState`
  **local** (état isolé par appel) → le dialogue lisait `updateInfo=null` :
  « Mettre à jour » inerte (`if (!info) return`) et « Plus tard »
  (`onClick={() => undefined}`) mort. Correctif : store **global**
  `src/updater/updaterStore.ts` (module + subscribe/emit) ; `useUpdater` =
  enveloppe ; **point de montage unique** du dialogue (App.tsx `UpdaterBridge`),
  SettingsAbout ne garde que le bouton. Garde :
  `src/updater/__tests__/updaterStore.test.ts` (état partagé prouvé par abonné).
  **Leçon générale** : un commentaire qui dit « état global » sur un hook à
  `useState` local est un signal — vérifier qui appelle le hook et où le résultat
  est consommé.

## Piège mesuré : `tsc -b` local peut mentir (cache incrémental)
- `tsc -b` (même `--noEmit`) est **incrémental** : un fichier de test déjà
  « vert » en cache peut masquer une **vraie** erreur TS (ex. TS1117 propriété
  dupliquée dans un objet littéral) jusqu'au rebuild CI.
- Vérifier un doute avec **`npx tsc -b --force --noEmit`** (rebuild complet).
- Ne pas supprimer les `.tsbuildinfo` du dépôt : le vrai diagnostic est le
  `--force`.

## R52.j — la famille R52 n'est pas close par les pages de détail
- Le motif « pas encore lu » ≠ « vide » frappe aussi les **listes dérivées d'une
  lecture asynchrone** hors des pages déjà traitées : `/trace`
  (`useAuditEntries()` retombe sur `store.auditEntries = []` avant la lecture) et
  `/admin/reports/send` (historique `org_reports` lu en `async`).
- **Signal générique à chercher** : un `useState([])` + un `useEffect` qui
  remplit la liste de façon asynchrone, avec un rendu `list.length === 0 ? "Aucun…"`
  sans drapeau `loaded`. Correctif : drapeau posé dans un **`finally`** (jamais
  seulement dans `catch`, sinon l'état reste bloqué en squelette si la lecture
  échoue) OU `isPowerSyncReadyNow()`.
- Garde statique `src/lib/__tests__/r52-readiness-guard.test.ts` **étendue** :
  `VERDICT_PATTERN` couvre « introuvable » + « Aucun(e) … trouvé(e) / pour le
  moment / pour l'instant ». Piège de faux positifs : il faut exclure les
  libellés de formulaire (« Aucun événement », « Aucune (racine) ») et les
  boutons (« Aucune notification à vider ») — un motif trop large (`Aucun\s`)
  fait échouer 9 pages légitimes.
- **R52.k** : même motif sur les pages à lecture asynchrone hors `dataLayer`
  (`/forms` = `formDefinitionRepo.list`, `/forms/custom-fields` =
  `customFieldRepo.list`) → drapeau `*Loaded` posé dans un `finally` +
  `ListSkeleton`. La garde statique couvre désormais aussi « Pas encore de ».
- **R52.l→R52.p (2026-10-28, Phase 11)** — cause **systémique** découverte :
  19 hooks de `dataLayer` renvoient `isLoading: false` **en dur** (l'état de
  chargement temporel a été retiré par D-R41). Donc toute garde
  `if (…Loading)` posée sur eux est **du code mort** → verdict vide faux
  (« Aucun membre », « Groupe introuvable », « Pas encore de mouvement »…)
  pendant la 1re lecture PowerSync. Écrans corrigés : `/dashboard` (R52.l),
  `/members` `/events` `/groups` `/cotisations` `/notifications` (R52.m),
  `/group/:id` (R52.n), `/reports` (R52.o), `DocumentPicker` (R52.p).
  Correctif = `isPowerSyncReadyNow()` (ou drapeau `*Loaded` posé dans un
  `finally` pour les lectures hors dataLayer).
- **Garde statique durcie** : `r52-readiness-guard.test.ts` dérive la liste des
  hooks à `isLoading:false` en dur **du source** `dataLayer.ts` et échoue si un
  verdict vide est gardé par un tel alias (alias explicite OU destructuration
  courte). Non-vacuité : sonde `__R52Probe.tsx` temporaire. 0 offenseur restant.
  Piège mesuré : un simple *import* de `Skeleton` (même en code mort) aveuglait
  l'ancienne garde — le mot a été retiré des signaux de disponibilité.
- **R52.q→R52.t (2026-10-28, même branche/PR #114)** — extension de la famille :
  `/balance` `/history` `/versement` (R52.q, chiffres faux) ;
  `/settings/notifications` (R52.r : « Tout est lu / 0 au total » + bouton
  « Tout marquer lu » désactivé à tort) ; `/event/:id/edit` (R52.s : « Chargement... »
  INFINI si événement absent + champ « Nom » JAMAIS pré-rempli → tout
  enregistrement bloqué en validation) ; `/transaction/:id/edit` (R52.t :
  formulaire VIDE en `ready` avant lecture → risque d'écrasement des valeurs
  réelles arrivées au sync).
- **Motif étendu de la garde statique** : ajouter `à vider` / `disponible` /
  `à afficher` au motif de verdict vide. Mesuré : seuls `NotFound.tsx` et
  `Tutorial.tsx` (déjà allowlistés) matchent → extension sans faux positif.
- **Balayage exhaustif fait (2026-10-28)** : plus aucun écran `useParams`+`id`
  ne rend un formulaire/verdict dérivé d'une lecture sans signal de
  disponibilité. Faux positifs confirmés : `FormFill.tsx` (a déjà loading +
  notfound), `TransactionNew.tsx` / `TransactionNewGroup.tsx` (ne font que
  dégrader un libellé « Groupe », pas un verdict faux).
- **R80 reste bloqué** : le stream `profiles` ne synchronise que le profil
  connecté (`WHERE id = auth.user_id()`). Élargir exige un **redéploiement
  PowerSync Cloud** ; `PS_ADMIN_TOKEN` ABSENT de l'environnement (vérifié :
  `PS_ADMIN_TOKEN`/`POWERSYNC_TOKEN` unset, pas de `~/.ps-secrets`). Modifier le
  YAML sans redéployer = divergence client/serveur, explicitement documentée
  comme défaut PIRE → ne pas le faire.
- **`Build Debug APK` = VERT depuis R90/P35 (PR #129)** : vrai blocage
  `Namespace not specified` sur `:capacitor-storage` (déprécié) — PAS le module
  cordova. Correctif : `@capacitor/storage` → `@capacitor/preferences` +
  Capacitor 7.6.9. Résiduel : bloc `permissions:` absent (403 sur commentaire PR).
- **Non-vacuité obligatoire** : pour tout correctif R52, retirer la garde, voir
  les tests échouer, restaurer. Chaque cas a son test comportemental
  (`list-loading-vs-empty.test.tsx`, `r52l-*`, `r52o-*`, `r52p-*`).

## RBAC Lumina (mesuré 2026-10-29, session R137/R138)
- **14 rôles** en DONNÉES (`role_permissions`, 149 lignes, **27 permissions
  distinctes**), pas un enum : colonne `role` = TEXT **sans CHECK**. Ordre :
  PASTEUR_PRINCIPAL(27) > TREASURIER(23) > ANCIEN(19) > … > MEMBRE(2).
- **15 rôles canoniques depuis le 2026-10-29** : `ADMIN` a été **AJOUTÉ** au
  modèle canon (R109 **TRANCHÉ**, PR #154) — super-admin, **28 permissions**
  (union des 14 rôles), `ROLE_HIERARCHY.ADMIN = 999`. `role_permissions` =
  **177 lignes / 15 rôles**. Seul orphelin restant : `CENTRAL_ADMIN` (D-S10-3).
- **R137 CORRIGÉ (PR #154)** : `has_permission` était appelée par **0/30**
  politiques d'écriture (1 seule, en LECTURE) → un `MEMBRE` pouvait écrire au
  niveau base via REST. **15 politiques** d'écriture câblées sur
  `is_org_member AND has_permission` (transactions, versements, members, events,
  groups). `documents`/`accounts` laissées en `is_org_member` seul (R137.a :
  aucune permission `document:*`/`account:*`). **La RLS ne couvre PAS la voie
  PowerSync** (`powersync_role` a `BYPASSRLS`) — correctif = voie REST directe.
- **R139 CORRIGÉ (PR #154)** : `invitations.target_role` n'avait aucun trigger →
  escalade vers `ADMIN`. Garde à 2 barrières : (1) trigger
  `guard_invitation_target_role` ; (2) garde dans `settle_invitation_claim`
  (`REJECTED_ROLE_ESCALATION`). Statut ajouté à `invitation_claims_status_check`.
- **PIÈGE MAJEUR (mesuré 2×)** : dans une fonction `SECURITY DEFINER`,
  `current_user` = le **propriétaire**, PAS le client. Une garde
  `current_user IN ('authenticated','anon')` est **silencieusement inopérante**.
  Toujours lire l'acteur réel via **`initplan_uid()`** (JWT). `initplan_uid()`
  lit `request.jwt.claims->>'sub'` ; pour tester en SQL :
  `select set_config('request.jwt.claims','{"sub":"<uuid>","role":"authenticated"}',false); set role authenticated;`
  (les blocs `DO $$ … raise exception …$$` annulent la transaction → 0 résidu).
- **Assignation** : `/admin/roles` (`OrgRoles.tsx`) → `assignMemberRole` écrit
  `org_memberships` (RLS `om_update` = `is_org_admin`) ; capacités →
  `grantCapability` sur `grants` (org-scopée, **0 ligne**). `profiles.role`
  jamais touché (rôle global, trigger immuable).
- **Créer un rôle** : possible en base (TEXT libre) mais **inopérant** — le
  front ne connaît que l'union TS. Exige R137 d'abord, puis modèle data-driven.
- **Sauvegarde** : cron `backup.yml` était **hebdomadaire** depuis #52 ;
  **rétabli quotidien** `0 3 * * *` (R138, PR #152). Run 40889847852 = success,
  artefact chiffré 3,2 Mo. Secrets `SUPABASE_DB_URL` + `BACKUP_GPG_PASSPHRASE`
  présents et fonctionnels.

## Audit RLS / RBAC (session 2026-10-30)
- **Substrat RBAC BIEN gardé (escalade IMPOSSIBLE, vérifié)** :
  - `org_memberships`, `grants`, `org_admins` : politiques gardées par
    `is_org_admin` → un membre ne peut PAS écrire les tables de rôle.
  - `has_permission` lit `org_memberships.role` + `grants` — **pas**
    `role_assignments` (table de rôle de **session** : session_id/role/org_id).
  - `is_org_admin` lit `profiles.role`, MAIS 3 triggers gardent `profiles` :
    `guard_profile_role_immutable` (BEFORE UPDATE), `guard_profile_role_insert`,
    `trg_guard_profile_org`. Test mesuré : `UPDATE profiles SET role='ADMIN'`
    par le membre lui-même → **`42501 ROLE_IMMUTABLE`**.
  - `invitations`/`invitation_claims` : gardées par `can_manage_invitations`
    (PAS `has_permission`) → un détecteur qui ne cherche que `has_permission`
    les **sur-compte** à tort.
  - `profiles` : UPDATE/INSERT/DELETE self-only (`initplan_uid() = id`).
- **R140 (corrigé)** : `audit_entries` était modifiable par tout membre
  (`is_org_member` seul sur UPDATE/DELETE) → journal d'audit altérable.
  Migration `20261030000001` : politiques retirées (deny-all UPDATE/DELETE),
  INSERT préservé. Garde `audit-append-only-guard.test.ts`.
- **R141 (ouvert, HAUTE)** : **26 tables** en écriture « membre seul »
  (`accounts`, `caisses`, `tax_receipts`, `org_budgets`, `pledges`, `giving_*`,
  `budget_lines`, `categories`, `org_units`, `role_assignments`, `cotisations`,
  `group_memberships`, `notifications`, `documents`, `custom_field_*`, `form_*`,
  `event_budgets`, `event_tasks`, `report_definitions`, `transaction_giving`,
  `giving_campaigns`, `giving_donors`, `org_budget_lines`). Écriture DIRECTE
  (pas escalade). Non corrigé : le vocabulaire canon n'a pas de permission pour
  ces tables (casserait des flux légitimes). Remédiation en 2 lots dans RISQUES.
- **R142 (ouvert)** : câblage de `hasPermission` dans `App.tsx` **toujours
  bloqué** malgré R109 — (1) `CENTRAL_ADMIN` absent de `Role`/`PERMISSION_MATRIX`
  (`parseRole` → null) ; (2) `/admin/reports*` exige `admin:settings` alors que
  les membres doivent y accéder (lien Dashboard non gardé) → enfermerait les
  destinataires de rapports.
- **Requête de mesure R141** : `pg_policies` où `cmd ∈ {INSERT,UPDATE,DELETE}`
  ET (`qual`||`with_check`) contient `is_org_member` SANS
  `has_permission`/`is_org_admin`. Vérifier ensuite `can_manage_*` et les
  politiques self-only pour éliminer les faux positifs.

## Anti-escalade RBAC — défenses vérifiées (2026-10-30)
- **4 correctifs CRITIQUES d'escalade** (migrations `20261022000010`–`14`,
  session antérieure) : (10) `org_memberships` INSERT/UPDATE gardés par
  `is_org_admin` (fin de l'auto-adhésion via `om_all_merged`) ; (11) trigger
  `guard_profile_role_immutable` (BEFORE UPDATE) ; (12) garde `is_org_admin`
  dans `upsert_profile` ; (14) trigger `guard_profile_role_insert` (BEFORE INSERT).
- **PIÈGE CLÉ** : les triggers `guard_profile_role_*` testent
  `current_user IN ('authenticated','anon')`. Dans une fonction **SECURITY
  DEFINER**, `current_user` = le **propriétaire** → le trigger **ne voit pas**
  l'appel. C'est pourquoi `upsert_profile` porte sa **propre** garde
  `is_org_admin` (sinon injection de `p_role` possible). Toujours vérifier ce
  couple (trigger + garde propre) pour tout RPC SECURITY DEFINER qui écrit un
  champ sensible.
- **R143 (corrigé)** : ces 4 correctifs n'avaient **aucune garde anti-régression**.
  Ajout de `src/lib/__tests__/rbac-escalation-guard.test.ts` (8 assertions,
  lecture des migrations, sans base). Invariants : `profiles.role` immuable
  (`42501 ROLE_IMMUTABLE`), `upsert_profile` → `42501 ROLE_NOT_ALLOWED`,
  `om_insert`/`om_update` = `is_org_admin`, `om_all_merged` jamais recréée.
- **Advisor `upsert_profile`** (SECURITY DEFINER exécutable par authenticated)
  = **faux positif** : garde `is_org_admin` interne (vérifié 42501).

## R141 — écriture gardée par permission (2026-10-31, corrigé)
- **Cause** : R137 n'avait câblé que 15 politiques ; 14 autres tables (dont
  FINANCIÈRES) restaient en `is_org_member` SEUL → tout MEMBRE écrivait en REST
  direct. Preuve : `INSERT INTO accounts` accepté.
- **Décision** : Lot 1 (permissions existantes) `cotisations`→`cotisation:manage`,
  `group_memberships`→`group:update`, `org_units`→`admin:settings` ; Lot 2
  nouvelle permission **`finance:manage`** (ADMIN, PASTEUR_PRINCIPAL, TREASURIER,
  TREASURIER_ADJOINT) pour `accounts`, `caisses`, `org_budgets`,
  `org_budget_lines`, `budget_lines`, `event_budgets`, `pledges`, `giving_*`,
  `transaction_giving`, `tax_receipts`. Migration `20261031000001` + rollback.
- **SÛRETÉ CLÉ** : le chemin d'écriture applicatif = **PowerSync**
  (`powersync_role` a **BYPASSRLS**, vérifié) → durcir la RLS ne casse AUCUN flux
  applicatif, ça ne ferme que le client REST direct. Vérifier BYPASSRLS avant
  toute modif RLS.
- **PIÈGE de modèle** : les gardes de dérive (`role-model-drift`, `permissions`,
  `capabilities`) parsent les permissions avec la regex `[a-z]+:[a-z]+` →
  **pas d'underscore** (`org_unit:manage` casse). Utiliser des paires simples.
  Toute nouvelle permission doit être ajoutée dans : type `Permission`,
  `PERMISSION_MATRIX`, miroir `20261026000002_rbac_has_permission.sql`,
  `role-model.json`, une capacité de `capabilities.ts`, et re-mesurer
  `migration-drift.json` (R17) si une migration est ajoutée.
- **R142 (partiel)** : `routeResolver.ts` `/admin/reports*` → `report:read`
  (turnkey ; câblage garde encore bloqué par `CENTRAL_ADMIN` hors canon).

## R142 — garde de route câblée (2026-10-31, corrigé)
- **Défaut** : `resolveRoute` produisait `forbidden` mais `App.tsx` ne fournissait
  jamais `hasPermission` → garde INERTE (classe « filet déclaré jamais câblé »).
- **Câblage** : état `userRole` dans `RouteGuard` (lu de
  `authService.getState().profile?.role`, repli `null`) + `hasPermission:
  (p) => roleHasPermission(userRole, p)`.
- **`roleHasPermission(rawRole, perm)`** (nouvelle, `src/lib/rbac.ts`) :
  centralise la décision, source unique `PERMISSION_MATRIX`, **fail-closed**
  pour un rôle hors canon (`parseRole → null` → false).
- **DÉCISION `CENTRAL_ADMIN`** : reste HORS canon (fail-closed). Impossible à
  canoniser proprement : `PERMISSION_MATRIX` est indexé par `Role`,
  `role-model-drift`/`permissions` gardent l'exhaustivité, `role-model.json` est
  régénéré depuis la matrice → l'ajouter exigerait des permissions DB+TS sans
  décision produit et créerait un rôle inutilisé (0 compte en base). L'admin
  central canonique = **`ADMIN`** (R109).
- **DÉCISION `/admin/reports*`** : **appartenance seule** (aucune permission de
  route), PAS `report:read`. Mesure : `MEMBRE` ne détient PAS `report:read`
  (12/14 rôles) ; le lien Dashboard est rendu sans garde de rôle ; RLS
  `org_reports_receiver` = appartenance d'org. Exiger `admin:settings` (avant)
  ou `report:read` enfermerait dehors des destinataires.
- **Pièges** : (1) `Role` = 14 rôles + `ADMIN` (R109) ; `SECRETAIRE_ADJOINT` et
  `RESPONSABLE_GROUPE` ont peu de permissions. (2) Tester un câblage de garde
  par un invariant « chaque route gardée par une permission que ≥1 rôle détient »
  + « aucun rôle légitime enfermé ». (3) Le test `route-state-wiring.test.ts`
  interdit tout champ `RouteState` inerte (retirer de `PENDING_WIRING` en câblant).

## R141.b/c — écriture gardée sur les tables non financières (2026-10-31, corrigé)
- **Défaut** : 8 tables gardaient INSERT/UPDATE/DELETE sur `is_org_member` SEUL
  → tout MEMBRE pouvait écrire via REST direct. Tables : `documents`,
  `event_tasks`, `report_definitions`, `custom_field_definitions`,
  `custom_field_values`, `form_definitions`, `form_submissions`, `categories`.
- **Mapping (aucune nouvelle permission)** : `documents`→`admin:settings` ;
  `event_tasks`→`event:update` ; `report_definitions`→`report:export` ; les
  autres→`admin:settings`. **`documents` n'avait AUCUN DELETE** (deny-all) →
  NE PAS en créer (ce serait une nouvelle capacité).
- **`role_assignments`** = table morte (0 référence client, hors sync-config) →
  hors périmètre.
- **Sûreté clé** : AUCUN write REST (`supabase.from`) pour ces tables → tout
  passe par PowerSync (`powersync_role` BYPASSRLS) → durcir la RLS REST ne peut
  PAS casser l'app. C'est le principe général de R137/R140/R141/R141.b-c.
- **Pièges preuve DEV** : `handle_new_user` crée le profil → insérer un
  `auth.users` jetable crée déjà le profil (ne pas réinsérer) ; `categories.type`
  ∈ {INCOME, EXPENSE} (CHECK, pas 'income') ; `org_memberships.user_id` a une FK
  vers `auth.users`. Toujours `BEGIN … SET LOCAL ROLE authenticated … ROLLBACK`.
- **Garde anti-dérive migrations** : ajouter une migration fait ÉCHOUER
  `migration-drift-guard.test.ts` → mettre à jour `docs/agent/migration-drift.json`
  (comptes 70/63/133 + `repo_filenames_sha256`).

## R17 — réconciliation dépôt ↔ base (2026-10-31, delta objets = 0)
- **Le tracker `schema_migrations` et les fichiers du dépôt sont deux
  historiques DISJOINTS** (2/79 versions communes). Ne PAS se fier au tracker
  seul ; recouper par OBJETS (tables/fonctions/triggers/vues).
- **`supabase db push` est INTERDIT** (rejouerait 63 migrations non tracées sur
  un schéma où leur contenu existe déjà). Appliquer via le MCP `apply_migration`
  (trace la version).
- **Audit 2026-10-31** : 40 tables / 39 fonctions / 31 triggers / 1 vue →
  après correction, **delta = 0**. Le seul absent (`agent_try_jsonb`) l'est
  **par conception** (DROP en fin de sa propre migration).
- **Écart trouvé** : le fichier historique `20260909000002_create_invitation_system.sql`
  n'a jamais été appliqué en l'état (remplacé par `invitation_system_v3`). 3
  objets manquaient : `mark_expired_invitations()` + 2 triggers `updated_at`
  sur `invitations`/`invitation_claims`. Redondants (expiration appliquée en
  ligne par `settle_invitation_claim`) mais recréés (migration
  `20261031000003`) pour fidélité exacte.
- **Instantané** `docs/agent/migration-drift.json` : mettre à jour comptes +
  `repo_filenames_sha256` + `repo_db_object_delta` + `drift_ratio` ; et
  `migration-drift-guard.test.ts` (assertion du ratio figée).

## Chantier autorisation d'ÉCRITURE — COMPLET (2026-10-31)
- 4 vagues : R137 (15 politiques) → R141 (14 tables financières, perm
  `finance:manage`) → R141.b/c (8 non financières) → **R141.d** (4 dernières :
  `invitation_claims`→`invitation:manage` ; `notifications`+`role_assignments`→
  `admin:settings`).
- **LAISSÉ volontairement** : `audit_entries` INSERT au niveau membre (journal
  de ses propres actions). `invitations` déjà gardée (`can_manage_invitations`).
- **Preuve RLS via MCP** : le MCP se connecte en `postgres` (BYPASSRLS) → il faut
  `SET LOCAL ROLE authenticated` + `set_config('request.jwt.claims', '{"sub":"<uuid>"}', true)`
  DANS une transaction, puis `ROLLBACK`. `has_permission` lit le rôle via
  `org_memberships` (PAS `profiles.role`).
- **Pattern de mapping** (table sans permission canon) : `admin:settings`.

## Audit d'écriture COMPLET (2026-10-31)
- Après R141.d, **1 seule** politique d'écriture hors garde de rôle :
  `org_reports_emitter` (`FOR ALL`, rôle `public`, `from_org_id=current_org_id()`).
  NON corrigée : bloquée par la décision de modèle `CENTRAL_ADMIN` (R109).
- Toutes les tables `public` ont RLS activée ; aucune politique d'écriture `anon`.
- Autres politiques hors garde = correctes : `profiles_*` (self, role immuable),
  `org_admins_*`/`orgs_update_merged` (`profiles.role='ADMIN'`), `invitation_claims_insert` (gardée).
- **Rôle : `has_permission` (DB) lit `org_memberships.role` ; l'UI legacy lit
  `profiles.role`.** `assignMemberRole` (`src/lib/orgAdmin.ts`) écrit
  `org_memberships` SEUL → l'UI legacy devient stale (R16/R62). Source unique =
  décision propriétaire.

## Mécanisme de la "dérive" migrations (R17) — VÉRIFIÉ 2026-10-31
- `supabase_apply_migration` (MCP) enregistre dans `schema_migrations` la version
  = **horodatage d'application** (YYYYMMDDHHMMSS), PAS le nom de fichier du dépôt.
  → une migration du dépôt appliquée via MCP apparaît comme une version
  DIFFÉRENTE : c'est la cause **structurelle** de la dérive (versions_in_common=2).
- Les OBJETS sont pourtant alignés (R17 : delta 0/0/0/0). **Mesurer l'alignement
  par OBJETS, jamais par version.** Tracker total = 80 (2026-10-31).
- Le snapshot `migration-drift.json` sert à détecter un CHANGEMENT côté dépôt
  (empreinte de noms), pas à mesurer l'alignement.

## Advisors Supabase (revus 2026-10-31)
- Sécurité : `rls_enabled_no_policy` (keep_alive + 2 `_jsonb_*` vides) = deny-all
  = faux positifs (R97) ; `keep_alive_ping` anon = intentionnel (anti-pause, sans
  paramètre) ; `upsert_profile` = **gardé** (`p_user_id=auth.uid()` + `is_org_admin`
  pour changer le rôle → aucune auto-escalade) ; `auth_leaked_password_protection`
  = action propriétaire (dashboard, pas SQL).
- Perf : `unindexed_foreign_keys` (event_tasks.event_id/parent_task_id) CORRIGÉ
  (migration 20261031000005, index mono-colonne car les index existants sont
  composites menés par org_id). `unused_index` = base dev sans trafic (ne pas
  supprimer) ; `multiple_permissive_policies` = redondance permissive (aucune faille).

## R17 — réconciliation par OBJETS (2026-10-31)
- Recoupement exhaustif dépôt↔base (tables/fonctions/triggers/vues) = 0 objet du
  dépôt manquant en base. Seule dérive : `public.org_federation` existait en base
  sans CREATE dépôt → recréée (migration 20261031000006, CREATE OR REPLACE VIEW
  préserve OID+grants, security_invoker=true).
- Objets DB sans CREATE dépôt (légitimes) : `keep_alive` (CREATE dans
  supabase/keep-alive.sql, hors migrations), `rls_auto_enable` (événement
  Supabase), `settle_pending_claims_for_invitation` (ALTER/REVOKE dans le dépôt,
  CREATE hors dépôt), `agent_try_jsonb` (DROP volontaire fin de sa migration).
- Tracker après 20261031000006 = 82 ; sha empreinte noms = d35c703a.

## Sauvegardes (état RÉEL, 2026-10-31)
- `backup.yml` est **ACTIF** : cron quotidien `0 3 * * *`, secrets
  `SUPABASE_DB_URL` (Session pooler) + `BACKUP_GPG_PASSPHRASE` configurés.
- Preuve : run **planifié** `41036453279` (2026-10-30) → artefact **chiffré**
  `supabase-backup-41036453279` (3,5 Mo, non expiré). Run manuel `40813667253`.
- Les docs qui disaient « INACTIVE/secrets absents » étaient **périmés** (R99,
  P31, B1, FEATURES, RUNBOOK, 00-RECON) — corrigés le 2026-10-31.
- Reste optionnel : rétention hors-site (dépôt privé → schedules 60 j).

## R12 — client Supabase unique (2026-10-31)
- `src/integrations/supabase/client.ts` **ré-exporte** `supabase` de
  `@/lib/auth` (`export { supabase } from "@/lib/auth"`). Ne JAMAIS y recréer
  un `createClient` (→ « Multiple GoTrueClient » + course sur `sb-<ref>-auth-token`).
- `SupabaseConnector` garde un client **non persistant** (persistSession:false).
- Garde : `supabase-single-client-guard.test.ts`.

## Contrat / boucle
- `docs/agent/PROGRESS.md` = contrat unique ; chaque fix dans le MÊME commit
  que sa ligne + un receipt sous `docs/agent/receipts/`.
- Dérive de statut = défaut récurrent : toujours vérifier l'en-tête d'un risque
  contre la preuve (GitHub API / DB) avant de le croire.

## PR15/PR16 (2026-10-31) — statistiques d'usage + centre d'aide
- **Environnement de test** : `src/lib/auth.ts:24` LÈVE si `VITE_SUPABASE_URL`
  / `VITE_SUPABASE_ANON_KEY` absents → ~104 tests / 33 fichiers échouent à
  tort. Remède : `.env.local` **gitignoré** avec valeurs factices. Ne jamais
  committer ce fichier ; sans lui, la suite complète est rouge pour une raison
  purement environnementale.
- **PR15** : `src/lib/usageStats.ts` (cœur pur). PIÈGE mesuré : le motif
  `namespace:slug` seul laisse passer `user:42` / `email:jean` — il FAUT une
  **liste blanche de namespaces** (`screen`, `action`). Le nettoyage
  (`sanitizeUsagePayload`) est appliqué à l'écriture ET à la lecture (stockage
  altéré ⇒ nettoyé). Kill switch `usage-stats` (fail-open).
- **PR16** : contenu du tutoriel extrait en **source unique**
  `src/lib/tutorialContent.ts` (importé par `Tutorial.tsx` ET `Help.tsx`).
  PIÈGE : `SECTIONS` référence `CHART_COLORS` → l'import `./utils` est
  obligatoire dans le module extrait, sinon `ReferenceError` au montage.
  `Tutorial.test.tsx` lit le littéral via `readFileSync` : après extraction, il
  faut pointer vers `../../lib/tutorialContent.ts` et changer `END_MARKER` en
  `// ─── Recherche (pure)`.
- **Non-vacuité — leçon** : une mutation n'est une preuve que si elle est
  OBSERVABLE. Retirer `if (!q) return sections;` de `searchSections` ne change
  RIEN (aiguille vide matche tout) → ne pas la retenir comme preuve ; muter le
  `return sections.filter(...)` la rend observable. Vérifier chaque mutation.
- **Lint** : le repo a ~1739 warnings pré-existants, 0 erreur ; `Tutorial.tsx`
  porte déjà des imports lucide inutilisés (`IonHeader`, `ChevronRight`…) — ne
  pas les attribuer à un nouveau lot.
- **`.openhands/memory/MEMORY.md` est SUIVI par git** et tronqué par des
  sessions antérieures → `git checkout --` avant de committer un PR.
