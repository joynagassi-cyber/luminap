CREATE TABLE public.org_budgets (
  id text PRIMARY KEY,
  org_id text NOT NULL DEFAULT 'org-1',
  fiscal_year integer NOT NULL,
  period text NOT NULL DEFAULT 'ANNUAL',
  cost_center_id text,
  cost_center_label text,
  name text NOT NULL,
  total_budgeted_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE',
  currency text NOT NULL DEFAULT 'XOF',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);