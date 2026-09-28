# Autonoma — test data integration (checklist)

> Checklist de l'implémentation du Environment Factory Autonoma
> (`POST /api/autonoma`, SDK `@autonoma-ai/sdk` + adaptateur
> `@autonoma-ai/server-node`).
> Contrat : `node_modules/@autonoma-ai/server-node/docs/{implement,factories,validation}.md`.

SDK endpoint path: /api/autonoma

## Architecture

L'app est offline-first : toutes les écritures passent par
`executeWrite(sql, params)` (PowerSync, placeholders `?`) dans
`src/lib/dataLayer.ts`, et les services (`src/lib/*.ts`,
`src/capabilities/*`) appellent les fonctions `*PS`.

Côté serveur Nitro :

- **`server/autonoma/pg-db.ts`** — client `pg` (Supabase PG,
  `SUPABASE_DB_URL` ou `PS_DB_HOST` + `PS_DATABASE_PASSWORD`) exposant
  `pgExecute(sql, params)` qui convertit `?` → `$1…$n` :
  l'équivalent serviciel de `getPowerSyncDatabase().execute()`.
- **`server/autonoma/writes.ts`** — plan d'écriture serviciel : chaque
  fonction répète le SQL exact de la `*PS` correspondante
  (`addTransactionPS`, `createGroupPS`, `createInvitationPS`, …)
  sans les side-effects navigateur (`localStorage`, `generateId()`
  base36), avec des ids déterministes retournables dans `refs`.
- **`server/autonoma/factories.ts`** — 37 factories, 1:1 avec l'entity
  audit. Chaque factory appelle `writes.ts` et retourne `{ id, ... }`.
  Teardown = scoped-delete par clé (la `down` de l'SDK les inverse).
- **`server/autonoma/auth.ts`** — `auth` du runner : renvoie les
  credentials réelles du user seedé (email du profile + password de
  l'env `AUTONOMA_TEST_PASSWORD`, semé via le signup Supabase du
  compte de test — jamais un placeholder).
- **`server/middleware/autonoma.ts`** — montage du handler SDK
  (`createNodeHandler`), gate HMAC par `AUTONOMA_SHARED_SECRET`.

> `@powersync/web` est browser-only (SQLite WASM) : les factories
> n'appellent JAMAIS les composants React / hooks, uniquement le SQL
> écriture via `pg` direct. Les champs temporels sensibles (« now »)
> sont des offsets relatifs, calculés au moment de l'`up`
> (factory-side), jamais de dates absolues commutées.

### Traitement des colonnes uuid

La base Supabase (PG) utilise des colonnes `uuid` pour :
`profiles.id`, `org_memberships.user_id`, `org_admins.admin_profile_id`,
`invitations.id`, `invitation_claims.{id, invitation_id, resulting_user_id}`,
`notifications.id`, `role_assignments.id`, `grants.{id, granted_by}`,
`tags.id`, `tag_assignments.{id, tag_id, user_id, assigned_by}`,
`audit_entries.user_id`, `transactions.{created_by_id, approved_by_id}`.

Les ids du scénario sont des **slugs** (`user-admin-{{testRunId}}`) qui ne
sont pas des uuid. La factory convertit chaque slug en **uuid v5
déterministe** (namespace Lumina `6ba7b810-…`) via `slugToUuid()`,
ainsi le même slug produit toujours le même uuid. La `refs` renvoyée
garde le slug d'origine dans `id` (le scénario y fait référence) et
stocke l'uuid PG réel dans `internalId` — le teardown opère sur
`internalId` via `teardownByInternal`.

Les colonnes uuid non-liées à un id de scénario
(`audit_entries.user_id`, `grants.granted_by`,
`tag_assignments.assigned_by`, `invitation_claims.resulting_user_id`
par défaut, `transactions.created_by_id/approved_by_id`)
reçoivent `slugToUuid("seed-user")` (uuid de seed fixe,
déterministe, jamais de secret).

### Cascade par org_id

Le teardown racine `organizations` delete toutes les tables
ayant une colonne `org_id` (ordre enfants → parents).
`event_budgets`, `budget_lines` et `group_memberships` n'ont **pas**
de colonne `org_id` — leur teardown est fait par les factories
spécifiques (l'SDK `down` inverse l'ordre de création, donc
`group_memberships` est supprimé avant `groups`, `budget_lines`
avant `event_budgets`).

## Checklist

### Factories (par nom, d'après l'entity audit)
- [x] organizations — `createOrganizationPS` (+ statut `ACTIVE` via update)
- [x] profiles — insert inline (mirror du trigger `handle_new_user`)
- [x] org_memberships — insert inline (dataLayer)
- [x] org_admins — `grantOrgAdminPS`
- [x] org_units — `createGroupPS` (4 lignes id partagée, `skipOrgUnit` option)
- [x] groups — `createGroupPS`
- [x] group_memberships — `addGroupMembershipPS`
- [x] members — `addMemberPS` (`persistCreateMember`)
- [x] accounts — insert inline `createGroupPS` / main account
- [x] caisses — insert inline `createGroupPS`
- [x] categories — insert inline (dataLayer)
- [x] transactions — `addTransactionPS` (`persistAddTransaction`)
- [x] versements — `createVersement` (+ paired transactions)
- [x] events — `addEventPS` (`persistAddEvent`)
- [x] event_budgets — insert inline
- [x] budget_lines — insert inline
- [x] cotisations — `addCotisationPS`
- [x] org_budgets — `budgets.create`
- [x] org_budget_lines — `budgets.addLine`
- [x] giving_donors — `giving.createDonor`
- [x] giving_campaigns — `giving.createCampaign`
- [x] pledges — `giving.recordPledge`
- [x] tax_receipts — `giving.generateTaxReceipt`
- [x] transaction_giving — `giving.linkGive`
- [x] invitations — `createInvitationPS`
- [x] invitation_claims — `claimInvitationPS`
- [x] notifications — insert inline (dataLayer)
- [x] audit_entries — `writeAudit`
- [x] role_assignments — insert inline (dataLayer)
- [x] report_definitions — `reportDefinitionRepo.create`
- [x] form_definitions — `createFormDefinitionPS`
- [x] form_submissions — `createFormSubmissionPS`
- [x] custom_field_definitions — `createCustomFieldDefinitionPS`
- [x] custom_field_values — `upsertCustomFieldValuePS`
- [x] tags — `createTagPS`
- [x] tag_assignments — `assignTagPS`
- [x] grants — `createGrantPS`

### Socle
- [x] Endpoint `/api/autonoma` via handler SDK
- [x] Teardown (scoped-delete)
- [x] Auth callback (credentials réelles, non placeholder)
- [x] Maintenance note (CLAUDE.md)
- [ ] Full-recipe pass (up + down) — en attente de l'env live
- [ ] Concurrency proof (`--repeat 3`) — en attente de l'env live
- [x] `sdk check` sur `recipe.json` → `ok: true` (37 entities, 120 records, 0 problems)
- [ ] Branch poussée + PR ouverte

## Limitations / notes

- `@powersync/web` n'expose pas d'API Node (SQLite WASM) — `writes.ts`
  réplique le plan SQL de chaque `*PS` sur `pg` direct. Les hooks React
  (useQuery, etc.) ne sont JAMAIS appelés par une factory : un factory
  ne fait que du SQL de création (pas de composants React).
- `createOrganizationPS` insère en statut `PENDING` (registre) ; le
  scénario attend `ACTIVE` → la factory fait `PENDING` puis `UPDATE`
  `ACTIVE` (équivalent de `setOrganizationStatusPS`).
- Les dates relatives du scénario (« 1 year before seeding »,
  « 30 days after seeding ») sont des **offsets factory-side**
  (champs `*DaysOffset` / `joinedDaysAgo` en entrée des factories) —
  calculés par `new Date()` au moment de l'`up`, jamais commutés.
- **Slugs vs uuid** : les ids du scénario sont des slugs (ex.
  `user-admin-{{testRunId}}`), mais les colonnes `uuid` PG exigent
  des vrais uuid. `slugToUuid()` convertit chaque slug en uuid v5
  déterministe. La `refs` expose le slug dans `id` (pour le
  scénario) et l'uuid PG dans `internalId` (pour le teardown).
  Toute factory qui insère dans une colonne uuid via le slug du
  scénario doit passer par `slugToUuid()` — ne jamais insérer un
  slug dans une colonne uuid directement.
- **Teardown cascade par org** : `event_budgets`, `budget_lines` et
  `group_memberships` n'ont pas de colonne `org_id` — leur
  suppression est assurée par les factories dédiées (l'SDK `down`
  inverse l'ordre de création). La teardown racine `organizations`
  ne delete que les tables ayant une colonne `org_id`.
- **Env live (SUPABASE_DB_URL)** : le endpoint `/api/autonoma` a
  besoin d'une connexion PG à la base Supabase pour les factories.
  Les secrets restants à fournir côté preview Vercel :
  - `SUPABASE_DB_URL` — `postgres://postgres:***@db.<ref>.supabase.co:5432/postgres?sslmode=require`
  - `PS_DATABASE_PASSWORD` — mot de passe du pooler Supabase
  - `AUTONOMA_TEST_EMAIL` + `AUTONOMA_TEST_PASSWORD` — compte de test
    (semé par le trigger `handle_new_user` sur `auth.users`)
  Les commandes de validation `sdk up` / `sdk down` / `--repeat 3`
  ne peuvent pas s'exécuter en local (la base Supabase n'est pas
  joignable par TCP depuis le poste de dev). Elles doivent être
  lancées depuis un environnement qui a accès à `SUPABASE_DB_URL`.
