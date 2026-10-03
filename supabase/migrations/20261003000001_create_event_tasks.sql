-- ============================================================================
-- 20261003000001 — Table `event_tasks` : tâches & sous-tâches d'un événement
-- ----------------------------------------------------------------------------
-- Feature « Calendrier premium » (docs/plans/2026-10-03-lumina-calendrier-evenements.md,
-- Phase 1 T1.2).
--
-- Contenu : pour chaque événement (events.id) on peut créer des tâches et des
-- sous-tâches (parent_task_id). La tâche peut être assignée à un groupe (groupe
-- « doit » → assigned_group_id, cf. table `groups` 0026) et avoir une date de
-- échéance.
--
-- Conventions reprises du pattern `events` (0015 + 0035 + 0038) et du pattern
-- P0 RLS :
--   * PK text (UUID) côté client (PowerSync) — cohérent avec events.id TEXT.
--   * `is_org_member(initplan_uid(), org_id)` (R24) sur chaque policy.
--   * FORCE ROW LEVEL SECURITY sur la table business (01 §2.2 règle 1).
--   * Grant SELECT,INSERT,UPDATE,DELETE TO powersync_role (pattern 20260921000007
--     + 0045/0046/0057/0060) pour l'upload local-first.
--   * Index `(org_id, event_id)` : lecture par org + regroupement par
--     événement dans le calendrier. Index `(org_id, due_date)` : chronologie
--     de la timeline. Index `(org_id, parent_task_id)` : arborescence des
--     sous-tâches.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) La table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_tasks (
  id                 text PRIMARY KEY,
  org_id             text NOT NULL,
  event_id           text NOT NULL
                     REFERENCES public.events(id) ON DELETE CASCADE,
  title              text NOT NULL,
  description        text NOT NULL DEFAULT '',
  is_sub             boolean NOT NULL DEFAULT false,
  parent_task_id     text
                     REFERENCES public.event_tasks(id) ON DELETE CASCADE,
  assigned_group_id  text,
  due_date           text,
  status             text NOT NULL DEFAULT 'OPEN'
                     CHECK (status IN ('OPEN','IN_PROGRESS','DONE','BLOCKED')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2) Index (lecture + timeline + arborescence)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS event_tasks_org_event_idx
  ON public.event_tasks (org_id, event_id);
CREATE INDEX IF NOT EXISTS event_tasks_org_due_idx
  ON public.event_tasks (org_id, due_date);
CREATE INDEX IF NOT EXISTS event_tasks_org_parent_idx
  ON public.event_tasks (org_id, parent_task_id);

-- ----------------------------------------------------------------------------
-- 3) RLS (pattern events : 4 policies sélectives + WITH CHECK ins/update)
-- ----------------------------------------------------------------------------
ALTER TABLE public.event_tasks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_tasks_select ON public.event_tasks;
CREATE POLICY event_tasks_select ON public.event_tasks
  FOR SELECT USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS event_tasks_insert ON public.event_tasks;
CREATE POLICY event_tasks_insert ON public.event_tasks
  FOR INSERT WITH CHECK (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS event_tasks_update ON public.event_tasks;
CREATE POLICY event_tasks_update ON public.event_tasks
  FOR UPDATE USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS event_tasks_delete ON public.event_tasks;
CREATE POLICY event_tasks_delete ON public.event_tasks
  FOR DELETE USING (is_org_member(initplan_uid(), org_id));

-- ----------------------------------------------------------------------------
-- 4) Grants (pattern P0 : anon/authenticated/service_role complets +
--    powersync_role en lecture-modification pour l'upload local-first)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.event_tasks
  TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_tasks
  TO powersync_role;
