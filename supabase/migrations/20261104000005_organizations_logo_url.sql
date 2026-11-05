-- R48 — Persistance du logo d'organisation.
--
-- Défaut : `organizations` n'avait pas de colonne pour le logo ; il n'existait
-- que dans `lumina-config` (localStorage). Un autre membre, un autre appareil
-- et les rapports PDF ne voyaient donc jamais le logo de l'organisation.
--
-- La policy UPDATE existante (`orgs_update_merged`) couvre la nouvelle colonne
-- (elle n'est pas restreinte par colonne). L'ajout est répliqué automatiquement
-- par PowerSync (réplication logique du slot).
alter table public.organizations
  add column if not exists logo_url text;
