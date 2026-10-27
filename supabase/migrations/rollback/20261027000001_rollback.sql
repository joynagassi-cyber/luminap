-- ============================================================================
-- Rollback 20261027000001 — annule la dénormalisation `org_id` (R89.b)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_custom_field_definitions_cascade_org ON public.custom_field_definitions;
DROP TRIGGER IF EXISTS trg_event_budgets_cascade_org          ON public.event_budgets;
DROP TRIGGER IF EXISTS trg_events_cascade_org                 ON public.events;
DROP TRIGGER IF EXISTS trg_groups_cascade_org                 ON public.groups;

DROP TRIGGER IF EXISTS trg_custom_field_values_denorm_org ON public.custom_field_values;
DROP TRIGGER IF EXISTS trg_budget_lines_denorm_org        ON public.budget_lines;
DROP TRIGGER IF EXISTS trg_event_budgets_denorm_org       ON public.event_budgets;
DROP TRIGGER IF EXISTS trg_group_memberships_denorm_org   ON public.group_memberships;

DROP FUNCTION IF EXISTS public.denorm_cascade_org_id();
DROP FUNCTION IF EXISTS public.denorm_child_org_id();

DROP INDEX IF EXISTS public.idx_custom_field_values_org_id;
DROP INDEX IF EXISTS public.idx_budget_lines_org_id;
DROP INDEX IF EXISTS public.idx_event_budgets_org_id;
DROP INDEX IF EXISTS public.idx_group_memberships_org_id;

ALTER TABLE public.custom_field_values DROP COLUMN IF EXISTS org_id;
ALTER TABLE public.budget_lines        DROP COLUMN IF EXISTS org_id;
ALTER TABLE public.event_budgets       DROP COLUMN IF EXISTS org_id;
ALTER TABLE public.group_memberships   DROP COLUMN IF EXISTS org_id;
