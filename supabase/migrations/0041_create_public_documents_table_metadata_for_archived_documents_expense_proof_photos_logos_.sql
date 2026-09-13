create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id text not null default 'org-1',
  title text not null,
  purpose text,
  bucket text not null default 'archives' check (bucket in ('archives','expense_proofs','logos')),
  file_path text not null,
  file_size bigint,
  mime_type text,
  entity_type text check (entity_type in ('ARCHIVE_DOC','EXPENSE_PROOF','LOGO','OTHER')),
  entity_id text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED','DELETED')),
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);