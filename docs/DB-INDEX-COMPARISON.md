# Comparaison des Index — Local vs Cloud

## ✅État: SYNC COMPLET

Tous les indexes locaux correspondent maintenant aux indexes cloud.

## IndexedDB (Local) — 21 stores + 10 indexes secondaires

### Stores avec Primary Key
| Store | Key Path |
|-------|----------|
| transactions | id |
| categories | id |
| orgUnits | id |
| auditEntries | id |
| events | id |
| syncQueue | id |
| config | key |
| caisses | id |
| notifications | id |
| members | id |
| groups | id |
| accounts | id |
| group_memberships | id |
| versements | id |
| event_budgets | id |
| budget_lines | id |
| report_definitions | id |
| form_definitions | id |
| form_submissions | id |
| custom_field_definitions | id |
| custom_field_values | id |

### Indexes Secondaires (Nouveau — Version 15)
| Store | Index | Champ(s) |
|-------|-------|----------|
| transactions | source_caisse_id | sourceCaisseId |
| transactions | versement_id | versementId |
| transactions | reversal_of_id | reversalOfId |
| caisses | org_id | orgId |
| groups | org_id | orgId |
| groups | parent_group_id | parentGroupId |
| accounts | org_id | orgId |
| accounts | owner_type_owner_id | [ownerType, ownerId] |
| versements | org_id | orgId |
| versements | from_account_id | fromAccountId |
| versements | to_account_id | toAccountId |
| versements | status | status |
| members | org_id | orgId |
| budget_lines | event_budget_id | eventBudgetId |
| budget_lines | category_id | categoryId |
| group_memberships | member_id | memberId |
| group_memberships | group_id | groupId |
| form_submissions | form_definition_id | formDefinitionId |
| form_submissions | entity | [linkedEntityType, linkedEntityId] |
| custom_field_values | entity | [entityType, entityId] |

## Supabase (Cloud) — 22 tables + indexes

| Table | Primary Key | Indexes |
|-------|-------------|---------|
| accounts | id | idx_accounts_org_id, idx_accounts_owner |
| audit_entries | id | - |
| budget_lines | id | idx_bl_budget, idx_bl_category |
| caisses | id | idx_caisses_org_id |
| categories | id | - |
| custom_field_definitions | id | - |
| custom_field_values | id | idx_cfv_entity |
| event_budgets | id | - |
| events | id | - |
| form_definitions | id + key | - |
| form_submissions | id | idx_fs_form, idx_fs_entity |
| group_memberships | id | idx_gm_member, idx_gm_group |
| groups | id | idx_groups_org_id, idx_groups_parent |
| members | id | idx_members_org_id |
| notifications | id | - |
| org_units | id | - |
| profiles | id | - |
| report_definitions | id | - |
| role_assignments | id + session_id | - |
| transactions | id | idx_transactions_source_caisse_id, idx_transactions_versement_id, idx_transactions_reversal_of_id |
| versements | id | idx_versements_org_id, idx_versements_from, idx_versements_to, idx_versements_status |

## Mapping Local → Cloud

| IndexedDB Store | Supabase Table | Indexes Sync |
|-----------------|----------------|--------------|
| transactions | transactions | ✅ 3 indexes |
| categories | categories | ✅ PK only |
| orgUnits | org_units | ✅ PK only |
| auditEntries | audit_entries | ✅ PK only |
| events | events | ✅ PK only |
| syncQueue | (local only) | ⚠️ Local only |
| config | (local only) | ⚠️ Local only |
| caisses | caisses | ✅ 1 index |
| notifications | notifications | ✅ PK only |
| members | members | ✅ 1 index |
| groups | groups | ✅ 2 indexes |
| accounts | accounts | ✅ 2 indexes |
| group_memberships | group_memberships | ✅ 2 indexes |
| versements | versements | ✅ 4 indexes |
| event_budgets | event_budgets | ✅ PK only |
| budget_lines | budget_lines | ✅ 2 indexes |
| report_definitions | report_definitions | ✅ PK only |
| form_definitions | form_definitions | ✅ PK + unique key |
| form_submissions | form_submissions | ✅ 2 indexes |
| custom_field_definitions | custom_field_definitions | ✅ PK only |
| custom_field_values | custom_field_values | ✅ 1 composite index |

## Migrations

| Version | Changement |
|---------|------------|
| 14 → 15 | Ajout des indexes secondaires dans IndexedDB |
| Schema 3 → 4 | Force cache bust pour appliquer les nouveaux indexes |

## Points d'attention résolus

1. ✅ **orgUnits ↔ org_units** — Mapping implicite corrigé dans sync.ts
2. ✅ **Indexes secondaires** — Tous les indexes cloud maintenant présents dans IndexedDB
3. ✅ **syncQueue/config** — Local only (comportement attendu, pas de sync cloud)
4. ✅ **Version DB incrémentée** — Migration automatique pour les utilisateurs existants

## Commandes de vérification

```bash
# Vérifier les indexes locaux (dans DevTools → Application → IndexedDB)
# Vérifier les indexes cloud
supabase db query "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname" --linked
```
