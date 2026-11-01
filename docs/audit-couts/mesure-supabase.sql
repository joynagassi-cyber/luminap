-- Mesure read-only Supabase pour l'audit coûts Lumina.
-- À exécuter dans le SQL Editor du projet ou via le connecteur.
-- Ne modifie aucune donnée. Ne retourne aucun secret.

SELECT json_build_object(
  'measured_at', now(),
  'database_bytes', pg_database_size(current_database()),
  'auth_users', (SELECT count(*) FROM auth.users),
  'organizations', (SELECT count(*) FROM public.organizations),
  'members', (SELECT count(*) FROM public.members),
  'transactions', (SELECT count(*) FROM public.transactions),
  'cotisations', (SELECT count(*) FROM public.cotisations),
  'events', (SELECT count(*) FROM public.events),
  'audit_entries', (SELECT count(*) FROM public.audit_entries),
  'notifications', (SELECT count(*) FROM public.notifications),
  'auth_sessions', (SELECT count(*) FROM auth.sessions),
  'auth_refresh_tokens', (SELECT count(*) FROM auth.refresh_tokens),
  'storage_files', (SELECT count(*) FROM storage.objects),
  'storage_bytes', (SELECT coalesce(sum((metadata->>'size')::bigint),0) FROM storage.objects),
  'public_bytes', (SELECT coalesce(sum(pg_total_relation_size(relid)),0) FROM pg_stat_user_tables WHERE schemaname='public'),
  'auth_bytes', (SELECT coalesce(sum(pg_total_relation_size(relid)),0) FROM pg_stat_user_tables WHERE schemaname='auth')
) AS snapshot;

-- WAL / disque système (le disque facturé est plus large que pg_database_size).
SELECT pg_size_pretty(sum(size)) AS wal_size FROM pg_ls_waldir();

-- Tables les plus volumineuses (estimations pg_class pour les lignes).
SELECT schemaname, relname,
       n_live_tup AS estimated_rows,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
