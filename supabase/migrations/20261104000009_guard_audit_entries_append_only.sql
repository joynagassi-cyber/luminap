-- ============================================================================
-- 20261104000009 — R167 : journal d'audit (`audit_entries`) réellement en AJOUT SEUL
-- ----------------------------------------------------------------------------
-- CLASSE DE DÉFAUT (R140 incomplet — même angle mort que R102/R164/R166)
--   R140 (migration 20261030000001) a rendu `audit_entries` « append-only » en
--   retirant les politiques RLS `audit_entries_update` / `audit_entries_delete`.
--   Mais la RLS n'est PAS la dernière barrière : PowerSync écrit en
--   `service_role` (BYPASSRLS) et l'API REST/service_role n'applique pas la
--   logique RLS. Or `audit_entries` n'avait AUCUN trigger de garde. Un client
--   forgé pouvait donc `UPDATE`/`DELETE` une entrée d'audit — exactement
--   l'anti-traçabilité que R140 voulait interdire.
--
-- MESURE (2026-11-04, instance hhgovvrnalibhgpakswi)
--   - `pg_trigger` sur `public.audit_entries` : AUCUN trigger non interne.
--   - Aucun chemin d'écriture applicatif ne fait UPDATE/DELETE (src/ = INSERT/
--     SELECT uniquement) ; aucune FK entrante ni cascade (R140).
--
-- CORRECTIF (minimal, réversible)
--   Trigger BEFORE UPDATE OR DELETE sur `audit_entries` : toute tentative lève
--   23514. Les INSERT (voie REST authentifiée + triggers de traçabilité
--   SECURITY DEFINER) restent inchangés.
--
-- CODE D'ERREUR : 23514 (classe 23) et NON P0001 — le connecteur PowerSync ne
--   JETTE que 22xxx/23xxx et 42501 ; un P0001 tomberait en retry infini.
--
-- NOTE EXPLOITATION : une éventuelle migration de données devant réécrire le
--   journal devra désactiver explicitement le trigger (superuser :
--   `ALTER TABLE public.audit_entries DISABLE TRIGGER guard_audit_entries_append_only;`).
--
-- RÉVERSIBILITÉ : rollback/20261104000009_rollback.sql (DROP du trigger).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_audit_entries_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RAISE EXCEPTION 'AUDIT_ENTRIES_APPEND_ONLY'
    USING ERRCODE = '23514',
          HINT = 'Le journal d''audit est en ajout seul : ni modification ni suppression.';
END;
$function$;

DROP TRIGGER IF EXISTS guard_audit_entries_append_only ON public.audit_entries;
CREATE TRIGGER guard_audit_entries_append_only
  BEFORE UPDATE OR DELETE ON public.audit_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_audit_entries_append_only();

-- R115 : une fonction de trigger SECURITY DEFINER ne doit PAS rester exécutable
-- par anon/authenticated (surface RPC). On révoque explicitement après le CREATE.
REVOKE ALL ON FUNCTION public.guard_audit_entries_append_only() FROM PUBLIC, anon, authenticated;
