-- ============================================================================
-- 20260921000005 — Modèle agnostique : tables `grants` + `tags` +
-- `tag_assignments` (Vague 2)
-- ----------------------------------------------------------------------------
-- Contrat minimal (invariant 8/9/10) :
--   * `subject_type` reste le SEUL CHECK (5 sources de résolution).
--   * `resource`, `action`, `scope_resource`, `scope_id` : TEXT LIBRES,
--     sans CHECK / sans enum — l'ajout d'une nouvelle feature = 0 migration.
--   * Un grant `subject_type='tag'` cible directement un `tag_id`
--     (sujet de première classe, pas seulement un groupeur de users).
--
-- Idem Vague 1 : le `id` pkey est UUID `gen_random_uuid()` ; les colonnes
-- `org_id` sont TEXT (cohérent avec `profiles.org_id`, `organizations.id`).
-- Les UUID FKs (`user_id`, `granted_by`, `assigned_by`) pointent vers
-- `auth.users` ou `tags` ; les colonnes `subject_id` / `scope_id` sont TEXT
-- libres (peuvent porter un rôle, un tag_id, un membership_id…).
--
-- RLS : lecture ouverte (filtrage fort via `canAccess` Vague 2.4) ;
-- l'écriture est réservée au serveur (trigger + edge-fns SECURITY DEFINER).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.grants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type   TEXT NOT NULL
                 CHECK (subject_type IN ('user','org_member','group_member','role','tag')),
  subject_id     TEXT NOT NULL,
  resource       TEXT NOT NULL,
  action         TEXT NOT NULL,
  scope_resource TEXT,
  scope_id       TEXT,
  granted_by     UUID,
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_grants_subject ON public.grants (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_grants_scope   ON public.grants (scope_resource, scope_id);
CREATE INDEX IF NOT EXISTS idx_grants_active  ON public.grants (resource, action) WHERE revoked_at IS NULL;

ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY grants_read_org ON public.grants FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_org ON public.tags (org_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_read_org ON public.tags FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.tag_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id      UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE (tag_id, user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_ta_user ON public.tag_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_ta_tag  ON public.tag_assignments (tag_id);

ALTER TABLE public.tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ta_read_org ON public.tag_assignments FOR SELECT TO authenticated USING (true);
