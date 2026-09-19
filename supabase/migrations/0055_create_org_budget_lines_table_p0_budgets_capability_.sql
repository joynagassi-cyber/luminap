CREATE TABLE public.org_budget_lines (
  id text PRIMARY KEY,
  org_id text NOT NULL DEFAULT 'org-1',
  budget_id text NOT NULL,
  category_id text,
  planned_amount_cents integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);