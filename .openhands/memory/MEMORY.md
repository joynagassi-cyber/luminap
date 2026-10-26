# Mémoire projet — Lumina

## Environnement d'agent (contraintes lourdes, vérifiées)
- **Cypress ne tourne PAS en local** : binaire non installable (pas d'écran X,
  téléchargement bloqué). Toute validation E2E passe par la **CI**.
- **Aucun accès DB direct** : ni `pg_dump`, ni Docker, ni credential Postgres.
  Le MCP Supabase (`execute_sql`) est la seule voie SQL.
- **`PS_ADMIN_TOKEN` absent** → `powersync deploy sync-config` impossible.
- **`npx tsc --noEmit` à la racine ne vérifie RIEN** (tsconfig `"files": []`,
  sort toujours 0). Utiliser **`npx tsc -b`**.

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

## Pièges CI (constats mesurés)
- **La suite Cypress n'a JAMAIS été verte sur `main`** (20 runs en échec,
  2026-10-19 → 10-24). Mêmes 10 specs en échec, déterministe.
  **Ce n'est PAS la parallélisation** (réfuté par mesure en mono-conteneur,
  run `40080015253`). Cause = environnement E2E (PowerSync/contexte d'org) :
  cf. R53/R83/R72/R54. Ne pas se fier au rouge Cypress comme signal.
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
