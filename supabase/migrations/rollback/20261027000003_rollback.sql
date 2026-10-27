-- ============================================================================
-- Rollback 20261027000003 — retire la trace du keep-alive externe
-- ============================================================================
-- Après ce rollback, `.github/workflows/keep-alive.yml` doit être ramené à sa
-- version précédente (lecture de /rest/v1/keep_alive), sinon le job échouera
-- en 404 sur /rest/v1/rpc/keep_alive_ping.
--
-- Les colonnes sont supprimées : l'historique des pings externes est perdu.
-- Dump préalable conseillé :
--   SELECT * FROM public.keep_alive;

REVOKE ALL ON FUNCTION public.keep_alive_ping() FROM anon;
DROP FUNCTION IF EXISTS public.keep_alive_ping();

ALTER TABLE public.keep_alive
  DROP COLUMN IF EXISTS external_count,
  DROP COLUMN IF EXISTS external_ping;
