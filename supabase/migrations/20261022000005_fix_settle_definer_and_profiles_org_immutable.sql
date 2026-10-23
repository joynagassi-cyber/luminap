-- ============================================================================
-- 20261022000005 — fix: régression `used_count` + durcissement `profiles`
-- ----------------------------------------------------------------------------
-- A) RÉGRESSION INTRODUITE PAR 20261022000004 (à corriger en priorité)
--    Le durcissement des policies `invitations` (INSERT/UPDATE/DELETE) a
--    bloqué l'écriture faite par `settle_invitation_claim` sur
--    `invitations.used_count`. Cette fonction est SECURITY INVOKER : sous le
--    rôle `authenticated` qui réclame, la policy `invitations_update` filtre
--    silencieusement l'UPDATE (aucune erreur levée) → `used_count` n'était plus
--    incrémenté, donc `max_uses` n'était plus appliqué (invitation réutilisable
--    au-delà de sa limite).
--
--    Preuve (transaction annulée) : claim d'une invitation `max_uses=1` →
--    profil promu ANCIEN, claim CONFIRMED, MAIS `used_count` = 0.
--
--    Correctif : rendre `settle_invitation_claim` SECURITY DEFINER (elle doit
--    écrire `invitations`/`invitation_claims`/`profiles` de façon autoritaire),
--    avec `search_path` figé. Les droits EXECUTE sont retirés à PUBLIC/anon
--    (la fonction ne doit être appelée que par les triggers, côté serveur).
--
-- B) DURCISSEMENT `profiles` — injection cross-org
--    La policy `profiles_update` autorisait un utilisateur à modifier TOUTE
--    colonne de son propre profil, y compris `org_id`. Un utilisateur pouvait
--    donc se rattacher à une organisation arbitraire (`profiles.org_id` choisi
--    librement), ce que `is_org_member()` prend en compte → accès en lecture aux
--    données de cette organisation.
--
--    Correctif : `org_id` devient immuable par UPDATE direct. Les chemins
--    légitimes de rattachement passent par des fonctions SECURITY DEFINER
--    (`upsert_profile`, `settle_invitation_claim`) et ne sont pas affectés.
--
--    NOTE : le rôle reste modifiable par l'utilisateur (self-service, cf.
--    `upsert_profile` qui accepte un `p_role` arbitraire). Ce point est un
--    défaut de modèle documenté (RISQUES R20) : le trancher est une décision
--    produit (le self-service est-il voulu ?). Non modifié ici pour ne pas
--    casser l'onboarding.
--
-- RÉVERSIBILITÉ : rollback/20261022000005_rollback.sql
-- ============================================================================

-- ── A) settle_invitation_claim : SECURITY DEFINER + droits restreints ───────
-- On conserve le corps EXISTANT (version étendue « Vague 3 ») et on ne change
-- que l'attribut de sécurité + les privilèges.
ALTER FUNCTION public.settle_invitation_claim(claim_id uuid) SECURITY DEFINER;
ALTER FUNCTION public.settle_invitation_claim(claim_id uuid) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.settle_invitation_claim(claim_id uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_invitation_claim(claim_id uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.settle_invitation_claim(claim_id uuid) TO authenticated, service_role;

-- Le helper de rôle ne doit pas être exposé à anon/PUBLIC.
REVOKE ALL ON FUNCTION public.can_manage_invitations(p_uid uuid, p_org_id text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_invitations(p_uid uuid, p_org_id text) FROM anon;

-- ── B) profiles : org_id immuable par UPDATE direct du client ───────────────
-- Un trigger plutôt qu'une policy RLS : une policy qui interroge sa propre
-- table provoque une récursion (« infinite recursion detected in policy for
-- relation profiles »). Le trigger distingue l'appel direct du client
-- (`current_user` = authenticated/anon) d'un appel via une fonction
-- SECURITY DEFINER (le contexte bascule alors sur le propriétaire, postgres),
-- ce qui laisse passer les chemins légitimes (upsert_profile, règlement
-- d'invitation) sans ouvrir l'écriture directe.
CREATE OR REPLACE FUNCTION public.guard_profile_org_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.org_id IS DISTINCT FROM OLD.org_id
     AND current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'ORG_ID_IMMUTABLE: profiles.org_id ne peut pas etre modifie directement'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_profile_org ON public.profiles;
CREATE TRIGGER trg_guard_profile_org
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_org_immutable();
