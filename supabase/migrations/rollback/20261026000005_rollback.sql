-- Rollback de 20261026000005 — ROUVRE la faille R103 (escalade de privilèges
-- via `settle_invitation_claim` appelable en RPC). Fourni pour la symétrie
-- migration↔rollback ; ne l'appliquer qu'en connaissance de cause.
--
-- Restaure : la fonction sans la garde `pg_trigger_depth()`, l'EXECUTE pour
-- anon/authenticated, et les wrappers de trigger en SECURITY INVOKER (état
-- rétabli par 20260926000001_advisors_cleanup).

CREATE OR REPLACE FUNCTION public.settle_invitation_claim(claim_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  c      public.invitation_claims%ROWTYPE;
  inv    public.invitations%ROWTYPE;
  dupe   RECORD;
  now_ts TIMESTAMPTZ := now();
  g      jsonb;
  tag_id_str TEXT;
  member_id TEXT;
  issued_by_uuid UUID;
  target_status TEXT;
BEGIN
  SELECT * INTO c FROM public.invitation_claims
   WHERE id = claim_id AND status = 'PENDING_SYNC';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO inv FROM public.invitations WHERE id = c.invitation_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF inv.status = 'REVOKED' THEN
    UPDATE public.invitation_claims SET status = 'REJECTED_REVOKED',
      reject_reason = 'invitation revoked', updated_at = now_ts WHERE id = c.id;
    RETURN;
  END IF;

  IF now_ts > inv.expires_at OR inv.status = 'EXPIRED' THEN
    UPDATE public.invitation_claims SET status = 'REJECTED_EXPIRED',
      reject_reason = 'invitation expired', updated_at = now_ts WHERE id = c.id;
    RETURN;
  END IF;

  IF inv.used_count >= inv.max_uses THEN
    UPDATE public.invitation_claims SET status = 'REJECTED_EXHAUSTED',
      reject_reason = 'invitation usage limit reached', updated_at = now_ts WHERE id = c.id;
    RETURN;
  END IF;

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

  IF c.resulting_user_id IS NOT NULL THEN
    SELECT p.status INTO target_status FROM public.profiles p WHERE p.id = c.resulting_user_id;
    IF target_status = 'ACTIVE' THEN
      issued_by_uuid := NULLIF(inv.issued_by, '')::uuid;
      IF issued_by_uuid IS NULL
         OR NOT public.can_manage_invitations(issued_by_uuid, inv.org_id) THEN
        UPDATE public.invitation_claims SET status = 'REJECTED_DUPLICATE',
          reject_reason = 'ROLE_ESCALATION_BLOCKED: profil deja actif',
          updated_at = now_ts WHERE id = c.id;
        RETURN;
      END IF;
    END IF;
  END IF;

  UPDATE public.invitations SET used_count = used_count + 1, updated_at = now_ts WHERE id = inv.id;
  UPDATE public.invitation_claims SET status = 'CONFIRMED', updated_at = now_ts WHERE id = c.id;

  IF c.resulting_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      status     = 'ACTIVE',
      role       = inv.target_role,
      org_id     = inv.org_id,
      updated_at = now_ts
     WHERE id = c.resulting_user_id;
  END IF;

  BEGIN
    issued_by_uuid := NULLIF(inv.issued_by, '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    issued_by_uuid := NULL;
  END;

  IF c.resulting_user_id IS NOT NULL THEN
    INSERT INTO public.org_memberships (user_id, org_id, role, is_primary, status)
    VALUES (c.resulting_user_id, inv.org_id, inv.target_role, true, 'ACTIVE')
    ON CONFLICT (user_id, org_id, role) DO UPDATE SET status = 'ACTIVE', left_at = NULL;

    IF inv.target_scope_resource = 'group' AND inv.target_scope_id IS NOT NULL THEN
      SELECT id INTO member_id FROM public.members
       WHERE id = c.resulting_user_id::text AND org_id = inv.org_id LIMIT 1;
      IF NOT FOUND THEN
        member_id := c.resulting_user_id::text;
        INSERT INTO public.members (id, org_id, first_name, last_name, status, joined_at)
        VALUES (member_id, inv.org_id, '', '', 'ACTIVE', now_ts)
        ON CONFLICT DO NOTHING;
      END IF;

      INSERT INTO public.group_memberships (id, member_id, group_id, role, joined_at)
      VALUES (
        'gm-' || c.resulting_user_id::text || '-' || inv.target_scope_id,
        member_id,
        inv.target_scope_id,
        'MEMBRE',
        now_ts
      )
      ON CONFLICT (id) DO UPDATE SET left_at = NULL;
    END IF;

    FOR g IN SELECT * FROM jsonb_array_elements(COALESCE(inv.grants_payload, '[]'::jsonb))
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.grants
        WHERE subject_type = 'user'
          AND subject_id = c.resulting_user_id::text
          AND resource = g->>'resource'
          AND action = g->>'action'
          AND revoked_at IS NULL
      ) THEN
        INSERT INTO public.grants (
          subject_type, subject_id, resource, action,
          scope_resource, scope_id, granted_by, granted_at
        )
        VALUES (
          'user',
          c.resulting_user_id::text,
          g->>'resource',
          g->>'action',
          CASE WHEN (g->'scope') IS NULL THEN NULL ELSE (g->'scope')->>'resource' END,
          CASE WHEN (g->'scope') IS NULL THEN NULL ELSE (g->'scope')->>'id' END,
          issued_by_uuid,
          now_ts
        );
      END IF;
    END LOOP;

    FOR tag_id_str IN SELECT * FROM jsonb_array_elements_text(COALESCE(inv.tags_payload, '[]'::jsonb))
    LOOP
      INSERT INTO public.tag_assignments (tag_id, user_id, org_id, assigned_by, assigned_at)
      VALUES (
        tag_id_str::uuid,
        c.resulting_user_id,
        inv.org_id,
        issued_by_uuid,
        now_ts
      )
      ON CONFLICT (tag_id, user_id, org_id) DO NOTHING;
    END LOOP;
  END IF;

  IF inv.used_count + 1 >= inv.max_uses THEN
    UPDATE public.invitations SET status = 'EXHAUSTED' WHERE id = inv.id;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.settle_invitation_claim(uuid) TO authenticated, anon;

ALTER FUNCTION public.tg_settle_claim() SECURITY INVOKER;
ALTER FUNCTION public.tg_settle_claims_on_invitation() SECURITY INVOKER;
ALTER FUNCTION public.settle_pending_claims_for_invitation() SECURITY INVOKER;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon', r.sig);
  END LOOP;
END $$;
