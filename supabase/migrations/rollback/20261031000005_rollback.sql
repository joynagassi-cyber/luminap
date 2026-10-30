-- Rollback de 20261031000005 — supprime les index couvrants des FK event_tasks.

DROP INDEX IF EXISTS public.event_tasks_event_id_idx;
DROP INDEX IF EXISTS public.event_tasks_parent_task_id_idx;
