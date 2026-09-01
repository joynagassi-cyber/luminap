# Lumina — Plateforme Universelle d'Organisation

## Stack
- React + TypeScript + Vite
- Tailwind CSS (design system Lumina)
- Zustand (state management)
- React Router (routing)
- lucide-react (icons)
- date-fns (formatting, fr locale)
- Nitro (server API routes)

## Design System
- Fond principal: `#121212` (canvas)
- Surface: `#181818`, hover: `#282828`, active: `#333333`
- Text: primary `#FFFFFF`, secondary `#B3B3B3`, tertiary `#808080`, placeholder `#535353`
- Couleurs financières fixes: income `#1DB954`, expense `#E51332`, pending `#FFB800`
- Accent brand: `#FF6B00` (orange église)
- Boutons pill shape, cartes 8px radius
- Navigation bottom tab bar fixe

## Règles Métier
- Montants en centimes (multiples de 100)
- Transactions approuvées immuables
- State: DRAFT → PENDING → APPROVED | REJECTED

## Données
- Mock données dans `src/config/mockData.ts`
- State serveur dans `server/store.ts`
- Organisation: Église MFE-JC Centrale
- 9 catégories, 5 groupes, 5 transactions exemple

## Routage
- `/login` — Authentification (serveur-side avec hash SHA-256)
- `/` — Dashboard
- `/finance` — Grand livre avec filtres
- `/transaction/new` — Nouvelle transaction
- `/transaction/:id` — Détail transaction
- `/transaction/:id/edit` — Modifier (draft/rejeté seulement)
- `/balance` — Bilan financier par période
- `/groups` — Groupes organisationnels
- `/settings` — Paramètres utilisateur

## Auth & Sécurité
- **Serveur Nitro** : authentification via `/api/auth/login` avec hash SHA-256 + salt, rate limiting (5 tentatives/60s), cookies httpOnly
- **Session** : token stocké en sessionStorage côté client, cookie httpOnly côté serveur
- **Autorisation** : middleware `server/middleware/security.ts` applique CSP, X-Frame-Options, X-Content-Type-Options
- **Métier** : transactions approuvées immuables, seuls REJECTED peuvent être supprimés
- **Rôles** : ADMIN (tous), TREASURER (lecture+création), APPROVER (lecture+approbation)
- **Données** : mock dans `src/config/mockData.ts`, state serveur dans `server/store.ts`
- **User par défaut** : admin@mfe-jc.org (mdp: `lumina-admin-2026`)

<!-- nitro:start -->

## Nitro Server Layer

This project has a Nitro server layer for backend API routes. A `nitro.config.ts` at the app root sets `serverDir: "./server"` — do not move or remove it.

### vite.config.ts

`vite.config.ts` already imports `nitro` from `"nitro/vite"` and registers `nitro()` as the LAST entry in the `plugins` array. Do not move it earlier — it must run after Vite's module-transform middleware, otherwise Nitro's SPA fallback intercepts Vite internal URLs (`/src/*.tsx`, `/@vite/client`, `/@react-refresh`, `/@fs/*`) and returns `index.html`, breaking the preview.

### API Route Conventions

- Write routes in `server/routes/api/` (NEVER top-level `/api/`).
- Dynamic routes: `[param].ts`. Method-specific: `hello.get.ts`, `hello.post.ts`.
- Runtime config: `useRuntimeConfig()` (env vars prefixed with `NITRO_`).

### Imports — read carefully

Imports come from two different sources:

- `defineHandler` and `useRuntimeConfig` are imported from **`"nitro"`**.
- **Every request/response helper comes from `"nitro/h3"`** — Nitro v3 re-exports h3 utilities through that subpath. Common ones: `readBody`, `readValidatedBody`, `getQuery`, `getRouterParam`, `getRouterParams`, `createError`, `sendError`, `setResponseStatus`, `getRequestHeaders`, `getRequestURL`, `setCookie`, `getCookie`, `deleteCookie`.

Worked example — `server/routes/api/todos.post.ts`:

```ts
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";

export default defineHandler(async (event) => {
  const body = await readBody<{ title?: string }>(event);
  if (!body?.title) {
    throw createError({ statusCode: 400, statusMessage: "title is required" });
  }
  return { ok: true, title: body.title };
});
```

### Server-side packages

Any package used inside `server/` (database drivers like `@neondatabase/serverless`, auth SDKs, third-party API clients) must be in `package.json`. Add it before writing the first server file that imports it. NEVER import these from `src/` — code under `src/` ships to the browser, so importing server packages there leaks them and usually breaks the build.

### Common mistakes

- `import { readBody } from "nitro"` → wrong. h3 utilities are not exported from `"nitro"`. Use `"nitro/h3"`.
- `import { readBody } from "h3"` → wrong. Even though Nitro is built on h3, you import through `"nitro/h3"` (the version Nitro re-exports), not `"h3"` directly.
- `nitro()` placed before `react()` in `plugins` → wrong. Must be the LAST entry, otherwise the SPA fallback intercepts Vite internals.
- Omitting `nitro()` from `vite.config.ts` entirely → `/api/*` returns `index.html` instead of JSON.
- Importing server-only packages or referencing server-only env vars (`process.env.DATABASE_URL`, secrets) from `src/` → wrong. The Vite client bundle is public; this leaks them. Server code lives in `server/` only.

<!-- nitro:end -->
