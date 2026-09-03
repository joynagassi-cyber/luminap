# Lumina — Plateforme Universelle d'Organisation

## Architecture
- **Local-first** : IndexedDB comme source de vérité (persiste aux crashs/reloads)
- **Sync background** : Supabase cloud en arrière-plan, retry auto avec backoff exponentiel
- **Pas d'auth** : Accès direct, données sécurisées par RLS open sur Supabase
- **Offline-first** : L'app fonctionne sans internet, sync dès la reconnexion
- **Retry queue** : Opérations échouées stockées dans IndexedDB, retry auto (max 5, backoff 1s→2s→4s→8s→16s)

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
- **Supabase** : tables `transactions`, `categories`, `org_units`, `audit_entries`, `caisses`
- **IndexedDB** : `lumina-db` v7 avec stores `transactions`, `categories`, `orgUnits`, `auditEntries`, `events`, `syncQueue`, `config`, `caisses`
- **Organisation** : Église MFE-JC Centrale (org-1)
- **Catégories** : 9 (dîme, offrande, offrande mission, don, salaire pasteur, frais fonctionnement, mission, entretien, aumône)
- **Groupes** : 5 (diacres, jeunesse, dames, messieurs, chorale)
- **Caisses** : Chaque groupe a sa propre caisse (`sourceCaisseId`). La caisse principale (`id: 'main'`) reçoit les versements.

## Architecture Caisses & Versement
- **Caisse principale** (`id: 'main'`) : fonds de l'église, visible dans le dashboard
- **Caisse groupe** (`id: orgUnitId`) : fonds de chaque groupe
- **Versement** : transfert d'une caisse groupe → caisse principale (crée 2 transactions liées par `versementId`)
- **Champ transaction** : `sourceCaisseId` indique quelle caisse est débitée (orgUnitId ou 'main')
- **Champ transaction** : `versementId` relie les 2 transactions d'un versement
- **Dashboard** : affiche toutes les caisses avec leur solde
- **Finance** : filtre par caisse (toutes / principale / groupe)
- **Page Versement** : sélectionne un groupe, montant total ou personnalisé, confirme le transfert
- **GroupDetail** : bouton "Verser à la caisse principale" avec modal montant personnalisé
- **TransactionNew** : le sélecteur "Groupe" détermine automatiquement `sourceCaisseId`

## Routage
- `/login` — Page d'entrée (pas d'auth, simple clic)
- `/` — Dashboard (caisses + transactions principale)
- `/finance` — Grand livre avec filtres (dont filtre par caisse)
- `/transaction/new` — Nouvelle transaction
- `/transaction/:id` — Détail transaction
- `/transaction/:id/edit` — Modifier (draft/rejeté seulement)
- `/balance` — Bilan financier par période
- `/groups` — Groupes organisationnels
- `/groups/:id` — Détail groupe (solde caisse + bouton verser)
- `/events` — Événements (dans menu Plus)
- `/event/new` — Nouvel événement
- `/event/:id` — Détail événement
- `/versement` — Page de versement (caisse groupe → caisse principale)
- `/settings` — Paramètres (status sync, stockage local)

## Architecture Local-First
- **IndexedDB** (`src/lib/db.ts`) : source de vérité locale, persiste aux crashs/reloads
- **Zustand store** (`src/store/useLocalStore.ts`) : UI alimentée par IndexedDB
- **Sync engine** (`src/lib/sync.ts`) : background sync Supabase avec retry (max 5, backoff 1s→16s)
- **Pas d'auth** : accès direct, RLS open sur Supabase pour tous les utilisateurs
- **Offline-first** : fonctionne sans internet, sync auto à la reconnexion
- **Network events** : écoute `online`/`offline` + `visibilitychange` pour relancer la sync

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
