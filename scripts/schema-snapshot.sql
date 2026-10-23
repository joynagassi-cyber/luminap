-- ============================================================================
-- Instantané de schéma Lumina — à exécuter avec un accès SQL (service_role,
-- SQL editor Supabase, ou `psql`). Sortie : DDL de référence exploitable pour
-- vérifier la dérive entre les migrations du dépôt et la base réelle, et pour
-- reconstruire un objet perdu.
--
-- Usage : psql "$DATABASE_URL" -f scripts/schema-snapshot.sql > snapshot.sql
-- ============================================================================

\pset pager off

-- 1) Colonnes de toutes les tables public
SELECT format('ALTER TABLE %I.%I ADD COLUMN %I %s%s;',
              table_schema, table_name, column_name,
              CASE WHEN data_type='USER-DEFINED' THEN udt_name
                   WHEN data_type='ARRAY' THEN udt_name
                   ELSE data_type END,
              CASE WHEN is_nullable='NO' THEN ' NOT NULL' ELSE '' END
       ) AS ddl
FROM information_schema.columns
WHERE table_schema='public'
ORDER BY table_name, ordinal_position;

-- 2) Définitions complètes des fonctions public
SELECT pg_get_functiondef(p.oid) || E';\n' AS ddl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind='f'
ORDER BY p.proname;

-- 3) Policies RLS
SELECT format('CREATE POLICY %I ON %I.%I FOR %s TO %s%s%s;',
              policyname, schemaname, tablename, cmd,
              array_to_string(roles, ','),
              CASE WHEN qual IS NOT NULL THEN ' USING ('||qual||')' ELSE '' END,
              CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK ('||with_check||')' ELSE '' END
       ) AS ddl
FROM pg_policies WHERE schemaname='public'
ORDER BY tablename, policyname;

-- 4) Triggers
SELECT pg_get_triggerdef(t.oid) || ';' AS ddl
FROM pg_trigger t
JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 5) Index
SELECT indexdef || ';' AS ddl
FROM pg_indexes WHERE schemaname='public'
ORDER BY tablename, indexname;

-- 6) Contraintes (PK/FK/UNIQUE/CHECK)
SELECT conname || ' : ' || pg_get_constraintdef(oid) || ';' AS ddl
FROM pg_constraint c
JOIN pg_class t ON t.oid=c.conrelid
JOIN pg_namespace n ON n.oid=t.relnamespace
WHERE n.nspname='public'
ORDER BY t.relname, conname;

-- 7) Migrations appliquées (source de vérité du drift)
SELECT version || '  ' || name AS migration
FROM supabase_migrations.schema_migrations ORDER BY version;
