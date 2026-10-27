-- ============================================================================
-- 20261026000007 — Phase 4 : invariant « ≥1 propriétaire » par organisation
-- ----------------------------------------------------------------------------
-- DÉFAUT (pre-mortem PM5, impact 4)
--   Rien n'empêchait de révoquer le DERNIER administrateur d'une organisation.
--   L'org devenait alors orpheline : plus personne ne pouvait la réadministrer
--   (personne ne détient `can_manage_invitations`/grant sur elle).
--
--   PREUVE AVANT : SELECT tgname FROM pg_trigger
--     WHERE tgrelid='public.org_admins'::regclass AND NOT tgisinternal;
--     → uniquement trg_org_admins_updated_at + trg_org_admins_audit.
--     Aucune garde de cardinalité.
--
-- CORRECTIF (défense en profondeur)
--   Trigger BEFORE UPDATE OR DELETE sur public.org_admins : refuse si l'écriture
--   ferait passer le nombre de grants ACTIFS de l'organisation à 0. Le miroir
--   TS (`assertNotLastOrgAdmin`, central.ts#revokeOrgAdmin) applique le même
--   invariant côté client.
--
-- SÉMANTIQUE : la fonction ne fait que REFUSER une écriture invalide ; elle ne
-- modifie aucune donnée, ne supprime aucune ligne.
--
-- RÉVERSIBILITÉ : rollback/20261026000007_rollback.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.org_assert_not_last_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_org     text := COALESCE(OLD.org_id, NEW.org_id);
  v_active  int;
  v_loses   boolean;
BEGIN
  -- Un INSERT n'enlève jamais d'admin ; seul UPDATE/DELETE peut.
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- L'admin visé est-il actif AVANT l'écriture ?
  v_loses := (OLD.status = 'ACTIVE');

  -- Après l'écriture, reste-t-il au moins un admin ACTIF ?
  SELECT count(*) INTO v_active
    FROM public.org_admins
   WHERE org_id = v_org
     AND status = 'ACTIVE'
     AND id <> OLD.id;

  -- UPDATE qui ne révoque pas (ex. updated_at) : rien à vérifier.
  IF TG_OP = 'UPDATE' AND NEW.status = 'ACTIVE' THEN
    RETURN NEW;
  END IF;

  -- DELETE d'un grant DÉJÀ révoqué : pas de perte d'admin actif.
  IF TG_OP = 'DELETE' AND NOT v_loses THEN
    RETURN OLD;
  END IF;

  IF v_active < 1 THEN
    RAISE EXCEPTION
      'Organisation orpheline refusée : % perdrait son dernier administrateur actif.',
      v_org
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_org_admins_not_last ON public.org_admins;
CREATE TRIGGER trg_org_admins_not_last
  BEFORE UPDATE OR DELETE ON public.org_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.org_assert_not_last_admin();

COMMENT ON FUNCTION public.org_assert_not_last_admin() IS
  'Phase 4 — refuse qu''une organisation perde son dernier administrateur actif (PM5).';
COMMENT ON TRIGGER trg_org_admins_not_last ON public.org_admins IS
  'Phase 4 — invariant ≥1 propriétaire (anti-orphelin) sur org_admins.';

-- Réduction de surface : fonction de trigger uniquement, jamais via PostgREST.
REVOKE ALL ON FUNCTION public.org_assert_not_last_admin() FROM PUBLIC, anon, authenticated;
