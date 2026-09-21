-- ============================================================================
-- 20260921000001 — Socle multi-org : table org_memberships (multi-rôle)
-- ----------------------------------------------------------------------------
-- Vague 1 du socle multi-org + modèle scopé (rapport §A→B→C).
--
-- Modélise l'appartenance d'un user à plusieurs organisations :
--   1 ligne par (user_id, org_id, role, status) — multi-rôle dans une même
--   org, et multi-org par user.
--
-- Le backfill 1:1 depuis `profiles` (migration 20260921000002) préserve
-- l'état existant : tout user mono-org verra exactement le même jeu de
-- données avant/après (assert 1.6 du plan).
--
-- Ajustements techniques par rapport au SQL du cahier des charges :
--   * La contrainte UNIQUE est `UNIQUE (user_id, org_id, role, status)`.
--     Le `ON CONFLICT (user_id, org_id, role)` du backfill exige un unique
--     index sur ces 3 colonnes ; ici on ajoute `status` pour que le trigger
--     de Vague 3 puisse « ACTIVER » une ligne PENDING existante au lieu de
--     créer un doublon (DO UPDATE SET status='ACTIVE').
--   * Les policies `om_grant_read` / `om_grant_write` sont corrélées par
--     `org_memberships.org_id` (la sou-select du cahier ne référencait pas
--     la table courante, ce qui est illégal dans une policy SELECT/ALL).
--   * `org_id` est TEXT (pas UUID) — cohérent avec `organizations.id TEXT`,
--     `profiles.org_id TEXT` et l'invariant 6 (UUID implicite, pas de texte
--     forcé sur les colonnes id).
-- ============================================================================

CREATE TABLE public.org_memberships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     TEXT NOT NULL,
  role       TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status     TEXT NOT NULL DEFAULT 'ACTIVE'
             CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','ARCHIVED')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at    TIMESTAMPTZ,
  UNIQUE (user_id, org_id, role, status)
);

-- UNIQUE (user_id, org_id, role) :
--   * Permet le backfill 1:1 (20260921000002) via ON CONFLICT DO NOTHING.
--   * Permet au trigger Vague 3 (20260921000006) d'écrire via
--     ON CONFLICT (user_id, org_id, role) DO UPDATE SET status='ACTIVE'.
-- Le `ON CONFLICT` de PG exige une UNIQUE/EXCL correspondante, et une
-- UNIQUE partielle (avec WHERE status IN …) ne suffit PAS au trigger :
-- il faut donc l'unique simple ici. L'invariant "1 statut actif par rôle"
-- est garanti par le trigger (DO UPDATE, jamais de 2ᵉ ligne pour le même
-- (user_id, org_id, role)).
CREATE UNIQUE INDEX uq_org_memberships_user_org_role
  ON public.org_memberships (user_id, org_id, role);

CREATE INDEX idx_org_memberships_org   ON public.org_memberships (org_id);
CREATE INDEX idx_org_memberships_user  ON public.org_memberships (user_id);

ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;

-- RLS org_memberships (restricte au membership + au grant admin)
-- Lecture : soi-même OU admin central de l'org (grants actifs)
CREATE POLICY om_self_read ON public.org_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid()
     OR EXISTS (SELECT 1 FROM org_admins a
                WHERE a.admin_profile_id = auth.uid()
                  AND a.org_id = org_memberships.org_id
                  AND a.status = 'ACTIVE'));

-- Écriture : réservée aux admins centraux de l'org (jamais aux membres)
CREATE POLICY om_grant_write ON public.org_memberships FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM org_admins a
                 WHERE a.admin_profile_id = auth.uid()
                   AND a.org_id = org_memberships.org_id
                   AND a.status = 'ACTIVE'))
  WITH CHECK (EXISTS (SELECT 1 FROM org_admins a
                      WHERE a.admin_profile_id = auth.uid()
                        AND a.org_id = org_memberships.org_id
                        AND a.status = 'ACTIVE'));
