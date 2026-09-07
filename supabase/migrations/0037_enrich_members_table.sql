-- Migration 0037: Enrichir la table membres avec total_dons et montant_en_avance

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS total_dons BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS montant_en_avance BIGINT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_members_total_dons ON public.members(total_dons);
