-- Create caisses table
CREATE TABLE IF NOT EXISTS public.caisses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('MAIN', 'GROUP')),
  color TEXT,
  org_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant Data API access
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.caisses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.caisses TO authenticated;

-- Enable RLS
ALTER TABLE public.caisses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "caisses_select" ON public.caisses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "caisses_insert" ON public.caisses
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "caisses_update" ON public.caisses
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "caisses_delete" ON public.caisses
  FOR DELETE TO authenticated USING (true);

-- Add columns to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source_caisse_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS versement_id TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_transactions_source_caisse_id ON public.transactions(source_caisse_id);
CREATE INDEX IF NOT EXISTS idx_transactions_versement_id ON public.transactions(versement_id);
CREATE INDEX IF NOT EXISTS idx_caisses_org_id ON public.caisses(org_id);