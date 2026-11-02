-- ============================================================================
-- 20261101000004 — fix: injection d'organisation via INSERT de profil
-- ----------------------------------------------------------------------------
-- DÉFAUT (CRITIQUE — fuite inter-organisation)
--   20261022000006 a retiré l'écriture de `org_id` du chemin UPDATE de
--   `upsert_profile`, et 20261022000005 a rendu `org_id` immuable par UPDATE
--   direct (trigger `trg_guard_profile_org`). MAIS le chemin INSERT n'était
--   gardé par RIEN : ni par un trigger BEFORE INSERT, ni par le RPC.
--
--   Deux vecteurs, tous deux exécutables par tout `authenticated` :
--     A. RPC `upsert_profile(p_org_id := '<org-victime>')` — SECURITY DEFINER,
--        le trigger UPDATE ne s'applique pas (pas de ligne existante), et le
--        corps insère `p_org_id` tel quel.
--     B. `DELETE /profiles?id=eq.<moi>` puis
--        `POST /profiles {id:<moi>, org_id:'<org-victime>'}` (policies
--        `profiles_delete` + `profiles_insert_self`), le trigger UPDATE ne
--        voyant jamais l'INSERT.
--
-- PREUVE (transaction annulée, rôle `authenticated`, claims d'un compte e2e) :
--     DELETE profiles(id=<moi>) ; puis
--     SELECT upsert_profile(<moi>,'x','y',NULL,'org-1',NULL) ;
--     SELECT org_id FROM profiles WHERE id=<moi>  ->  'org-1'
--   Or `is_org_member()` et `current_org_id()` s'appuient sur `profiles.org_id`,
--   donc l'attaquant obtient la lecture de toutes les lignes portant cet org_id
--   (profils, transactions, événements, audit…).
--
-- CORRECTIF (défense en profondeur, deux couches)
--   1. Trigger `guard_profile_org_insert` (BEFORE INSERT) : un profil créé par
--      `authenticated`/`anon` ne peut naître que dans `__no_org__`/`no-org` ou
--      sans organisation. Les créations légitimes s'exécutent hors de ces rôles
--      (`handle_new_user`, `upsert_profile` en SECURITY DEFINER, edge
--      `create_org`/`signup` en service_role, règlement d'invitation) et ne sont
--      pas affectées.
--   2. `upsert_profile` : sur le chemin INSERT, l'organisation demandée n'est
--      honorée que si le demandeur en est administrateur actif ; sinon elle est
--      ramenée à `__no_org__`. Le rattachement légitime passe par
--      `create_org`/`settle_invitation_claim` (SECURITY DEFINER/service_role).
--
-- RÉVERSIBILITÉ : rollback/20261101000004_rollback.sql
-- ============================================================================

-- ── 1) Trigger BEFORE INSERT : pas d'auto-rattachement direct ───────────────
CREATE OR REPLACE FUNCTION public.guard_profile_org_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.org_id IS NOT NULL
     AND NEW.org_id NOT IN ('__no_org__', 'no-org')
     AND current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'ORG_ID_NOT_ALLOWED: un profil ne peut pas etre cree directement dans une organisation'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_profile_org_insert ON public.profiles;
CREATE TRIGGER guard_profile_org_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_org_insert();

-- ── 2) upsert_profile : organisation honorée seulement pour un admin ────────
CREATE OR REPLACE FUNCTION public.upsert_profile(
  p_user_id uuid,
  p_first_name text DEFAULT NULL::text,
  p_last_name text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text,
  p_org_id text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  result public.profiles;
  v_role text := NULLIF(TRIM(p_role), '');
  v_org text := coalesce(NULLIF(TRIM(p_org_id), ''), '__no_org__');
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'NOT_YOUR_PROFILE: p_user_id does not match auth.uid()';
  END IF;

  IF v_role IS NOT NULL
     AND NOT public.is_org_admin(
           auth.uid(),
           coalesce(NULLIF(TRIM(p_org_id), ''),
                    (SELECT org_id FROM public.profiles WHERE id = p_user_id))
         ) THEN
    RAISE EXCEPTION 'ROLE_NOT_ALLOWED: seul un administrateur de l''organisation peut attribuer un role'
      USING ERRCODE = '42501';
  END IF;

  -- Ne jamais laisser un non-admin s'attacher directement à une organisation
  -- réelle via ce RPC (fuite inter-organisation) : le rattachement passe par
  -- `create_org` (service_role) ou le règlement d'invitation.
  IF v_org NOT IN ('__no_org__', 'no-org')
     AND NOT public.is_org_admin(auth.uid(), v_org) THEN
    v_org := '__no_org__';
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, role, org_id, status)
  VALUES (
    p_user_id,
    coalesce(p_first_name, ''),
    coalesce(p_last_name,  ''),
    coalesce(v_role,       'MEMBRE'),
    v_org,
    coalesce(p_status,     'ACTIVE')
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = coalesce(NULLIF(TRIM(p_first_name), ''), profiles.first_name),
    last_name  = coalesce(NULLIF(TRIM(p_last_name),  ''), profiles.last_name),
    role       = coalesce(v_role, profiles.role),
    status     = coalesce(NULLIF(TRIM(p_status),     ''), profiles.status),
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$function$;
