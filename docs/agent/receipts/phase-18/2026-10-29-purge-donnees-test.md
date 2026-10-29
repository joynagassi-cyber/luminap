# Receipt — Phase 18 : purge des données de test de la base Supabase

- **Date** : 2026-10-29
- **Projet** : `hhgovvrnalibhgpakswi` (instance de DÉVELOPPEMENT)
- **Demande** : « supprimer toutes les données de test actuelles, laisser la
  base propre, aucun doublon, conserver les identifiants de test ».
- **Statut** : **terminé** (purge exécutée + vérifiée).

## 1. Sauvegarde de sécurité (préalable obligatoire)

- Chaîne de sauvegarde **vérifiée opérationnelle** : `backup.yml` configuré
  (secrets `SUPABASE_DB_URL` + `BACKUP_GPG_PASSPHRASE` présents) ; déclenché
  manuellement le 2026-10-29 → **run `40813667253` : succès**, étapes
  « Export (schéma + données) » et « Publier l'export » **exécutées**,
  **1 artefact chiffré publié** (`supabase-backup-40813667253`, 3,9 Mo,
  non expiré).
- Sauvegarde locale antérieure : `/workspace/backups/` (chiffrée, 27/10).
- Aucune suppression destructive n'a été faite sans sauvegarde fraîche.

## 2. Inventaire avant purge

| Élément | Avant | Après |
|---|---|---|
| `profiles` | 109 | **2** |
| `auth.users` | 109 | **2** |
| `organizations` | 9 | **3** |
| `org_memberships` | 5 | 2 |
| `org_admins` | 6 | 1 |
| `events` | 13 824 | 0 |
| `notifications` | 14 368 | 0 |
| `groups` | 624 | 0 |
| `org_units` | 636 | 0 |
| `accounts` | 620 | 0 |
| `caisses` | 625 | 0 |
| `members` | 287 | 0 |
| `form_definitions` | 286 | 0 |
| `custom_field_definitions` | 331 | 0 |
| `invitations` | 243 | 0 |
| `audit_entries` | 203 | 0 |
| `role_assignments` | 1 | 0 |
| `event_tasks` | 59 | 0 |
| `categories` | 18 | **9** (canoniques) |
| `role_permissions` | 149 | 149 (référentiel) |
| `keep_alive` | 1 | 1 (sonde) |
| `_jsonb_backfill_20261024` | 213 | 0 |
| `_jsonb_null_literal_20261027` | 88 | 0 |

## 3. Ce qui a été CONSERVÉ (et pourquoi)

- **Comptes de test Cypress** (demandés explicitement) :
  `lumina-org-e2e@lumina.dev` (PASTEUR_PRINCIPAL, org `org-e2e`) et
  `lumina-org-unconfigured@lumina.dev` (org `org-e2e-unconf`) — profil + compte
  Auth + `org_memberships` + `org_admins` intacts.
- **`organizations`** : `org-e2e`, `org-e2e-unconf` (orgs des comptes de test)
  et `org-central` (Administration centrale, créée par migration, protégée par
  la garde « dernier admin actif »).
- **Référentiels non-données** : `role_permissions` (149), `categories`
  canoniques (9, requises par `transactions_category_id_fkey` — cf. R89.a),
  `keep_alive` (1, sonde anti-pause).

## 4. Méthode

1. `update groups set parent_group_id/responsable_member_id = null` (débloque
   les cycles).
2. Suppression enfants → parents (ordre FK-safe) : `event_tasks`, `event_budgets`,
   `budget_lines`, `cotisations`, `audit_entries`, `notifications`,
   `form_submissions`, `custom_field_values`, `invitation_claims`, `invitations`,
   `group_memberships`, `groups`, `members`, `events`, `org_budget_lines`,
   `org_budgets`, `versements`, `transactions`, `documents`, `accounts`,
   `caisses`, `org_units`, `categories`, `custom_field_definitions`,
   `form_definitions`, `report_definitions`, `role_assignments`, `*giving*`,
   `grants`, `tag_assignments`, `tags`, `org_reports`.
3. `org_memberships` / `org_admins` hors orgs de test ; `organizations` hors
   orgs conservées ; `profiles` hors comptes de test.
   — **`trg_org_admins_not_last` désactivé le temps de la purge** puis
   **réactivé** (la garde protège le dernier admin d'une org ; elle a bloqué à
   juste titre la suppression de `org-central`).
4. `delete from auth.users where email not in (…)` → **cascade** sur `profiles`.
5. **Restauration des 9 catégories canoniques** (`ON CONFLICT DO NOTHING`) —
   données de **référence**, pas de test.
6. `truncate` des tables de rollback `_jsonb_*` (copies de données de test).

## 5. Vérification post-purge

- **Login réel** des 2 comptes de test → **OK** (`aud: authenticated`).
- Lecture RLS `GET /rest/v1/profiles` avec le JWT du compte de test → renvoie
  uniquement son profil d'org (isolation correcte).
- Garde `org_assert_not_last_admin` **réactivée** (vérifié dans `pg_trigger`).
- Aucun doublon, aucune organisation orpheline (toutes les orgs restantes ont
  leur admin ou sont protégées).

## 6. Limites

- Les données étant supprimées par SQL direct (MCP), la purge n'est pas
  réversible par un rollback SQL : **la restauration passe par la sauvegarde
  `40813667253`** si nécessaire.
- Le `storage` est vide (0 objet) : rien à purger côté fichiers.
