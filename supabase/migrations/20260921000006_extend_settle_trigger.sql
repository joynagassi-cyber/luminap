-- ============================================================================
-- 20260921000006 — Vague 3 : flux invitation scopé
-- ----------------------------------------------------------------------------
-- Trois livrables, idempotents, dans l'ordre :
--
--   1. `invitations` étendu (grants_payload / tags_payload / target_scope_*)
--      — la colonne `target_role_uuid` d'une tentative antérieure est
--      retirée si présente (rédundante : `target_role` TEXT + le trigger
--      résolvent le rôle canon via `org_roles`).
--
--   2. `org_memberships` : UNIQUE plein (user_id, org_id, role) — c'est la
--      contrainte exigée par l'ON CONFLICT du trigger et du backfill.
--      Nettoyage préalable des doublons (on garde la ligne la plus récente).
--
--   3. Extension de `settle_invitation_claim` (le trigger EXISTANT, on
--      n'ajoute PAS de 2ᵉ trigger — invariant 4) :
--        * org_memberships  (idempotent, DO UPDATE status='ACTIVE')
--        * group_memberships si target_scope_resource='group' (gap §8.1)
--        * grants  depuis grants_payload JSONB  (resource/action libres)
--        * tag_assignments  depuis tags_payload  (jsonb_array_elements_text)
--        * used_count++     UNIQUE au trigger (invariant 5, correction §8.2)
--
-- Idempotence garantie partout : ON CONFLICT / NOT EXISTS / le moteur du
-- trigger qui ne rejoue que les claims PENDING_SYNC.
-- ============================================================================

-- ── 1. Colons granulaires sur invitations ─────────────────────────────────
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS grants_payload        JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags_payload          JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_scope_resource TEXT,
  ADD COLUMN IF NOT EXISTS target_scope_id       TEXT;

ALTER TABLE public.invitations DROP COLUMN IF EXISTS target_role_uuid;

CREATE INDEX IF NOT EXISTS idx_invitations_target_scope
  ON public.invitations (target_scope_resource, target_scope_id)
  WHERE target_scope_resource IS NOT NULL;

-- ── 2. UNIQUE plein sur org_memberships (nettoyage des doublons d'abord) ──
DELETE FROM public.org_memberships o
WHERE EXISTS (
  SELECT 1 FROM public.org_memberships n
  WHERE n.user_id = o.user_id
    AND n.org_id  = o.org_id
    AND n.role    = o.role
    AND n.id <> o.id
    AND n.joined_at > o.joined_at
);

DROP INDEX IF EXISTS public.uq_org_memberships_user_org_role_active;
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_memberships_user_org_role
  ON public.org_memberships (user_id, org_id, role);

-- ── 3. Trigger (fonction seule ; les déclencheurs existent déjà) ─────────
CREATE OR REPLACE FUNCTION public.settle_invitation_claim(claim_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c            public.invitation_claims%ROWTYPE;
  inv          public.invitations%ROWTYPE;
  dupe         RECORD;
  now_ts       TIMESTAMPTZ := now();
  g            jsonb;
  tag_id_str   TEXT;
  member_id    TEXT;
  issued_by_uuid UUID;
BEGIN
  -- Moteur d'idempotence EXISTANT : on ne rejoue que les claims PENDING_SYNC.
  SELECT * INTO c FROM public.invitation_claims
   WHERE id = claim_id AND status = 'PENDING_SYNC';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Late-arrival (§5) : l'invitation n'est pas encore sync'ée → on attend.
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

  -- 4) Doublon : ce user a déjà claimé cette invitation
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

  -- ================================================================
  -- VALID : confirmer la claim, promouvoir le profil, matérialiser le scope
  -- ================================================================
  -- used_count++ : UNE SEULE FOIS, ICI (invariant 5 — le client n'incrémente
  -- plus ; fin du double-incrément §8.2).
  UPDATE public.invitations SET used_count = used_count + 1, updated_at = now_ts WHERE id = inv.id;

  UPDATE public.invitation_claims SET status = 'CONFIRMED', updated_at = now_ts WHERE id = c.id;

  -- Promouvoir le profil PENDING → ACTIVE (comportement EXISTANT)
  IF c.resulting_user_id IS NOT NULL THEN
    UPDATE public.profiles SET status = 'ACTIVE', updated_at = now_ts
     WHERE id = c.resulting_user_id AND status = 'PENDING';
  END IF;

  -- issued_by : TEXT (tolère les ids "local-user" hors Supabase) → UUID nullable
  BEGIN
    issued_by_uuid := NULLIF(inv.issued_by, '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    issued_by_uuid := NULL;
  END;

  IF c.resulting_user_id IS NOT NULL THEN

    -- 1) org_memberships (unique (user_id, org_id, role))
    INSERT INTO public.org_memberships (user_id, org_id, role, is_primary, status)
    VALUES (c.resulting_user_id, inv.org_id, inv.target_role, true, 'ACTIVE')
    ON CONFLICT (user_id, org_id, role) DO UPDATE SET status = 'ACTIVE', left_at = NULL;

    -- 2) group_memberships si target_scope_resource = 'group' (gap §8.1 comblé)
    IF inv.target_scope_resource = 'group' AND inv.target_scope_id IS NOT NULL THEN
      -- La FK group_memberships.member_id → members(id) : créer le member row
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

    -- 3) GRANTS agnostiques depuis grants_payload (resource/action LIBRES)
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

    -- 4) TAGS depuis tags_payload (tableau de tag_ids — cahier §3.2)
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

  -- Dernière utilisation consommée → EXHAUSTED
  IF inv.used_count + 1 >= inv.max_uses THEN
    UPDATE public.invitations SET status = 'EXHAUSTED' WHERE id = inv.id;
  END IF;
END;
$$;

-- NB : les déclencheurs `settle_claim_on_insert` et
-- `settle_claims_on_invitation` (20260909000003) restent en place — on
-- réutilise le MÊTE moteur, on n'en crée pas un second (invariant 4).