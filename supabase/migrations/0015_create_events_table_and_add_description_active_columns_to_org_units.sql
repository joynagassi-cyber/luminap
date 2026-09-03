CREATE TABLE IF NOT EXISTS public.events (
  id text PRIMARY KEY,
  org_id text NOT NULL DEFAULT 'org-1',
  name text NOT NULL,
  description text DEFAULT '',
  start_date text NOT NULL,
  end_date text,
  status text NOT NULL DEFAULT 'PLANIFIED',
  budget bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.org_units ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.org_units TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.org_units TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.org_units TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_open_all" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "org_units_open_all" ON public.org_units FOR ALL USING (true) WITH CHECK (true);