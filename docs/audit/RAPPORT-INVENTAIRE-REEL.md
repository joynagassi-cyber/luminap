# Rapport d'Inventaire Réel — Lumina

> Date : 2026-09-05
> Objet : État réel du codebase et de la base Supabase

---

## 1. Tables Supabase Réelles

### 1.1 Invention exhaustive (20 tables)

| # | Table | Colonnes clés | RLS | Index | Triggers |
|---|-------|--------------|-----|-------|----------|
| 1 | `accounts` | id, org_id, owner_type, owner_id, name, currency, status, archived_at, archived_by, archive_reason, created_at, updated_at | ✅ (open_all) | pkey, idx_accounts_org_id, idx_accounts_owner | Aucun |
| 2 | `audit_entries` | id, org_id, transaction_id, user_id, action, entity_type, entity_id, comment, created_at, before_state, after_state, actor_role_at_time | ✅ (open_audit_insert/select) | pkey, FK audit_entries_transaction_id_fkey | Aucun |
| 3 | `budget_lines` | id, event_budget_id, category_id, planned_amount_cents, actual_amount_cents, created_at | ✅ (bl_open_all) | pkey, idx_bl_budget, idx_bl_category | Aucun |
| 4 | `caisses` | id, name, description, type, color, org_id, created_at, updated_at | ✅ (caisses_select/insert/update/delete) | pkey, idx_caisses_org_id | Aucun |
| 5 | `categories` | id, key, label_fr, type, org_id, created_at | ✅ (open_cat_*) | pkey | Aucun |
| 6 | `custom_field_definitions` | id, org_id, entity_type, key, label, type, options, order, created_at | ✅ (cfd_open_all) | pkey | Aucun |
| 7 | `custom_field_values` | id, entity_type, entity_id, custom_field_definition_id, value, created_at, updated_at | ✅ (cfv_open_all) | pkey, idx_cfv_entity | Aucun |
| 8 | `event_budgets` | id, event_id, currency, revised_at, revised_by, created_at | ✅ (eb_open_all) | pkey | Aucun |
| 9 | `events` | id, org_id, name, description, start_date, end_date, status, budget, budget_items (jsonb), created_at, updated_at | ✅ (events_open_all) | pkey | Aucun |
| 10 | `form_definitions` | id, org_id, key, name, description, version, target_entity_type, status, fields (jsonb), created_at, updated_at | ✅ (fd_open_all) | pkey, form_definitions_key_key | Aucun |
| 11 | `form_submissions` | id, org_id, form_definition_id, form_version, submitted_by, submitted_at, data (jsonb), linked_entity_type, linked_entity_id, status, created_at | ✅ (fs_open_all) | pkey, idx_fs_form, idx_fs_entity | Aucun |
| 12 | `group_memberships` | id, member_id, group_id, role_in_group, joined_at, left_at, created_at | ✅ (gm_open_all) | pkey, idx_gm_group, idx_gm_member | Aucun |
| 13 | `groups` | id, org_id, name, parent_group_id, responsable_member_id, status, archived_at, archived_by, archive_reason, created_at, updated_at | ✅ (groups_open_all) | pkey, idx_groups_org_id, idx_groups_parent | Aucun |
| 14 | `members` | id, org_id, first_name, last_name, phone, email, status, joined_at, archived_at, archived_by, archive_reason, created_at, updated_at | ✅ (members_open_all) | pkey, idx_members_org_id | Aucun |
| 15 | `notifications` | id (uuid), org_id, action_type, title, message, is_read, source_transaction_id, created_at | ✅ (notifications_*) | pkey | trigger `notify_transaction_change` (sur transactions) |
| 16 | `org_units` | id, name, type, org_id, created_at, description, is_active | ✅ (open_ou_*, org_units_open_all) | pkey | Aucun |
| 17 | `profiles` | id (uuid, FK auth.users), email, first_name, last_name, role, org_id, created_at, updated_at | ✅ (profiles_* policy : auth.uid()=id) | pkey | trigger `handle_new_user` (sur auth.users) |
| 18 | `report_definitions` | id, org_id, name, data_source, dimensions (text[]), metrics (text[]), filters (jsonb), group_by (text[]), sort_by, saved_by, is_template, created_at, updated_at | ✅ (rd_open_all) | pkey | Aucun |
| 19 | `role_assignments` | id (uuid), session_id, role, org_id, created_at | ✅ (role_assignments_*, avec anonyme) | pkey, role_assignments_session_id_key | Aucun |
| 20 | `transactions` | id, org_id, type, amount, description, date, status, category_id, org_unit_id, compensates_for, comment, version, created_by_id, approved_by_id, created_at, updated_at, approved_at, event_id, source, person_name, source_caisse_id, versement_id, reversal_of_id | ✅ (open_tx_*) | pkey, idx_transactions_reversal_of_id, idx_transactions_source_caisse_id, idx_transactions_versement_id | trigger `notify_transaction_change` |
| 21 | `versements` | id, org_id, from_account_id, to_account_id, amount_cents, date, status, created_by, approved_by, approved_at, created_at | ✅ (versements_open_all) | pkey, idx_versements_from, idx_versements_org_id, idx_versements_status, idx_versements_to | Aucun |

### 1.2 Contraintes FK critiques

| Table | Colonne | FK vers | Constraint |
|-------|---------|---------|------------|
| `accounts` | — | — | Aucune FK externe (owner_type+owner_id sont des champs libres) |
| `audit_entries` | `transaction_id` | `transactions.id` | `audit_entries_transaction_id_fkey` |
| `budget_lines` | `event_budget_id` | `event_budgets.id` | `budget_lines_event_budget_id_fkey` |
| `budget_lines` | `category_id` | `categories.id` | `budget_lines_category_id_fkey` |
| `custom_field_values` | `custom_field_definition_id` | `custom_field_definitions.id` | `custom_field_values_custom_field_definition_id_fkey` |
| `event_budgets` | `event_id` | `events.id` | `event_budgets_event_id_fkey` |
| `form_submissions` | `form_definition_id` | `form_definitions.id` | `form_submissions_form_definition_id_fkey` |
| `group_memberships` | `member_id` | `members.id` | `group_memberships_member_id_fkey` |
| `group_memberships` | `group_id` | `groups.id` | `group_memberships_group_id_fkey` |
| `groups` | `parent_group_id` | `groups.id` | `groups_parent_group_id_fkey` (auto-référence) |
| `groups` | `responsable_member_id` | `members.id` | `groups_responsable_member_id_fkey` |
| `transactions` | `org_unit_id` | `org_units.id` | `transactions_org_unit_id_fkey` |
| `transactions` | `category_id` | `categories.id` | `transactions_category_id_fkey` |
| `transactions` | `reversal_of_id` | `transactions.id` | `transactions_reversal_of_id_fkey` (auto-référence) |
| `transactions` | `compensates_for` | `transactions.id` | `transactions_compensates_for_fkey` |
| `transactions` | `created_by_id` | `auth.users.id` | `transactions_created_by_id_fkey` |
| `transactions` | `approved_by_id` | `auth.users.id` | `transactions_approved_by_id_fkey` |
| `versements` | `from_account_id` | `accounts.id` | `versements_from_account_id_fkey` |
| `versements` | `to_account_id` | `accounts.id` | `versements_to_account_id_fkey` |

### 1.3 Triggers

| Trigger | Table | Fonction |
|---------|-------|----------|
| `on_transaction_change` | `transactions` | `notify_transaction_change()` — insère une notification + entrée audit à chaque INSERT/UPDATE/DELETE |
| `on_auth_user_created` | `auth.users` | `handle_new_user()` — crée un profil automatique |

### 1.4 RLS Résumé

Toutes les tables sont en RLS. Les 4 tables sans politique `open_all` (transactions, audit_entries, notifications, role_assignments) ont des politiques par commande (INSERT/SELECT/UPDATE/DELETE) séparées. `profiles` est la seule table avec des politiques authentifiées spécifiques (`auth.uid() = id`).

---

## 2. Modèles Frontend Réels

### 2.1 Types TypeScript (`src/types/index.ts`)

| Type | Utilisé | Fichiers référençant |
|------|---------|----------------------|
| `Transaction` | ✅ | `src/store/useLocalStore.ts`, `src/lib/api.ts`, `src/pages/*.tsx` |
| `Category` | ✅ | `src/store/useLocalStore.ts`, `src/pages/TransactionNew.tsx` |
| `OrgUnit` | ✅ | `src/store/useLocalStore.ts`, `src/pages/Groups.tsx` |
| `Caisse` | ✅ | `src/store/useLocalStore.ts`, `src/pages/Dashboard.tsx`, `src/pages/Versement.tsx` |
| `Event` | ✅ | `src/store/useLocalStore.ts`, `src/pages/EventDetail.tsx` |
| `AuditEntry` | ✅ | `src/store/useLocalStore.ts`, `src/lib/audit.ts` |
| `Member` | ✅ | `src/store/useLocalStore.ts`, `src/pages/Members.tsx` |
| `Group` | ✅ | `src/store/useLocalStore.ts`, `src/pages/Groups.tsx`, `src/pages/GroupDetail.tsx` |
| `Account` | ✅ | `src/store/useLocalStore.ts`, `src/lib/account.ts` |
| `GroupMembership` | ✅ | `src/store/useLocalStore.ts` |
| `Versement` | ✅ | `src/types/index.ts` (défini mais NON utilisé dans le store) |
| `EventBudget` | ✅ | `src/types/index.ts` (défini mais NON utilisé dans le store) |
| `BudgetLine` | ✅ | `src/types/index.ts` (défini mais NON utilisé dans le store) |
| `ReportDefinition` | ✅ | `src/types/index.ts`, `src/lib/reporting.ts`, `src/pages/Reports.tsx` |
| `FormDefinition` | ✅ | `src/types/index.ts`, `src/lib/formSystem.ts` |
| `FormSubmission` | ✅ | `src/types/index.ts`, `src/lib/formSystem.ts` |
| `FormFieldDefinition` | ✅ | `src/types/index.ts` (défini dans FormDefinition) |
| `CustomFieldDefinition` | ✅ | `src/types/index.ts`, `src/lib/customFields.ts` |
| `CustomFieldValue` | ✅ | `src/types/index.ts`, `src/lib/customFields.ts` |
| `ArchivePolicy` / `ArchivableEntity` | ✅ | `src/lib/archiveService.ts` |
| `RoleAssignment` | ✅ | `src/types/index.ts`, `src/store/useLocalStore.ts` |
| `NotificationItem` | ✅ | `src/store/useLocalStore.ts`, `src/pages/Notifications.tsx` |

### 2.2 Stores IndexedDB (`src/lib/db.ts`)

| Store | Clé | Ligne |
|-------|-----|-------|
| `transactions` | `id` | ligne 21 |
| `categories` | `id` | ligne 22 |
| `orgUnits` | `id` | ligne 23 |
| `auditEntries` | `id` | ligne 24 |
| `events` | `id` | ligne 25 |
| `syncQueue` | `id` | ligne 26 |
| `config` | `key` | ligne 27 |
| `caisses` | `id` | ligne 28 |
| `notifications` | `id` | ligne 29 |
| `members` | `id` | ligne 30 |
| `groups` | `id` | ligne 31 |
| `accounts` | `id` | ligne 32 |
| `group_memberships` | `id` | ligne 33 |
| `versements` | `id` | ligne 34 |
| `event_budgets` | `id` | ligne 35 |
| `budget_lines` | `id` | ligne 36 |
| `report_definitions` | `id` | ligne 37 |
| `form_definitions` | `id` | ligne 38 |
| `form_submissions` | `id` | ligne 39 |
| `custom_field_definitions` | `id` | ligne 40 |
| `custom_field_values` | `id` | ligne 41 |

### 2.3 Zustand Store (`src/store/useLocalStore.ts`)

| État | Utilisé dans |
|------|-------------|
| `transactions` | Dashboard, Finance, GroupDetail, Versement, TransactionNew, TransactionDetail |
| `categories` | TransactionNew, Finance |
| `orgUnits` | Groups, GroupDetail |
| `caisses` | Dashboard, GroupDetail, Versement |
| `events` | Events, GroupDetail (versements) |
| `auditEntries` | History (non vérifié — à confirmer) |
| `notifications` | Notifications, Dashboard |
| `members` | Members, GroupDetail (memberships) |
| `groups` | Groups, GroupDetail |
| `accounts` | GroupDetail, Reports (non vérifié) |
| `memberships` | GroupDetail, Members (non vérifié) |
| `caisses` (sync) | `src/lib/sync.ts` — handlers pour caisses, orgUnits, notifications |

---

## 3. Tableaux morts ou quasi-morts

| Entité | Code existant | Utilisé dans UI | Verdict |
|--------|--------------|-----------------|---------|
| `Versement` (store) | Oui, déf. + store | **Non** — Versement.tsx utilise les transactions directement | **MORT** |
| `EventBudget` (store) | Oui, déf. + store | **Non** — les budgets sont dans `events.budgetItems` | **MORT** |
| `BudgetLine` (store) | Oui, déf. + store | **Non** — pas d'utilisation | **MORT** |
| `ReportDefinition` (UI) | Oui, dans `src/lib/reporting.ts` | **Partiel** — Reports.tsx fait du calcul direct, pas d'UI builder | **FAIBLEMENT UTILISÉ** |
| `FormDefinition` / `FormSubmission` | Oui, `src/lib/formSystem.ts` | **Non** — pas de page UI dédiée | **MORT** |
| `CustomFieldDefinition` / `CustomFieldValue` | Oui, `src/lib/customFields.ts` | **Non** — pas de page UI dédiée | **MORT** |
| `Account` (store) | Oui, dans `useLocalStore.ts` | **Non** — pas de page UI dédiée | **FAIBLEMENT UTILISÉ** |
| `GroupMembership` | Oui, dans `useLocalStore.ts` | **Non** — pas de UI | **MORT** |
| `ArchiveService` / `ArchiveRegistry` | Oui, `src/lib/archiveService.ts` | **Non** — pas d'intégration UI | **MORT** |

---

## 4. Tables Supabase non couvertes par IndexedDB

| Table Supabase | Couverte par IndexedDB | Note |
|---------------|----------------------|------|
| `profiles` | ✅ (via `config` store, role assignments) | Tables `role_assignments` aussi |
| `role_assignments` | ✅ (via `config` store) | Non sync vers cloud |
| `notifications` | ✅ | Sync cloud implémenté |
| `accounts` | ✅ | **Pas de sync cloud** dans `sync.ts` |
| `versements` | ✅ (store) | **Pas de sync cloud** dans `sync.ts` — le store a le store mais pas de handler sync |
| `event_budgets` | ✅ (store) | **Pas de sync cloud** |
| `budget_lines` | ✅ (store) | **Pas de sync cloud** |
| `form_definitions` | ✅ (store) | **Pas de sync cloud** |
| `form_submissions` | ✅ (store) | **Pas de sync cloud** |
| `custom_field_definitions` | ✅ (store) | **Pas de sync cloud** |
| `custom_field_values` | ✅ (store) | **Pas de sync cloud** |
| `report_definitions` | ✅ (store) | **Pas de sync cloud** |
| `groups` | ✅ | **Pas de sync cloud** |
| `members` | ✅ | **Pas de sync cloud** |
| `group_memberships` | ✅ | **Pas de sync cloud** |
| `caisses` | ✅ | Sync cloud **oui** (handle case dans sync.ts) |
| `org_units` | ✅ | Sync cloud **oui** |

---

## 5. Résumé des écarts structuraux majeurs

1. **Duplication caisses/groups/accounts** : 3 modèles concurrents pour la même entité "caisse de groupe"
   - `caisses` (table et store) — utilisé par l'UI actuelle
   - `groups` (table et store) — utilisé par l'UI groupes
   - `accounts` (table et store) — canonique mais non utilisé en UI

2. **Versement non implémenté** : La table `versements` existe mais n'est pas utilisée par l'UI (`Versement.tsx` crée 2 transactions directes)

3. **Formulaires et Champs personnalisés** : Tables + lib existantes mais aucune UI

4. **ArchiveService** : Classes existantes mais non intégrées à l'UI (Archives.tsx fait du filtrage direct)

5. **ReportDefinition** : Stocké localement mais pas de builder UI

6. **GroupMembership** : Store + type existants mais pas d'UI
