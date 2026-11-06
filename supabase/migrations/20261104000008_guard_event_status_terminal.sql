-- ============================================================================
-- 20261104000008 — R166 : immuabilité du STATUT d'un événement terminal
-- ----------------------------------------------------------------------------
-- CLASSE DE DÉFAUT (même famille que R102/R164 : garde CLIENT-only)
--   La règle « un événement COMPLETED ou CANCELLED est terminal » n'était
--   appliquée QUE côté client (`eventStatusGuard` dans
--   `src/capabilities/workflow/index.ts`, appelé par `EventDetail` via
--   `workflow.transition`). La table `events` n'avait AUCUN trigger de statut
--   (uniquement `on_event_created` et `trg_events_cascade_org`).
--   Or un appelant DIRECT PostgREST (REST/SDK) avec un JWT utilisateur valide
--   et la permission `event:update` saute la logique TS (la RLS s'applique mais
--   la policy UPDATE n'exige pas de statut) ; et une clé `service_role`
--   (BYPASSRLS) contourne aussi la RLS (cf. R169). Un `UPDATE events SET
--   status = 'PLANIFIED' WHERE id = <event CANCELLED>` ré-ouvrait donc un
--   événement annulé — aucune garde serveur.
--
-- CORRECTIF (portée minimale, miroir EXACT de la garde client)
--   Trigger BEFORE UPDATE sur `events` : refuse tout CHANGEMENT de `status`
--   d'une ligne dont `OLD.status IN ('COMPLETED','CANCELLED')`. Les autres
--   colonnes (nom, dates, budget…) restent modifiables, et toutes les
--   transitions depuis un statut non terminal (PLANIFIED/ONGOING) restent
--   permises. Les règles de transition fines (PLANIFIED→{ONGOING,CANCELLED},
--   ONGOING→{COMPLETED,CANCELLED}) restent côté client : elles relèvent du
--   workflow d'UI, pas de l'intégrité de données.
--
-- CODE D'ERREUR : 23514 (classe 23) et NON P0001 — le connecteur PowerSync ne
--   JETTE que les classes 22xxx/23xxx et 42501 ; un P0001 tomberait en retry
--   infini (cf. R164, SupabaseConnector.FATAL_RESPONSE_CODES).
--
-- RÉVERSIBILITÉ : rollback/20261104000008_rollback.sql (DROP du trigger).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_event_status_terminal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF OLD.status IN ('COMPLETED', 'CANCELLED')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'EVENT_TERMINAL_IMMUTABLE'
      USING ERRCODE = '23514',
            HINT = 'Un événement terminé ou annulé ne peut plus changer de statut.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_event_status_terminal ON public.events;
CREATE TRIGGER guard_event_status_terminal
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_event_status_terminal();

-- R115 : une fonction de trigger SECURITY DEFINER ne doit PAS rester exécutable
-- par anon/authenticated (surface RPC). On révoque explicitement après le CREATE.
REVOKE ALL ON FUNCTION public.guard_event_status_terminal() FROM PUBLIC, anon, authenticated;
