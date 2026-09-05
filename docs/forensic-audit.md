# LUMINA — AUDIT FORENSIQUE DU SYSTÈME ACTUEL

> Date : 2026-09-05
> État du dépôt : commit 57220c8
> Objectif : documentation factuelle du système pour planification d'une future refonte

---

## 1. Executive Summary

Lumina est une **application PWA mobile-first** de gestion financière pour organisations religieuses (églises), actuellement déployée pour l'Église MFE-JC Centrale. Elle suit une architecture **local-first** : IndexedDB est la source de vérité principale, Supabase sert de backend cloud avec synchronisation bidirectionnelle via realtime et queue de retry.

**Points clés :**
- Frontend React 19 + TypeScript, Zustand pour le state, React Router pour le routing
- Backend Nitro (Node.js) avec store en mémoire (fictif pour le dev, pas de DB serveance)
- Base locale IndexedDB (`lumina-db` v9) avec 9 stores
- Cloud Supabase avec 8 tables, RLS open, realtime subscriptions
- **Pas d'authentification réelle** : accès direct par session locale + sélection de rôle
- Fonctionnalités principales : Transactions (CRUD + workflow DRAFT→PENDING→APPROVED), Caisses (principale + groupes), Versements (transferts groupe→principal), Événements avec budget, Rapports/Exports (PDF/Excel/CSV), Notifications, Historique d'actions

**Problèmes identifiés dans l'audit précédent (corrigés) :**
- Bug de conversion double `/100` dans `formatCentsToFCFA` — corrigé
- Queue de sync jamais vidée — corrigé avec cleanup >5 retries ET >24h
- Audit entries jamais créés — corrigé (créés à CREATED/APPROVED)
- Notifications créées 2× (frontend + trigger DB) — corrigé avec dedup par `source_transaction_id`
- Cascade delete des transactions sur suppression de groupe — corrigé

**Problèmes résiduels :**
- Server store non persisté (données mémoire)
- `createdById`/`approvedById` en STRING vs UUID dans la DB (mismatch)
- Rejet de transaction ne crée pas d'audit entry
- `createNotification` exporté mais jamais appelé directement (code mort)

---

## 2. Stack réellement utilisée

### Frontend
| Élément | Technologie | Version |
|---|---|---|
| Framework | React | 19.2.8 |
| Language | TypeScript | 5.9.3 |
| Bundler | Vite | 8.2.2 |
| State | Zustand | 5.0.15 |
| Routing | React Router | 6.30.6 |
| Styling | Tailwind CSS | 3.4.19 |
| Icons | lucide-react | 0.462.0 |
| Date | date-fns | 3.6.0 |
| HTTP | supabase-js (REST + realtime) | 2.114.0 |
| Query | @tanstack/react-query | 5.102.8 |
| Export PDF | jspdf + jspdf-autotable | 4.2.1 / 5.0.8 |
| Export Excel | xlsx | 0.18.5 |
| Composants UI | shadcn/ui (Radix UI) | 1.x |
| Tests | Playwright | 1.62.1 |

### Backend (Nitro server)
| Élément | Technologie | Version |
|---|---|---|
| Runtime | Nitro (Node.js) | 3.0.260610-beta |
| Routes | server/routes/api/ | — |
| Store | server/store.ts (en mémoire) | — |
| DB | Supabase Postgres | — |
| Auth (fictif) | session cookies Nitro | — |

### Infrastructure
| Élément | Technologie | Version |
|---|---|---|
| Cloud | Supabase | hhgovvrnalibhgpakswi.supabase.co |
| Mobile wrapper | Capacitor | 6.2.2 (Android) |
| Hébergement | Vercel (vercel.json) | — |

---

## 3. Architecture réelle

```
┌─────────────────────────────────────────────────────────────┐
│                      React SPA (Vite)                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Pages/     │  │ Components/  │  │  Store/Zustand   │  │
│  │  -Dashboard  │  │  Transaction-│  │  useLocalStore   │  │
│  │  -Finance    │  │    Card      │  │  (state + ops)   │  │
│  │  -Balance    │  │  -BottomNav  │  │                  │  │
│  │  -Events*    │  │  -TopHeader  │  └────────┬─────────┘  │
│  │  -Groups*    │  │  -Skeleton   │           │           │
│  │  -Settings*  │  │  -Export*    │           │           │
│  │  -Versement  │  │  -Auth*      │           │           │
│  │  -Help*      │  │              │           │           │
│  └──────┬───────┘  └──────────────┘           │           │
│         │                                      │           │
│  ┌──────▼──────────────────────────────────────▼───────┐  │
│  │                    AppContext                        │  │
│  │  - loadInitialData()                                 │  │
│  │  - startBackgroundSync()                             │  │
│  │  - startRealtimeSubscriptions()                      │  │
│  │  - setupNetworkListeners()                           │  │
│  └──────────────────────┬───────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌──────────────────────────────────────────────────────┐
│                    lib/ layer                         │
│                                                      │
│  db.ts    → IndexedDB (lumina-db v9, 9 stores)       │
│  sync.ts  → Supabase realtime + background queue     │
│  api.ts   → Nitro REST client (unused in practice)   │
│  export.ts → PDF/Excel/CSV generation                │
│  utils.ts → formatting, ID generation                │
│                                                      │
│  stores/ useLocalStore.ts → Zustand (all business    │
│               logic lives here)                      │
└──────────────────────┬───────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  IndexedDB   │ │  Nitro   │ │   Supabase   │
│  (local)     │ │  Server  │ │   (cloud)    │
│              │ │          │ │              │
│ lumina-db v9 │ │ In-memory│ │ Postgres     │
│ 9 stores     │ │ store.ts │ │ 8 tables     │
│              │ │ (dev data)│ │  RLS open    │
│              │ │          │ │  Realtime    │
│              │ │          │ │  Triggers    │
└──────────────┘ └──────────┘ └──────────────┘
```

**Flux de données typique (exemple : créer une transaction) :**
1. `TransactionNew.tsx` → utilisateur clique "Enregistrer"
2. `addTransaction()` dans `useLocalStore.ts`
3. Écrit dans IndexedDB (`db.put('transactions', tx)`)
4. Met à jour le Zustand state (`set({ transactions: updated })`)
5. Envoie dans la queue de sync (`enqueueSync`)
6. `sync.ts` background sync → `supabase.from('transactions').insert(...)`
7. Realtime trigger `on_transaction_change` crée une notification dans la DB
8. Realtime subscription `notifications-changes` dans `sync.ts` détecte l'insertion
9. Notification écrite dans IndexedDB (avec dedup)

---

## 4. Repository Map

```
ROOT/
├── package.json                    → Dépendances, scripts (dev/build/capacitor/test)
├── tsconfig.json                   → Configuration TS (baseUrl, paths @/*)
├── vite.config.ts                  → Vite + Nitro plugin (last in plugins)
├── nitro.config.ts                 → Nitro serverDir: "./server"
├── capacitor.config.ts             → Capacitor (appId: org.mfejcentrale.lumina)
├── index.html                      → Entry point (body#root, src/main.tsx)
├── tailwind.config.ts              → Tailwind config
├── postcss.config.js               → PostCSS config
├── vercel.json                     → Vercel deployment config
│
├── src/
│   ├── main.tsx                    → createRoot + App
│   ├── App.tsx                     → BrowserRouter + QueryClient + routes
│   ├── App.css                     → Global styles
│   ├── globals.css                 → Tailwind + design tokens
│   │
│   ├── types/index.ts              → Tous les types TypeScript (Transaction, Event, etc.)
│   │
│   ├── context/AppContext.tsx      → Provider : loadInitialData + sync setup
│   │
│   ├── store/
│   │   └── useLocalStore.ts        → Zustand store (business logic centralisée)
│   │
│   ├── lib/
│   │   ├── db.ts                   → IndexedDB wrapper (9 stores, v9)
│   │   ├── sync.ts                 → Supabase sync engine (queue + realtime)
│   │   ├── api.ts                  → Nitro REST client (non utilisé par les pages)
│   │   ├── export.ts               → PDF/Excel/CSV generation
│   │   └── utils.ts                → formatters (formatCurrencyCompact, etc.)
│   │
│   ├── integrations/supabase/
│   │   └── client.ts               → Supabase client (URL + key hardcoded)
│   │
│   ├── components/
│   │   ├── TopHeader.tsx           → Header fixe (logo, notifications, settings)
│   │   ├── BottomNav.tsx           → Tab bar fixe (4 onglets + menu "Plus")
│   │   ├── TransactionCard.tsx     → Carte transaction réutilisable
│   │   ├── StatusBadge.tsx         → Badge statut transaction
│   │   ├── SyncIndicator.tsx       → Indicateur connexion
│   │   ├── ConfirmModal.tsx        → Modal confirmation
│   │   ├── EmptyState.tsx          → État vide réutilisable
│   │   ├── LuminaLogo.tsx          → Logo SVG
│   │   ├── LogoSpinner.tsx         → Spinner de chargement
│   │   ├── BottomDrawer.tsx        → Drawer.bottom
│   │   ├── Skeleton.tsx            → Composants skeleton
│   │   └── ui/                     → shadcn/ui (~40 composants Radix UI)
│   │
│   ├── pages/
│   │   ├── Login.tsx               → Entrée sans auth (nom + rôle)
│   │   ├── Onboarding.tsx          → Carrousel de présentation
│   │   ├── RoleSelection.tsx       → Choix du rôle (après login)
│   │   ├── Dashboard.tsx           → Accueil (caisses + transactions récentes)
│   │   ├── Finance.tsx             → Grand livre avec filtres + bulk approve
│   │   ├── TransactionNew.tsx      → Formulaire création transaction
│   │   ├── TransactionEdit.tsx     → Formulaire édition (DRAFT/REJECTED)
│   │   ├── TransactionDetail.tsx   → Détail transaction + actions
│   │   ├── Balance.tsx             → Bilan financier par période + export
│   │   ├── Groups.tsx              → Liste groupes + CRUD
│   │   ├── GroupDetail.tsx         → Détail groupe (caisse + transactions + versement)
│   │   ├── Events.tsx              → Liste événements
│   │   ├── EventNew.tsx            → Formulaire création événement + budget
│   │   ├── EventDetail.tsx         → Détail événement + tabs (overview/budget/tx)
│   │   ├── Versement.tsx           → Transfert groupe → caisse principale
│   │   ├── History.tsx             → Historique d'actions (audit entries)
│   │   ├── Notifications.tsx       → Center notifications
│   │   ├── Settings.tsx            → Configuration (église + stockage)
│   │   ├── Help.tsx                → Page d'aide
│   │   ├── Tutorial.tsx            → Guide complet d'utilisation
│   │   ├── NotFound.tsx            → 404
│   │   └── config/mockData.ts      → Données mock (non utilisées en prod)
│   │
│   └── hooks/
│       ├── use-mobile.tsx          → Hook responsive
│       └── use-toast.ts            → Hook toasts
│
├── server/
│   ├── store.ts                    → Store en mémoire (fake DB pour le dev)
│   └── routes/api/
│       ├── hello.get.ts            → Health check
│       ├── data.get.ts             → Données complètes (admin)
│       ├── org-config.get.ts       → Config org
│       ├── org-config.put.ts       → Update config org
│       ├── auth/
│       │   ├── login.post.ts       → Login (hash SHA256, cookie session)
│       │   ├── signup.post.ts      → Signup (hash SHA256, cookie session)
│       │   ├── session.get.ts      → Check session
│       │   └── session.delete.ts   → Logout
│       ├── transactions/
│       │   ├── get.ts              → List transactions (filtres query)
│       │   ├── post.ts             → Create transaction
│       │   ├── [id].get.ts         → Get transaction
│       │   ├── [id].put.ts         → Update transaction
│       │   ├── [id].delete.ts      → Delete transaction (REJECTED only)
│       │   └── [id]/action.post.ts → Approve/Reject transaction
│       └── events/
│           ├── get.ts              → List events
│           ├── post.ts             → Create event
│           ├── [id].put.ts         → Update event
│           └── [id].delete.ts      → Delete event
│
├── supabase/
│   ├── migrations/
│   │   ├── 0000_create_profiles_table.sql
│   │   ├── 0001_create_categories_table.sql
│   │   ├── 0002_create_org_units_table.sql
│   │   ├── 0003_create_transactions_table.sql
│   │   ├── 0004_create_audit_entries_table.sql
│   │   ├── 0005_create_helper_function_for_user_profile.sql
│   │   ├── 0006_create_admin_user_in_supabase_auth_with_confirmed_email.sql
│   │   ├── 0007_create_trigger_to_auto_insert_profile_on_signup.sql
│   │   ├── 0008_enable_realtime_and_rls_on_all_tables.sql
│   │   ├── 0009_open_rls_policies_for_unauthenticated_access.sql
│   │   ├── 0010_add_missing_timestamps_and_verify_rls.sql
│   │   ├── 0011_create_notifications_and_role_assignments_tables_with_rls_and_realtime.sql
│   │   ├── 0012_create_trigger_for_auto_notifications_and_cleanup_function.sql
│   │   ├── 0013_add_rls_policies_for_anon_role_on_role_assignments.sql
│   │   ├── 0014_add_rls_policies_for_anon_role_on_notifications.sql
│   │   ├── 0015_create_events_table_and_add_description_active_columns_to_org_units.sql
│   │   ├── 0016_add_event_id_and_source_columns_to_transactions_table.sql
│   │   ├── 0017_add_person_name_column_to_transactions_table.sql
│   │   ├── 0018_cr_er_la_table_caisses_et_ajouter_les_colonnes_source_caisse_id_et_versement_id_sur_transactions.sql
│   │   ├── 0019_create_profiles_table_with_rls_for_future_auth_support.sql
│   │   ├── 0020_create_rls_policies_for_profiles_table.sql
│   │   ├── 0021_add_budget_items_json_column_to_events_table.sql
│   │   └── 0022_add_budget_items_json_column_to_events_table_for_cloud_persistence.sql
│   └── functions/
│       ├── login/index.ts          → Edge function login (non utilisée par le frontend)
│       └── signup/index.ts         → Edge function signup (non utilisée par le frontend)
│
├── android/                          → Capacitor Android project
├── e2e-tests/                        → Playwright tests
├── public/                           → Assets statiques
│   ├── lumina-logo.png
│   ├── manifest.json
│   └── assets/
└── docs/
    └── dashboard-design.html         → Design dashboard (statique)
```

---

## 5. Feature Inventory

| Feature | Frontend | Backend | Local | Cloud | Sync | Status |
|---|---|---|---|---|---|---|
| **Finance (Transactions)** | ✅ Dashboard, Finance, TransactionNew/Edit/Detail, Balance | ✅ CRUD + action (approve/reject) | ✅ IndexedDB transactions store | ✅ transactions table | ✅ enqueue + realtime | **IMPLEMENTÉ** |
| **Bilan** | ✅ Balance.tsx | ❌ Pas de route spécifique | ✅ Calcul local | ❌ Pas de route | ❌ Non requis | **IMPLEMENTÉ** |
| **Grand Livre** | ✅ Finance.tsx (filterable list) | ✅ GET /api/transactions | ✅ IndexedDB | ✅ Supabase realtime | ✅ Enqueue + download | **IMPLEMENTÉ** |
| **Groupes (OrgUnits)** | ✅ Groups.tsx, GroupDetail.tsx | ✅ Store en mémoire (pas de routes CRUD) | ✅ orgUnits store | ✅ org_units table | ✅ Enqueue create/update/delete | **IMPLEMENTÉ** |
| **Caisses** | ✅ Dashboard, GroupDetail, Versement | ❌ Pas de route dédiée | ✅ caisses store | ✅ caisses table | ✅ Enqueue create/update/delete | **IMPLEMENTÉ** |
| **Versement** | ✅ Versement.tsx | ❌ Pas de route | ✅ 2 transactions créées | ✅ 2 insertions cloud | ✅ 2 enqueue + realtime | **IMPLEMENTÉ** |
| **Événements** | ✅ Events.tsx, EventNew.tsx, EventDetail.tsx | ✅ CRUD complet | ✅ events store | ✅ events table | ✅ Enqueue + realtime | **IMPLEMENTÉ** |
| **Budget événement** | ✅ EventNew (poste budgétaire), EventDetail (dépenser) | ❌ Pas de route budget | ✅ budgetItems dans event | ✅ budget_items JSONB | ✅ Via update event | **IMPLEMENTÉ** |
| **Liste de courses** | ✅ EventDetail (shoppingItems) | ❌ Pas de route | ✅ shoppingItems dans event | ✅ dans event JSON | ✅ Via update event | **IMPLEMENTÉ** |
| **Historique (Audit)** | ✅ History.tsx (filterable) | ❌ Pas de route | ✅ auditEntries store | ✅ audit_entries table | ✅ Enqueue insert + realtime | **IMPLEMENTÉ** |
| **Notifications** | ✅ Notifications.tsx (unread badge) | ❌ Pas de route | ✅ notifications store | ✅ notifications table | ✅ Enqueue insert + realtime | **IMPLEMENTÉ** |
| **Paramètres** | ✅ Settings.tsx | ❌ Route org-config | ✅ config store | ❌ Pas persisté | ❌ Local only | **IMPLEMENTÉ** |
| **PDF Export** | ✅ Finance.tsx, Balance.tsx | ❌ | ✅ Génération client-side | ❌ | ❌ | **IMPLEMENTÉ** |
| **Excel Export** | ✅ Finance.tsx, Balance.tsx | ❌ | ✅ Génération client-side | ❌ | ❌ | **IMPLEMENTÉ** |
| **CSV Export** | ✅ Finance.tsx, Balance.tsx | ❌ | ✅ Génération client-side | ❌ | ❌ | **IMPLEMENTÉ** |
| **Tutoriel** | ✅ Tutorial.tsx, Help.tsx | ❌ | ❌ | ❌ | ❌ | **IMPLEMENTÉ** |
| **Membres** | ❌ | ❌ | ❌ | ❌ | ❌ | **ABSENT** |
| **Archive** | ❌ | ❌ | ❌ | ❌ | ❌ | **ABSENT** |
| **Timeline** | ❌ (partiellement dans GroupDetail historique) | ❌ | ❌ | ❌ | ❌ | **PARTIEL** |
| **Auth utilisateur** | ✅ Login, RoleSelection, Onboarding | ✅ login.post, signup.post | ✅ sessionStorage cookie | ❌ (Supabase auth existe mais pas utilisé) | ❌ | **PARTIEL** |

---

## 6. Frontend Architecture

### 6.1 Structure React

L'application est une SPA classique avec React Router v6.

**EntryPoint :** `main.tsx` → `App.tsx` → `AppProvider` → `AppRoutes`

**Routeurs protégés :** Tous les chemins sauf `/login`, `/role-selection`, `/onboarding`, `/help`, `/tutoriel`, `/notifications` sont protégés par `ProtectedRoute` (vérifie `localStorage.lumina-role`).

**Navigation :**
- `TopHeader.tsx` : fixe en haut, logo + titre + bouton notifications + paramètres
- `BottomNav.tsx` : fixe en bas, 4 onglets principaux (Accueil, Finances, Groupes, Événements) + menu "Plus" (Paramètres, Bilan, Historique, Tutoriel)
- FAB (Floating Action Button) sur le dashboard pour créer une transaction rapidement

### 6.2 Store Zustand (`useLocalStore.ts`)

**Architecture :** Un seul store global Zustand avec `persist` middleware (sauvegarde du user dans localStorage).

**État :**
```ts
user: User
transactions: Transaction[]
categories: Category[] (9 prédéfinies, chargées depuis DB locale)
orgUnits: OrgUnit[] (5 prédéfinis)
caisses: Caisse[] (1 principale + 5 groupes, prédéfinis)
events: Event[]
auditEntries: any[]
notifications: NotificationItem[]
appConfig: AppConfig
isLoading: boolean
isOnline: boolean
```

**Actions (toutes async) :**
- `selectRole(role)` → écrit session + role dans localStorage + IndexedDB config
- `addTransaction(tx)` → génère ID, écrit local + queue sync + audit entry + notification PENDING
- `updateTransaction(id, data)` → écrit local + queue sync
- `deleteTransaction(id)` → supprime local + queue sync delete
- `batchDeleteTransactions(ids)` → supprime en lot
- `approveTransaction(id, userId)` → met à jour local + queue sync + audit entry + notification APPROVED
- `batchApproveTransactions(ids, userId)` → idem en lot
- `syncEventBudget(eventId)` → recalcul des spent par catégorie, notifications budget dépassé
- `addEvent(event)` → écrit local + queue sync
- `updateEvent(id, data)` → écrit local + queue sync
- `deleteEvent(id)` → cascade delete des transactions liées + écrit local + queue sync
- `updateEventStatus(id, status)` → écrit local + queue sync + notification
- `addBudgetItem/removeBudgetItem` → update event budgetItems + budget total
- `addShoppingItem/removeShoppingItem/updateShoppingItemStatus` → update event shoppingItems
- `createGroup(data)` → crée orgUnit + caisse (même ID) + écrit local + 2 queues sync
- `updateGroup(id, data)` → update orgUnit + caisse + écrit local + 2 queues sync
- `deleteGroup(id)` → cascade delete transactions groupe + écrit local + 4 queues sync
- `updateConfig(config)` → écrit local config
- `createNotification(notif)` → écrit local + queue sync
- `markNotificationRead/markAllNotificationsRead` → écrit local (pas de sync delete)
- `loadInitialData()` → lit tous les stores IndexedDB, initialise le state

### 6.3 Services et Libs

**`src/lib/db.ts`** — Wrapper IndexedDB :
- `openDB()` → `indexedDB.open('lumina-db', 9)`
- `withStore<T>(storeName, mode, fn)` → utilitaire transaction
- Méthodes : `get`, `getAll`, `put`, `delete`, `clear`
- Config : `getConfig`, `setConfig`
- Rôle : `getRoleAssignment`, `putRoleAssignment`, `setRole`
- Sync queue : `enqueueSync`, `getSyncQueue`, `removeSyncItem`, `updateSyncAttempt`
- Stores : `transactions`, `categories`, `orgUnits`, `auditEntries`, `events`, `syncQueue`, `config`, `caisses`, `notifications`

**`src/lib/sync.ts`** — Moteur de synchronisation :
- `enqueueSync(item)` → ajoute à la queue IndexedDB si en ligne
- `startBackgroundSync()` → cycle toutes les 30s, retry with backoff (1s→16s, max 5), cleanup items >24h
- `stopBackgroundSync()` → clearInterval
- `startRealtimeSubscriptions()` → 3 channels Supabase realtime (transactions, audit_entries, notifications)
- `stopRealtimeSubscriptions()` → removeChannel
- `setupNetworkListeners()` → écoute online/offline + visibilitychange
- Dedup notifications : check `source_transaction_id` + 60s window

**`src/lib/api.ts`** — Client REST vers Nitro server :
- Endpoints : auth (login/session/logout), transactions (CRUD + action)
- **Note : Ce client n'est PAS utilisé par les pages frontend.** Les pages utilisent directement `useLocalStore`. Le Nitro server sert uniquement au développement et aux API potentielles futures.

**`src/lib/export.ts`** — Génération de rapports :
- `exportPDF(options)` → jsPDF landscape A4, en-tête avec logo/nom église, tableau transactions
- `exportExcel(options)` → xlsx multi-feuilles (Résumé, Transactions, Par groupe)
- `exportCSV(options)` → CSV UTF-8 avec BOM, séparateur point-virgule
- Toutes les exports fonctionnent côté client, données depuis le store Zustand

**`src/lib/utils.ts`** — Utilitaires :
- `formatCurrencyCompact(cents)` → K/M compact (input: cents, output: string)
- `formatCentsToFCFA(cents)` → délégue à formatCurrencyCompact
- `formatCentsFull(cents)` → format numérique complet
- `formatDate(date)` → `d MMM yyyy` (locale fr)
- `formatDateTime(date)` → `d MMM yyyy à HH:mm` (locale fr)
- `getStatusLabel/getStatusColor` → mapping status → texte/couleur
- `getPeriodRange(period)` → {start, end} ISO pour filtre période
- `generateId()` → `Date.now().toString(36) + Math.random().toString(36).substr(2)`

### 6.4 Composants

| Composant | Rôle | Réutilisable |
|---|---|---|
| `TransactionCard` | Affiche une transaction (montant, description, date, catégorie, groupe, événement, statut) | ✅ Oui |
| `TopHeader` | Header fixe avec logo, titre, notifications, paramètres | ✅ Oui |
| `BottomNav` | Tab bar fixe avec 4 onglets + menu "Plus" | ✅ Oui |
| `StatusBadge` | Badge de statut coloré | ✅ Oui |
| `SyncIndicator` | Indicateur de connexion | ✅ Oui |
| `ConfirmModal` | Modal confirmation générique | ✅ Oui |
| `EmptyState` | État vide avec icône + CTA | ✅ Oui |
| `LuminaLogo` | Logo SVG | ✅ Oui |
| `LogoSpinner` | Spinner de chargement | ✅ Oui |
| `Skeleton` | Composants skeleton (PageSkeleton, CardSkeleton, etc.) | ✅ Oui |
| `BottomDrawer` | Drawer bottom générique | ✅ Oui |
| `ui/*` | ~40 composants shadcn/ui (button, dialog, select, etc.) | ✅ Génériques |

### 6.5 Pages (mapping route → fonctionnalité)

| Route | Page | Fonctionnalité |
|---|---|---|
| `/login` | Login.tsx | Entrée sans auth (nom + rôle) |
| `/role-selection` | RoleSelection.tsx | Choix rôle avec icônes |
| `/onboarding` | Onboarding.tsx | Carrousel 7 écrans |
| `/` | Dashboard.tsx | Vue d'ensemble (caisses, stats, events, tx récentes) |
| `/finance` | Finance.tsx | Grand livre (filtres, batch approve, recherche) |
| `/transaction/new` | TransactionNew.tsx | Formulaire création |
| `/transaction/:id` | TransactionDetail.tsx | Détail + approuver/rejeter |
| `/transaction/:id/edit` | TransactionEdit.tsx | Édition (DRAFT/REJECTED) |
| `/balance` | Balance.tsx | Bilan par période + export |
| `/groups` | Groups.tsx | Liste + CRUD groupes |
| `/groups/:id` | GroupDetail.tsx | Détail groupe (solde, tx, versement) |
| `/events` | Events.tsx | Liste événements |
| `/event/new` | EventNew.tsx | Formulaire création + budget |
| `/event/:id` | EventDetail.tsx | Détail + tabs (overview/budget/tx) |
| `/versement` | Versement.tsx | Transfert groupe → caisse principale |
| `/history` | History.tsx | Historique d'actions (audit) |
| `/notifications` | Notifications.tsx | Center notifications |
| `/settings` | Settings.tsx | Configuration église |
| `/help` | Help.tsx | Page d'aide |
| `/tutoriel` | Tutorial.tsx | Guide complet (8 sections) |

---

## 7. Backend Architecture

### 7.1 Stack Backend

- **Moteur :** Nitro (framework serverless/Node.js)
- **Point d'entrée :** `server/routes/api/`
- **Runtime config :** `server/store.ts` (store en mémoire)
- **Base de données serveur :** Aucune (store en mémoire, données mock)
- **Client Supabase côté serveur :** Non utilisé dans les routes (le store.ts est purement en mémoire)

### 7.2 Cartographie des Routes

| Méthode | Chemin | Input | Validation | Business Logic | DB Read | DB Write | Sync Side Effect | Response |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/hello` | — | — | — | — | — | — | `{ message: "Hello..." }` |
| GET | `/api/data` | — | — | — | store | — | — | `{ ok, user, transactions, categories, orgUnits, events }` |
| GET | `/api/org-config` | — | — | — | store | — | — | `{ ok, config }` |
| PUT | `/api/org-config` | body | required name/logoUrl | — | store | store | — | `{ ok }` |
| POST | `/api/auth/login` | email, password | required, SHA256 check | auth | store.users | store.users (session) | — | `{ ok, user, sessionToken }` |
| POST | `/api/auth/signup` | firstName, lastName, email, password | required | auth | store.users | store.users | — | `{ ok, user, sessionToken }` |
| GET | `/api/auth/session` | cookie | — | — | — | — | — | `{ ok, authenticated, user }` |
| DELETE | `/api/auth/session` | cookie | — | — | — | — | — | `{ ok }` |
| GET | `/api/transactions` | query: status, type, categoryId, startDate, endDate | optional filters | enrich relations | store | — | — | `{ ok, transactions }` |
| POST | `/api/transactions` | body | required: type, amount, description, date, categoryId, status | creates tx | store | store | — | `{ ok, transaction }` |
| GET | `/api/transactions/:id` | route param | id required | enrich relations | store | — | — | `{ ok, transaction }` |
| PUT | `/api/transactions/:id` | route param + body | id required, allowed fields list | version increment | store | store | — | `{ ok, transaction }` |
| DELETE | `/api/transactions/:id` | route param | id required, status must be REJECTED | — | store | store | — | `{ ok }` |
| POST | `/api/transactions/:id/action` | id + {action, comment} | id required, action APPROVE/REJECT | status validation | store | store | — | `{ ok, transaction }` |
| GET | `/api/events` | — | — | — | store | — | — | `{ ok, events }` |
| POST | `/api/events` | body | required: name, startDate, budget | creates event | store | store | — | `{ ok, event }` |
| PUT | `/api/events/:id` | id + body | id required, allowed fields | version update | store | store | — | `{ ok, event }` |
| DELETE | `/api/events/:id` | id | id required | — | store | store | — | `{ ok }` |

**Observations critiques :**
1. **Le store serveur est en mémoire** (`server/store.ts`) — les données persistent uniquement pendant le processus Node.js. Un restart efface tout.
2. **Les routes ne touchent PAS Supabase** — elles opèrent uniquement sur le store en mémoire.
3. **Le client frontend n'utilise PAS ces routes** — toutes les opérations CRUD passent par IndexedDB + sync Supabase directement.
4. **Double validation des champs** — les routes ont des validations `required` mais pas de zod/schema.
5. **Delete transaction** — uniquement si `status === 'REJECTED'`. Pas de cascade delete.
6. **Pas de gestion d'erreurs structurée** — utilisation basique de `createError` de Nitro.

### 7.3 Regles Métier dans les Routes

- **Transaction workflow :** DRAFT → PENDING → APPROVED ou REJECTED
- **Approval :** uniquement si status === 'PENDING'
- **Rejet :** uniquement si status === 'PENDING', commentaire obligatoire
- **Delete :** uniquement si status === 'REJECTED'
- **Budget événement :** calculé depuis `budgetItems[].allocated` (pas vérifié lors de la création)
- **Versement :** crée 2 transactions liées par `versementId` (côté frontend uniquement)

### 7.4 Double Écritures Identifiées

1. **Frontend écrit dans IndexedDB + enqueue sync** → le sync engine écrit dans Supabase
2. **Server routes écrivent dans le store en mémoire** → jamais synchronisé avec Supabase
3. **Notifications :** créées par le frontend (IndexedDB) ET par le trigger Supabase (`notify_transaction_change`) → déduplication côté frontend
4. **Audit entries :** créés uniquement côté frontend (IndexedDB), jamais dans la DB cloud (pas de trigger correspondants)

---

## 8. Database Schema

### 8.1 Tables Supabase (réelles)

**`public.transactions`**
| Colonne | Type | Nullable | Default | PK | FK |
|---|---|---|---|---|---|
| id | TEXT | NO | — | ✅ | — |
| org_id | TEXT | NO | 'org-1' | — | — |
| type | TEXT | NO | — | — | CHECK: 'INCOME' \| 'EXPENSE' |
| amount | BIGINT | NO | — | — | — |
| description | TEXT | NO | — | — | — |
| date | DATE | NO | — | — | — |
| status | TEXT | NO | 'DRAFT' | — | CHECK: 'DRAFT','PENDING','APPROVED','REJECTED' |
| category_id | TEXT | NO | — | — | → categories(id) |
| org_unit_id | TEXT | YES | — | — | → org_units(id) |
| compensates_for | TEXT | YES | — | — | → transactions(id) |
| comment | TEXT | YES | — | — | — |
| version | INTEGER | NO | 1 | — | — |
| created_by_id | UUID | YES | — | — | → auth.users(id) |
| approved_by_id | UUID | YES | — | — | → auth.users(id) |
| created_at | TIMESTAMPTZ | YES | NOW() | — | — |
| updated_at | TIMESTAMPTZ | YES | NOW() | — | — |
| approved_at | TIMESTAMPTZ | YES | — | — | — |
| event_id | TEXT | YES | — | — | — |
| source | TEXT | YES | — | — | — |
| person_name | TEXT | YES | — | — | — |
| source_caisse_id | TEXT | YES | — | — | — |
| versement_id | TEXT | YES | — | — | — |

**`public.categories`**
| Colonne | Type | Nullable | Default | PK |
|---|---|---|---|---|
| id | TEXT | NO | — | ✅ |
| key | TEXT | NO | — | — |
| label_fr | TEXT | NO | — | — |
| type | TEXT | NO | — | CHECK: 'INCOME' \| 'EXPENSE' |
| org_id | TEXT | NO | 'org-1' | — |
| created_at | TIMESTAMPTZ | YES | NOW() | — |

**`public.org_units`**
| Colonne | Type | Nullable | Default | PK |
|---|---|---|---|---|
| id | TEXT | NO | — | ✅ |
| name | TEXT | NO | — | — |
| type | TEXT | NO | 'groupe' | — |
| org_id | TEXT | NO | 'org-1' | — |
| created_at | TIMESTAMPTZ | YES | NOW() | — |
| description | TEXT | YES | '' | — |
| is_active | BOOLEAN | YES | true | — |

**`public.events`**
| Colonne | Type | Nullable | Default | PK |
|---|---|---|---|---|
| id | TEXT | NO | — | ✅ |
| org_id | TEXT | NO | 'org-1' | — |
| name | TEXT | NO | — | — |
| description | TEXT | YES | '' | — |
| start_date | TEXT | NO | — | — |
| end_date | TEXT | YES | — | — |
| status | TEXT | NO | 'PLANIFIED' | — |
| budget | BIGINT | NO | 0 | — |
| created_at | TIMESTAMPTZ | YES | NOW() | — |
| updated_at | TIMESTAMPTZ | YES | NOW() | — |
| budget_items | JSONB | YES | '[]' | — |

**`public.caisses`**
| Colonne | Type | Nullable | Default | PK |
|---|---|---|---|---|
| id | TEXT | NO | — | ✅ |
| name | TEXT | NO | — | — |
| description | TEXT | YES | — | — |
| type | TEXT | NO | — | CHECK: 'MAIN' \| 'GROUP' |
| color | TEXT | YES | — | — |
| org_id | TEXT | NO | — | — |
| created_at | TIMESTAMPTZ | YES | NOW() | — |
| updated_at | TIMESTAMPTZ | YES | NOW() | — |

**`public.audit_entries`**
| Colonne | Type | Nullable | Default | PK |
|---|---|---|---|---|
| id | TEXT | NO | — | ✅ |
| org_id | TEXT | NO | 'org-1' | — |
| transaction_id | TEXT | NO | — | → transactions(id) |
| user_id | UUID | YES | — | → auth.users(id) |
| action | TEXT | NO | — | — |
| entity_type | TEXT | NO | 'transaction' | — |
| entity_id | TEXT | NO | — | — |
| comment | TEXT | YES | — | — |
| created_at | TIMESTAMPTZ | YES | NOW() | — |

**`public.notifications`**
| Colonne | Type | Nullable | Default | PK |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | ✅ |
| org_id | TEXT | NO | 'org-1' | — |
| action_type | TEXT | NO | — | — |
| title | TEXT | NO | — | — |
| message | TEXT | NO | — | — |
| is_read | BOOLEAN | YES | false | — |
| source_transaction_id | TEXT | YES | — | — |
| created_at | TIMESTAMPTZ | YES | NOW() | — |

**`public.role_assignments`**
| Colonne | Type | Nullable | Default | PK |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | ✅ |
| session_id | TEXT | NO | — | UNIQUE |
| role | TEXT | NO | — | CHECK: 6 rôles |
| org_id | TEXT | NO | 'org-1' | — |
| created_at | TIMESTAMPTZ | YES | NOW() | — |

**`public.profiles`**
| Colonne | Type | Nullable | Default | PK |
|---|---|---|---|---|
| id | UUID | NO | — | ✅ FK auth.users |
| first_name | TEXT | YES | — | — |
| last_name | TEXT | YES | — | — |
| avatar_url | TEXT | YES | — | — |
| updated_at | TIMESTAMPTZ | YES | NOW() | — |

### 8.2 Indexes

| Index | Table | Colonne | Type |
|---|---|---|---|
| transactions_pkey | transactions | id | UNIQUE btree |
| idx_transactions_source_caisse_id | transactions | source_caisse_id | btree |
| idx_transactions_versement_id | transactions | versement_id | btree |
| categories_pkey | categories | id | UNIQUE btree |
| org_units_pkey | org_units | id | UNIQUE btree |
| events_pkey | events | id | UNIQUE btree |
| caisses_pkey | caisses | id | UNIQUE btree |
| idx_caisses_org_id | caisses | org_id | btree |
| audit_entries_pkey | audit_entries | id | UNIQUE btree |
| notifications_pkey | notifications | id | UNIQUE btree |
| role_assignments_pkey | role_assignments | id | UNIQUE btree |
| role_assignments_session_id_key | role_assignments | session_id | UNIQUE btree |
| profiles_pkey | profiles | id | UNIQUE btree |

### 8.3 Constraints

**CHECK constraints :**
- `transactions.type` IN ('INCOME', 'EXPENSE')
- `transactions.status` IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')
- `caisses.type` IN ('MAIN', 'GROUP')
- `events.status` IN ('PLANIFIED', 'ONGOING', 'COMPLETED', 'CANCELLED')
- `role_assignments.role` IN ('PASTEUR', 'SECRETAIRE', 'TREASURIER', 'COMPTABLE', 'TREASURIER_ADJOINT', 'SECRETAIRE_ADJOINT')

**FOREIGN KEY constraints :**
- `transactions.category_id` → `categories(id)`
- `transactions.org_unit_id` → `org_units(id)`
- `transactions.compensates_for` → `transactions(id)` (self-reference)
- `transactions.created_by_id` → `auth.users(id)`
- `transactions.approved_by_id` → `auth.users(id)`
- `audit_entries.transaction_id` → `transactions(id)`
- `audit_entries.user_id` → `auth.users(id)`
- `profiles.id` → `auth.users(id)` (CASCADE DELETE)

### 8.4 Triggers

| Trigger | Table | Event | Function |
|---|---|---|---|
| `on_transaction_change` | transactions | INSERT, UPDATE, DELETE | `notify_transaction_change()` |

**Fonction `notify_transaction_change()` :**
- Crée une notification dans `public.notifications` pour tout changement de statut autre que DRAFT
- Action types : TRANSACTION_SUBMITTED, TRANSACTION_DRAFT, TRANSACTION_APPROVED, TRANSACTION_REJECTED, TRANSACTION_DELETED, TRANSACTION_UPDATED
- Ne créer PAS de notification pour DRAFT (dans IF condition)

**Fonction `cleanup_old_notifications()` :**
- Supprime les notifications older than 30 days
- **Non attachée à un trigger** — fonction orphan

### 8.5 RLS Policies

Toutes les tables ont RLS enabled avec des policies **"open"** (using true / with check true) pour le rôle `anon` (0) ou `authenticated` (16485).

**Table `transactions` :** open_select, open_insert, open_update, open_delete (anon + authenticated)
**Table `categories` :** open_cat_select, open_cat_insert, open_cat_update, categories_delete (authenticated)
**Table `org_units` :** open_ou_select, open_ou_insert, open_ou_update, org_units_delete, org_units_open_all
**Table `events` :** events_open_all (tout pour anon + authenticated)
**Table `caisses` :** caisses_select, caisses_insert, caisses_update, caisses_delete
**Table `audit_entries` :** open_audit_select, open_audit_insert (anon + authenticated)
**Table `notifications` :** notifications_select, notifications_insert, notifications_update (avec politiques anon + authenticated)
**Table `role_assignments` :** role_assignments_select, role_assignments_insert, role_assignments_update (avec politiques anon + authenticated)
**Table `profiles` :** profiles_select_policy, profiles_insert_policy, profiles_update_policy, profiles_delete_policy

---

## 9. Entity Relationship Map

```
org-1 ( Organisation implicite, hardcoded dans le code)
│
├─── categories (9 prédéfinies)
│       │
│       └─── transactions[categoryId] ── FK
│
├─── org_units (5 prédéfinis)
│       │
│       ├─── transactions[orgUnitId] ── FK
│       │
│       └─── caisses[id] (même ID que orgUnit) ── Corrélation par ID (pas FK)
│
├─── transactions (liens multiples)
│       │
│       ├─── org_units[orgUnitId] ── FK
│       ├─── categories[categoryId] ── FK
│       ├─── transactions[compensatesFor] ── FK self
│       ├─── events[eventId] ── (champ event_id, pas FK)
│       ├─── audit_entries[transactionId] ── FK
│       └─── notifications[sourceTransactionId] ── (champ text, pas FK)
│
├─── events (budget_items JSONB, pas de relation FK)
│       │
│       └─── transactions[eventId] ── (champ text, pas FK)
│
├─── caisses (corrélation avec org_units par ID)
│       │
│       └─── transactions[sourceCaisseId] ── (champ text, pas FK)
│
├─── audit_entries (liens vers transactions)
│       │
│       └─── transactions[transactionId] ── FK
│
├─── notifications (liens vers transactions)
│       │
│       └─── transactions[sourceTransactionId] ── (champ text, pas FK)
│
└─── role_assignments (session-based)
        └─── session_id ( UNIQUE )
```

**Relations documentées mais inexistantes :**
- `transactions.orgUnit` → `orgUnitId` est un champ TEXT, pas de FK vers `org_units` (seulement dans les types TS)
- `transactions.event` → `eventId` est un champ TEXT, pas de FK vers `events`
- `transactions.sourceCaisse` → `sourceCaisseId` est un champ TEXT, pas de FK vers `caisses`
- `notifications.sourceTransactionId` → TEXT, pas de FK vers `transactions`
- `audit_entries.transaction_id` → FK vers `transactions(id)` ✅ (réelle)

---

## 10. Local Storage (IndexedDB)

### Moteur
- **Nom :** `lumina-db`
- **Version :** 9
- **API :** Web IndexedDB (pas de library wrapper)
- **Accès :** Direct via `idb` API native, encapsulée dans `db.ts`

### Stores (9)
| Store | Clé primaire | Contenu | Mis à jour par |
|---|---|---|---|
| `transactions` | `id` | Transactions utilisateur | `useLocalStore` → `db.put` |
| `categories` | `id` | 9 catégories prédéfinies | `useLocalStore` → `db.put` |
| `orgUnits` | `id` | Groupes organisationnels | `useLocalStore` → `db.put` |
| `caisses` | `id` | Caisses (principale + groupes) | `useLocalStore` → `db.put` |
| `events` | `id` | Événements + budgetItems JSON | `useLocalStore` → `db.put` |
| `auditEntries` | `id` | Historique d'actions | `useLocalStore` → `db.put` |
| `notifications` | `id` | Notifications | `useLocalStore` + Supabase realtime |
| `syncQueue` | `id` | Ops en attente de sync | `sync.ts` → `db.put` |
| `config` | `key` (non auto) | Config app + rôle sélectionné | `useLocalStore` → `db.setConfig` |

### Migration IndexedDB (v8 → v9)
```typescript
// Dans onupgradeneeded :
if (!db.objectStoreNames.contains('events')) {
  db.createObjectStore('events', { keyPath: 'id' });
}
// Puis création de tous les autres stores si inexistants
```
Note : La migration v9 n'ajoute PAS de colonne `budget_items` à `events` — cela est géré côté Supabase (migration 0021).

### Structure des données

**transactions :** objet complet `Transaction` (id, orgId, type, amount, description, date, status, categoryId, orgUnitId, eventId, sourceCaisseId, versementId, version, etc.)

**categories :** objet `Category` (id, key, labelFr, type, orgId)

**orgUnits :** objet `OrgUnit` (id, name, type, description, orgId, isActive)

**caisses :** objet `Caisse` (id, name, description, type, color, orgId, createdAt, updatedAt)

**events :** objet `Event` (id, orgId, name, description, startDate, endDate, status, budget, budgetItems[], shoppingItems[], createdAt, updatedAt)

**auditEntries :** objet `AuditEntry` (id, orgId, transactionId, userId, action, entityType, entityId, previousValue, newValue, comment, createdAt)

**notifications :** objet `NotificationItem` (id, orgId, actionType, title, message, isRead, sourceTransactionId, createdAt)

**syncQueue :** objet `SyncQueueItem` (id, operation, entityType, entityId, payload, attempts, lastAttempt, createdAt)

**config :** objet `{ key: string, value: any }` (clés : 'appConfig', 'selectedRole', 'role_{sessionId}')

---

## 11. Cloud Storage (Supabase)

### Fournisseur
- **URL :** `https://hhgovvrnalibhgpakswi.supabase.co`
- **Client :** `@supabase/supabase-js` v2.114.0
- **Clé publique :** `sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh`

### Tables
8 tables : `transactions`, `categories`, `org_units`, `events`, `audit_entries`, `caisses`, `notifications`, `role_assignments` (+ `profiles` pour auth future)

### Politiques RLS
- **Transactions :** open (tous les rôles)
- **Categories :** open select/insert/update, delete authenticated only
- **OrgUnits :** open
- **Events :** open (anon + authenticated)
- **Caisses :** authenticated only (pas anon)
- **AuditEntries :** open
- **Notifications :** open (anon + authenticated)
- **RoleAssignments :** open (anon + authenticated)
- **Profiles :** authenticated only (users themselves)

### Realtime
- **Publications :** `supabase_realtime` inclut `transactions`, `notifications`, `role_assignments`
- **Audit entries :** subscription manuelle dans `sync.ts` (channel 'audit-changes'), mais pas dans la publication Supabase (pas de realtime natif pour cette table)
- **Caisses :** pas de realtime (pas de publication)
- **Events :** pas de realtime (pas de publication)
- **OrgUnits :** pas de realtime (pas de publication)

### Triggers
- **`on_transaction_change`** sur `transactions` (INSERT/UPDATE/DELETE) → appelle `notify_transaction_change()`
- **Pas de trigger** sur `audit_entries` (les entries sont créées côté frontend)
- **Pas de trigger** sur `notifications` pour le cleanup (fonction `cleanup_old_notifications` existe mais n'est pas appelée automatiquement)

### Authentification
- **Supabase Auth** est configuré (migrations 0006, 0007)
- **Edge functions** `login` et `signup` existent dans `supabase/functions/`
- **Mais l'application N'utilise PAS Supabase Auth** — elle utilise un système de session local (localStorage + cookies Nitro)
- **Table `profiles`** existe mais n'est pas peuplée (pas de trigger sur auth.users car pas d'auth réelle)

---

## 12. Local ↔ Cloud Synchronization

### 12.1 Mécanisme général

```
[CRÉATION/UPDATE/DELETE locale]
        │
        ▼
  IndexedDB (db.put)
        │
        ├──► Zustand state update (set)
        │
        └──► Sync Queue (enqueueSync)
                    │
                    ▼
          Background Sync (toutes les 30s)
                    │
                    ├──► Retry with backoff (1s→2s→4s→8s→16s)
                    │
                    ├──► Supabase.from(table).insert/update/delete
                    │
                    ├──► Supabase Realtime (transactions)
                    │
                    ├──► Supabase Realtime (notifications)
                    │
                    └──► Cleanup queue items (failed > 5 retries OR > 24h)
```

### 12.2 Entité par entité

| Entité | Local | Cloud | Mapping | Direction | Sync Trigger | Conflict |
|---|---|---|---|---|---|---|
| **Transaction** | IndexedDB `transactions` | `transactions` | 1:1 par `id` | Local→Cloud (enqueue) + Cloud→Local (realtime) | CRUD local | **AUCUN** — pas de résolution de conflit |
| **Category** | IndexedDB `categories` | `categories` | 1:1 par `id` | Local→Cloud (enqueue) | CRUD local | **AUCUN** — statique |
| **OrgUnit** | IndexedDB `orgUnits` | `org_units` | 1:1 par `id` | Local→Cloud (enqueue) | CRUD local | **AUCUN** — pas de realtime |
| **Caisse** | IndexedDB `caisses` | `caisses` | 1:1 par `id` | Local→Cloud (enqueue) | CRUD local | **AUCUN** — pas de realtime |
| **Event** | IndexedDB `events` | `events` | 1:1 par `id` | Local→Cloud (enqueue) | CRUD local | **AUCUN** — pas de realtime |
| **AuditEntry** | IndexedDB `auditEntries` | `audit_entries` | 1:1 par `id` | Local→Cloud (enqueue) + Cloud→Local (realtime) | CRUD local | **AUCUN** — en lecture seule côté cloud |
| **Notification** | IndexedDB `notifications` | `notifications` | 1:1 par `id` | Local→Cloud (enqueue) + Cloud→Local (realtime) | CRUD local + Trigger DB | **DEDUP** par `source_transaction_id` + 60s window |
| **Config** | IndexedDB `config` | ❌ | — | Local only | — | — |

### 12.3 Flux détaillé : LOCAL CREATE → QUEUE → SYNC → CLOUD

```
1. Utilisateur clique "Enregistrer" sur TransactionNew.tsx
2. handleSubmit() appelle addTransaction() dans useLocalStore
3. addTransaction() :
   a. Génère ID avec generateId()
   b. Crée objet Transaction complet
   c. set({ transactions: updated }) → reactive state update
   d. db.put('transactions', newTx) → IndexedDB write
   e. enqueueSync({ operation: 'create', entityType: 'transactions', entityId: id, payload: newTx })
   f. db.put('auditEntries', { action: 'CREATED', ... }) → audit entry local
   g. Si status === 'PENDING' : db.put('notifications', notif) + enqueueSync notification
4. Background sync (toutes les 30s) lit la queue
5. Pour chaque item pending :
   a. syncWithBackoff() → supabase.from('transactions').insert(payload)
   b. db.removeSyncItem(item.id)
6. Supabase trigger `on_transaction_change` crée une notification cloud
7. Realtime subscription `notifications-changes` détecte l'insertion
8. Dedup check → si nouveau, db.put('notifications', notif)
```

### 12.4 Flux détaillé : CLOUD UPDATE → DOWNLOAD → LOCAL MERGE

```
1. Transaction modifiée sur Supabase (par un autre appareil ou API directe)
2. Supabase realtime publie l'événement
3. Realtime subscription `transactions-changes` dans sync.ts reçoit le payload
4. Si eventType === 'INSERT' ou 'UPDATE' : db.put('transactions', newTx)
5. Zustand state se met à jour automatiquement (pas d'action explicite)
6. L'interface utilisateur se rafraîchit via React re-render
```

**Note importante :** Il n'y a **aucune logique de résolution de conflit**. La dernière écriture gagne (last-write-wins). Si deux appareils modifient la même transaction simultanément, la dernière sync réussie écrase l'autre.

### 12.5 Gestion hors ligne

- **Création locale :** Les opérations CRUD locales fonctionnent toujours. IndexedDB est la source de vérité.
- **Sync queue :** Les opérations sont mises en file d'attente avec `attempts: 0`.
- **Au retour en ligne :** `setupNetworkListeners` détecte l'événement `online`, lance `startBackgroundSync()` et `startRealtimeSubscriptions()`.
- **Retry avec backoff :** Chaque tentative échouée incrémente `attempts`. Backoff exponentiel : 1s, 2s, 4s, 8s, 16s. Max 5 retries.
- **Cleanup automatique :** Items avec `attempts >= 5` OU `createdAt > 24h` sont supprimés de la queue.
- **Realtime hors ligne :** Les subscriptions sont stoppées (`stopRealtimeSubscriptions()`).

---

## 13. ID Strategy

### 13.1 Génération côté client

```typescript
// src/lib/utils.ts
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
```

**Format :** `1xyz2abc` (base36 de timestamp + random string)
**Exemple :** `1p8xk2m` → unique à ~milliseconde près, combiné avec random.

**Utilisé pour :**
- Transactions (`tx.id`)
- Events (`ev.id`)
- Categories (hardcoded `cat-dime`, etc.)
- OrgUnits (hardcoded `org-diactes`, etc.)
- Caisses (hardcoded `main`, `org-diactes`, etc.)
- Notifications (`notifId`)
- Sync queue items (`sync-${id}`, `sync-notif-${notifId}`)
- Versement IDs (`versementId + '_src'`, `versementId + '_tgt'`)

### 13.2 ID côté cloud

**UUID** pour les notifications (`gen_random_uuid()`) et role_assignments (`gen_random_uuid()`).

### 13.3 Mapping local ↔ cloud

| Entité | ID local | ID cloud | Mapping |
|---|---|---|---|
| Transaction | `generateId()` (string base36) | Même string | **Pas de mapping** — même ID utilisé des deux côtés |
| Event | `generateId()` | Même string | **Pas de mapping** |
| Category | hardcoded `cat-*` | Même string | **Pas de mapping** |
| OrgUnit | hardcoded `org-*` | Même string | **Pas de mapping** |
| Caisse | hardcoded `main`, `org-*` | Même string | **Pas de mapping** |
| Notification | `generateId()` (UUID format) | `gen_random_uuid()` | **Pas de mapping** — IDs différents si créé par frontend vs trigger |
| AuditEntry | `generateId()` | `generateId()` (côté frontend uniquement) | **Pas de mapping cloud** — audit_entries ne sont pas syncés |
| SyncQueue | `sync-${id}` | N/A | Local only |

**Problème critique :** Les notifications créées par le trigger Supabase ont un ID UUID généré par `gen_random_uuid()`, tandis que celles créées par le frontend ont un ID généré par `generateId()` (base36). Le dedup par `source_transaction_id` + 60s window gère ce conflit.

---

## 14. Finance

### 14.1 Cycle de vie d'une transaction

```
[Création]
  ↓
  TransactionNew.tsx → addTransaction()
  ↓
  Local : IndexedDB + Zustand
  ↓
  Auto-status : INCOME → 'DRAFT', EXPENSE → 'PENDING'
  ↓
  Audit entry créé (CREATED)
  ↓
  Notification créée (TRANSACTION_PENDING si PENDING)
  ↓
  Sync queue → Supabase insert
  ↓
  [Soumission — NON IMPLÉMENTÉ]
  (Aucun bouton "Soumettre" n'existe dans TransactionNew)
  ↓
  [Approbation]
  ↓
  TransactionDetail.tsx → approveTransaction(id, userId)
  ↓
  Local : status = 'APPROVED', approvedById, approvedAt
  ↓
  Audit entry créé (APPROVED)
  ↓
  Notification créée (TRANSACTION_APPROVED)
  ↓
  Sync queue → Supabase update
  ↓
  Si eventId : syncEventBudget() → recalcul des spent par catégorie
  ↓
  [Rejet]
  ↓
  TransactionDetail.tsx → updateTransaction(id, { status: 'REJECTED', comment })
  ↓
  Local : status = 'REJECTED'
  ↓
  ❌ Pas d'audit entry créé pour le rejet (bug)
  ❌ Pas de notification créée pour le rejet
  ↓
  Sync queue → Supabase update
  ↓
  [Suppression — uniquement pour REJECTED]
  ↓
  TransactionDetail.tsx → deleteTransaction(id)
  ↓
  Local : supprimée de IndexedDB + Zustand
  ↓
  Sync queue → Supabase delete
  ↓
  [Immuable]
  ↓
  APPROVED : ne peut pas être modifiée ni supprimée
```

### 14.2 Dépendances Finance

| Dépendance | Type | Description |
|---|---|---|
| Categories | 🔴 Critique | Chaque transaction doit avoir un categoryId |
| OrgUnits | 🟡 Moyen | Optionnel, lié par orgUnitId |
| Events | 🟡 Moyen | Optionnel, lié par eventId |
| Caisses | 🔴 Critique | Chaque transaction a un sourceCaisseId |
| Versement | 🟡 Moyen | Versement crée 2 transactions liées |
| Audit | 🟡 Moyen | Audit entries liés par transactionId |
| Notifications | 🟡 Moyen | Notifications liées par sourceTransactionId |
| Budget | 🟡 Moyen | syncEventBudget relie transactions approuvées aux budgetItems |

### 14.3 Calculs financiers

**Dashboard (caisse principale) :**
- `netResult` = somme(INCOME approved) - somme(EXPENSE approved) du mois courant
- `totalIncome` = somme des entrées approuvées du mois
- `totalExpense` = somme des dépenses approuvées du mois

**Caisse groupe (GroupDetail) :**
- `balance` = somme(INCOME approved) - somme(EXPENSE approved) de la caisse
- `pendingAmount` = somme des entrées - sorties en attente

**Versement :**
- Crée 2 transactions :
  - Source : EXPENSE, sourceCaisseId = groupe, versementId = shared
  - Target : INCOME, sourceCaisseId = 'main', versementId = shared
- Montant en cents (×100)

**Budget événement :**
- `syncEventBudget(eventId)` calcule les `spent` par catégorie à partir des transactions approuvées liées
- Formule : `newSpent = (incomeByCategory - expenseByCategory) / 100` (conversion cents→FCFA puis reverse)
- **Bug :** la formule divise par 100 puis multiplie par 100, ce qui est redondant et peut causer des arrondis incorrects

### 14.4 Exports

- **PDF :** jsPDF landscape A4, en-tête avec logo/nom église, tableau de transactions, footer avec page number
- **Excel :** xlsx multi-feuilles (Résumé, Transactions, Par groupe), colonnes adaptatives
- **CSV :** UTF-8 BOM, séparateur point-virgule, échappement des guillemets

---

## 15. Groups (Groupes)

### 15.1 Modèle

Un groupe est représenté par **deux entités corrélées** :
- `OrgUnit` (table `org_units`) : entité organisationnelle
- `Caisse` (table `caisses`) : entité financière liée

**Corrélation par ID :** `orgUnit.id === caisse.id`. Pas de Foreign Key.

### 15.2 CRUD

| Opération | Frontend | Backend | Local | Cloud |
|---|---|---|---|---|
| Create | Groups.tsx → createGroup() | ❌ Pas de route | ✅ IndexedDB | ✅ Enqueue insert |
| Read | Groups.tsx → loadInitialData() | ✅ GET /api/data | ✅ IndexedDB | ✅ Realtime non implémenté |
| Update | Groups.tsx → updateGroup() | ✅ PUT /api/org-config | ✅ IndexedDB | ✅ Enqueue update |
| Delete | Groups.tsx → deleteGroup() | ❌ Pas de route DELETE | ✅ IndexedDB | ✅ Enqueue delete |

### 15.3 Cascade delete

**Suppression d'un groupe :**
1. `deleteGroup(id)` dans useLocalStore
2. Trouve toutes les transactions avec `sourceCaisseId === id`
3. Pour chaque transaction : `deleteTransaction(tx.id)` (cascade)
4. Supprime l'orgUnit et la caisse de IndexedDB
5. Enqueue sync delete pour orgUnit, caisse, et toutes les transactions

**Limitation :** Le cascade delete des transactions n'est PAS implémenté dans Supabase (pas de ON DELETE CASCADE sur `org_units`). Les suppressions sont gérées manuellement par l'application.

### 15.4 Dépendances

- **Transactions** : chaque transaction a un `sourceCaisseId` qui pointe vers une caisse groupe
- **Versement** : les versements viennent des caisses groupe
- **Dashboard** : les caisses groupe sont affichées sur le dashboard

---

## 16. Events (Événements)

### 16.1 Modèle

```typescript
Event {
  id: string
  orgId: string
  name: string
  description: string
  startDate: string    // format: YYYY-MM-DD
  endDate: string | null
  status: 'PLANIFIED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
  budget: number       // total en cents
  budgetItems: BudgetItem[]
  shoppingItems: ShoppingItem[]
  createdAt: string
  updatedAt: string
}

BudgetItem {
  id: string
  label: string
  allocated: number    // en cents
  spent: number        // en cents
  fundedBy: 'main' | string   // ID de la caisse
  categoryId?: string
  isCustom?: boolean
}

ShoppingItem {
  id: string
  label: string
  quantity: number
  unitPrice: number
  total: number
  status: 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'
  supplier?: string
  notes?: string
}
```

### 16.2 CRUD

| Opération | Frontend | Backend | Local | Cloud |
|---|---|---|---|---|
| Create | EventNew.tsx → addEvent() | ✅ POST /api/events | ✅ IndexedDB | ✅ Enqueue insert |
| Read | Events.tsx → loadInitialData() | ✅ GET /api/events | ✅ IndexedDB | ❌ Pas de realtime |
| Update | EventDetail.tsx → updateEvent() | ✅ PUT /api/events/:id | ✅ IndexedDB | ✅ Enqueue update |
| Delete | EventDetail.tsx → deleteEvent() | ✅ DELETE /api/events/:id | ✅ IndexedDB | ✅ Enqueue delete |

### 16.3 Budget Tracking

**Approche actuelle :**
- Les `budgetItems` sont stockés dans `Event.budgetItems` (JSONB dans la DB cloud)
- Lorsqu'une transaction est approuvée avec `eventId`, `syncEventBudget()` recalcul les `spent` par catégorie
- Formule : `spent = incomeByCategory - expenseByCategory` (par categoryId du budgetItem)
- **Bug :** le calcul divide par 100 puis multiplie par 100, ce qui peut causer des arrondis

**Limitations :**
- Pas de validation avant dépassement de budget lors de la création de transaction
- Les transactions liées à un événement peuvent provenir de n'importe quelle caisse
- Le budget total est calculé à la création mais pas mis à jour automatiquement

### 16.4 État des événements

| Status | Signification | Actions possibles |
|---|---|---|
| PLANIFIED | Planifié | → ONGOING, → CANCELLED |
| ONGOING | En cours | → COMPLETED, → CANCELLED |
| COMPLETED | Terminé | Aucune |
| CANCELLED | Annulé | Aucune |

---

## 17. History / Audit

### 17.1 Structure

L'"Historique" (`History.tsx`) affiche les **audit entries** stockés dans IndexedDB (`auditEntries`).

**Type AuditEntry :**
```typescript
{
  id: string
  orgId: string
  transactionId: string | null
  userId: string
  action: string         // 'CREATED' | 'APPROVED' | 'UPDATED' | 'DELETED'
  entityType: string     // 'transaction' | 'orgUnit' | 'event'
  entityId: string
  previousValue: any
  newValue: any
  comment: string | null
  createdAt: string
  user?: User
}
```

### 17.2 Sources d'audit entries

| Action | Créé par | Déclenché par |
|---|---|---|
| CREATED (transaction) | `addTransaction()` | Frontend |
| APPROVED (transaction) | `approveTransaction()` | Frontend |
| BATCH_APPROVED | `batchApproveTransactions()` | Frontend |
| UPDATED (transaction) | `updateTransaction()` | ❌ Jamais créé |
| DELETED (transaction) | `deleteTransaction()` | ❌ Jamais créé |
| REJECTED (transaction) | `updateTransaction()` | ❌ Jamais créé |
| GROUP_CREATED | `createGroup()` | ❌ Jamais créé |
| GROUP_UPDATED | `updateGroup()` | ❌ Jamais créé |
| GROUP_DELETED | `deleteGroup()` | ❌ Jamais créé |
| EVENT_CREATED | `addEvent()` | ❌ Jamais créé |
| EVENT_UPDATED | `updateEvent()` | ❌ Jamais créé |
| EVENT_STATUS_CHANGED | `updateEventStatus()` | ❌ Jamais créé |

**Conclusion :** Seuls les audit entries `CREATED` et `APPROVED` sont réellement créés. Tous les autres types d'actions ne génèrent PAS d'entrée d'audit.

### 17.3 Cloud vs Local

- **Local :** IndexedDB `auditEntries` store
- **Cloud :** `audit_entries` table existe mais n'est remplie que par les subscriptions realtime (si des entries étaient créées via l'API — ce qui n'arrive pas)
- **Realtime :** Subscription active dans `sync.ts` (channel 'audit-changes'), mais les entries ne sont jamais insérées dans Supabase

---

## 18. Members (Membres)

### État actuel

**Table Supabase :** `profiles` existe (migration 0000, 0019, 0020) mais n'est pas utilisée.
**Type frontend :** `User` existe dans `types/index.ts` mais est un type "fake" (pas de vraie auth).
**Données :** Aucun membre n'est stocké ou géré.
**Formulaires :** Aucun formulaire de création de membre.
**Routes :** Aucune route membres.
**Pages :** Aucune page membres.

### Ce qui existe réellement
- Type `User` dans `types/index.ts`
- Table `profiles` dans Supabase
- Trigger `handle_new_user()` dans Supabase (créé par migration 0007) mais jamais appelé
- Fonction `handle_new_user()` dans `supabase/migrations/0007` mais non déployée (migration 0019 recrée profiles)

### Ce qui n'existe PAS
- Système de membres
- CRUD membres
- Relations membres ↔ groupes
- Historique membre
- Archive membre

**Verdict : ABSENT**

---

## 19. Forms

### 19.1 Formulaires existants

| Formulaire | Page | Champs | Validation |
|---|---|---|---|
| Création transaction | TransactionNew.tsx | type, amount, description, date, categoryId, source, personName, orgUnitId, eventId, comment | Champs requis : amount, description, categoryId |
| Édition transaction | TransactionEdit.tsx | même que création + compensatesFor | Même validation |
| Création événement | EventNew.tsx | name, description, startDate, endDate, status, budgetItems | Champs requis : name, startDate |
| Versement | Versement.tsx | selectedCaisse, amount, comment | Montant ≤ solde disponible |
| Connexion | Login.tsx | name, role | Champs requis : name, role |
| Configuration église | Settings.tsx | churchName, churchLogoUrl, userPhoto | Aucun |
| Création groupe | Groups.tsx | name, type, description, color | Champs requis : name |

### 19.2 Types de champs utilisés

| Type | Utilisation | Réutilisable |
|---|---|---|
| `input[type="text"]` | description, name, personName | ✅ Oui |
| `input[type="number"]` | amount, budget | ✅ Oui |
| `input[type="date"]` | date, startDate, endDate | ✅ Oui |
| `textarea` | comment, description | ✅ Oui |
| `select` | categoryId, orgUnitId, source, status | ✅ Oui |
| `button toggle` | type (INCOME/EXPENSE), status | ✅ Oui |
| `grid buttons` | category chips, source chips | ✅ Oui |
| `color picker` | group color palette | ✅ Oui |

### 19.3 Validation

- **Aucun schéma de validation** (pas de Zod utilisé pour les formulaires)
- **Validation HTML5** : `required` sur les inputs, mais pas de `pattern`
- **Validation JS** : checks `if (!amount || !description || !categoryId)`
- **Pas de feedback temps réel** : les erreurs sont affichées uniquement sur submit
- **Pas de formatage automatique** : les montants sont en FCFA dans les inputs mais convertis en cents dans le store

---

## 20. Archive

### 20.1 Ce qui existe

**Aucun système d'archive n'existe.** Les données sont :
- **Supprimées** de IndexedDB et Sync Queue
- **Supprimées** de Supabase via le sync
- **Jamais archivée** — une suppression est définitive

### 20.2 Ce qui est documenté mais inexistant

- **Transaction immuable** : une transaction APPROVED ne peut pas être modifiée ni supprimée. Ce n'est pas une archive, c'est une contrainte de statut.
- **Old notifications cleanup** : fonction `cleanup_old_notifications()` existe mais n'est pas appelée.

---

## 21. Timeline

### 21.1 Ce qui existe

**GroupDetail.tsx — Tab "Historique" :**
- Affiche un timeline du groupe avec :
  - "Caisse créée" (date de création)
  - Les 5 dernières transactions approuvées (entrée/sortie avec date et montant)
- Pas de véritable timeline chronologique unifiée
- Pas de timeline par événement

**History.tsx — "Historique des actions" :**
- Affiche les audit entries triés par date
- Filtres : Tout, Transaction, Groupe, Événement
- **Mais** la plupart des actions ne créent pas d'audit entry (voir section 17)

### 21.2 Ce qui n'existe pas

- Timeline globale unifiée (toutes entités confondues)
- Timeline enrichie avec anciens/nouveaux values
- Timeline des versements
- Timeline des changements de statut d'événement

---

## 22. Attachments / Files

### 22.1 Ce qui existe

- **Photos/Logos** : stockés en Base64 dans `AppConfig` (churchLogoUrl, userPhoto)
- **Pas de Upload Cloud** : pas de Supabase Storage utilisé
- **Pas de Receipts** : pas de champ receipt dans Transaction
- **Pas de Documents** : pas de table documents
- **Comportement offline** : les images base64 sont stockées dans IndexedDB (taille limitée)

### 22.2 Limitations

- **Stockage local** : les images base64 peuvent devenir très lourdes (IndexedDB a une limite ~50MB par défaut)
- **Pas de compression** : les images sont stockées telles quelles
- **Pas de URL externe** : toutes les images sont des data URLs
- **Pas de deletion** : pas de cleanup des images orphelines

---

## 23. Cross-Feature Dependencies

### Matrice des dépendances

| Feature | Dépend de | Dépendance |
|---|---|---|
| **Finance** | Transactions, Categories, Caisses, Events | 🔴 Transactions est la donnée centrale |
| **Balance** | Transactions, Categories, Caisses | 🔴 Calcule depuis les transactions |
| **Grand Livre** | Transactions, Categories, Caisses | 🔴 List filtrée de transactions |
| **Groupes** | OrgUnits, Caisses | 🟡 Crée 2 entités corrélées |
| **GroupDetail** | Caisses, Transactions | 🔴 Affiche les tx de la caisse |
| **Versement** | Caisses, Transactions | 🔴 Crée 2 transactions liées |
| **Événements** | Events, BudgetItems, ShoppingItems | 🟡 CRUD indépendant |
| **EventDetail** | Events, Transactions | 🔴 Affiche les tx liées à l'événement |
| **Historique** | AuditEntries, Transactions | 🟡 Affiche les entries d'audit |
| **Notifications** | Notifications, Transactions | 🔴 Liées aux transactions |
| **Bilan** | Transactions, Categories, Caisses | 🔴 Calcule depuis les transactions |
| **PDF Export** | Transactions, Caisses, AppConfig | 🟡 Génère depuis les données locales |
| **Excel Export** | Transactions, Caisses, AppConfig | 🟡 Génère depuis les données locales |
| **CSV Export** | Transactions, Caisses, AppConfig | 🟡 Génère depuis les données locales |

### Points de couplage critiques

1. **Transactions → Toutes les autres features** : C'est l'entité centrale. Toute modification du schéma transactions impacte : Finance, Balance, Grand Livre, GroupDetail, Versement, EventDetail, PDF, Excel, CSV.

2. **Caisses → Transactions** : Le `sourceCaisseId` lie chaque transaction à une caisse. Le cascade delete de groupe dépend de cette relation.

3. **Events → Transactions** : Le `eventId` lie les transactions aux événements. `syncEventBudget()` dépend de cette relation.

4. **OrgUnits → Caisses** : La corrélation par ID (pas FK) signifie que la suppression d'un orgUnit ne supprime pas automatiquement la caisse.

---

## 24. Existing Abstractions

### 24.1 Abstractions identifiées

| Abstraction | Emplacement | Responsabilité | Utilisée par | Qualité | Réutilisable |
|---|---|---|---|---|---|
| **Zustand Store** | `src/store/useLocalStore.ts` | State management + business logic | Toutes les pages | Moyenne (monolithique) | ✅ Oui (mais difficile à extraire) |
| **IndexedDB Wrapper** | `src/lib/db.ts` | Persistence locale | Store, Sync | Bonne | ✅ Oui |
| **Sync Engine** | `src/lib/sync.ts` | Synchronisation cloud | AppContext, Store | Moyenne (couplé au store) | ✅ Oui (avec adaptation) |
| **API Client** | `src/lib/api.ts` | Communications REST | Non utilisé | Bonne | ❌ Inutile (non utilisé) |
| **Export Engine** | `src/lib/export.ts` | Génération PDF/Excel/CSV | Finance, Balance | Bonne | ✅ Oui |
| **Utils** | `src/lib/utils.ts` | Formatting, ID generation | Toutes les pages | Bonne | ✅ Oui |
| **TransactionCard** | `src/components/TransactionCard.tsx` | Affichage transaction | Dashboard, Finance, GroupDetail | Bonne | ✅ Oui |
| **TopHeader** | `src/components/TopHeader.tsx` | Header fixe | Toutes les pages | Bonne | ✅ Oui |
| **BottomNav** | `src/components/BottomNav.tsx` | Navigation principale | Toutes les pages | Bonne | ✅ Oui |
| **shadcn/ui** | `src/components/ui/` | Composants UI basiques | Tous les composants | Excellente | ✅ Oui |

### 24.2 Absences d'abstractions

| Abstraction | Besoin | Statut |
|---|---|---|
| **Repository pattern** | Séparer DB access des业务逻辑 | ❌ Absent — le store fait tout |
| **Service layer** | Séparer UI de la logique métier | ❌ Absent — tout est dans le store |
| **Form schema** | Validation centralisée | ❌ Absent — validation inline |
| **API client** | Abstraction pour les appels HTTP | ⚠️ Partiel — api.ts existe mais n'est pas utilisé |
| **Event bus** | Communication inter-composants | ❌ Absent (Zustand suffit) |
| **Cache layer** | Mise en cache des données | ❌ Absent (IndexedDB sert de cache) |

---

## 25. Coupling Analysis

### 25.1 Couplages forts

```
Finance (Finance.tsx, Balance.tsx)
  ├── useLocalStore (transactions, categories, caisses)
  ├── db.ts (lecture IndexedDB)
  ├── sync.ts (écriture cloud)
  ├── export.ts (PDF/Excel/CSV)
  └── utils.ts (formatCurrencyCompact, getPeriodRange)

TransactionNew / TransactionEdit
  ├── useLocalStore (addTransaction, updateTransaction)
  ├── db.ts (écriture IndexedDB)
  └── utils.ts (generateId, formatCurrencyCompact)

TransactionDetail
  ├── useLocalStore (approveTransaction, deleteTransaction)
  ├── db.ts (écriture IndexedDB)
  └── utils.ts (formatCurrencyCompact, formatDate)

GroupDetail
  ├── useLocalStore (deleteGroup, transactions, caisses)
  ├── db.ts (cascade delete)
  └── Versement.tsx (navigation vers versement)

EventDetail
  ├── useLocalStore (updateEvent, addTransaction, syncEventBudget)
  ├── db.ts (écriture IndexedDB)
  └── transactions (recherche par eventId)
```

### 25.2 Couplages faibles

```
Dashboard
  ├── useLocalStore (transactions, caisses, events, notifications)
  └── utils.ts (formatCentsToFCFA, getPeriodRange)

History
  ├── useLocalStore (auditEntries)
  └── utils.ts (formatDate)

Settings
  ├── useLocalStore (updateConfig, loadInitialData, auditEntries)
  └── db.ts (écriture config)
```

### 25.3 Couplages croisés (cross-feature)

- **Finance → Export** : Finance.tsx importe export.ts directement
- **EventDetail → TransactionNew** : navigation avec state (`eventId`)
- **GroupDetail → Versement** : navigation avec state (`caisseId`, `defaultAmount`)
- **Dashboard → Finance** : navigation avec state (`caisseId`)
- **Versement → Dashboard** : navigation après confirmation
- **TransactionDetail → TransactionEdit** : navigation par ID

---

## 26. Fragility / Technical Risks

### 26.1 CRITIQUE

| Problème | Preuve | Fichiers | Impact | Dépendances |
|---|---|---|---|---|
| **Double écriture notifications** | Trigger DB + frontend créent chacun une notification | `sync.ts:57-75`, `useLocalStore.ts:114-131` | Notifications en doublon dans IndexedDB | Notifications |
| **Audit entries incomplets** | Seuls CREATED et APPROVED sont créés | `useLocalStore.ts:105-112`, `useLocalStore.ts:158-172` | Historique incomplet | History.tsx |
| **Mismatch UUID/STRING** | `created_by_id`/`approved_by_id` sont UUID dans la DB mais strings dans le code | `types/index.ts:51-52`, `server/store.ts:27-28` | Insertion Supabase peut échouer | transactions table |
| **Pas de résolution de conflit** | Last-write-wins, pas de merge | `sync.ts:27-76` | Perte de données en cas de modification simultanée | Toutes les features |
| **Server store éphémère** | Données en mémoire, perdues au restart | `server/store.ts` | API routes retourne données fausses | Development only |
| **Versement ID collision** | `versementId + '_src'` et `versementId + '_tgt'` peuvent coller avec `generateId()` | `Versement.tsx:54-55` | Transaction ID clash | Transactions |

### 26.2 ÉLEVÉ

| Problème | Preuve | Fichiers | Impact | Dépendances |
|---|---|---|---|---|
| **Sync queue jamais vidée des items failed** | Items avec attempts >= MAX_RETRIES sont nettoyés mais pas retryés manuellement | `sync.ts:30-35` | Perte de sync silencieuse | Sync |
| **Budget sync bug** | Division/multiplication par 100 redondante | `useLocalStore.ts:202-208` | Spent incorrect | EventDetail |
| **Realtime audit non publie** | Table audit_entries pas dans supabase_realtime | `sync.ts:83-93` | Audit entries cloud jamais mis à jour | Audit |
| **Notifications cleanup inexistant** | Fonction existe mais n'est pas appelée | `supabase/migrations/0012` | Accumulation de notifications anciennes | Notifications |
| **API client non utilisé** | `src/lib/api.ts` définit un client REST mais aucune page ne l'utilise | `src/lib/api.ts` | Code mort | — |
| **Categories hardcoded** | 9 catégories hardcodées dans le store | `useLocalStore.ts:53-62` | Pas de personnalisation | Finance |
| **Caisses hardcoded** | 6 caisses hardcodées (1 principale + 5 groupes) | `useLocalStore.ts:64-70` | Pas de personnalisation initiale | Dashboard |

### 26.3 MOYEN

| Problème | Preuve | Fichiers | Impact | Dépendances |
|---|---|---|---|---|
| **Pas de schéma Zod** | Validation inline dans les formulaires | `TransactionNew.tsx`, `EventNew.tsx` | Maintenance difficile | Forms |
| **Couplage store → UI** | Toutes les pages importent directement useLocalStore | Toutes les pages | Difficile à tester | Architecture |
| **Realtime notifications dedup imparfait** | Check par source_transaction_id + 60s window | `sync.ts:57-75` | Double notification possible si même source > 60s apart | Notifications |
| **Pas de versioning des données** | Pas de schéma de migration pour IndexedDB | `db.ts` | Difficile de migrer les données existantes | IndexedDB |
| **Format monétaire mixte** | Certains calculs utilisent cents, d'autres FCFA | `export.ts:97`, `EventDetail.tsx:166` | Risque de confusion | Finance |

### 26.4 FAIBLE

| Problème | Preuve | Fichiers | Impact | Dépendances |
|---|---|---|---|---|
| **Commentaires incohérents** | `// TODO`, `// Use effect would be better` | `Finance.tsx:43-45` | Code cleanup nécessaire | — |
| **Imports non utilisés** | `useState` importé mais pas utilisé dans certaines pages | `History.tsx` | Linter warnings | — |
| **Taille du bundle** | 1.48 MB JS bundle (main) | `vite build` output | Performance mobile | — |
| **Pas de PWA installable** | manifest.json existe mais pas de service worker | `index.html`, `public/manifest.json` | Expérience PWA incomplète | Mobile |

---

## 27. Migration Safety Map

### 27.1 DONNÉES À NE PAS CASSER

```
CAISSES / ORGANISATION
├── caisses[0].id = "main"                    → Caisse principale (hardcodée)
├── caisses[1-5].id = "org-diactes","org-jeunesse","org-dames","org-messieurs","org-chorale"  → Groupes prédéfinis
└── orgUnits mêmes IDs que caisses             → Corrélation par ID

CATEGORIES (9 fixes)
├── cat-dime (INCOME)
├── cat-offrande (INCOME)
├── cat-offrande-mission (INCOME)
├── cat-don (INCOME)
├── cat-salaire-pasteur (EXPENSE)
├── cat-frais-fonc (EXPENSE)
├── cat-mission (EXPENSE)
├── cat-entretien (EXPENSE)
└── cat-aumone (EXPENSE)

TRANSACTIONS
├── amount : en CENTimes (multiples de 100)
├── status : DRAFT | PENDING | APPROVED | REJECTED
├── sourceCaisseId : référence à caisses.id
├── versementId : lie 2 transactions d'un versement
└── eventId : référence à events.id

VERSEMENTS
├── versementId partagé entre 2 transactions
├── Transaction source : EXPENSE, sourceCaisseId = groupe
└── Transaction target : INCOME, sourceCaisseId = "main"

EVENTS
├── budgetItems : jsonb, chaque item a allocated/spent en cents
├── shoppingItems : jsonb
└── status : PLANIFIED | ONGOING | COMPLETED | CANCELLED
```

### 27.2 CLASSIFICATION des modifications

| Élément | SAFE TO CHANGE | CAUTION | DO NOT CHANGE SANS MIGRATION | DO NOT CHANGE SANS DATA BACKFILL |
|---|---|---|---|---|
| ID generation (`generateId()`) | — | — | ✅ Oui (tous les IDs existants) | — |
| Format amount (cents) | — | ✅ Oui (conversion exists) | — | — |
| Status workflow | — | — | ✅ Oui (toutes les transactions existantes) | — |
| Caisse "main" | — | — | ✅ Oui (hardcodée dans tout le code) | — |
| OrgUnit/Caisse correlation | — | — | ✅ Oui (corrélation par ID) | — |
| Category IDs | — | ✅ Oui (si on ajoute des catégories) | — | — |
| Sync queue format | ✅ Oui | — | — | — |
| IndexedDB schema (v9) | — | — | ✅ Oui (toutes les données locales) | — |
| Supabase schema (tables) | — | ✅ Oui (si on ajoute des colonnes) | — | ✅ Oui (si on supprime des colonnes) |
| RLS policies | — | — | — | ✅ Oui (impacte sécurité) |
| Realtime subscriptions | ✅ Oui | — | — | — |
| Export formats (PDF/Excel/CSV) | ✅ Oui | — | — | — |

---

## 28. Compatibility with Generic Resource/Record Model

### 28.1 Matrice de compatibilité

| Concept | État actuel | Où | Couplage |
|---|---|---|---|
| **Record / Resource** | PARTIEL | `Transaction`, `Event`, `OrgUnit`, `Caisse` sont des resources bien définies. Mais pas d'abstraction générique. | Fortement couplé au store Zustand |
| **RecordType** | ABSENT | Pas de type polymorphique. Chaque entité a son propre type TypeScript. | — |
| **Dynamic Form** | ABSENT | Tous les formulaires sont codés en dur. Pas de schéma de formulaire. | — |
| **Relationship** | PARTIEL | Relations définies dans les types TS et FK SQL. Mais pas d'abstraction. | Fortement couplé |
| **Lifecycle** | PARTIEL | `Transaction` a un workflow (DRAFT→PENDING→APPROVED). `Event` a un status lifecycle. Mais pas d'abstraction. | Couplé au store |
| **History** | PARTIEL | Audit entries existent mais incomplets. Pas d'abstraction générique. | Couplé à IndexedDB |
| **Timeline** | ABSENT | Partiellement implémenté dans GroupDetail. Pas d'abstraction. | — |
| **Archive** | ABSENT | Aucune fonctionnalité d'archive. | — |
| **Attachment** | FAIBLE | Images base64 dans config. Pas de table attachments. | — |
| **Search** | PARTIEL | Recherche texte dans Finance.tsx (description, catégorie, groupe). | Couplé au store |

### 28.2 Points d'extension identifiés

1. **Transaction** → Peut devenir un "Record" générique avec un type polymorphique
2. **AuditEntry** → Peut devenir le modèle de base pour un "History" générique
3. **Category** → Peut devenir un "RecordType" générique
4. **Formulaires** → Peuvent être dérivés d'un schéma JSON (pas encore fait)
5. **Caisses** → Peut devenir une "Relationship" entre OrgUnit et Transaction

### 28.3 Risques de refonte

| Risque | Severity | Description |
|---|---|---|
| Casser les IDs existants | 🔴 CRITIQUE | Tous les IDs sont en base36, un changement de format casserait toutes les références |
| Casser le workflow transaction | 🔴 CRITIQUE | Le statut DRAFT→PENDING→APPROVED est utilisé partout |
| Casser la corrélation OrgUnit/Caisse | 🔴 CRITIQUE | Corrélation par ID, pas par FK |
| Casser le format amount (cents) | 🔴 CRITIQUE | Utilisé dans tous les calculs financiers |
| Casser le format versementId | 🟠 ÉLEVÉ | Lie 2 transactions, cassé = versements inconsistants |
| Casser le format budgetItems (jsonb) | 🟠 ÉLEVÉ | Stocké dans events, utilisé par syncEventBudget |
| Casser le schéma IndexedDB v9 | 🟠 ÉLEVÉ | Toutes les données locales seraient perdues |
| Casser les RLS policies | 🟠 ÉLEVÉ | Impacte la sécurité cloud |
| Casser le format notification actionType | 🟡 MOYEN | Utilisé par le trigger DB et le frontend |
| Casser le format sync queue | 🟡 MOYEN | Utilisé par le moteur de sync |

---

## 29. Validation Commands and Results

### 29.1 Type Check
```bash
npx tsc --noEmit
```
**Résultat :** `No errors found in src and server`

### 29.2 Production Build
```bash
npm run build
```
**Résultat :**
- Client : 2750 modules, 39.67s
- Server (Nitro) : 76 modules, 951ms
- Bundle size : 1.48 MB (main), 199 KB (html2canvas), 151 KB (react)
- Warning : "Some chunks are larger than 500 kB after minification"
- **Build status : PASSED**

### 29.3 Database Schema Verification
```sql
-- Tables count : 8 (transactions, categories, org_units, events, caisses, audit_entries, notifications, role_assignments)
-- Indexes count : 13
-- RLS policies count : 28
-- Triggers count : 1 (on_transaction_change)
-- Functions count : 2 (notify_transaction_change, cleanup_old_notifications)
```

### 29.4 E2E Tests
- `e2e-tests/simple-check.spec.ts` — Check de base
- `e2e-tests/comprehensive-flow.spec.ts` — Flow complet (login, create tx, approve, export)

---

## 30. Final System Map

```
                    ┌──────────────────────────────────────┐
                    │           React 19 SPA               │
                    │     (Vite 8.2.2 + SWC)               │
                    └──────────────────┬───────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
    ┌───────────────────┐   ┌──────────────────┐   ┌────────────────────┐
    │     Pages/        │   │   Components/    │   │      Hooks/        │
    │                   │   │                  │   │                    │
    │ Dashboard         │   │ TransactionCard  │   │ use-mobile         │
    │ Finance           │   │ TopHeader        │   │ use-toast          │
    │ Balance           │   │ BottomNav        │   │                    │
    │ TransactionNew    │   │ StatusBadge      │   └────────────────────┘
    │ TransactionEdit   │   │ SyncIndicator    │
    │ TransactionDetail │   │ ConfirmModal     │   ┌────────────────────┐
    │ Groups/GroupDetail│   │ Skeleton         │   │    lib/ layer      │
    │ Events/EventNew   │   │ BottomDrawer     │   │                    │
    │ EventDetail       │   │ LuminaLogo       │   │ db.ts    → Indexed │
    │ Versement         │   │ LogoSpinner      │   │ sync.ts→ Supabase  │
    │ Settings          │   │ EmptyState       │   │ api.ts → Nitro (  │
    │ History           │   │                  │   │ export.ts→ PDF/    │
    │ Notifications     │   └──────────────────┘   │         Excel/CSV  │
    │ Help/Tutorial     │                          │ utils.ts→ fmt/id  │
    │ Login/Onboarding  │                          └────────┬───────────┘
    └───────────────────┘                                   │
              │                                    ┌──────▼───────┐
              │                                    │   Zustand    │
              │                                    │  useLocal    │
              │                                    │    Store     │
              │                                    └──────┬───────┘
              │                                           │
              │                   ┌───────────────────────┼───────────────────────┐
              │                   │                       │                       │
              ▼                   ▼                       ▼                       ▼
    ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌────────────────┐
    │   IndexedDB      │ │    Nitro Server  │ │    Supabase      │ │   Capacitor    │
    │                  │ │                  │ │                  │ │   (Android)    │
    │ lumina-db v9     │ │  In-memory       │ │  Postgres DB     │ │                │
    │                  │ │  store.ts        │ │  (cloud)         │ │  appId:        │
    │ 9 stores:        │ │                  │ │                  │ │  org.mfej      │
    │  - transactions  │ │  Routes API:     │ │  8 tables:       │ │  centrale.lu   │
    │  - categories    │ │  - /api/hello    │ │  - transactions  │ │                │
    │  - orgUnits      │ │  - /api/transactions│ │  - categories  │ │  webDir: dist  │
    │  - caisses       │ │  - /api/events   │ │  - org_units     │ │  server: https │
    │  - events        │ │  - /api/auth/*   │ │  - events        │ │                │
    │  - auditEntries  │ │                  │ │  - caisses       │ │                │
    │  - notifications │ │  (dev only, not  │ │  - audit_entries │ │                │
    │  - syncQueue     │ │   used by app)   │ │  - notifications │ │                │
    │  - config        │ │                  │ │  - role_assign   │ │                │
    └──────────────────┘ └──────────────────┘ │  - profiles      │ └────────────────┘
                                              │                  │
                                              │  Realtime:       │
                                              │  - transactions  │
                                              │  - notifications │
                                              │                  │
                                              │  Triggers:       │
                                              │  - on_transaction│
                                              │    _change       │
                                              │                  │
                                              │  RLS: open       │
                                              └──────────────────┘
```

### 30.1 Flux de données critiques

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUX DE CRÉATION DE TRANSACTION                  │
└─────────────────────────────────────────────────────────────────────┘

Utilisateur (TransactionNew.tsx)
        │
        ▼ click "Enregistrer"
        │
        ▼
addTransaction(tx) dans useLocalStore
        │
        ├──► set({ transactions: updated })     ← Zustand state
        │                                       ← React re-render
        │
        ├──► db.put('transactions', tx)          ← IndexedDB write
        │
        ├──► enqueueSync('create', 'transactions', tx)  ← Sync queue
        │
        ├──► db.put('auditEntries', {action:'CREATED',...}) ← Audit local
        │
        └──► db.put('notifications', {actionType:'TRANSACTION_PENDING',...}) ← Notification locale
                │
                ▼
        Background Sync (toutes les 30s)
                │
                ├──► supabase.from('transactions').insert(tx)  ← Cloud write
                │
                ├──► Trigger DB: on_transaction_change
                │       │
                │       ▼
                │   INSERT INTO notifications (trigger)
                │       │
                │       ▼
                │   Realtime: notifications-changes channel
                │       │
                │       ▼
                │   db.put('notifications', notif)  ← Cloud → Local sync
                │       │
                │       └──► Dedup check (source_transaction_id + 60s)
                │
                └──► db.removeSyncItem(item.id)  ← Queue cleanup

┌─────────────────────────────────────────────────────────────────────┐
│                    FLUX DE VERSIONNEMENT                            │
└─────────────────────────────────────────────────────────────────────┘

Chaque transaction a un champ `version` (INTEGER)
  - Incrémenté à chaque update
  - Initialisé à 1
  - Utilisé pour le optimistic locking (pas implémenté côté serveur)

┌─────────────────────────────────────────────────────────────────────┐
│                    FLUX DE VERSEMENT                                │
└─────────────────────────────────────────────────────────────────────┘

Utilisateur (Versement.tsx)
        │
        ▼ click "Aperçu du versement"
        │
        ▼ buildPreview()
        │   Génère versementId = Date.now().toString(36) + random
        │   Crée sourceTx (EXPENSE, sourceCaisseId=groupe, versementId)
        │   Crée targetTx (INCOME, sourceCaisseId='main', versementId)
        │
        ▼ click "Confirmer"
        │
        ▼ addTransaction(sourceTx) + addTransaction(targetTx)
        │   (même flux que création transaction normale)
        │
        └──► Les 2 transactions sont liées par versementId partagé
```

### 30.2 Résumé des fonctionnalités

| Feature | Status | Complexité | Dépendances |
|---|---|---|---|
| Transaction CRUD | ✅ IMPLEMENTÉ | Élevée | Categories, Caisses, Events |
| Transaction workflow | ✅ IMPLEMENTÉ | Moyenne | — |
| Caisse principale | ✅ IMPLEMENTÉ | Faible | — |
| Caisse groupe | ✅ IMPLEMENTÉ | Moyenne | OrgUnit correlation |
| Versement | ✅ IMPLEMENTÉ | Moyenne | 2 transactions liées |
| Événements | ✅ IMPLEMENTÉ | Moyenne | BudgetItems, ShoppingItems |
| Budget tracking | ✅ PARTIEL | Élevée | syncEventBudget() |
| Rapports/Exports | ✅ IMPLEMENTÉ | Moyenne | PDF, Excel, CSV |
| Notifications | ✅ IMPLEMENTÉ | Moyenne | Dedup logic |
| Audit/History | ⚠️ PARTIEL | Moyenne | Incomplet (seuls CREATED/APPROVED) |
| Groupes CRUD | ✅ IMPLEMENTÉ | Moyenne | Cascade delete transactions |
| Paramètres | ✅ IMPLEMENTÉ | Faible | Local only |
| Tutoriel/Aide | ✅ IMPLEMENTÉ | Faible | Statique |
| Membres | ❌ ABSENT | — | — |
| Archive | ❌ ABSENT | — | — |
| Timeline | ⚠️ PARTIEL | Faible | GroupDetail uniquement |
| Auth | ⚠️ PARTIEL | Moyenne | Session locale, pas Supabase Auth |

---

*Fin de l'audit forensique — Lumina v2.0*
*Document créé le 2026-09-05*
*Source de vérité : code déposé à commit 57220c88984ecffed230ad50ff557b44ecad6db9*
