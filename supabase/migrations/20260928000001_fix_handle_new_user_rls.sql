-- 20260928000001 : corrige handle_new_user — SECURITY DEFINER + policy insert
--
-- Causale : depuis 20260926000001_advisors_cleanup, les politiques
-- profiles_insert / profiles_update utilisent initplan_uid() = id pour
-- éviter le re-évaluation N+1 de current_setting() (advisor perf).
--
-- Problème : le trigger on_auth_user_created (AFTER INSERT ON auth.users)
-- exécutait handle_new_user EN TANT QUE le rôle courant de la session
-- GoTrue — c'est-à-dire `anon` — car la fonction n'était PAS SECURITY
-- DEFINER (prosecdef=false depuis la dernière DROP + CREATE sans
-- SECURITY DEFINER dans 0039_create_profiles_table.sql, puis la
-- migration 20260926000001 qui a réécrit le corps sans re-déclarer
-- le mode).
--
-- Conséquence : GoTrue signale 500 « Database error saving new user »
-- pour TOUS les signups (email/mot de passe, OTP, Google OAuth, …).
-- Le trigger échoue sur le WITH CHECK de profiles_insert :
-- initplan_uid() = id → NULL = id → faux → 42501 → rollback du signup.
--
-- Fix :
--  1. handle_new_user → SECURITY DEFINER : le trigger s'exécute avec
--     le rôle de l'owner (postgres), qui BYPASSes RLS et dispose du
--     GRANT à la table profiles. C'est le contrat standard d'un
--     trigger GoTrue (cf. docs Supabase « Database Trigger Events »).
--  2. Suppression de la politique profiles_insert (initplan_uid()=id) :
--     elle ne pouvait être satisfaite que par un utilisateur connecté,
--     or le trigger s'exécute en SECURITY DEFINER (owner postgres), qui
--     BYPASS RLS entièrement. Aucun rôle n'a besoin d'une politique
--     INSERT explicite pour créer un profil. L'upsert self-service passe
--     par le RPC upsert_profile (qui garde sa propre validation auth.uid()).

-- 1) SECURITY DEFINER sur le trigger + owner explicite (postgres)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, org_id, status)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'first_name',
             split_part(coalesce(NEW.email, ''), '@', 1)),
    coalesce(NEW.raw_user_meta_data->>'last_name', ''),
    'MEMBRE',
    'org-1',
    'ACTIVE'
  )
  ON CONFLICT (id) DO UPDATE
    SET first_name = coalesce(EXCLUDED.first_name, profiles.first_name),
        last_name  = coalesce(EXCLUDED.last_name,  profiles.last_name),
        email      = coalesce(EXCLUDED.email,     profiles.email);
  RETURN NEW;
END;
$$;

-- 2) Le trigger doit continuer à pointer la dernière version de la fonction
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Garde-fou : retire la politique INSERT stricte initplan_uid()=id,
--    qui ne pouvait être satisfaite que par un utilisateur connecté —
--    or le trigger s'exécute en SECURITY DEFINER (owner postgres, BYPASS
--    RLS), donc plus de role a besoin d'une politique INSERT explicite
--    pour créer un profil. L'upsert self-service passe par l'RPC
--    upsert_profile (qui garde sa propre validation auth.uid()), et
--    l'auto-creation au signup passe par ce trigger.
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
