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

## Auth & sessions

- `src/lib/auth.ts` (singleton `authService`) est la seule source de
  vérité pour l'auth Supabase. Le client est créé avec
  `persistSession: true` (clé `sb-<projectRef>-auth-token`) et
  `flowType: "pkce"`.
- **Déconnexion douce** : `authService.signOut()` n'appelle PAS
  `supabase.auth.signOut()` (même `{ scope: "local" }` révoque le
  refresh token côté serveur → reconnexion impossible). Il sauvegarde
  les tokens sous `lumina-session-backup`, coupe l'auto-refresh et
  retire la clé de session locale.
- `authService.restoreSoftSession()` (utilisé par `/sessions`) rejoue
  `supabase.auth.refreshSession({ refresh_token })` — chemin fiable
  même si l'access token sauvegardé a expiré.
- Après une déconnexion, `/sessions` doit lister le compte et un clic
  doit reconnecter **sans retaper d'identifiants** (specs
  `cypress/e2e/sessions.cy.ts` + `src/pages/__tests__/Sessions.test.tsx`).

## PowerSync

- `powersync/sync-config.yaml` est l'unique source de vérité des
  streams (31 streams, édition 3, `auth.user_id()`). `service.yaml`
  est l'unique source de vérité du service config Cloud. Ne pas
  recréer de dump « fetched » (ils divergeaient).
- Les streams **on-demand** (`auto_subscribe: false`) doivent être
  souscrits explicitement par le client, sinon les tables locales
  restent vides. La liste est centralisée dans `ON_DEMAND_STREAMS`
  (`src/lib/powersync/index.ts`) et souscrite après login. Si tu
  ajoutes un stream `auto_subscribe: false` au YAML, ajoute-le aussi
  à `ON_DEMAND_STREAMS`.
- Déploiement Cloud : `powersync deploy sync-config` /
  `powersync deploy service-config` exigent `PS_ADMIN_TOKEN` (ou
  `powersync login`). Supabase : `supabase db push` exige
  `SUPABASE_ACCESS_TOKEN` ou un `supabase login` préalable.
