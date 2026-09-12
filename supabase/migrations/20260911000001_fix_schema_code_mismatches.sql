-- ============================================================================
-- 20260911000001 : Correction des écarts schéma ↔ code identifiés par l'audit
-- ----------------------------------------------------------------------------
-- Résout les findings critiques de l'audit (DB schema↔code) :
--   1. cotisations : ajout de la colonne org_id (requêtée par dataLayer.ts)
--   2. custom_field_definitions : renommage des colonnes
--      (key→field_name, label→field_label, type→field_type) + ajout updated_at
--   3. versements : ajout de la colonne comment
--   4. group_memberships : renommage role_in_group → role
--   5. budget_lines : ajout de la colonne description
--
-- NB : ces ALTER sont idempotents (IF NOT EXISTS / renommage protégé) et
--     réconcilient le DDL avec les interfaces TypeScript (PSCotisation,
--      PSVersement, PSGroupMembership, PSBudgetLine) de src/lib/dataLayer.ts.
-- ============================================================================

-- 1. cotisations : ajout de org_id (dataLayer.ts:585 WHERE org_id = ?)
ALTER TABLE public.cotisations ADD COLUMN IF NOT EXISTS org_id TEXT NOT NULL DEFAULT 'org-1';
CREATE INDEX IF NOT EXISTS idx_cotisations_org ON public.cotisations(org_id);

-- 2. custom_field_definitions : le code (dataLayer.ts:1064,1086,1110) utilise
--    field_name / field_label / field_type / updated_at. On crée ces colonnes,
--    on copie les valeurs depuis les anciennes (key / label / type), on retire
--    les anciennes.
ALTER TABLE public.custom_field_definitions ADD COLUMN IF NOT EXISTS field_name  TEXT;
ALTER TABLE public.custom_field_definitions ADD COLUMN IF NOT EXISTS field_label TEXT;
ALTER TABLE public.custom_field_definitions ADD COLUMN IF NOT EXISTS field_type  TEXT;
ALTER TABLE public.custom_field_definitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

UPDATE public.custom_field_definitions SET field_name  = key   WHERE field_name  IS NULL AND key   IS NOT NULL;
UPDATE public.custom_field_definitions SET field_label = label WHERE field_label IS NULL AND label IS NOT NULL;
UPDATE public.custom_field_definitions SET field_type  = type  WHERE field_type  IS NULL AND type  IS NOT NULL;

ALTER TABLE public.custom_field_definitions ALTER COLUMN field_name  SET NOT NULL;
ALTER TABLE public.custom_field_definitions ALTER COLUMN field_label SET NOT NULL;
ALTER TABLE public.custom_field_definitions ALTER COLUMN field_type  SET NOT NULL;

ALTER TABLE public.custom_field_definitions DROP COLUMN IF EXISTS key;
ALTER TABLE public.custom_field_definitions DROP COLUMN IF EXISTS label;
ALTER TABLE public.custom_field_definitions DROP COLUMN IF EXISTS type;

-- 3. versements : ajout de comment (PSVersement + SELECT dataLayer.ts:477)
ALTER TABLE public.versements ADD COLUMN IF NOT EXISTS comment TEXT;

-- 4. group_memberships : le code (dataLayer.ts:607,635) utilise la colonne `role`.
--    Le DDL original définit role_in_group. On renomme vers le nom attendu.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_memberships' AND column_name = 'role_in_group'
  ) THEN
    ALTER TABLE public.group_memberships RENAME COLUMN role_in_group TO role;
  END IF;
END
$$;

ALTER TABLE public.group_memberships ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE public.group_memberships ADD COLUMN IF NOT EXISTS left_at   TIMESTAMP WITH TIME ZONE;

-- 5. budget_lines : ajout de description (PSBudgetLine + SELECT dataLayer.ts:541)
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS description TEXT;
