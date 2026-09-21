-- ============================================================================
-- 20260921000002 — Backfill 1:1 : profiles → org_memberships
-- ----------------------------------------------------------------------------
-- Préserve l'état existant (1 org / user). Chaque profil actif devient une
-- ligne org_memberships ACTIVE. Le COALESCE(role,'MEMBRE') ne casse pas les
-- rôles orphelins / anglais flagués §1 : on ne les "répare" pas, on les
-- laisse au trigger de Vague 3 / à l'edge-fn.
--
-- ON CONFLICT DO NOTHING : si le couple (user_id, org_id, role) est déjà
-- présent (idempotence), on ne duplique pas.
--
-- Invariant 5 : `used_count` (invitations) n'est PAS incrémenté ici — c'est
-- le rôle du trigger `settle_invitation_claim` (Vague 3).
-- ============================================================================

INSERT INTO public.org_memberships (user_id, org_id, role, is_primary, status)
SELECT p.id, p.org_id, COALESCE(p.role, 'MEMBRE'), true, 'ACTIVE'
FROM public.profiles p
ON CONFLICT (user_id, org_id, role) DO NOTHING;
