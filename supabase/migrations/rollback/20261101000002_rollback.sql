-- Rollback de 20261101000002 — supprime la RPC de rate-limiting anonyme et sa
-- table de comptage.

REVOKE ALL ON FUNCTION public.register_anonymous_report(TEXT, INTEGER) FROM service_role;
DROP FUNCTION IF EXISTS public.register_anonymous_report(TEXT, INTEGER);
DROP TABLE IF EXISTS public.error_report_throttle;
