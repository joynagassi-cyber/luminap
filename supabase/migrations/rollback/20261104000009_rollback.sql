-- Rollback R167 — retire la garde d'ajout seul du journal d'audit.
DROP TRIGGER IF EXISTS guard_audit_entries_append_only ON public.audit_entries;
DROP FUNCTION IF EXISTS public.guard_audit_entries_append_only();
