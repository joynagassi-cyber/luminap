-- ============================================================
-- Migration: Invitation confirmation trigger (Sprint 4)
--
-- Server-side settlement of invitation claims (§3 step 13-14, §4, §5, §9).
-- PowerSync delivers the InvitationClaim to Postgres; this trigger performs
-- the business validation and transitions:
--   VALID   -> claim CONFIRMED, invitations.used_count++,
--              profiles.status: PENDING -> ACTIVE, invitation EXHAUSTED when full
--   INVALID  -> claim REJECTED_{EXPIRED,EXHAUSTED,REVOKED,DUPLICATE} + reject_reason
--
-- Idempotent: settle_invitation_claim() only acts on claims in PENDING_SYNC.
--
-- Design note on ordering (§5): invitation_claims.invitation_id is a hard FK
-- to invitations.id. Therefore a claim can only exist once its invitation
-- row is present. PowerSync's upload queue (per-client causal ordering) plus
-- this FK guarantee that the late-arrival case is handled: if a claim's
-- invitation has not yet synced to the server, the claim insert is retried
-- until the invitation lands, at which point both triggers fire.
-- ============================================================

-- Ensure profiles.status exists (idempotent; defined here for the trigger's
-- PENDING -> ACTIVE transition)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'
  CHECK (status IN ('PENDING', 'ACTIVE', 'DISABLED'));

-- ============================================================
-- Core settlement function (business logic)
-- Resolves a single PENDING_SYNC claim for a given invitation.
-- Safe to call manually; idempotent (only acts on PENDING_SYNC).
-- ============================================================
CREATE OR REPLACE FUNCTION public.settle_invitation_claim(claim_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  c    public.invitation_claims%ROWTYPE;
  inv  public.invitations%ROWTYPE;
  dupe RECORD;
  now_ts TIMESTAMPTZ := now();
BEGIN
  -- Only settle pending claims
  SELECT * INTO c FROM public.invitation_claims
   WHERE id = claim_id AND status = 'PENDING_SYNC';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Invitation not yet synced -> leave in PENDING_SYNC (§5)
  SELECT * INTO inv FROM public.invitations WHERE id = c.invitation_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1) Revoked
  IF inv.status = 'REVOKED' THEN
    UPDATE public.invitation_claims SET status = 'REJECTED_REVOKED',
      reject_reason = 'invitation revoked', updated_at = now_ts WHERE id = c.id;
    RETURN;
  END IF;

  -- 2) Expired
  IF now_ts > inv.expires_at OR inv.status = 'EXPIRED' THEN
    UPDATE public.invitation_claims SET status = 'REJECTED_EXPIRED',
      reject_reason = 'invitation expired', updated_at = now_ts WHERE id = c.id;
    RETURN;
  END IF;

  -- 3) Exhausted
  IF inv.used_count >= inv.max_uses THEN
    UPDATE public.invitation_claims SET status = 'REJECTED_EXHAUSTED',
      reject_reason = 'invitation usage limit reached', updated_at = now_ts WHERE id = c.id;
    RETURN;
  END IF;

  -- 4) Duplicate: same resulting_user already confirmed for this invitation
  SELECT 1 INTO dupe FROM public.invitation_claims
   WHERE invitation_id = c.invitation_id
     AND resulting_user_id = c.resulting_user_id
     AND status = 'CONFIRMED'
     AND id <> c.id
   LIMIT 1;
  IF FOUND THEN
    UPDATE public.invitation_claims SET status = 'REJECTED_DUPLICATE',
      reject_reason = 'invitation already claimed by this user', updated_at = now_ts WHERE id = c.id;
    RETURN;
  END IF;

  -- VALID: consume a use, confirm the claim, activate the user
  UPDATE public.invitations SET used_count = used_count + 1, updated_at = now_ts WHERE id = inv.id;

  UPDATE public.invitation_claims SET status = 'CONFIRMED', updated_at = now_ts WHERE id = c.id;

  -- Promote the resulting PENDING profile to ACTIVE
  IF c.resulting_user_id IS NOT NULL THEN
    UPDATE public.profiles SET status = 'ACTIVE', updated_at = now_ts
     WHERE id = c.resulting_user_id AND status = 'PENDING';
  END IF;

  -- Mark the invitation EXHAUSTED if the last use was just consumed
  IF inv.used_count + 1 >= inv.max_uses THEN
    UPDATE public.invitations SET status = 'EXHAUSTED' WHERE id = inv.id;
  END IF;
END;
$$;

-- ============================================================
-- Trigger wrapper functions (RETURNS trigger; no-arg call form,
-- which is the form that parses reliably across schema qualification)
-- ============================================================

-- Settle a claim as soon as it lands (or is updated to PENDING_SYNC)
CREATE OR REPLACE FUNCTION public.tg_settle_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'PENDING_SYNC' THEN
    PERFORM public.settle_invitation_claim(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- When an invitation row arrives, re-attempt settlement of any pending
-- claims that were waiting for it (§5 late-arrival).
CREATE OR REPLACE FUNCTION public.tg_settle_claims_on_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.settle_invitation_claim(c.id)
    FROM public.invitation_claims c
   WHERE c.invitation_id = NEW.id AND c.status = 'PENDING_SYNC';
  RETURN NEW;
END;
$$;

-- ============================================================
-- Triggers
-- ============================================================

DROP TRIGGER IF EXISTS settle_claim_on_insert ON public.invitation_claims;
CREATE TRIGGER settle_claim_on_insert
AFTER INSERT OR UPDATE ON public.invitation_claims
FOR EACH ROW
EXECUTE FUNCTION public.tg_settle_claim();

DROP TRIGGER IF EXISTS settle_claims_on_invitation ON public.invitations;
CREATE TRIGGER settle_claims_on_invitation
AFTER INSERT ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.tg_settle_claims_on_invitation();
