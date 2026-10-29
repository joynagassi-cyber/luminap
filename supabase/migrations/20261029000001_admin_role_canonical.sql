-- ============================================================================
-- 20261029000001 — R109 TRANCHÉ : rôle canonique `ADMIN` (15e rôle, super-admin)
-- ----------------------------------------------------------------------------
-- DÉCISION PROPRIÉTAIRE (2026-10-29)
--   Le rôle `ADMIN` devient le 15e rôle CANONIQUE. Il « supplante tout » : il
--   détient TOUTES les permissions. Un porteur peut :
--     1. administrer l'organisation dans laquelle il se trouve ;
--     2. créer des organisations ANNEXES rattachées à la sienne
--        (`organizations.parent_org_id`) ;
--     3. superviser et voir l'activité de ces annexes (famille d'organisations).
--
--   C'est l'option (b) de R109 : ajouter `ADMIN` au modèle canon
--   (`Role` TS + `PERMISSION_MATRIX` + `role_permissions`) au lieu de
--   supprimer le littéral des politiques RLS.
--
-- CORRECTIF
--   1. `role_permissions` : 28 lignes pour `ADMIN` (miroir de
--      `PERMISSION_MATRIX.ADMIN`, verrouillé par `role-model-drift.test.ts`).
--   2. `is_org_admin(uid, org)` : un porteur du rôle canon `ADMIN` est
--      administrateur de SON organisation (via `profiles.role` OU
--      `org_memberships.role`), sans exiger une ligne `org_admins`.
--   3. `can_manage_invitations(uid, org)` : `ADMIN` inclus (cohérent avec
--      « toutes les permissions », dont `invitation:*`).
--
-- SÉCURITÉ — garde anti-escalade associée
--   Rendre `ADMIN` attribuable crée un risque d'escalade si un gestionnaire
--   d'invitations pouvait viser `ADMIN`. La garde correspondante est livrée
--   dans `20261029000003_guard_invitation_target_role.sql` (seul un `ADMIN`
--   peut émettre une invitation vers `ADMIN`).
--
-- RÉVERSIBILITÉ : rollback/20261029000001_rollback.sql
-- ============================================================================

-- ── 1) ADMIN détient les 28 permissions du modèle canon ─────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('ADMIN', 'transaction:create'),
  ('ADMIN', 'transaction:read'),
  ('ADMIN', 'transaction:update'),
  ('ADMIN', 'transaction:approve'),
  ('ADMIN', 'transaction:reject'),
  ('ADMIN', 'transaction:delete'),
  ('ADMIN', 'versement:create'),
  ('ADMIN', 'versement:approve'),
  ('ADMIN', 'group:create'),
  ('ADMIN', 'group:read'),
  ('ADMIN', 'group:update'),
  ('ADMIN', 'group:delete'),
  ('ADMIN', 'event:create'),
  ('ADMIN', 'event:read'),
  ('ADMIN', 'event:update'),
  ('ADMIN', 'event:delete'),
  ('ADMIN', 'report:read'),
  ('ADMIN', 'report:export'),
  ('ADMIN', 'member:create'),
  ('ADMIN', 'member:read'),
  ('ADMIN', 'member:update'),
  ('ADMIN', 'member:delete'),
  ('ADMIN', 'cotisation:manage'),
  ('ADMIN', 'admin:settings'),
  ('ADMIN', 'admin:roles'),
  ('ADMIN', 'invitation:create'),
  ('ADMIN', 'invitation:revoke'),
  ('ADMIN', 'invitation:manage')
ON CONFLICT (role, permission) DO NOTHING;

-- ── 2) is_org_admin : un porteur ADMIN administre SON organisation ──────────
CREATE OR REPLACE FUNCTION public.is_org_admin(p_uid uuid, p_org_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p_org_id IS NOT NULL
     AND p_org_id NOT IN ('__no_org__', 'no-org')
     AND (
       EXISTS (
         SELECT 1 FROM public.org_admins a
          WHERE a.admin_profile_id = p_uid
            AND a.org_id = p_org_id
            AND a.status = 'ACTIVE'
       )
       -- R109 : le rôle canon ADMIN est administrateur de son organisation.
       OR EXISTS (
         SELECT 1 FROM public.profiles p
          WHERE p.id = p_uid
            AND p.org_id = p_org_id
            AND p.role = 'ADMIN'
       )
       OR EXISTS (
         SELECT 1 FROM public.org_memberships m
          WHERE m.user_id = p_uid
            AND m.org_id = p_org_id
            AND m.status = 'ACTIVE'
            AND m.role = 'ADMIN'
       )
     );
$function$;

-- ── 3) can_manage_invitations : ADMIN inclus ────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_manage_invitations(p_uid uuid, p_org_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = p_uid
         AND p.org_id = p_org_id
         AND p.role IN ('ADMIN', 'PASTEUR_PRINCIPAL', 'ANCIEN', 'TREASURIER')
    )
    OR EXISTS (
      SELECT 1 FROM public.org_memberships m
       WHERE m.user_id = p_uid
         AND m.org_id = p_org_id
         AND m.status = 'ACTIVE'
         AND m.role IN ('ADMIN', 'PASTEUR_PRINCIPAL', 'ANCIEN', 'TREASURIER')
    );
$function$;
