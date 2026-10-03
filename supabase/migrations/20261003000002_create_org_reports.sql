-- ============================================================================
-- 20261003000002 — Table `org_reports` : rapports de gestion inter-organisations
-- ----------------------------------------------------------------------------
-- Feature « Rapports inter-organisations » (plan docs/plans/2026-10-03-lumina-rapports-organisations.md,
-- Phase 1 T1.1).
--
-- Contenu : une organisation (annexe) envoie à sa mère un rapport de gestion
-- détaillé (finances + événements + membres + documents) sur une période
-- (mensuelle/semestrielle/annuelle), dans un format (pdf/docx/xlsx/png). Le
-- destinataire est TOUJOURS `parent_org_id` de `from_org` (hiérarchie
-- existante, migration 20260910000004).
--
-- Conventions reprises du pattern P0 Lumina :
--   * PK text (UUID) côté client (PowerSync) — cohérent avec les autres
--     tables (id implicit pkey côté PowerSync, cf. invitation-schema.ts).
--   * Policies RESTREINTES (pas de `USING(true)` global) :
--       - émetteur  : lit/modifie ses propres rapports
--                     (`from_org_id = current_org_id()`)
--       - récepteur : lit les rapports qui lui sont destinés
--                     (`to_org_id = current_org_id()`)
--   * `FORCE ROW LEVEL SECURITY` sur la table business (01 §2.2 règle 1).
--   * Grants : `SELECT, INSERT, UPDATE` TO authenticated + service_role
--     (pas de DELETE côté client — la suppression d'un rapport est un
--     admin action, pas un client action).
--   * Index `(to_org_id, period_start DESC)` : réception (liste des rapports
--     reçus triés par période). Index `(from_org_id, period_start DESC)` :
--     émission (liste des rapports émis par une org).
--   * Contrainte UNIQUE (from_org_id, to_org_id, period_start, period_end,
--     format) : idempotence de l'outbox offline-first (Phase 3) — un même
--     rapport n'est pas ré-enregistré.
--
-- Le helper `current_org_id()` est créé dans cette migration (absent,
-- collision check validé via pg_class/pg_proc) : SECURITY DEFINER, retourne
-- l'org courante de l'appelant via `profiles.org_id` (aligné sur le pattern
-- `is_org_member`, SECURITY DEFINER + SET search_path = public).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Helper `current_org_id()` (absent, créé ici — aligné sur is_org_member)
--    Rationale : SECURITY DEFINER pour pouvoir lire `profiles` (qui a son
--    propre RLS) sans boucle de permission ; STABLE (pas VOLATILE) pour
--    l'utiliser dans les policies RLS sans invalider le plan de query.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT org_id FROM public.profiles WHERE id = auth.uid();
$fn$;

GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;

-- ----------------------------------------------------------------------------
-- 2) La table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_reports (
  id text PRIMARY KEY,
  from_org_id text NOT NULL,            -- émetteur (l'annexe)
  to_org_id text NOT NULL,              -- destinataire (la mère) = parent_org_id de from_org
  period_start date NOT NULL,
  period_end date NOT NULL,
  format text NOT NULL DEFAULT 'pdf'
    CHECK (format IN ('pdf','docx','xlsx','png')),
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',  -- agrégats calculés (finances/événements/membres)
  pdf_path text,                         -- bucket privé `org_reports`, clé storage
  document_refs text[] DEFAULT '{}',    -- ids documents uploadés joints (picker)
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SENT','READ','FAILED')),
  read_at timestamptz,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (from_org_id, to_org_id, period_start, period_end, format)
);

-- ----------------------------------------------------------------------------
-- 3) Index (réception + émission)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_org_reports_to ON public.org_reports(to_org_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_org_reports_from ON public.org_reports(from_org_id, period_start DESC);

-- ----------------------------------------------------------------------------
-- 4) RLS — policies RESTREINTES (émetteur + récepteur, pas d'accès global)
--    Rationale : les rapports sont des données de gestion sensibles ;
--    l'accès est limité à (a) l'émetteur qui lit/modifie ses propres envois,
--    (b) le récepteur qui lit les rapports qui lui sont destinés. Pas de
--    `USING(true)` global (interdit hors registres globaux serveurs, 01 §4.10).
--    `FOR ALL` sur l'émetteur = SELECT + INSERT + UPDATE (pas de DELETE).
-- ----------------------------------------------------------------------------
ALTER TABLE public.org_reports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_reports_emitter ON public.org_reports;
CREATE POLICY org_reports_emitter ON public.org_reports
  FOR ALL
  USING (from_org_id = public.current_org_id())
  WITH CHECK (from_org_id = public.current_org_id());

DROP POLICY IF EXISTS org_reports_receiver ON public.org_reports;
CREATE POLICY org_reports_receiver ON public.org_reports
  FOR SELECT
  USING (to_org_id = public.current_org_id());

-- ----------------------------------------------------------------------------
-- 5) Grants (SELECT/INSERT/UPDATE TO authenticated + service_role ; pas de
--    DELETE côté client — la suppression est un admin action)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.org_reports TO authenticated, service_role;
