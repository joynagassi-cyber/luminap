-- ============================================================================
-- 20261031000005 — Index couvrants pour les 2 clés étrangères de `event_tasks`.
-- ----------------------------------------------------------------------------
-- ADVISOR (performance, lint 0001 `unindexed_foreign_keys`, mesuré 2026-10-31) :
--   * `event_tasks_event_id_fkey`
--   * `event_tasks_parent_task_id_fkey`
--
-- CAUSE : les index existants sont COMPOSITES et mènent par `org_id`
--   (`event_tasks_org_event_idx (org_id, event_id)`,
--    `event_tasks_org_parent_idx (org_id, parent_task_id)`). Un index composite
--   ne peut PAS servir une recherche sur la seule colonne de FK (le préfixe
--   `org_id` manque). Or la contrainte FK est vérifiée précisément par
--   `WHERE event_id = …` / `WHERE parent_task_id = …` (DELETE/UPDATE sur
--   `events` / `event_tasks`). Sans index dédié, ce contrôle fait un scan.
--
-- CORRECTIF : deux index mono-colonne (additifs, aucune donnée modifiée).
--   Les index composites existants restent (requêtes filtrées par `org_id`).
--
-- RÉVERSIBILITÉ : rollback/20261031000005_rollback.sql (DROP INDEX).
-- ============================================================================

CREATE INDEX IF NOT EXISTS event_tasks_event_id_idx
  ON public.event_tasks (event_id);

CREATE INDEX IF NOT EXISTS event_tasks_parent_task_id_idx
  ON public.event_tasks (parent_task_id);
