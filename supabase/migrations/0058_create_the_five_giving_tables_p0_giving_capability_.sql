CREATE TABLE public.giving_donors (
  id text PRIMARY KEY,
  org_id text NOT NULL DEFAULT 'org-1',
  full_name text NOT NULL,
  email text,
  phone text,
  address text,
  member_id text,
  tax_receipt_enabled integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.giving_campaigns (
  id text PRIMARY KEY,
  org_id text NOT NULL DEFAULT 'org-1',
  name text NOT NULL,
  purpose text,
  fund text,
  target_amount_cents integer NOT NULL DEFAULT 0,
  start_date text,
  end_date text,
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pledges (
  id text PRIMARY KEY,
  org_id text NOT NULL DEFAULT 'org-1',
  campaign_id text NOT NULL,
  donor_id text NOT NULL,
  pledged_amount_cents integer NOT NULL DEFAULT 0,
  schedule text NOT NULL DEFAULT 'ONCE',
  amount_per_period_cents integer NOT NULL DEFAULT 0,
  start_date text,
  end_date text,
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tax_receipts (
  id text PRIMARY KEY,
  org_id text NOT NULL DEFAULT 'org-1',
  donor_id text NOT NULL,
  year integer NOT NULL,
  receipt_no text NOT NULL,
  total_amount_cents integer NOT NULL DEFAULT 0,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tax_receipts_org_donor_year_key UNIQUE (org_id, donor_id, year)
);
CREATE TABLE public.transaction_giving (
  id text PRIMARY KEY,
  org_id text NOT NULL DEFAULT 'org-1',
  transaction_id text NOT NULL,
  donor_id text NOT NULL,
  campaign_id text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transaction_giving_org_tx_key UNIQUE (org_id, transaction_id)
);