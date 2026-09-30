-- 20260930000001 : corrige le blocage du signup (RLS profiles + trigger inopérant)
--
-- Causale (audit live 2026-09-30, projet Supabase hhgovvrnalibhgpakswi) :
--  1. La migration 20260928000001 a supprimé la policy `profiles_insert` en
--     comptant sur le trigger `on_auth_user_created` (SECURITY DEFINER) pour
--     créer le profil. En live, aucun chemin d'insertion n'existait plus
--     pour le rôle `authenticated` :
--       - pas de policy INSERT  → upsert_profile (INVOKER) échouait en 42501
--         « new row violates row-level security policy for table "profiles" »
--       - profiles_select (is_org_member) → le profil auto-créé en org-1
--         restait invisible tant que l'adhésion org n'était pas active
--     → le signup « restait sur la page d'inscription » et le login
--         de compte récent échouait au chargement du profil.
--  2. Le trigger on_auth_user_created doit rester le chemin principal
--     (SECURITY DEFINER, owner postgres) : on le recrée de façon
--     idempotente pour garantir son état ENABLE.
--
-- Fix (défensif, sans élargir la surface RLS existante) :
--  1. Trigger : DROP + CREATE idempotent (force l'état ENABLE ; un
--     ALTER TRIGGER ... DISABLE manuel en live serait annulé au
--     prochain apply de cette migration).
--  2. `upsert_profile` → SECURITY DEFINER (owner postgres, GRANT
--     EXECUTE authenticated) : le chemin client de reprise/réparation
--     du profil passe alors par le même canal sécurisé que le
--     trigger (la garde `p_user_id = auth.uid()` dans le corps reste
--     effective : en DEFINER, la comparaison porte sur le claim JWT,
--     pas sur un superuser).
--  3. Policy `profiles_insert_self` (PERMISSIVE, INSERT) : repli
--     self-scopé (initplan_uid() = id) si le trigger échoue.
--     INSERT ne prend qu'une expression WITH CHECK (PG).
--  4. `profiles_select` élargie : initplan_uid() = id OR
--     is_org_member(...) — lire le propre profil ne dépend plus de
--     l'adhésion org (premier login post-signup, org par défaut).
--
-- Rationale (01 §4.10, AD-16b) : policies auto-service strictement
-- self-scopées (initplan_uid() = id) ; aucun accès croisé. Le trigger
-- SECURITY DEFINER reste le chemin principal de création ; les policies
-- sont le repli défensif.

-- 1) Recréer le trigger ENABLE (idempotent : DROP + CREATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Vérification : le trigger existe et n'est pas en D (disabled)
DO $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname = 'on_auth_user_created'
      AND tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created absent ou désactivé';
  END IF;
END
$fn$;

-- 2) upsert_profile en SECURITY DEFINER (chemin client de reprise)
ALTER FUNCTION public.upsert_profile SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.upsert_profile TO authenticated;

-- 3) Policy INSERT self-service (repli si le trigger ne crée pas la ligne)
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (initplan_uid() = id);

-- 4) profiles_select : propre profil OU adhésion org (élargissement)
ALTER POLICY profiles_select ON public.profiles
  USING (initplan_uid() = id OR is_org_member(initplan_uid(), org_id));

-- 5) invitation_claims_insert : le claimant n'est PAS encore membre de
--    l'org cible (c'est le settlement qui le crée) — exiger
--    is_org_member était structurellement fermé (chicken-and-egg :
--    le claim échouait pour n'importe qui). Garde correcte :
--    l'invitation référencée doit EXISTER (le trigger
--    settle_invitation_claim valide code / statut / usage au settlement).
--
-- Note live : appliquer en 2 instructions séparées (ALTER POLICY ne
-- supporte pas `FOR INSERT` dans le corps de l'ALTER ; le cmd est
-- conservé tel quel).
ALTER POLICY invitation_claims_insert ON public.invitation_claims
  WITH CHECK (
    initplan_uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.id = invitation_claims.invitation_id
    )
  );

-- Rationale (01 §4.10) : pas d'USING (true) — self-scoping via
-- initplan_uid() + existence de l'invitation. Toute la validation
-- métier (code, statut PENDING, usage unique, settlement) reste
-- du côté serveur (trigger settle_invitation_claim, SECURITY DEFINER).
