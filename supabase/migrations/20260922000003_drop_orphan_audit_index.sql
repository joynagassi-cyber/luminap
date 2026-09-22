-- Lot F.2b (stabilisation) : nettoyage de l'index orphelin.
-- idx_audit_entries_actor référence une colonne `actor_id` inexistante
-- (la colonne réelle est `user_id`) : c'est un index orphan, inutilisable
-- et trompeur. L'index fonctionnel est idx_audit_entries_entity_created
-- (créé par 20260922000002). On supprime proprement l'orphan.
DROP INDEX IF EXISTS public.idx_audit_entries_actor;
