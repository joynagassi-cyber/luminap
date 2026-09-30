# Lumina — Instructions pour agents de code (AGENTS.md)

L'architecture Nitro serveur (`server/`, plugin `nitro()` de Vite,
dépendances `h3` / `nitro` / `@supabase/server` / `pg`) a été supprimée
le 2026-09-30 : l'app est 100 % front-first (PowerSync + Supabase
directement côté navigateur). Il n'existe plus de route API serveur —
la couche de données est dans `src/lib/dataLayer.ts` et les services
`src/lib/*.ts`.

- `vite.config.ts` active le plugin Nitro uniquement si `server/`
  contient de vraies routes `.ts` — ce n'est plus le cas.
- `package.json` conserve `nitro` / `h3` / `pg` comme déclarations
  historiques ; le build fonctionne sans `server/`.
