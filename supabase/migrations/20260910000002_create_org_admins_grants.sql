-- ============================================================================
-- T2 — Grants d'administration centrale (admin central → organisation)
-- ----------------------------------------------------------------------------
-- Lien explicite « un administrateur central gère telle organisation ».
-- C'est le SEUL lien "central" du modèle : l'administration d'une org reste
-- pilotée par le membership local (profiles.org_id + rôle ADMIN), ce lien
-- donne UNEMENT à l'admin central le droit de gérer les orgs qui lui sont
-- attribuées. Aucun accès global implicatif.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.org_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id UUID NOT NULL,             -- profiles.id (UUID, clé de l'admin central)
  org_id TEXT NOT NULL,                      -- organisations.id (TEXT, cf. registre)
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'REVOKED')),
  granted_by UUID,                           -- profiles.id de celui qui accorde
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_profile_id, org_id)          -- un grant par (admin, org)
);

CREATE INDEX IF NOT EXISTS idx_org_admins_admin ON public.org_admins(admin_profile_id);
CREATE INDEX IF NOT EXISTS idx_org_admins_org ON public.org_admins(org_id);

DROP TRIGGER IF EXISTS trg_org_admins_updated_at ON public.org_admins;
CREATE TRIGGER trg_org_admins_updated_at
  BEFORE UPDATE ON public.org_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Audit : chaque assignation/révocation d'admin central est tracée
-- (réutilise audit_entries — pas de 2ᵉ système)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_org_admin_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.audit_entries (
    id, org_id, user_id, action, entity_type, entity_id, comment,
    actor_role_at_time, created_at, before_state, after_state
  ) VALUES (
    gen_random_uuid(),
    COALESCE(NEW.org_id, OLD.org_id),
    COALESCE(NEW.admin_profile_id, OLD.admin_profile_id),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'ADMIN_ASSIGNED'
      WHEN TG_OP = 'DELETE' THEN 'ADMIN_REMOVED'
      WHEN NEW.status = 'REVOKED' THEN 'ADMIN_REVOKED'
      WHEN OLD.status = 'REVOKED' AND NEW.status = 'ACTIVE' THEN 'ADMIN_REINSTATED'
      ELSE 'ADMIN_UPDATED'
    END,
    'OrgAdmin',
    COALESCE(NEW.id, OLD.id)::text,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'Assigné admin de ' || COALESCE(NEW.org_id, '')
      WHEN TG_OP = 'DELETE' THEN 'Admin retiré de ' || COALESCE(OLD.org_id, '')
      ELSE 'Changement de statut'
    END,
    COALESCE(auth.role()::text, 'service_role'),
    now(),
    CASE WHEN TG_OP = 'DELETE' THEN jsonb_build_object('status', OLD.status) ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL
         ELSE jsonb_build_object('status', NEW.status, 'org_id', COALESCE(NEW.org_id, OLD.org_id)) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_org_admins_audit ON public.org_admins;
CREATE TRIGGER trg_org_admins_audit
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.org_admins
  FOR EACH ROW EXECUTE FUNCTION public.log_org_admin_change();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.org_admins ENABLE ROW LEVEL SECURITY;

-- L'admin central voit ses propres grants
CREATE POLICY "org_admins_select_self" ON public.org_admins
  FOR SELECT TO authenticated
  USING (admin_profile_id = auth.uid());

-- L'organisation gérée voit qui en est admin (lecture du scope)
CREATE POLICY "org_admins_select_org" ON public.org_admins
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- La centrale (rôle ADMIN d'une org) gère les grants de CETTE organisation
-- via un path dédié : on laisse l'écriture passer pour les admins, la
-- vérification forte du "qui peut accorder" se fait en application +
-- fonction SECURITY DEFINER (voir T3/T6) ; ici on borne à l'org du user.
CREATE POLICY "org_admins_insert_admin" ON public.org_admins
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "org_admins_update_admin" ON public.org_admins
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
