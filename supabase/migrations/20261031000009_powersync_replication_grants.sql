-- ============================================================================
-- 20261031000009 — Grants de RÉPLICATION PowerSync pour les tables récentes
-- ----------------------------------------------------------------------------
-- DÉFAUT MESURÉ (2026-10-31, `powersync deploy --dry-run`)
--   La validation du sync config échouait :
--     • [error] permission denied for table org_settings
--   L'instance Production se connecte avec un rôle de réplication
--   PROPRE À L'INSTANCE (`powersync_28d1d97617993b66d4ee0a3b`, cf.
--   `powersync/service.yaml`), créé par l'intégration Supabase. Les tables
--   antérieures au 2026-10-28 ont reçu `GRANT SELECT ON ALL TABLES IN SCHEMA
--   public` (réparation R80) ; toute table créée ENSUITE (ex. `org_settings`,
--   PR #162) n'a que le grant à `powersync_role` (convention du dépôt) et
--   reste INVISIBLE du rôle réellement utilisé par la réplication.
--   Conséquence : impossible de déployer le sync config (bloquant), et un
--   stream pointant sur une telle table ne synchroniserait rien.
--
-- CORRECTIF
--   Accorder SELECT à TOUT rôle dont le nom commence par `powersync`
--   (générique et indépendant du nom d'instance — un nom de rôle codé en dur
--   serait faux sur une autre instance). Idempotent : rejouer la migration ne
--   change rien. Couvre `transaction_attachments` (PR9) et `org_settings`
--   (PR8/PR13), les deux tables concernées.
--
-- RÉVERSIBILITÉ : rollback/20261031000009_rollback.sql
-- ============================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname LIKE 'powersync%' LOOP
    EXECUTE format(
      'GRANT SELECT ON public.transaction_attachments, public.org_settings TO %I',
      r.rolname
    );
  END LOOP;
END $$;
