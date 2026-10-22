
## Sauvegardes et restauration

État constaté (2026-10-22) : `walg_enabled=true`, `pitr_enabled=false`,
`backups=[]`. **Aucune sauvegarde exploitable n'existe côté Supabase.**

### Créer une sauvegarde maintenant
```bash
cd <dépôt>
npx supabase@latest db dump --linked -f backup-schema.sql          # schéma
npx supabase@latest db dump --linked --data-only -f backup-data.sql # données
```
Prérequis : projet lié (`supabase/.temp/project-ref`) et
`SUPABASE_ACCESS_TOKEN` (ou `supabase login`).
Un export équivalent a été produit pendant la session dans `/tmp/` (schéma
133 Ko + données 1,1 Mo) — **à récupérer avant la fin de la session**, il n'est
pas dans le dépôt (données réelles).

### Restaurer
```bash
psql "$DATABASE_URL" -f backup-schema.sql   # structure
psql "$DATABASE_URL" -f backup-data.sql     # données
```
Les contraintes de clés étrangères circulaires (`organizations`,
`event_tasks`) peuvent exiger `--disable-triggers` ou une restauration
table par table.

### À faire par le propriétaire (priorité critique)
1. Activer les **sauvegardes planifiées** (voire le PITR) dans le dashboard
   Supabase : sans cela, une perte de données est irréversible.
2. Vérifier la rétention et tester **une restauration** au moins une fois.

## Revenir en arrière sur une migration
Chaque migration de cette session a son script inverse :
```bash
psql "$DATABASE_URL" -f supabase/migrations/rollback/<version>_rollback.sql
```
| Version | Objet | Inverse |
|---|---|---|
| 20261022000008 | vues `org_family`/`org_federation` (RLS) | `rollback/20261022000008_rollback.sql` |
| 20261022000009 | durcissement SECURITY DEFINER | `rollback/20261022000009_rollback.sql` |
| 20261022000010 | escalade `org_memberships` | `rollback/20261022000010_rollback.sql` |
| 20261022000011 | `profiles.role` immuable | `rollback/20261022000011_rollback.sql` |
| 20261022000012 | `upsert_profile` (rôle) | `rollback/20261022000012_rollback.sql` |
| 20261022000013 | isolation Storage | `rollback/20261022000013_rollback.sql` |
