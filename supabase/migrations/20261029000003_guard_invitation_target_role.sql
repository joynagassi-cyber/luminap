-- ============================================================================
-- 20261029000003 — GARDE : `invitations.target_role = 'ADMIN'` réservé à ADMIN
-- ----------------------------------------------------------------------------
-- RISQUE (introduit par 20261029000001)
--   Rendre `ADMIN` attribuable par invitation crée une voie d'escalade : un
--   gestionnaire d'invitations (PASTEUR_PRINCIPAL / ANCIEN / TREASURIER —
--   `can_manage_invitations`) pourrait émettre une invitation `target_role =
--   'ADMIN'` et s'octroyer (ou octroyer) le rôle suprême. Aucun garde-fou
--   n'existait sur `invitations.target_role` (mesuré : 0 trigger).
--
-- DEUX BARRIÈRES (défense en profondeur)
--   1. Trigger BEFORE INSERT/UPDATE sur `invitations` (voie REST) : un client
--      `authenticated`/`anon` ne peut pas écrire `target_role='ADMIN'` s'il
--      n'est pas lui-même ADMIN.
--   2. Garde dans `settle_invitation_claim` (voie PowerSync ET REST) : au
--      règlement — le SEUL point où un rôle est réellement attribué — une
--      invitation `ADMIN` dont l'émetteur n'est pas ADMIN est REJETÉE
--      (`REJECTED_ROLE_ESCALATION`), rôle inchangé.
--
--   La barrière (2) est la décisive : le chemin d'écriture de l'application
--   passe par PowerSync (`powersync_role`, BYPASSRLS, sans JWT), où un trigger
--   fondé sur `current_user`/`auth.uid()` est aveugle. `settle_invitation_claim`
--   est SECURITY DEFINER et lit `inv.issued_by` de façon fiable.
--
-- RÉVERSIBILITÉ : rollback/20261029000003_rollback.sql
-- ============================================================================

-- ── Barrière 1 : trigger sur invitations (voie REST directe) ────────────────
-- Le statut `REJECTED_ROLE_ESCALATION` (barrière 2) doit être accepté par la
-- contrainte CHECK existante, sinon le rejet devient une erreur SQL.
ALTER TABLE public.invitation_claims
  DROP CONSTRAINT IF EXISTS invitation_claims_status_check;
ALTER TABLE public.invitation_claims
  ADD CONSTRAINT invitation_claims_status_check
  CHECK (status IN (
    'PENDING_SYNC','CONFIRMED','REJECTED_DUPLICATE','REJECTED_EXPIRED',
    'REJECTED_EXHAUSTED','REJECTED_REVOKED','REJECTED_ROLE_ESCALATION'
  ));

CREATE OR REPLACE FUNCTION public.guard_invitation_target_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Dans une fonction SECURITY DEFINER, `current_user` = propriétaire, pas le
  -- client : on détecte donc l'acteur réel via `initplan_uid()` (JWT). Un
  -- appelant sans JWT (service_role, migrations, PowerSync) n'est pas filtré
  -- ici — la barrière (2) `settle_invitation_claim` le couvre.
  IF NEW.target_role = 'ADMIN'
     AND initplan_uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles p
        WHERE p.id = initplan_uid() AND p.role = 'ADMIN'
       UNION ALL
       SELECT 1 FROM public.org_memberships m
        WHERE m.user_id = initplan_uid()
          AND m.org_id = NEW.org_id
          AND m.status = 'ACTIVE'
          AND m.role = 'ADMIN'
     ) THEN
    RAISE EXCEPTION 'ROLE_ESCALATION: seul un ADMIN peut inviter vers le role ADMIN'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_invitation_target_role ON public.invitations;
CREATE TRIGGER guard_invitation_target_role
  BEFORE INSERT OR UPDATE OF target_role ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_invitation_target_role();

-- R115 — surface RPC : une fonction de trigger SECURITY DEFINER ne doit pas
-- être exécutable par anon/authenticated. Cette migration est postérieure au
-- balayage générique de 20261026000005 → révocation explicite obligatoire.
REVOKE EXECUTE ON FUNCTION public.guard_invitation_target_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_invitation_target_role() FROM anon, authenticated;

-- ── Barrière 2 : garde au règlement (voie PowerSync + REST) ─────────────────
-- Réémission du corps courant de `settle_invitation_claim` (20261024000004)
-- + un contrôle ADMIN avant d'appliquer `inv.target_role`.
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
  issuer_is_admin BOOLEAN;
BEGIN
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

  issued_by_uuid := NULLIF(inv.issued_by, '')::uuid;

  -- R109 — une invitation vers le rôle suprême `ADMIN` n'est valable que si
  -- l'ÉMETTEUR est lui-même ADMIN. Empêche l'escalade par un gestionnaire
  -- d'invitations (défense en profondeur ; la barrière 1 ne couvre pas
  -- PowerSync).
  IF inv.target_role = 'ADMIN' THEN
    issuer_is_admin := EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = issued_by_uuid AND p.role = 'ADMIN'
      UNION ALL
      SELECT 1 FROM public.org_memberships m
       WHERE m.user_id = issued_by_uuid
         AND m.org_id = inv.org_id
         AND m.status = 'ACTIVE'
         AND m.role = 'ADMIN'
    );
    IF NOT COALESCE(issuer_is_admin, false) THEN
      UPDATE public.invitation_claims SET status = 'REJECTED_ROLE_ESCALATION',
        reject_reason = 'ROLE_ESCALATION_BLOCKED: invitation ADMIN emise par un non-ADMIN',
        updated_at = now_ts WHERE id = c.id;
      RETURN;
    END IF;
  END IF;

  -- R91.c : refuser d'élever un profil DÉJÀ ACTIF sauf si un gestionnaire
  -- d'invitations en est l'auteur. (Ici, en DEFINER, la lecture est fiable.)
  IF c.resulting_user_id IS NOT NULL THEN
    SELECT p.status INTO target_status FROM public.profiles p WHERE p.id = c.resulting_user_id;
    IF target_status = 'ACTIVE' THEN
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

-- Réémission de `settle_invitation_claim` ci-dessus → on réapplique le REVOKE
-- (une redéfinition réinitialise les privilèges par défaut).
REVOKE EXECUTE ON FUNCTION public.settle_invitation_claim(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.settle_invitation_claim(uuid) FROM anon, authenticated;
