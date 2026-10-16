-- ============================================================================
-- 20261012000001 — Fix initplan_uid() : plan préparé (Prepared SubPlan) cache
-- request.jwt.claims → NULL → toutes les policies RLS USING/WITH CHECK qui
-- passent par is_org_member(initplan_uid(), …) retournent FALSE (403 42501)
-- même quand le user EST membre de l'org.
--
-- Reproduction (avant le fix) :
--   1. POST /rest/v1/accounts avec le JWT du compte e2e (sub=87afea21-…,
--      org-e2e, membership ACTIVE) → 403 « new row violates RLS ».
--   2. La même fonction appelée directement is_org_member(sub, 'org-e2e')
--      dit TRUE → le data est bon, c'est l'évaluation RLS qui est fausse.
--   3. SELECT current_setting('request.jwt.claim.sub', true) en top-level dit
--      NULL alors que current_setting('request.jwt.claims', true) contient le
--      JSON → le claim individualisé n'est pas propagé dans le SubPlan
--      préparé de la policy.
--
-- RLS est évalué dans le contexte du SubPlan préparé ; une fonction SQL
-- VOLATILE qui lit current_setting() y retourne NULL (le set_config de
-- l'appelant n'est pas visible). Une fonction STABLE qui lit la clé
-- parent `request.jwt.claims` (toujours remplie par PostgREST, jamais
-- « individualisée » en claim isolé) est lue une seule fois et sa
-- valeur est propagée au plan préparé → le sub est résolu.
--
-- Le changement de VOLATILE → STABLE n'impacte pas les autres usages
-- (initplan_uid n'est appelée que par les policies RLS et par
-- is_org_member, qui est SECURITY DEFINER mais ne l'appelle pas).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initplan_uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
$function$;

COMMENT ON FUNCTION public.initplan_uid() IS
  'Retourne le sub du JWT courant (uuid ou NULL). STABLE (pas VOLATILE) : '
  'la valeur lue via current_setting() est propagée dans les plans préparés '
  'utilisés par les policies RLS — une fonction VOLATILE y retourne NULL '
  'et casse tout le RLS (2026-10-12, bug identifié dans le cycle '
  'cloud-sync e2e : 403 42501 sur INSERT alors que le user est membre).';
