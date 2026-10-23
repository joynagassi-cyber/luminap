-- ============================================================================
-- ROLLBACK de 20261022000014
-- ----------------------------------------------------------------------------
-- Supprime la protection à l'INSERT : un utilisateur peut de nouveau recréer
-- son profil avec un rôle privilégié (NON SÛR).
-- ============================================================================
DROP TRIGGER IF EXISTS guard_profile_role_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profile_role_insert();
