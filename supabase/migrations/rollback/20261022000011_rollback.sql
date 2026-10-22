-- ============================================================================
-- ROLLBACK de 20261022000011
-- ----------------------------------------------------------------------------
-- Supprime la protection : un utilisateur peut de nouveau modifier son
-- `profiles.role` (NON SÛR : permet l'escalade MEMBRE -> ADMIN).
-- ============================================================================
DROP TRIGGER IF EXISTS guard_profile_role_immutable ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profile_role_immutable();
