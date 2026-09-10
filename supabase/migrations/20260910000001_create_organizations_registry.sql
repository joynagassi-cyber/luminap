-- ============================================================================
-- T1 — Registre des organisations (administration centrale multi-organisation)
-- ----------------------------------------------------------------------------
-- Source de vérité du cycle de vie des organisations (PENDING/ACTIVE/
-- SUSPENDED/ARCHIVED). Jusqu'à présent les organisations n'existaient que
-- comme `org_id TEXT` implicite (défaut 'org-1') sur les tables métier.
--
-- CONTRAINTES :
--   * id en TEXT pour rester compatible avec toutes les colonnes org_id
--     existantes (TEXT, pas UUID) — aucune table existante n'est altérée ici
--     (pas de FK ajoutée dans ce fichier : backfill d'abord, FK éventuelle
--     à l'étape suivante une fois le backfill validé).
--   * ARCHIVED ≠ DELETE : l'historique (membre, transactions, événements,
--     rapports) reste intact ; l'organisation passe simplement en ARCHIVED.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'CHURCH'
    CHECK (type IN ('CENTRAL', 'CHURCH', 'SCHOOL', 'ENTERPRISE')),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  suspended_at TIMESTAMPTZ,
  suspended_by UUID,                 -- profiles.id (UUID) — pas de FK (cf. invitations)
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  archive_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(type);

-- updated_at automatique.
-- La fonction public.update_updated_at_column() est créée ici (CREATE OR
-- REPLACE, idempotente) pour que la migration soit auto-suffisante : la base
-- vivante ne l'avait pas (seule storage. l'a), et le fichier d'invitations la
-- présuppose. Définition identique à celle du système d'invitations.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Seed : organisation centrale + backfill des org_id existantes (observées :
-- 'org-1', 'e2e-auth-org-1' — le SELECT couvre l'ensemble dynamiquement)
-- ----------------------------------------------------------------------------
INSERT INTO public.organizations (id, name, type, status)
VALUES ('org-central', 'Administration centrale Lumina', 'CENTRAL', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, type, status)
SELECT DISTINCT p.org_id,
       'Organisation ' || p.org_id,
       'CHURCH',
       'ACTIVE'
FROM public.profiles p
WHERE p.org_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- RLS (le scope admin central est ajouté dans T2 via org_admins)
-- ----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Membre de l'organisation lit sa propre organisation
CREATE POLICY "orgs_select_member" ON public.organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- Création d'une organisation : politique d'INSERT créée dans la migration
-- T3 (après org_admins) — « réservé à un admin central avec grant actif ».
-- (Elle ne peut pas vivre ici : org_admins n'existe pas encore au moment
-- de l'application de ce fichier en base neuve, et CREATE POLICY analyse
-- le subquery.)

-- Admin de l'organisation (rôle ADMIN local) gère le cycle de vie de SA org
CREATE POLICY "orgs_update_admin" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
