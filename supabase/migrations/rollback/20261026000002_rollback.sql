-- Rollback — 20261026000002 (RBAC fin : has_permission + role_permissions)
-- Réversible. ATTENTION : supprime la colonne `grants.effect` (et `expires_at`)
-- → toute politique/requête utilisant le deny prioritaire cesse de fonctionner.
-- Aucune donnée d'org n'est supprimée (les colonnes de grants le sont).
DROP FUNCTION IF EXISTS public.has_permission(uuid, text, text, text, text, text);
DROP TABLE IF EXISTS public.role_permissions;
ALTER TABLE public.grants DROP CONSTRAINT IF EXISTS grants_effect_check;
ALTER TABLE public.grants DROP COLUMN IF EXISTS effect;
ALTER TABLE public.grants DROP COLUMN IF EXISTS expires_at;
