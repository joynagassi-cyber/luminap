-- ============================================================================
-- 20261027000003 — Le keep-alive EXTERNE laisse enfin une trace vérifiable
-- ----------------------------------------------------------------------------
-- DÉFAUT
--   Le workflow `.github/workflows/keep-alive.yml` appelle
--   `GET /rest/v1/keep_alive?select=id,last_ping&limit=1` avec la clé anon.
--   C'est une LECTURE. Elle n'écrit rien, donc elle ne laisse aucune trace
--   attribuable : impossible de prouver, après coup, qu'un ping externe a bien
--   eu lieu — ni de distinguer un ping GitHub d'un ping pg_cron.
--
--   Aggravant : la procédure de vérification du RUNBOOK dit « `last_ping` doit
--   dater de < 48 h ». Or `last_ping` est écrit par le job pg_cron
--   `keep_alive_daily` (quotidien, DANS la base), jamais par GitHub. Ce
--   contrôle valide donc pg_cron et donne une fausse assurance sur le seul
--   mécanisme qui protège réellement de la pause.
--
--   PREUVE AVANT (relevé le 2026-10-27) :
--     SELECT * FROM cron.job;
--       → jobid 3, keep_alive_daily, '0 0 * * *', active = true
--     SELECT status, start_time FROM cron.job_run_details ORDER BY start_time DESC;
--       → 12 exécutions 'succeeded' du 16/10 au 27/10, toutes à 00:00:00 UTC
--     SELECT * FROM public.keep_alive;
--       → id 1, last_ping 2026-10-27 00:00:00 UTC  (écrit par pg_cron)
--     SELECT calls, query FROM pg_stat_statements WHERE query ILIKE '%keep_alive%';
--       → 4 appels « WITH pgrst_source AS (SELECT public.keep_alive.id, …) »
--         (le ping REST exécute bien du SQL) mais AUCUNE écriture externe :
--         la table ne contient qu'une ligne, modifiée uniquement par pg_cron.
--
-- CORRECTIF
--   Le ping externe devient une ÉCRITURE idempotente, par une fonction dédiée
--   exposée en RPC PostgREST. Chaque appel :
--     - incrémente `external_count` (preuve de l'appel),
--     - pose `external_ping = now()` (preuve de la fraîcheur).
--   La colonne `last_ping` reste la propriété EXCLUSIVE de pg_cron : les deux
--   mécanismes deviennent enfin distinguables.
--
-- SÉCURITÉ
--   - `SECURITY DEFINER` + `SET search_path = ''` et noms pleinement qualifiés :
--     aucune résolution d'objet détournable (cf. 20261022201822).
--   - La fonction ne fait qu'UNE chose : avancer deux colonnes de la ligne id=1.
--     Elle n'expose aucune donnée, ne lit aucune table utilisateur.
--   - `EXECUTE` accordé à `anon` uniquement (la clé publishable est publique,
--     c'est assumé : elle permet déjà de lire la base via PostgREST). Le pire
--     usage possible est de maintenir le projet éveillé — c'est-à-dire
--     exactement l'effet recherché. La valeur écrite est TOUJOURS `now()` :
--     impossible de faire reculer l'horodatage pour simuler une panne.
--   - Aucun accès en écriture direct à la table n'est accordé à `anon`.
--
-- RÉVERSIBILITÉ : rollback/20261027000003_rollback.sql
-- ============================================================================

-- 1. Colonnes de traçabilité. `external_count` est en BIGINT : à raison de
--    ~180 pings/an, INT suffirait, mais BIGINT ne coûte rien et évite une
--    migration dans 100 ans.
ALTER TABLE public.keep_alive
  ADD COLUMN IF NOT EXISTS external_ping  timestamptz,
  ADD COLUMN IF NOT EXISTS external_count bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.keep_alive.last_ping IS
  'Écrit par le job pg_cron keep_alive_daily (mécanisme INTERNE — ne protège PAS de la pause).';
COMMENT ON COLUMN public.keep_alive.external_ping IS
  'Écrit par le RPC keep_alive_ping(), appelé par .github/workflows/keep-alive.yml (mécanisme EXTERNE — seul à protéger de la pause).';
COMMENT ON COLUMN public.keep_alive.external_count IS
  'Nombre de pings externes reçus. Doit croître d''au moins 1 tous les 7 jours.';

-- 2. Point d'entrée unique du ping externe.
CREATE OR REPLACE FUNCTION public.keep_alive_ping()
RETURNS TABLE (external_ping timestamptz, external_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.keep_alive
     SET external_ping  = now(),
         external_count = keep_alive.external_count + 1
   WHERE id = 1
  RETURNING keep_alive.external_ping, keep_alive.external_count;
$function$;

-- 3. Droits : personne, puis `anon` seulement.
REVOKE ALL ON FUNCTION public.keep_alive_ping() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.keep_alive_ping() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.keep_alive_ping() TO anon;

COMMENT ON FUNCTION public.keep_alive_ping() IS
  'Heartbeat EXTERNE (GitHub Actions). Écrit external_ping=now() et incrémente external_count. N''expose aucune donnée utilisateur.';
