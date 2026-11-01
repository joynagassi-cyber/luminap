-- Rollback de 20261101000003 — supprime les RPC de déduplication atomique et
-- leur table de réservation (ordre : fonctions avant la table).

REVOKE ALL ON FUNCTION public.claim_error_report(TEXT, INTEGER) FROM service_role;
REVOKE ALL ON FUNCTION public.release_error_report(TEXT, INTEGER) FROM service_role;
DROP FUNCTION IF EXISTS public.claim_error_report(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.release_error_report(TEXT, INTEGER);
DROP TABLE IF EXISTS public.error_report_dedupe;
