-- Migration: Invitation system
-- Creates invitations and invitation_claims tables with RLS and audit support.
-- Extends profiles table with status column for PENDING users.

-- ============================================================
-- 1. Extend profiles with status column
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status') THEN
    ALTER TABLE public.profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'DISABLED'));
  END IF;
END $$;

-- ============================================================
-- 2. Create invitations table
-- ============================================================

-- NOTE: org_id is declared as plain TEXT (no FK), matching every other table
-- in this project (transactions, members, events, ... all use `org_id TEXT
-- DEFAULT 'org-1'` with no reference constraint). profiles.org_id is not
-- unique, so it cannot be a FK target.

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,           -- Human-readable, e.g. "LUM-7F3K2Q"
  target_role TEXT NOT NULL,
  target_scope_type TEXT NOT NULL DEFAULT 'ORG' CHECK (target_scope_type IN ('ORG', 'GROUP')),
  target_group_id TEXT,               -- NULL when target_scope_type = 'ORG' (group id is TEXT in this project)
  target_member_id TEXT,              -- NULL when creating a new member (member id is TEXT)
  issued_by TEXT,                     -- profiles id; TEXT to tolerate offline "local-user" fallback ids (no FK)
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'EXHAUSTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON public.invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at) WHERE status = 'ACTIVE';

-- ============================================================
-- 3. Create invitation_claims table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invitation_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  claimed_by_device_id TEXT,           -- Push notification device ID or random UUID
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resulting_user_id UUID,             -- profiles.id (UUID). No FK: the resulting PENDING profile may not exist on the server when the claim arrives (offline first-connection, §5).
  status TEXT NOT NULL DEFAULT 'PENDING_SYNC'
    CHECK (status IN ('PENDING_SYNC', 'CONFIRMED', 'REJECTED_DUPLICATE', 'REJECTED_EXPIRED', 'REJECTED_EXHAUSTED', 'REJECTED_REVOKED')),
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claims_invitation_id ON public.invitation_claims(invitation_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.invitation_claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_resulting_user ON public.invitation_claims(resulting_user_id);

-- ============================================================
-- 4. RLS policies for invitations
-- ============================================================

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_claims ENABLE ROW LEVEL SECURITY;

-- Invitations: all members of the org can read; only those with invitation:create can insert
DROP POLICY IF EXISTS "invitations_select" ON public.invitations;
CREATE POLICY "invitations_select" ON public.invitations
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "invitations_insert" ON public.invitations;
CREATE POLICY "invitations_insert" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    AND auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE org_id = NEW.org_id
        AND (role = 'PASTEUR_PRINCIPAL' OR role = 'ANCIEN' OR role = 'TREASURIER')
    )
  );

DROP POLICY IF EXISTS "invitations_update" ON public.invitations;
CREATE POLICY "invitations_update" ON public.invitations
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- Invitation claims: members can read; backend inserts
DROP POLICY IF EXISTS "invitation_claims_select" ON public.invitation_claims;
CREATE POLICY "invitation_claims_select" ON public.invitation_claims
  FOR SELECT TO authenticated
  USING (
    invitation_id IN (
      SELECT id FROM public.invitations
      WHERE org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "invitation_claims_insert" ON public.invitation_claims;
CREATE POLICY "invitation_claims_insert" ON public.invitation_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    invitation_id IN (
      SELECT id FROM public.invitations
      WHERE org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ============================================================
-- 5. Function to mark expired invitations
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_expired_invitations()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.invitations
  SET status = 'EXPIRED', updated_at = now()
  WHERE status = 'ACTIVE' AND expires_at < now();
END;
$$;

-- ============================================================
-- 6. Trigger: update updated_at on invitations
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_invitation_claims_updated_at ON public.invitation_claims;
CREATE TRIGGER update_invitation_claims_updated_at
  BEFORE UPDATE ON public.invitation_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
