-- Rollback de 20261031000002 (R141.b / R141.c) — restaure les politiques
-- d'écriture sur `is_org_member` SEUL (état antérieur) et NE recrée PAS de
-- politique DELETE sur `documents` (elle n'en avait aucune avant — deny-all).

-- ── documents (INSERT/UPDATE seulement ; DELETE restait deny-all) ──
DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS documents_update ON public.documents;
CREATE POLICY documents_update ON public.documents
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));

-- ── event_tasks ──
DROP POLICY IF EXISTS event_tasks_insert ON public.event_tasks;
CREATE POLICY event_tasks_insert ON public.event_tasks
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS event_tasks_update ON public.event_tasks;
CREATE POLICY event_tasks_update ON public.event_tasks
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS event_tasks_delete ON public.event_tasks;
CREATE POLICY event_tasks_delete ON public.event_tasks
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

-- ── report_definitions ──
DROP POLICY IF EXISTS report_definitions_insert ON public.report_definitions;
CREATE POLICY report_definitions_insert ON public.report_definitions
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS report_definitions_update ON public.report_definitions;
CREATE POLICY report_definitions_update ON public.report_definitions
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS report_definitions_delete ON public.report_definitions;
CREATE POLICY report_definitions_delete ON public.report_definitions
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

-- ── custom_field_definitions ──
DROP POLICY IF EXISTS custom_field_definitions_insert ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_insert ON public.custom_field_definitions
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS custom_field_definitions_update ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_update ON public.custom_field_definitions
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS custom_field_definitions_delete ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_delete ON public.custom_field_definitions
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

-- ── custom_field_values ──
DROP POLICY IF EXISTS custom_field_values_insert ON public.custom_field_values;
CREATE POLICY custom_field_values_insert ON public.custom_field_values
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id))));
DROP POLICY IF EXISTS custom_field_values_update ON public.custom_field_values;
CREATE POLICY custom_field_values_update ON public.custom_field_values
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id))))
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id))));
DROP POLICY IF EXISTS custom_field_values_delete ON public.custom_field_values;
CREATE POLICY custom_field_values_delete ON public.custom_field_values
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id
     FROM custom_field_definitions
    WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id))));

-- ── form_definitions ──
DROP POLICY IF EXISTS form_definitions_insert ON public.form_definitions;
CREATE POLICY form_definitions_insert ON public.form_definitions
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS form_definitions_update ON public.form_definitions;
CREATE POLICY form_definitions_update ON public.form_definitions
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS form_definitions_delete ON public.form_definitions;
CREATE POLICY form_definitions_delete ON public.form_definitions
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

-- ── form_submissions ──
DROP POLICY IF EXISTS form_submissions_insert ON public.form_submissions;
CREATE POLICY form_submissions_insert ON public.form_submissions
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS form_submissions_update ON public.form_submissions;
CREATE POLICY form_submissions_update ON public.form_submissions
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS form_submissions_delete ON public.form_submissions;
CREATE POLICY form_submissions_delete ON public.form_submissions
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

-- ── categories ──
DROP POLICY IF EXISTS categories_insert ON public.categories;
CREATE POLICY categories_insert ON public.categories
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS categories_update ON public.categories;
CREATE POLICY categories_update ON public.categories
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS categories_delete ON public.categories;
CREATE POLICY categories_delete ON public.categories
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));
