-- Rollback R166 — retire la garde d'immuabilité du statut d'un événement terminal.
DROP TRIGGER IF EXISTS guard_event_status_terminal ON public.events;
DROP FUNCTION IF EXISTS public.guard_event_status_terminal();
