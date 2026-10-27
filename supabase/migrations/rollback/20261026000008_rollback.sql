-- Rollback 20261026000008 — rétablit le CASCADE d'origine (NON SÛR) et retire
-- le trigger d'audit de suppression.
DROP TRIGGER IF EXISTS trg_members_audit_delete ON public.members;
DROP FUNCTION IF EXISTS public.members_audit_delete();
ALTER TABLE public.cotisations DROP CONSTRAINT IF EXISTS cotisations_membre_id_fkey;
ALTER TABLE public.cotisations
  ADD CONSTRAINT cotisations_membre_id_fkey
  FOREIGN KEY (membre_id) REFERENCES public.members(id) ON DELETE CASCADE;
