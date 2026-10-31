-- Rollback de 20261031000007 — supprime la table org_settings (socle PR8/PR13).

DROP TRIGGER IF EXISTS trg_org_settings_updated_at ON public.org_settings;
DROP TABLE IF EXISTS public.org_settings;
