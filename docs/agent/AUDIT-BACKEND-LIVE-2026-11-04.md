# Audit backend LIVE — Supabase + PowerSync (2026-11-04)

> Investigation profonde menée **sur l'état réel** de la production (pas
> seulement sur les fichiers du dépôt). Méthode : MCP Supabase (SQL +
> advisors) sur `hhgovvrnalibhgpakswi`, PowerSync CLI
> (`PS_ADMIN_TOKEN=$POWERSYNC_TOKEN`, instance `Production`
> `6a9dd96302481fb31b945823`), et lecture du dépôt.
>
> Complète `RISQUES.md` (audit code). Ici : ce qui est **vérifié en base**.

---

## 1. Confirmations positives (le durcissement tient en PROD)

| Domaine | Constat LIVE |
|---|---|
| **Schéma client PowerSync ↔ colonnes DB** | **Delta NUL** sur 17 tables (transactions, events, members, groups, caisses, accounts, versements, cotisations, audit_entries, budget_lines, event_budgets, form_submissions, custom_field_values, group_memberships, org_units, documents, report_definitions). Aucune colonne cliente « en trop » ⇒ pas de cause d'échec de push silencieux. |
| **Sync rules PowerSync** | **Déployées == dépôt** : 43 streams, requêtes **sémantiquement identiques** (le diff texte n'est qu'un re-wrapping). R3 / R89.b sont **déployés**. |
| **Rôle de réplication** | `powersync_28d1d97617993b66d4ee0a3b` = `BYPASSRLS` + `LOGIN` + `REPLICATION`. `last checkpoint` récent, `Initial replication done: true`. |
| **RLS** | Activée sur **48/48 tables** (`relrowsecurity=true`). Aucune table publique sans RLS. |
| **Policies permissives `{public}`** | 3 résiduelles, toutes inoffensives pour `anon` : `event_tasks_select` (`is_org_member`), `org_reports_emitter`/`org_reports_receiver` (scopées `current_org_id()`). |
| **Écriture gardée en base (R137/R141)** | `transactions`, `accounts`, `caisses`, `org_budgets`, `org_settings` → `is_org_member(...) AND has_permission(...)`. |
| **`is_org_member` (live)** | Version durcie : sentinelle (`__no_org__`/`no-org`/vide → `false`) + `profiles` ∪ `org_memberships(ACTIVE,PENDING)` ∪ `org_admins(ACTIVE)`. |
| **`handle_new_user` (live)** | Version durcie : `role='MEMBRE'`, `org_id='__no_org__'`, `ON CONFLICT` (first/last name, email). |
| **RBAC** | `role_permissions` = **181 lignes / 15 rôles / 12 perms `invitation%`** (R105 corrigé). `has_permission` = deny > rôle canon ACTIF > grant allow. |
| **Intégrité données** | 0 FK orpheline (tx→categories, org_admins→profiles/orgs), 0 tx/events en org sentinelle, 9 catégories canoniques alignées (R89.a), `report_definitions.kind` présente (Issue #317). |
| **`audit_entries`** | **Append-only** : policies UPDATE/DELETE retirées (migration `20261030000001`, appliquée sous `20261030063307`) ⇒ deny-all. INSERT/SELECT seuls. |
| **Storage (R29)** | 4 buckets ; écritures scopées par org : `logos`/`archives`/`expense_proofs` → `is_org_member(foldername[1])`, `org_reports` → `foldername[2]`. `logos` public en lecture (attendu). |
| **Advisors sécurité** | Plus aucun « anon exécute SECURITY DEFINER » sauf `keep_alive_ping` (intentionnel, R97.b). Reste `auth_leaked_password_protection` (R104, plan gratuit). Aucun `rls_enabled_no_policy` hors faux positifs R97. |

---

## 2. Découvertes nouvelles / risques ouverts

### R-A [MOYEN-ÉLEVÉ] — La base de PRODUCTION sert de bac à sable E2E
- `cypress.yml` injecte les secrets `SUPABASE_URL` / `POWERSYNC_URL` **de
  production** dans le job E2E.
- Mesure live : **95 comptes** dont **93 en `@lumina.dev`**, **91 `ss-e2e-%`** ;
  **262 organisations vides sur 265** (86 « Self-Serve E2E », 174 « Annexe A/B »),
  créées à **chaque run CI** (les plus récentes datent de quelques minutes).
- Le nettoyage `cleanupTestArtifacts` est **non fatal** et **ne supprime ni les
  organisations ni les `auth.users`** ⇒ pollution illimitée.
- **Action** : projet Supabase de test dédié pour la CI ; purge des orgs
  `Self-Serve E2E %` / `Annexe %` et comptes `ss-e2e-%@lumina.dev`.

### R-B [MOYEN] — R8 (mot de passe en clair) × 91 comptes admin
- `cypress/support/orgCreds.ts` expose `E2e-Lumina!1` en clair ; **91 comptes
  distincts** détiennent des grants `org_admins` ACTIVE.
- **Action** : changer le mot de passe (ou comptes éphémères) + purge prod.

### R-C [FAIBLE] — `audit_entries_insert` = `is_org_member`
- Un membre peut **INSÉRER** des entrées d'audit arbitraires dans son org
  (falsification par ajout — l'altération/suppression est, elle, bloquée).
- **Action** : restreindre l'INSERT aux triggers `SECURITY DEFINER` (retirer la
  policy INSERT pour `authenticated`) si le client n'écrit pas d'audit
  directement.

### R-D [FAIBLE] — `org-central` sans grant `org_admins` ACTIVE
- Seule organisation sans admin ACTIVE : `org-central` (« Administration
  centrale Lumina », type CENTRAL, sans parent).
- Conséquence : le **broadcast** `onesignal-notify` (qui exige un grant ACTIVE
  sur `org-central`) est **inopérant**, et les branches centrales des policies
  `orgs_*` ne s'activent pas pour un opérateur central. Aucun compte n'est
  bloqué (les membres réels passent par `profiles`/`org_memberships`).
- **Action** : matérialiser un admin central (`org_admins` ACTIVE) ou basculer
  la vérification sur `profiles.role='ADMIN' AND org_id='org-central'`.

### R-E [FAIBLE] — Pas de rate-limit applicatif (R6, non corrigé)
- `signup` / `login` / `create_org` sans limitation de débit applicative.

### R-F [INFO] — Edge functions mortes
- `signup` (v11) et `login` (v11) sont **invoquées nulle part** côté client
  (seul `create_org` l'est). 5 fonctions déployées :
  `signup`, `login`, `create_org`, `onesignal-notify`, `report-error`.
- `verify_jwt:false` sur les 4 premières (auth applicative dans le corps).

### R-G [INFO] — Hygiène réplication
- 3 rôles `powersync_*` coexistent (`…28d1d976…` actif, `…90f6145d…`,
  `powersync_role` legacy), tous `BYPASSRLS`.

---

## 3. Dérive migrations dépôt ↔ base (R17) — mesure affinée

Le tracker expose la colonne `name` (slug). Comparaison **par nom** :

| Mesure | Valeur |
|---|---|
| Versions appliquées (tracker) | **92** |
| Noms appliqués distincts | **91** |
| Fichiers `.sql` du dépôt | **145** (82 horodatés + 63 séquentiels) |
| Slugs du dépôt distincts | **144** |
| **Slugs communs (appliqué ET fichier présent)** | **68** |
| Appliqués sans fichier correspondant (nom) | **23** |
| Fichiers jamais enregistrés comme appliqués | **76** |

- Les 23 noms « sans fichier » sont soit des variantes de nom
  (`event_tasks` vs `create_event_tasks`, `extend_settle_trigger_vN`),
  soit des **artefacts d'application via l'éditeur SQL** (le tracker enregistre
  un slug différent du fichier). Détail des 23 : `20260911000001_…`,
  `create_org_federation_view`, `error_report_dedupe_release`, `event_tasks`,
  `event_tasks_full`, `extend_settle_trigger_v2..v7`, `extend_settle_trigger_b5`,
  `fix_grants_tags_rls_org_scoping`, `fk_covering_indexes_event_tasks`,
  `invitation_system_v3`, `onboarding_rls_and_rpc`,
  `org_memberships_unique_all/fix`, `r109_admin_role_canonical`,
  `r137_rls_write_permission`, `r141_fix_org_units_to_admin_settings`,
  `rbac_invitation_permissions_mirror`, `settle_claim_trigger_only_guard`.
- Les 76 « fichiers non appliqués » = l'historique séquentiel `NNNN_*` (0000→0062)
  plus des migrations horodatées « abandonnées ».
- **Conclusion** : la dérive reste **ouverte** (dépôt ≠ tracker) même si le
  **delta d'objets** (tables/fonctions/triggers/vues) mesuré le 2026-10-31 est
  **nul**. `supabase db push` reste à proscrire sans revue.

---

## 4. Logique applicative (offline-first)

- PowerSync = **source unique de lecture** (42 tables locales) ; RLS Supabase
  = **source unique d'autorisation** ; `has_permission` DB ↔ `evaluatePermission`
  TS = même décision.
- `pushCrudTransaction` : filtre les colonnes au schéma client
  (`filterOpDataToSchema`), coercition jsonb + acteurs uuid, backfill des
  `NOT_NULL_DEFAULTS`, puis :
  - **FATAL** (42501 / 23xxx / 22xxx) → op **jetée** mais **journalisée**
    (`recordRejectedSyncOp` + `reportError`, source `powersync-fatal`),
    `transaction.complete()` appelé (pas de blocage de file).
  - **Non-FATAL** (401/429/5xx réseau) → `throw` (retry PowerSync).
- `ensureUploadSession()` : re-mirror de la session Supabase dans le client du
  connecteur avant chaque upload (évite un 401 après reconnexion).
- Boot local-first + `isOfflineLikeError` (5xx/429 transitoires) + reprise de
  session : livrés par PR #419 (commit `e42a6882`), CI verte.

---

## 5. Plan d'action recommandé (priorité)

1. **Isoler la CI** : projet Supabase de test dédié + purge des artefacts E2E
   en prod (`Self-Serve E2E %`, `Annexe %`, `ss-e2e-%@lumina.dev`).
2. **Révoquer** `E2e-Lumina!1` (ou comptes E2E éphémères).
3. **Matérialiser un admin central** (`org-central`) ou corriger la garde
   broadcast.
4. **Durcir `audit_entries_insert`** (retirer l'INSERT client si inutile).
5. Trancher **R16/R62** (source unique de rôle) et **R17** (régulariser
   l'historique).
6. R5 (RGPD), R6 (rate-limit), R104 (plan Pro), R13 (fuites d'abonnements).

---

## 6. Notifications + défenses financières (compléments 2026-11-04)

### R-H [MOYEN] — « Marquer comme lu » est inopérant (RLS + client)
- `notifications_update` (RLS live) = `is_org_member(...) AND
  has_permission(..., 'admin','settings')`. Un **TREASURIER / PASTEUR /
  ANCIEN** ne peut donc **pas** mettre `is_read=true` (seul un admin
  `admin:settings` le peut).
- Côté client, `markNotificationRead` / `markAllNotificationsRead`
  (`src/lib/notification-service.ts` → `useLocalStore`) **ne mettent à jour
  que l'état React en mémoire** — **aucune** écriture PowerSync/Supabase.
- Résultat : cliquer « lu » n'a **aucun effet persistant** ; toutes les
  notifications redeviennent non lues au reload/à la resynchro.
- **Action** : soit écrire `is_read` via PowerSync (UPDATE), soit assouplir la
  policy à `is_org_member` (voire par destinataire), soit assumer « non lu
  permanent ».

### R-I [FAIBLE] — Notification de transaction PENDING en double
- Deux triggers `AFTER INSERT` sur `transactions` tirent quand `status='PENDING'` :
  `on_transaction_change` → `notify_transaction_change` (`TRANSACTION_SUBMITTED`)
  **et** `on_transaction_pending` → `create_pending_transaction_notification`
  (`TRANSACTION_PENDING`). Preuve en base : 32 `TRANSACTION_SUBMITTED` + 32
  `TRANSACTION_PENDING` (mêmes 32 transactions).
- **Action** : supprimer l'un des deux triggers (garder un seul chemin).

### R-J [FAIBLE] — Montant BRUT dans la notification PENDING
- `create_pending_transaction_notification` concatène `NEW.amount` **brut**
  (stocké en **centimes**) → « 5 000 000 FCFA » pour 50 000 FCFA.
- Le correctif B-07 (`20261103000001_fix_notify_transaction_amount_display`) n'a
  patché **que** `notify_transaction_change` — la fonction PENDING (chemin
  redondant R-I) garde le bug.
- **Action** : corriger aussi `create_pending_transaction_notification`
  (`NEW.amount / 100` + `to_char`), ou la supprimer (cf. R-I).

### R-K [FAIBLE-MOYEN] — Contrôles financiers côté CLIENT uniquement
- **Maker-checker** (anti auto-approbation) : `canApprove` est une règle PURE
  appelée dans `dataLayer` avant l'approbation. **Aucune** contrainte DB, RLS
  ou trigger ne l'applique.
- **Gel de période** (`period-lock`) : `assertTransactionWritable` /
  `assertPeriodOpen` sont **côté client**. Aucun trigger/contrainte sur
  `transactions` ne bloque une date ≤ `period_locked_until`.
- Conséquence : un client direct (ou un utilisateur avec `transaction:approve`)
  peut **auto-approuver** sa transaction et **écrire dans une période gelée**
  via REST/PowerSync en contournant l'app. `org_settings` ne contient aujourd'hui
  **aucune** ligne (donc les deux options sont **désactivées** par défaut).
- **Action** : porter ces règles en base (trigger `BEFORE INSERT/UPDATE` sur
  `transactions`) si l'on veut une garantie serveur, ou documenter
  l'acceptation du risque (contrôle « procédural » côté app).

### Confirmations positives (contrôles d'exécution RPC)
- `settle_invitation_claim` : **non exécutable** par `anon` **ni**
  `authenticated` (trigger-only) — surface RPC fermée.
- `claim_error_report` / `release_error_report` / `register_anonymous_report` :
  non exécutables par `anon`/`authenticated` (service_role / trigger).
- Invitations : SELECT/INSERT/UPDATE/DELETE gardés par `can_manage_invitations`
  (R15/R87 tenus).
- `keep_alive_ping` : exécutable par `anon` = **intentionnel** (R97.b, ping de
  réveil, `search_path=""`).

---

## 7. Correctifs APPLIQUÉS en production (2026-11-04)

### ✅ R-I + R-J — doublon PENDING + montant ×100 (résolu)
- **Migration** `20261104000001_drop_duplicate_pending_notification_trigger.sql`
  appliquée via MCP (`apply_migration`) → `DROP TRIGGER on_transaction_pending`
  + `DROP FUNCTION create_pending_transaction_notification`.
- **Vérifié en base** : triggers restants sur `transactions` =
  `on_transaction_change`, `on_transaction_approved`,
  `prevent_approved_transaction_delete`. La fonction PENDING n'existe plus.
- Effet : une seule notification par transaction PENDING
  (`TRANSACTION_SUBMITTED`, montant correct /100).

### ✅ R-H — « marquer comme lu » persistant (résolu)
- **Migration** `20261104000002_notifications_read_policy.sql` : policy
  `notifications_update` → `is_org_member(auth.uid(), org_id)` (USING + WITH
  CHECK) ; `REVOKE UPDATE` puis `GRANT UPDATE (is_read)` (privilège colonne).
- **Vérifié en base** : `notifications_update` qual =
  `is_org_member(auth.uid(), org_id)` ; colonnes UPDATE autorisées pour
  `authenticated` = `{is_read}` uniquement. INSERT/DELETE restent `admin:settings`.
- **Client** : `useLocalStore.markNotificationRead` /
  `markAllNotificationsRead` écrivent désormais `is_read=1` dans PowerSync
  (UPDATE local) avant le `set()` mémoire ; la page `Notifications.tsx` passe
  par le store (plus par les fonctions pures sans effet).
- **Gardes** : `r-h-notification-read.test.ts` ; exceptions justifiées ajoutées
  dans `pr18-write-permission-guard.test.ts` et `r141d-write-permission-guard.test.ts`.

### Dérive migrations (R17) re-mesurée
- Tracker : 94 versions (92 + 2) ; fichiers dépôt : 84 horodatés / 63
  séquentiels / 147 total ; `drift_ratio` 2/94 ; empreinte de noms mise à jour
  (`docs/agent/migration-drift.json`).
- Versions tracker des 2 migrations (horodatage d'application, dérive
  structurelle connue) : `20261105124717`, `20261105125246`.

### Reste à traiter (non corrigé)
- **R-K** : maker-checker + gel de période côté client uniquement (pas de
  trigger DB) — décision produit requise.
- **R-H (suite)** : notifications historiques déjà lues non backfillées (sans
  objet), et le libellé « lu » n'est pas par-utilisateur (compteur d'org).
- **R104 / R8 / CI-prod partagée** : voir sections précédentes.
