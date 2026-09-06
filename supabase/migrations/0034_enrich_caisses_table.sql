-- Migration 0034: enrich caisses table with status and archive columns

ALTER TABLE public.caisses
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived_by TEXT,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_caisses_status ON public.caisses(status);
CREATE INDEX IF NOT EXISTS idx_caisses_org_id ON public.caisses(org_id);
