-- ============================================================================
-- 20261104000012 — R172 : retirer l'ÉCRITURE au rôle `anon` + durcir les
--                   privilèges par défaut de `public`
-- ----------------------------------------------------------------------------
-- DÉFAUT MESURÉ (2026-11-04, instance hhgovvrnalibhgpakswi)
--   ~49 tables de `public` portaient des grants INSERT/UPDATE/DELETE (voire
--   TRUNCATE/REFERENCES/TRIGGER) pour le rôle `anon`, hérités de :
--     • ALTER DEFAULT PRIVILEGES … ON TABLES TO anon (pg_default_acl), posé par
--       des migrations précoces + les défauts Supabase ; et
--     • quelques GRANT explicites historiques (ex. 0015_* sur events/org_units).
--
--   Ces grants sont INERTES aujourd'hui : RLS est activée sur TOUTES les tables
--   de `public` et AUCUNE policy n'accorde quoi que ce soit à `anon` (les 3
--   policies visant le pseudo-rôle `public` — event_tasks_select,
--   org_reports_emitter/receiver — sont gardées par un prédicat uid/org qui vaut
--   NULL, donc faux, pour `anon`). Aucune donnée n'est donc exposée.
--
--   MAIS c'est une bombe à retardement : le jour où une table perdrait RLS, ou
--   où une policy serait écrite par erreur `TO public`/`anon`, l'écriture
--   anonyme serait IMMÉDIATEMENT possible. On retire donc à `anon` le droit
--   d'ÉCRIRE (défense en profondeur) et on empêche la récidive via les
--   privilèges par défaut.
--
-- PRÉSERVÉ (lecture anon légitime, à ne PAS casser)
--   • `keep_alive` : le ping anti-pause .github/workflows/keep-alive.yml lit
--     /rest/v1/keep_alive avec la clé anon → SELECT conservé.
--   • `logos` (storage) : bucket public, policy `lumina_logos_read` → anon.
--   • SELECT sur `public` : conservé par prudence (aucune exposition réelle,
--     RLS n'ayant aucune policy anon) — on ne durcit QUE l'écriture.
--   • RPC `keep_alive_ping()` : seule fonction anon assumée (écrit
--     external_ping=now()) → EXECUTE conservé.
--
-- RÉVERSIBILITÉ : rollback/20261104000012_rollback.sql
-- ============================================================================

-- 1. Écriture retirée à `anon` sur les tables existantes (SELECT conservé).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM anon;

-- 2. Privilèges par défaut : plus aucune écriture auto-accordée à `anon` sur
--    les FUTURES tables de `public` créées par `postgres` (ferme la classe,
--    pas seulement les cas présents). MAINTAIN (PG17) est retiré aussi.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLES FROM anon;

-- 3. Storage : best-effort. `storage.objects` appartient à
--    `supabase_storage_admin` ; si le rôle d'application n'en est pas
--    propriétaire, ce REVOKE est un no-op (sans erreur). Les grants d'écriture
--    d'`anon` y restent donc INERTES derrière la RLS (aucune policy d'écriture
--    anon) — cf. RISQUES.md R172 (résiduel).
REVOKE INSERT, UPDATE, DELETE ON storage.objects FROM anon;
