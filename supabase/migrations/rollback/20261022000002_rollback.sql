-- Rollback de 20261022000002_add_org_id_indexes.sql
--
-- Sûr : supprimer un index ne touche aucune donnée. L'effet est uniquement
-- une perte de performance (retour au Seq Scan sur les filtres org_id).
-- À n'utiliser que si un index cause un problème avéré (ex. espace disque).

DROP INDEX IF EXISTS public.idx_audit_entries_org_id;
DROP INDEX IF EXISTS public.idx_categories_org_id;
DROP INDEX IF EXISTS public.idx_custom_field_definitions_org_id;
DROP INDEX IF EXISTS public.idx_events_org_id;
DROP INDEX IF EXISTS public.idx_form_definitions_org_id;
DROP INDEX IF EXISTS public.idx_form_submissions_org_id;
DROP INDEX IF EXISTS public.idx_notifications_org_id;
DROP INDEX IF EXISTS public.idx_org_budget_lines_org_id;
DROP INDEX IF EXISTS public.idx_org_units_org_id;
DROP INDEX IF EXISTS public.idx_profiles_org_id;
DROP INDEX IF EXISTS public.idx_report_definitions_org_id;
DROP INDEX IF EXISTS public.idx_role_assignments_org_id;
DROP INDEX IF EXISTS public.idx_transactions_org_id;
