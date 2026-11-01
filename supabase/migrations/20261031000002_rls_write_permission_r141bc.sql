-- ============================================================================
-- 20261031000002 — R141.b / R141.c CORRIGÉ : l'autorisation d'ÉCRITURE est
-- étendue aux tables NON FINANCIÈRES restées en `is_org_member` SEUL (suite de
-- R141, qui avait couvert les tables FINANCIÈRES + 3 tables du Lot 1).
-- ----------------------------------------------------------------------------
-- DÉFAUT (mesuré 2026-10-31)
--   Ces tables avaient leurs politiques INSERT/UPDATE/DELETE fondées sur
--   `is_org_member(...)` SEUL : tout MEMBRE, quel que soit son rôle, pouvait
--   écrire au niveau base via le client REST direct (clé anon publique + JWT).
--   Aucune escalade de privilèges (ces tables ne portent ni rôle ni
--   appartenance), mais écriture non gouvernée sur des données de configuration
--   et de gestion documentaire.
--
-- PÉRIMÈTRE (décision 2026-10-31) — 8 tables, AUCUNE nouvelle permission
-- (toutes canon) :
--   R141.b :
--     * documents            → admin:settings  (gestion documentaire / Archives)
--     * event_tasks          → event:update    (sous-ressource des événements)
--   R141.c :
--     * report_definitions   → report:export   (édition de rapports)
--     * custom_field_definitions → admin:settings (schéma de champs)
--     * custom_field_values  → admin:settings  (valeurs ; portée via définition)
--     * form_definitions     → admin:settings  (constructeur de formulaires)
--     * form_submissions     → admin:settings  (données de formulaires)
--     * categories           → admin:settings  (taxonomie canonique)
--
--   Hors périmètre (justifié) : `role_assignments` (table morte : 0 référence
--   client, hors sync-config ; toute politique y est sans objet).
--
-- SÛRETÉ (mesurée) : AUCUN chemin d'écriture REST (`supabase.from(...)`) n'existe
--   pour ces tables dans le client — toutes les écritures de l'application
--   passent par PowerSync, dont le rôle `powersync_role` porte BYPASSRLS
--   (vérifié). Ces politiques ne peuvent donc pas casser un flux applicatif ;
--   elles ferment le client REST direct. (Mêmes preuves que R141.)
--
-- RÉVERSIBILITÉ : rollback/20261031000002_rollback.sql
-- ============================================================================

-- ── documents (admin:settings) — R141.b ──
-- NB : `documents` n'avait AUCUNE politique DELETE (deny-all en REST) — on ne
-- l'ouvre pas (ce serait une nouvelle capacité, hors périmètre d'un durcissement).
DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS documents_update ON public.documents;
CREATE POLICY documents_update ON public.documents
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

-- ── event_tasks (event:update) — R141.b ──
DROP POLICY IF EXISTS event_tasks_insert ON public.event_tasks;
CREATE POLICY event_tasks_insert ON public.event_tasks
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'event', 'update'));

DROP POLICY IF EXISTS event_tasks_update ON public.event_tasks;
CREATE POLICY event_tasks_update ON public.event_tasks
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'event', 'update'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'event', 'update'));

DROP POLICY IF EXISTS event_tasks_delete ON public.event_tasks;
CREATE POLICY event_tasks_delete ON public.event_tasks
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'event', 'update'));

-- ── report_definitions (report:export) — R141.c ──
DROP POLICY IF EXISTS report_definitions_insert ON public.report_definitions;
CREATE POLICY report_definitions_insert ON public.report_definitions
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'report', 'export'));

DROP POLICY IF EXISTS report_definitions_update ON public.report_definitions;
CREATE POLICY report_definitions_update ON public.report_definitions
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'report', 'export'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'report', 'export'));

DROP POLICY IF EXISTS report_definitions_delete ON public.report_definitions;
CREATE POLICY report_definitions_delete ON public.report_definitions
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'report', 'export'));

-- ── custom_field_definitions (admin:settings) — R141.c ──
DROP POLICY IF EXISTS custom_field_definitions_insert ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_insert ON public.custom_field_definitions
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS custom_field_definitions_update ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_update ON public.custom_field_definitions
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS custom_field_definitions_delete ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_delete ON public.custom_field_definitions
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

-- ── custom_field_values (admin:settings, portée via définition) — R141.c ──
DROP POLICY IF EXISTS custom_field_values_insert ON public.custom_field_values;
CREATE POLICY custom_field_values_insert ON public.custom_field_values
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id)))
              AND has_permission(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id)), 'admin', 'settings'));

DROP POLICY IF EXISTS custom_field_values_update ON public.custom_field_values;
CREATE POLICY custom_field_values_update ON public.custom_field_values
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id)))
         AND has_permission(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id)), 'admin', 'settings'))
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id)))
              AND has_permission(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id)), 'admin', 'settings'));

DROP POLICY IF EXISTS custom_field_values_delete ON public.custom_field_values;
CREATE POLICY custom_field_values_delete ON public.custom_field_values
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id)))
         AND has_permission(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id)), 'admin', 'settings'));

-- ── form_definitions (admin:settings) — R141.c ──
DROP POLICY IF EXISTS form_definitions_insert ON public.form_definitions;
CREATE POLICY form_definitions_insert ON public.form_definitions
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS form_definitions_update ON public.form_definitions;
CREATE POLICY form_definitions_update ON public.form_definitions
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS form_definitions_delete ON public.form_definitions;
CREATE POLICY form_definitions_delete ON public.form_definitions
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

-- ── form_submissions (admin:settings) — R141.c ──
DROP POLICY IF EXISTS form_submissions_insert ON public.form_submissions;
CREATE POLICY form_submissions_insert ON public.form_submissions
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS form_submissions_update ON public.form_submissions;
CREATE POLICY form_submissions_update ON public.form_submissions
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS form_submissions_delete ON public.form_submissions;
CREATE POLICY form_submissions_delete ON public.form_submissions
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

-- ── categories (admin:settings) — R141.c ──
DROP POLICY IF EXISTS categories_insert ON public.categories;
CREATE POLICY categories_insert ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS categories_update ON public.categories;
CREATE POLICY categories_update ON public.categories
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS categories_delete ON public.categories;
CREATE POLICY categories_delete ON public.categories
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));
