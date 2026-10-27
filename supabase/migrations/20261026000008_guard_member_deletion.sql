-- ============================================================================
-- 20261026000008 — Phase 7 : suppression d'un membre → écritures orphelines
-- ----------------------------------------------------------------------------
-- DÉFAUT (pre-mortem PM8, impact 5)
--   `cotisations.membre_id REFERENCES members(id) ON DELETE CASCADE`
--   (migration 0036). Supprimer un membre DÉTRUISAIT donc silencieusement
--   toutes ses cotisations — l'historique financier disparaissait sans trace
--   ni avertissement. Les autres liens (`group_memberships.member_id`,
--   `groups.responsable_member_id`) sont NO ACTION : ils bloquent déjà la
--   suppression, mais aucune n'est tracée.
--
--   PREUVE AVANT (base de dev) :
--     SELECT conname, confdeltype FROM pg_constraint
--      WHERE conrelid='public.cotisations'::regclass AND contype='f';
--     → cotisations_culte_id_fkey | c
--       cotisations_membre_id_fkey | c        (c = CASCADE)
--
-- CORRECTIF (défense en profondeur)
--   1. Le lien financier passe en ON DELETE RESTRICT : supprimer un membre qui
--      a des cotisations devient IMPOSSIBLE (il faut l'archiver ou
--      l'anonymiser). Aucune donnée financière ne peut plus disparaître par
--      effet de bord.
--   2. Trigger d'audit sur DELETE : si un membre sans écriture financière est
--      tout de même supprimé, on conserve une trace immuable (identité + org)
--      dans audit_entries — la suppression n'est plus muette.
--
--   Miroir TS : `src/lib/member-service.ts` documente le chemin sanctionné
--   (archive / anonymisation) ; `deleteMember` n'est plus un effacement muet.
--
-- SÉMANTIQUE : la migration ne supprime aucune ligne ; elle ajoute une
-- contrainte de refus et un trigger d'audit.
--
-- RÉVERSIBILITÉ : rollback/20261026000008_rollback.sql
-- ============================================================================

-- ── 1) Le lien financier ne cascade plus ────────────────────────────────────
ALTER TABLE public.cotisations
  DROP CONSTRAINT IF EXISTS cotisations_membre_id_fkey;

ALTER TABLE public.cotisations
  ADD CONSTRAINT cotisations_membre_id_fkey
  FOREIGN KEY (membre_id) REFERENCES public.members(id) ON DELETE RESTRICT;

-- ── 2) Toute suppression de membre est tracée ───────────────────────────────
CREATE OR REPLACE FUNCTION public.members_audit_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.audit_entries (
    id, org_id, user_id, action, entity_type, entity_id, comment,
    actor_role_at_time, created_at, before_state
  ) VALUES (
    gen_random_uuid(),
    OLD.org_id,
    NULL,
    'DELETE',
    'Member',
    OLD.id,
    'Membre supprimé : ' || COALESCE(OLD.first_name, '') || ' ' || COALESCE(OLD.last_name, ''),
    COALESCE(auth.role()::text, 'service_role'),
    now(),
    jsonb_build_object(
      'first_name', OLD.first_name,
      'last_name', OLD.last_name,
      'status', OLD.status,
      'org_id', OLD.org_id
    )
  );
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_members_audit_delete ON public.members;
CREATE TRIGGER trg_members_audit_delete
  AFTER DELETE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.members_audit_delete();

COMMENT ON FUNCTION public.members_audit_delete() IS
  'Phase 7 — trace immuable de la suppression d''un membre (PM8).';
COMMENT ON CONSTRAINT cotisations_membre_id_fkey ON public.cotisations IS
  'Phase 7 — RESTRICT : un membre porteur de cotisations ne peut pas être supprimé (PM8).';

REVOKE ALL ON FUNCTION public.members_audit_delete() FROM PUBLIC, anon, authenticated;
