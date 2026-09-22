-- Lot F.2 : famille de rapport (FINANCE / FEATURE / AUDIT).
-- Défaut FINANCE pour rester rétro-compatible avec les rapports existants.
ALTER TABLE public.report_definitions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'FINANCE';
COMMENT ON COLUMN public.report_definitions.kind IS 'FINANCE | FEATURE | AUDIT';
