-- Rollback de 20261031000009 — retire les grants de réplication accordés
-- génériquement (PR9). Best-effort : si le rôle n'existe plus, on ignore.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname LIKE 'powersync%' LOOP
    EXECUTE format(
      'REVOKE SELECT ON public.transaction_attachments, public.org_settings FROM %I',
      r.rolname
    );
  END LOOP;
END $$;
