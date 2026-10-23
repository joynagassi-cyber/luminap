-- ============================================================================
-- 20261022000006 — fix: tout nouvel inscrit était rattaché à `org-1` (fuite PII)
-- ----------------------------------------------------------------------------
-- DÉFAUT (CRITIQUE)
--   `public.handle_new_user()` (trigger AFTER INSERT sur auth.users) créait le
--   profil de CHAQUE nouvel inscrit avec `org_id = 'org-1'` :
--
--     INSERT INTO public.profiles (..., role, org_id, status)
--     VALUES (..., 'MEMBRE', 'org-1', 'ACTIVE');
--
--   Or `org-1` est une organisation « par défaut » qui contient déjà de vraies
--   adresses personnelles (et un TREASURIER réel). Comme la policy
--   `profiles_select` autorise `is_org_member(uid, org_id)` et que
--   `is_org_member` considère `profiles.org_id`, **tout nouvel inscrit pouvait
--   lire tous les profils de `org-1`** — nom, e-mail, rôle — sans invitation.
--
--   `upsert_profile` (RPC SECURITY DEFINER, EXECUTE par `authenticated`) était
--   un second vecteur : il acceptait un `p_org_id` arbitraire et l'écrivait sur
--   le profil, permettant à un utilisateur de rejoindre n'importe quelle
--   organisation par simple appel RPC.
--
-- PREUVE
--   Compte neuf `audit-isolation-<ts>@lumina.dev` (créé via /auth/v1/signup) :
--     GET /rest/v1/profiles?select=email,role,org_id  ->  59 profils
--     dont « joynagassi@gmail.com », « kairosiluminate@gmail.com », …
--   Après correctif : 1 seul profil (le sien).
--
-- CORRECTIF
--   1. `handle_new_user` : `'org-1'` → `'__no_org__'` (le marqueur explicite
--      d'absence d'organisation, déjà géré par `orgContext.ts` et
--      `AppContext.tsx`). L'utilisateur rejoint une organisation par invitation
--      (règlement de claim) ou en créant la sienne.
--   2. `upsert_profile` : n'écrit plus `org_id` sur un profil EXISTANT
--      (l'appartenance ne se change pas par ce RPC), et un INSERT sans
--      organisation explicite retombe sur `'__no_org__'` (plus jamais `org-1`).
--
-- Les utilisateurs déjà rattachés à `org-1` ne sont PAS déplacés (données
-- potentiellement réelles : on ne touche pas). Voir RISQUES.md R21.
--
-- RÉVERSIBILITÉ : rollback/20261022000006_rollback.sql
-- ============================================================================

-- ── 1) Trigger d'inscription : plus de rattachement automatique à org-1 ─────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, org_id, status)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'first_name',
             split_part(coalesce(NEW.email, ''), '@', 1)),
    coalesce(NEW.raw_user_meta_data->>'last_name', ''),
    'MEMBRE',
    -- Aucune organisation tant qu'une invitation n'a pas été réclamée ou
    -- qu'une organisation n'a pas été créée : ne JAMAIS rattacher à une
    -- organisation existante (fuite de données entre utilisateurs).
    '__no_org__',
    'ACTIVE'
  )
  ON CONFLICT (id) DO UPDATE
    SET first_name = coalesce(EXCLUDED.first_name, profiles.first_name),
        last_name  = coalesce(EXCLUDED.last_name,  profiles.last_name),
        email      = coalesce(EXCLUDED.email,     profiles.email);
  RETURN NEW;
END;
$function$;

-- ── 2) upsert_profile : l'organisation ne s'injecte plus par ce RPC ─────────
CREATE OR REPLACE FUNCTION public.upsert_profile(
  p_user_id uuid,
  p_first_name text DEFAULT NULL::text,
  p_last_name text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text,
  p_org_id text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result profiles;
BEGIN
  -- Sécurité : seuls les utilisateurs peuvent modifier leur propre profil
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'NOT_YOUR_PROFILE: p_user_id does not match auth.uid()';
  END IF;

  INSERT INTO profiles (id, first_name, last_name, role, org_id, status)
  VALUES (
    p_user_id,
    coalesce(p_first_name, ''),
    coalesce(p_last_name,  ''),
    coalesce(p_role,       'MEMBRE'),
    -- Jamais 'org-1' par défaut : une organisation réelle ne s'attribue pas
    -- toute seule. '__no_org__' est le marqueur d'absence d'organisation.
    coalesce(NULLIF(TRIM(p_org_id), ''), '__no_org__'),
    coalesce(p_status,     'ACTIVE')
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = coalesce(NULLIF(TRIM(p_first_name), ''), profiles.first_name),
    last_name  = coalesce(NULLIF(TRIM(p_last_name),  ''), profiles.last_name),
    role       = coalesce(NULLIF(TRIM(p_role),       ''), profiles.role),
    -- org_id N'EST VOLONTAIREMENT PLUS mis à jour ici : l'appartenance à une
    -- organisation ne doit passer que par une invitation réclamée ou une
    -- création d'organisation (fonctions dédiées), pas par ce RPC générique.
    status     = coalesce(NULLIF(TRIM(p_status),     ''), profiles.status),
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$function$;
