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
- **Tokens sémantiques CSS** (src/App.css) : `--canvas, --surface, --card, --surface-hover, --surface-active, --border, --text-primary/secondary/tertiary/placeholder, --nav-bg, --shadow-card/pop` définis en **deux blocs** `[data-theme="dark"]` (défaut) et `[data-theme="light"]`. Dark : canvas `#121212`, surface `#212121`, card `#181818`… Light : canvas `#F5F6F8`, surface/card `#FFFFFF`, hover `#EEF0F2`…
- **JAMAIS de hex neutre en dur dans les composants** : toujours `var(--…)` (inline `style` ou Tailwind arbitrary `bg-[var(--surface)]`, `text-[var(--text-tertiary)]`, `border-[var(--border)]`). Tailwind (tailwind.config.ts) pointe ses couleurs vers ces vars.
- **Invariantes (inchangées dark/light)** : couleurs financières income `#1DB954`, expense `#E51332`, pending `#FFB800` (tokens `--data-*`) ; accent brand `#FF6B00` (tokens `--accent-*`, poussé au runtime par `applyTheme` — 10 palettes) ; couleurs sémantiques de statut (`#808080` DRAFT, `#3B82F6` planifié/EN_AVANCE, `#8B5CF6`…).
- Boutons pill shape, cartes 8px radius
- Navigation bottom tab bar fixe

## Thème clair/sombre + double splash + 3 onglets Paramètres
- **Mode clair/sombre** : `applyThemeMode` / `getStoredThemeMode` / `persistThemeMode` / `applyStoredThemeMode` (src/ionic/themes.ts, type `ThemeMode`), localStorage `lumina-theme-mode` (sombre par défaut). `index.html` pose `data-theme` **avant le premier paint** (script inline) ; `main.tsx` relance `applyStoredThemeMode()` au boot. Le store React : `src/store/useThemeModeStore.ts` (zustand, `mode`/`setMode`/`toggleMode`). `src/ionic/theme.ts` expose `applyIonicThemeMode` (vars `--ion-*` par mode) ; `theme.css` pointe tous les `--ion-*` neutres vers les tokens `var(--…)` (ils basculent tout seuls avec le mode).
- **Bascule UI** : `src/components/ThemeToggle.tsx` (switch Sombre/Clair, `data-testid="theme-mode-toggle"`), visible dans Paramètres → onglet « Paramètres » → carte Thème & apparence.
- **Paramètres en 3 onglets** (`/settings`) : `SegmentedTabs` (onglets HTML natifs, ARIA tablist/tab, `data-testid="settings-tabs"`, onglets `tab-parameters`/`tab-practical`/`tab-profile`, actif = accent) ; onglet 1 « Paramètres » = config org + Thème & apparence (ThemeToggle + ThemePicker) + Features & navigation ; onglet 2 « Pratique » = raccourcis + actions rapides ; onglet 3 « Profil » = carte profil + stats/données + déconnexion + version. État `activeTab` = useState, défaut onglet 1.
- **Double splash** (`/splash`) : phase `logo` (~1,2 s, `LuminaLogo`) → phase `illustration` (~1,5 s, `src/components/SplashIllustration.tsx` : SVG plate statique, fond transparent, couleurs via vars sémantiques — thème-adaptative) + logo en bas ; gate existant conservé (si `useLoadInitialData` pas prêt à ~2,7 s → spinner `splash-loading`), puis `/onboarding` ou `/dashboard`. Testids : `splash-phase-logo`, `splash-phase-illustration`, `splash-illustration`, `splash-loading`.
- **Pièges de migration (respecter en ajoutant des styles)** : (1) `color: #fff` reste blanc **sur fond accent/colore** (boutons pill, FAB, badges), devient `var(--text-primary)` sur fond neutre ; (2) les hex à 8 chiffres (`#80808020`, `#1DB95420`…) ne se remplacent JAMAIS ; (3) les maps de statut conservent leurs hex ; (4) limitation native : le fond du splash Capacitor reste `#121212` (capacitor.config.ts) — le mode clair n'est appliqué que web/webview.
- **Note portage Versyflow** : les pièces portables = blocs tokens `[data-theme=…]` App.css + `applyThemeMode`/store + `ThemeToggle` + `SegmentedTabs` + motif « 3 onglets Paramètres » + double-splash + `SplashIllustration` (adapter le motif au branding Versyflow) + le bulk-replace de ses propres hex neutres (mapping : `#121212`→`var(--canvas)`, `#181818`→`var(--card)`, `#1e1e1e`/`#212121`→`var(--surface)`, `#282828`→`var(--surface-hover)` en fond / `var(--border)` en bordure, `#333333`→`var(--surface-active)`, `#B3B3B3`→`var(--text-secondary)`, `#808080`→`var(--text-tertiary)`, `rgba(18,18,18,.97)`→`var(--nav-bg)`, `#fff`→`var(--text-primary)` sauf sur accent).

## Scroll & viewport (global)
- **Pas de barre de défilement visible** : `globals.css` masque les scrollbars sur tous les éléments (`scrollbar-width:none` + `*::-webkit-scrollbar{display:none}`), le défilement reste fluide. Ne pas réintroduire de scrollbars visibles.
- **Conteneurs pleine hauteur** : `.h-screen`/`.min-h-screen` sont surchargés en `100dvh` (repli `100vh`) pour que le bas de page soit atteignable sur mobile (100vh dépasse le viewport réel).
- **`BottomNav` fixe (~64px) + FAB** : dans un conteneur qui scrolle (`overflow-y-auto` ou `IonContent`), la zone de contenu doit avoir un padding-bottom ≥ `pb-28`, sinon le dernier contenu (bouton d'envoi…) est masqué sous la nav.

## Règles Métier
- Montants en centimes (multiples de 100)
- Transactions approuvées immuables
- State: DRAFT → PENDING → APPROVED | REJECTED

## Données
- **Supabase** : tables `transactions`, `categories`, `org_units`, `audit_entries`, `caisses`
- **P0 (grandes églises)** : `org_budgets`, `org_budget_lines` (budget par centre de coûts) ; `giving_donors`, `giving_campaigns`, `pledges`, `tax_receipts`, `transaction_giving` (dons/campagnes). Toutes RLS par `is_org_member(auth.uid(), org_id)` (TO authenticated, INSERT `WITH CHECK`), grants `anon`/`authenticated`/`service_role` (CRUD) + `powersync_role` (SELECT). Publication `powersync` est `FOR ALL TABLES` → toute nouvelle table `public` est auto-synchronisée (pas d'`ALTER PUBLICATION`).
- **IndexedDB** : `lumina-db` v7 avec stores `transactions`, `categories`, `orgUnits`, `auditEntries`, `events`, `syncQueue`, `config`, `caisses`
- **Organisation** : Église MFE-JC Centrale (org-1)
- **Catégories** : 9 (dîme, offrande, offrande mission, don, salaire pasteur, frais fonctionnement, mission, entretien, aumône)
- **Groupes** : 5 (diacres, jeunesse, dames, messieurs, chorale)
- **Caisses** : Chaque groupe a sa propre caisse (`sourceCaisseId`). La caisse principale (`id: 'main'`) reçoit les versements.

## Stockage fichiers (buckets Supabase)
- **3 buckets** : `logos` (PUBLIC — logos de l'église/organisation), `archives` (privé — documents nommés + objet), `expense_proofs` (privé — photos-preuves de dépenses).
- **Table `documents`** (Postgres + PowerSync, publication `powersync`) : métadonnée des fichiers — `org_id`, `title`, `purpose` (objet), `bucket`, `file_path`, `file_size`, `mime_type`, `entity_type` ∈ {ARCHIVE_DOC, EXPENSE_PROOF, LOGO, OTHER}, `entity_id`, `status` ∈ {ACTIVE, ARCHIVED, DELETED} (soft-delete par UPDATE, pas de DELETE côté client), `uploaded_by` (uuid, nullable).
- **Accès** : `src/lib/storageService.ts` → `uploadLuminaFile(bucket, file, subpath?)`, `getDocumentUrl(bucket, path)` (public → URL stable ; privé → URL signée 30 min), `deleteLuminaFile()`. Les uploads nécessitent le réseau (pas de binaire offline) ; la métadonnée `documents` est PowerSync (offline ok).
- **RLS storage** : `lumina_storage_read` / `lumina_storage_write` (anon + authenticated, restreintes aux 3 buckets) ; `lumina_storage_delete` (authenticated).
- **UI** : upload de documents dans `Archives` (nom + objet) ; photos-preuve dans le formulaire de dépense (`TransactionNew`, section « Preuve de la dépense ») et affichées dans `TransactionDetail` ; upload du logo dans `Settings` (bucket `logos`, repli base64 hors ligne) ; logo affichée dans `TopHeader`.
- **Bornière uuid** : `SupabaseConnector.uploadData` coerce `documents.uploaded_by` et `transactions.created_by_id/approved_by_id` vers `null` si non-UUID.

## Features configurables (nav & menu « Plus »)
- `src/lib/features.ts` : registre `FEATURES` (id/libellé/route/icone, `kind` core|feature) + store zustand `useFeatureConfig` (persisté `localStorage["lumina-features"]`).
- `navTabs` : liste **dynamique, non hardcodée** — l'utilisateur ajoute/retire/réordonne librement les onglets (`addNavTab`/`removeNavTab`/`moveNavTab`), min 1 / max 4, sans slot verrouillé ; défaut `["dashboard","finance","groups","cotisations"]`.
- `visible` : bascule par feature (masque du menu « Plus ») ; une feature épinglée dans la barre n'apparaît pas dans le menu (`featuresForMoreMenu`).
- Config UI : Settings → carte « Features & navigation » (selects emplacements 3-4 + toggles + reset). Réactif partout (zustand) + sync inter-onglets (event `storage`).

## ⚠️ React 19 + custom elements Ionic — PIÈGE (barre nav / boutons vides)
- **Réglé** : avec React 19, les *enfants React* de certains custom elements Ionic (`ion-tab-bar`, `ion-button`, `ion-tab-button`) peuvent ne PAS être rendus dans le light DOM (selon l'ordre de définition des éléments) → barre d'onglets **vide** et boutons **sans icône**. Le diagnostic DOM : `ion-tab-bar` présent mais `innerHTML` vide (shadow = `<slot>` seul), 0 `ion-tab-button`.
- **Règle** : pour tout élément dont le contenu compte (nav, FAB, boutons du header, **selects**) → **HTML natif** (`<button>`, `<nav>`, `<select>`), pas `IonButton`/`IonTabBar`/`IonTabButton`/`IonSelect`. `BottomNav` (barre + FAB + menu Plus) et les boutons du `TopHeader` sont en natif (`data-testid="bottom-nav"`).
- **`IonSelect`/`IonSelectOption` aussi touchés** : le picker s'ouvre **blanc et vide** (options non rendues) → impossible de sélectionner. Convertir en `<select>` + `<option>` natifs (fond `#181818`, texte `#fff`, bordure `#282828`, radius `rounded-xl`). Fait dans `Federation` (formulaire de création d'organisation : Nom / Type / Parente + boutons des nœuds).
- `IonPage`/`IonContent`/`IonHeader`/`IonTitle` restent OK (leurs enfants s'affichent).
- Best-effort : `main.tsx` tente de précharger les définitions Ionic avant le premier render.
- Si un bouton `ion-*` ressort vide → le convertir en bouton natif (même style/ARIA), ne pas « réparer » Ionic.

## ⚠️ Routeur Ionic + état de navigation (query param, pas location.state)
- Le routeur Ionic (`IonReactRouter`/`IonRouterOutlet`/`LazyRoute`) **ne préserve pas** le `location.state` de React Router entre les vues → une navigation `navigate("/x", { state: { type } })` arrive avec `state = undefined` (le formulaire retombait sur le défaut).
- **Règle** : pour passer des données d'une page à une autre (ex. le type de transaction ENTRÉE/SORTIE), utiliser un **query param** `?type=` (fiable, dans l'URL) et le lire via `new URLSearchParams(location.search).get("type")`. Fait : `Finance`/`Dashboard` → `TransactionNew` (`?type=`).
- **FAB** : masqué sur `/finance` (`BottomNav` rend le FAB uniquement si `fabAction` non nul) — les boutons « Nouvelle entrée »/« Nouvelle dépense » de la page font la même chose, le FAB rouge se superposait.

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
- `/budgets` — Budgets (liste + filtres exercice/période/centre de coûts) ; `/budgets/:id` — détail (écart prévu/réel par ligne, rapport conseil, clôturer)
- `/giving` — Dons & campagnes (onglets Campagnes / Donateurs / Pledges / Reçus) ; `/giving/campaigns/:id` — détail campagne (progression, pledges, rattachement tx, reçu fiscal)
- `/groups` — Groupes organisationnels
- `/groups/:id` — Détail groupe (solde caisse + bouton verser)
- `/events` — Événements (dans menu Plus)
- `/event/new` — Nouvel événement
- `/event/:id` — Détail événement
- `/versement` — Page de versement (caisse groupe → caisse principale)
- `/settings` — Paramètres en 3 onglets (Paramètres / Pratique / Profil ; tabuleur `SegmentedTabs` + bascule de thème `ThemeToggle` dans l'onglet 1)
- `/splash` — Rampe double phase (logo → illustration plate), puis onboarding/dashboard

## Capabilités P0 (grandes églises) — budgets & giving
- **`src/capabilities/budgets/index.ts`** : service `budgets` (CRUD `org_budgets`/`org_budget_lines`) + helpers purs **testables** : `budgetWindow(budget)` (fenêtre date par exercice/période) et `computeBudgetReport(budget, lines, transactions, categories)` → prévu/réel/écart par ligne + totaux. Le « réel » est **toujours dérivé** des transactions APPROVED (jamais stocké).
- **`src/capabilities/giving/index.ts`** : service `giving` (donors, campaigns, pledges, tax receipts, liens tx↔donneur) + helpers purs : `givenForCampaign`, `pledgedForCampaign`, `campaignProgress` (réel + engagements vs objectif), `annualDonorTotal`, `generateTaxReceipt` (idempotent : 1 reçu par (org, donateur, année), total recomputé depuis les tx liées).
- **Data layer** : types `PSOrgBudget`, `PSOrgBudgetLine`, `PSGivingDonor`, `PSGivingCampaign`, `PSPledge`, `PSTaxReceipt`, `PSTransactionGiving` + hooks de lecture PS-only (`useOrgBudgets`, `useOrgBudgetLines`, `useGivingDonors`, `useGivingCampaigns`, `usePledges`, `useTaxReceipts`, `useTransactionGiving`) + écritures (`addOrgBudgetPS`/`addOrgBudgetLinePS`/…, `addGivingDonorPS`/`addGivingCampaignPS`/`addPledgePS`/`addTaxReceiptPS`/`linkTransactionGivingPS`). Pas de fallback IndexedDB (comme `useDocuments`).
- **Pages** : `Budgets` (liste/filtres/création), `BudgetDetail` (lignes + rapport conseil + clôturer), `Giving` (hub 4 onglets), `GivingCampaign` (progression + pledges + rattachement + reçu fiscal). Routes dans `src/ionic/routes/finance.tsx` ; features `budgets`/`giving` au menu « Plus » (`src/lib/features.ts`).
- Convention montants : saisie en FCFA dans les formulaires → ×100 en centimes à l'écriture (`*_amount_cents`). `tax_receipt_enabled` = 0/1 (integer) en PG **et** PowerSync.

## Architecture Local-First
- **IndexedDB** (`src/lib/db.ts`) : source de vérité locale, persiste aux crashs/reloads
- **Zustand store** (`src/store/useLocalStore.ts`) : UI alimentée par IndexedDB
- **Sync engine** (`src/lib/sync.ts`) : background sync Supabase avec retry (max 5, backoff 1s→16s)
- **Pas d'auth** : accès direct, RLS open sur Supabase pour tous les utilisateurs
- **Offline-first** : fonctionne sans internet, sync auto à la reconnexion
- **Network events** : écoute `online`/`offline` + `visibilitychange` pour relancer la sync

## Authentification & routage post-login
- **Toute inscription → `/onboarding` d'abord** (jamais le dashboard direct) ; une **connexion** (compte existant) peut aller direct au dashboard.
- Email : `AuthPage` force l'onboarding à la signature (`forceOnboarding: true`).
- Google (web OAuth **et** deep-link natif) : détection du **nouveau compte** via `user.created_at` < 5 min (`isBrandNewUser` dans `src/lib/auth.ts`, exposé `isNewUser` par `handleOAuthCallback`/`handleOAuthDeepLink`). Nouveau → onboarding ; retour → dashboard.
- L'état d'onboarding est **par navigateur** (localStorage `lumina-onboarded`) : un compte existant sur un nouvel appareil repasse l'onboarding (limitation connue, acceptable).

## Multi-organisation & RBAC (bootstrap)
- **Grille RLS (vérifiée)** : `organizations` INSERT et `org_admins` INSERT exigent un **grant central actif** (`org_admins`) → on ne peut PAS créer la 1ʳᵉ organisation côté client.
- **Bootstrap serveur** : edge function `supabase/functions/create_org` (service_role) — vérifie la session JWT, exige un grant `org_admins` actif, crée l'org (status `ACTIVE`) + donne l'admin au créateur. Wrapper client : `src/lib/orgBootstrap.ts` → `bootstrapOrganization()`.
- **1ʳ admin seedé par SQL** (service_role) : `admin@mfe-jc.org` sur `org-central`. Sans lui, tout « créer une org opérationnelle » renvoie 403. Pour changer d'admin → insérer un autre grant `org_admins` (DELETE/re-INSERT).
- **Flux complet** : Fédération → « Créer opérationnelle » (edge fn) → l'org est ACTIVE + vous êtes admin → bouton « Inviter des membres » → `/invitation/emit?org=<id>` → le destinataire claim (`/invitation/claim`) → `profiles.role` + `profiles.org_id` attribués (RBAC).
- **Invitations** : capabilité `@/capabilities/invitation` (QR / code / fichier) + `InvitationEmit` (supporte `?org=`) / `InvitationClaim` / `InvitationManage`.
- **Menu « Plus »** : features `invitations` (`/invitation/manage`), `federation` (`/admin/federation`), `admin` (`/admin`) ajoutées (visibilité bornée par RLS sur les pages).

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
