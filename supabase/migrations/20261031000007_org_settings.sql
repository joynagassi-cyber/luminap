-- ============================================================================
-- 20261031000007 — `org_settings` : réglages par organisation (socle partagé)
-- ----------------------------------------------------------------------------
-- POURQUOI
--   Deux features produit ont besoin d'un réglage PERSISTANT par organisation :
--     * PR8  — approbation en deux étapes (maker-checker), par défaut DÉSACTIVÉE ;
--     * PR13 — gel de période comptable (date de clôture), par défaut AUCUN.
--   Il n'existait AUCUN magasin de réglages par org. La table `config`
--   déclarée dans le schéma PowerSync n'a NI migration NI usage : elle est
--   vestigiale et n'est pas synchronisée (aucun stream). On crée donc une table
--   dédiée, explicitement scopée par organisation.
--
-- FORME
--   `key`/`value` en TEXT (value = JSON sérialisé) : souple, extensible sans
--   migration à chaque nouveau réglage. La clé primaire est (org_id, key) :
--   un réglage est UNIQUE par organisation, jamais global.
--
-- SÉCURITÉ
--   Lecture : tout MEMBRE de l'organisation (les réglages ne sont pas secrets).
--   Écriture : permission canon `admin:settings` (via `has_permission`), donc
--   ADMIN / PASTEUR_PRINCIPAL uniquement. Aligné sur la politique d'écriture
--   R141 (le client REST direct ne peut pas écrire sans la permission).
--   Le chemin d'écriture applicatif passe par PowerSync (rôle BYPASSRLS) : ces
--   politiques ferment l'accès REST direct, sans casser l'application.
--
-- RÉVERSIBILITÉ : rollback/20261031000007_rollback.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.org_settings (
  org_id     TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, key)
);

CREATE INDEX IF NOT EXISTS idx_org_settings_org_id ON public.org_settings(org_id);

-- updated_at automatique (fonction déjà présente : migration 20260910000001).
DROP TRIGGER IF EXISTS trg_org_settings_updated_at ON public.org_settings;
CREATE TRIGGER trg_org_settings_updated_at
  BEFORE UPDATE ON public.org_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Grants Data API ────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.org_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.org_settings TO authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_settings_select ON public.org_settings;
CREATE POLICY org_settings_select ON public.org_settings
  FOR SELECT TO authenticated
  USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS org_settings_insert ON public.org_settings;
CREATE POLICY org_settings_insert ON public.org_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS org_settings_update ON public.org_settings;
CREATE POLICY org_settings_update ON public.org_settings
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS org_settings_delete ON public.org_settings;
CREATE POLICY org_settings_delete ON public.org_settings
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));
