ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS source text;