-- Rollback R172 — restaure les privilèges d'écriture de `anon` sur `public`
-- et sur `storage.objects`, ainsi que les privilèges par défaut et l'EXECUTE
-- des fonctions RPC. (État d'origine : `anon` détenait l'écriture sur toutes
-- les tables via les privilèges par défaut.)

GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public TO anon;

GRANT INSERT, UPDATE, DELETE ON storage.objects TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLES TO anon;
