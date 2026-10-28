-- ============================================================================
-- 20261028000001 — Durcissement RPC : garde R103 restaurée + surface des
--                    fonctions de trigger refermée (R115)
-- ----------------------------------------------------------------------------
-- Deux instances d'UNE MÊME classe de défaut : une migration qui recrée une
-- fonction de trigger (ou la fonction de règlement) hors du chemin de
-- durcissement R103, laissant la surface RPC ouverte.
--
--   (A) `denorm_child_org_id` / `denorm_cascade_org_id` (20261027000001) ont
--       été créées APRÈS le balayage générique de 20261026000005 : elles sont
--       SECURITY DEFINER et EXECUTE-ables par `anon`/`authenticated` via
--       `POST /rest/v1/rpc/...`. Mesuré en base le 2026-10-28
--       (`has_function_privilege('anon', oid, 'EXECUTE') = true`).
--
--   (B) `20261027000011` recrée `settle_invitation_claim` en repartant du corps
--       de 20261024000004 (pré-R103) : la garde `pg_trigger_depth() = 0` du
--       correctif R103 a été SILENCIEUSEMENT PERDUE. Le `REVOKE EXECUTE`
--       tient toujours (un appel RPC direct renvoie `42501 permission denied`),
--       donc la faille d'escalade R103 n'est PAS rouverte — mais la défense en
--       profondeur (2e niveau) l'est.
--
-- EXPLOITABILITÉ (mesurée, honnêteté R12) : un appel direct d'une fonction
-- `RETURNS trigger` est refusé par PostgreSQL lui-même
-- (`0A000: trigger functions can only be called as triggers`). La surface
-- (A) n'est donc PAS une vulnérabilité exploitable — c'est un faux positif de
-- la classe R97. Ce correctif referme néanmoins la surface par cohérence avec
-- R103 et pour qu'un futur `SECURITY INVOKER`/`GRANT` ne la rende pas réelle.
--
-- RÉVERSIBILITÉ : rollback/20261028000001_rollback.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- (B) Restaurer la garde `pg_trigger_depth() = 0` dans settle_invitation_claim
--     Corps identique à 20261027000011 (org_id dans l'INSERT des grants) ; on
--     ne réintroduit QUE le garde-fou, aucune autre modification.
-- ---------------------------------------------------------------------------
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
  -- R103 (restauré par 20261028000001) : n'accepter qu'une invocation depuis
  -- un trigger, jamais en RPC direct.
  IF pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'settle_invitation_claim: appel direct interdit'
      USING ERRCODE = '42501';
  END IF;

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

  -- R91.c : refuser d'élever un profil DÉJÀ ACTIF sauf si un gestionnaire
  -- d'invitations en est l'auteur.
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

  -- B.5 : réconciliation du profil legacy (role + org_id) avec l'invitation
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
          AND org_id = inv.org_id
          AND revoked_at IS NULL
      ) THEN
        INSERT INTO public.grants (
          subject_type, subject_id, resource, action,
          scope_resource, scope_id, org_id, granted_by, granted_at
        )
        VALUES (
          'user',
          c.resulting_user_id::text,
          g->>'resource',
          g->>'action',
          CASE WHEN (g->'scope') IS NULL THEN NULL ELSE (g->'scope')->>'resource' END,
          CASE WHEN (g->'scope') IS NULL THEN NULL ELSE (g->'scope')->>'id' END,
          inv.org_id,
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

-- La redéfinition ci-dessus réinitialise les privilèges par défaut : on
-- ré-applique le revoke de R103 (défense en profondeur niveau 1).
REVOKE EXECUTE ON FUNCTION public.settle_invitation_claim(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.settle_invitation_claim(uuid) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- (A) Refermer la surface RPC des fonctions de trigger créées après le
--     balayage de 20261026000005 (denorm_*). On rejoue le balayage générique :
--     idempotent, il couvre toute fonction de trigger présente ou future
--     jusqu'à cette migration.
-- ---------------------------------------------------------------------------
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
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.sig);
  END LOOP;
END $$;
