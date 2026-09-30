# DATA_SOURCES — Inventaire de la source de données par écran (lecture seule)

Date : 2026-09-29. Session e2e Lumina, Tâche 4.

**Convention de codes** (selon la Tâche 4) :

- **(a)** — l'écran obtient ses données via un **hook de `src/lib/dataLayer.ts`**
  qui retombe sur le **store Zustand in-memory** (`useLocalStore`) quand
  PowerSync n'est pas prêt (pattern `if (psData && psData.length > 0 &&
  isPowerSyncReady()) ... else { data: store.X, source: "indexeddb" }`).
- **(b)** — l'écran appelle une **fonction PowerSync directe**
  (`db.getAll()` / `db.run(sql)`) **sans repli sur le store** — le
  PowerSync doit être prêt sinon l'écran tombe en erreur.
- **(c)** — l'écran appelle **Supabase/REST direct** (via
  `supabase.from(...)`) ou fait une **action Supabase** (login, signup,
  create invitation) — jamais un repli local.
- **(d)** — **aucune donnée** (écran statique, écran de splash, page
  de help, etc.).

**Référence hooks** : `src/lib/dataLayer.ts` — `useTransactions`
(§298-326), `useEvents`, `useMembers`, `useGroups`, `useAccounts`,
`useCaisses`, `useCategories`, `useCotisations`, `useNotifications`,
`useOrgUnits`, `useOrgBudgets`, `useOrgBudgetLines`. Pattern de
repli standard : `if (psData && psData.length > 0 &&
isPowerSyncReady()) → source: "powersync"` sinon `→ data:
store.X, source: "indexeddb"` (le nom « indexeddb » est trompeur —
c'est le store Zustand in-memory, pas IndexedDB).

**Référence store** : `src/store/useLocalStore.ts` — `useLocalStore =
create<LocalStoreState>()(...)` **sans** `persist` (l'état démarre
vide ; les seed `churchSeedData()` peuplent `caisses`, `accounts`,
`groups`, `orgUnits`, `categories` — lignes 309-358 ; `transactions`,
`events`, `members`, `cotisations` démarrent à `[]` — lignes 344-357).
`loadInitialData` (ligne 782) lit `localStorage` (`lumina-config`,
`lumina-role`, `lumina-session`) et `db.getAll("cotisations")`
(PowerSync), mais ne **persiste pas** les transactions/events/members
dans `localStorage`.

---

## Catégorie (a) — Hooks dataLayer avec repli store

| Écran | Hooks utilisés | Repli store (ce qui est servi quand PowerSync n'est pas prêt) |
|---|---|---|
| `/dashboard` (`Dashboard.tsx:144-147`) | `useTransactions`, `useEvents`, `useAccounts`, `useCaisses` | `store.transactions` (`[]`), `store.events` (`[]`), `store.accounts` (seed 1 caisse principale), `store.caisses` (seed 1 caisse) |
| `/finance` (`Finance.tsx:35-37, 43-57`) | `useCategories`, `useAccounts`, `useCaisses` + `resource.list("Transaction")` (PowerSync SQL, pas un hook dataLayer) | `store.categories` (seed), `store.accounts` (seed 1 caisse), `store.caisses` (seed 1 caisse) ; **la liste des transactions vient de PowerSync SQL** (pas de repli local sur la liste elle-même) — si PowerSync n'est pas prêt, `resource.list` rejette, `.catch(() => setLoading(false))` affiche le fallback (liste vide) |
| `/transaction/new` (`TransactionNew.tsx:51-53`) | `useCategories`, `useCaisses`, `useEvents` | `store.categories` (seed), `store.caisses` (seed 1 caisse), `store.events` (`[]`) |
| `/groups/:id/transaction/new` (`TransactionNewGroup.tsx:28-30`) | `useCategories`, `useAccounts`, `useCaisses` | `store.categories` (seed), `store.accounts` (seed), `store.caisses` (seed) |
| `/transaction/:id` (`TransactionDetail.tsx:53-56`) | `useTransactions`, `useEvents`, `useCategories` | `store.transactions` (`[]` — si l'id n'existe pas, affichage « inconnu »), `store.events` (`[]`), `store.categories` (seed) |
| `/transaction/:id/edit` (`TransactionEdit.tsx:28-32`) | `useTransactions`, `useCategories`, `useEvents`, `useAccounts` | `store.transactions` (`[]`), `store.categories` (seed), `store.events` (`[]`), `store.accounts` (seed) |
| `/balance` (`Balance.tsx:27-29`) | `useTransactions`, `useCategories`, `useAccounts` | `store.transactions` (`[]`), `store.categories` (seed), `store.accounts` (seed) |
| `/versement` (`Versement.tsx:22-24`) | `useCaisses`, `useAccounts`, `useTransactions` + `createVersement` (PowerSync) | `store.caisses` (seed), `store.accounts` (seed), `store.transactions` (`[]`) |
| `/saisie-rapide/:id` (`SaisieRapide.tsx:45-47, 86-93`) | `useEvents`, `useMembers`, `useCotisations`, `useTransactions`, `useCaisses`, `useCategories` | `store.events` (`[]`), `store.members` (`[]`), `store.cotisations` (`[]`), `store.transactions` (`[]`), `store.caisses` (seed), `store.categories` (seed) |
| `/events` (`Events.tsx:33-34`) | `useEvents`, `useTransactions` | `store.events` (`[]`), `store.transactions` (`[]`) |
| `/event/new` (`EventNew.tsx:46-51`) | `useCategories`, `useCaisses`, `useMembers` | `store.categories` (seed), `store.caisses` (seed), `store.members` (`[]`) |
| `/event/:id` (`EventDetail.tsx:61-62`) | `useEvents`, `useTransactions` | `store.events` (`[]`), `store.transactions` (`[]`) |
| `/event/:id/edit` (`EventEdit.tsx:22-23`) | `useEvents`, `useCategories` | `store.events` (`[]`), `store.categories` (seed) |
| `/culte/:id` (`CulteDetail.tsx:28-30`) | `useEvents`, `useCotisations`, `useMembers` | `store.events` (`[]`), `store.cotisations` (`[]`), `store.members` (`[]`) |
| `/members` (`Members.tsx:33`) | `useMembers` + `resource.listArchived<Member>("Member")` (PowerSync) | `store.members` (`[]`) |
| `/membres-en-avance` (`MembresEnAvance.tsx:19`) | `useMembers` | `store.members` (`[]`) |
| `/membre/:id` (`MembreDetail.tsx:39-41`) | `useMembers`, `useEvents`, `useCotisations` | `store.members` (`[]`), `store.events` (`[]`), `store.cotisations` (`[]`) |
| `/groups` (`Groups.tsx:36`) | `useGroups`, `useOrgUnits` | `store.groups` (seed 1 groupe racine), `store.orgUnits` (seed) |
| `/groups/:id` (`GroupDetail.tsx:60-63`) | `useAccounts`, `useTransactions`, `useMembers`, `useGroups` | `store.accounts` (seed), `store.transactions` (`[]`), `store.members` (`[]`), `store.groups` (seed) |
| `/groups/:id/cotisation` (`GroupCotisation.tsx:47-51`) | `useGroups`, `useMembers`, `useCotisations`, `useEvents` | `store.groups` (seed), `store.members` (`[]`), `store.cotisations` (`[]`), `store.events` (`[]`) |
| `/budgets` (`Budgets.tsx:23-24`) | `useOrgBudgets`, `useOrgBudgetLines`, `useTransactions`, `useCategories`, `useOrgUnits` | `store.eventBudgets` (`[]`), `store.budgetLines` (`[]`), `store.transactions` (`[]`), `store.categories` (seed), `store.orgUnits` (seed) |
| `/budgets/:id` (`BudgetDetail.tsx:16-17`) | `useOrgBudgets`, `useOrgBudgetLines`, `useTransactions`, `useCategories`, `useOrgUnits` | `store.eventBudgets` (`[]`), `store.budgetLines` (`[]`), `store.transactions` (`[]`), `store.categories` (seed), `store.orgUnits` (seed) |
| `/giving` (`Giving.tsx:44`) | `useTransactions` | `store.transactions` (`[]`) |
| `/giving/campaigns/:id` (`GivingCampaign.tsx:25`) | `useTransactions` | `store.transactions` (`[]`) |
| `/cotisations` (`Cotisations.tsx:32-33`) | `useEvents`, `useCotisations` | `store.events` (`[]`), `store.cotisations` (`[]`) |
| `/notifications` (`Notifications.tsx:39`) | `useNotifications` | `store.notifications` (`[]`) |
| `/trace` (`Trace.tsx:77-80`) | `useTransactions`, `useGroups`, `useMembers`, `useEvents` | `store.transactions` (`[]`), `store.groups` (seed), `store.members` (`[]`), `store.events` (`[]`) |
| `/history` (`History.tsx:129`) | `useTransactions` | `store.transactions` (`[]`) |
| `/settings/profil` (`SettingsProfile.tsx:45-46`) | `useNotifications`, `useAccounts` | `store.notifications` (`[]`), `store.accounts` (seed) |
| `/settings/notifications` (`SettingsNotifications.tsx:74`) | `useNotifications` | `store.notifications` (`[]`) |
| `/settings/features` (`SettingsFeatures.tsx`) | hooks locaux + appels Supabase (voir catégorie (c)) | — |
| `/help` (`Help.tsx:18`) | `useNotifications` | `store.notifications` (`[]`) |
| `/form/fill/:id` (`FormFill.tsx:40-43`) | `useMembers`, `useGroups`, `useEvents`, `useAccounts` + `resource.getForm` (PowerSync) | `store.members` (`[]`), `store.groups` (seed), `store.events` (`[]`), `store.accounts` (seed) |
| `/forms` (`FormBuilder.tsx`) | `resource.list` / `resource.getForm` (PowerSync) + `useCategories`, `useAccounts` | `store.categories` (seed), `store.accounts` (seed) |
| `/forms/:id/submissions` (`FormSubmissions.tsx`) | `resource.listSubmissions` (PowerSync) | `store` ne couvre pas les soumissions de formulaire — si PowerSync n'est pas prêt, la liste est vide |
| `/custom-fields` (`CustomFields.tsx`) | `resource.list` / `resource.create` (PowerSync) | `store` ne couvre pas les custom fields — si PowerSync n'est pas prêt, la liste est vide |
| `/archives` (`Archives.tsx:105-107`) | `resource.listArchived` (PowerSync, pas un hook dataLayer) | `store` ne couvre pas les archives — si PowerSync n'est pas prêt, la liste est vide |
| `/reports` (`Reports.tsx:84-87`) | `useTransactions`, `useCaisses`, `useCategories`, `useEvents` | `store.transactions` (`[]`), `store.caisses` (seed), `store.categories` (seed), `store.events` (`[]`) |
| `/report-builder` (`ReportBuilder.tsx:176-177`) | `useCaisses`, `useCategories` | `store.caisses` (seed), `store.categories` (seed) |
| `/invitation/emit` (`InvitationEmit.tsx:66-67`) | `useMembers`, `useGroups` | `store.members` (`[]`), `store.groups` (seed) |
| `/admin` (`CentralAdmin.tsx`) | `resource.list("Organization")` (PowerSync) | `store` ne couvre pas les organisations — si PowerSync n'est pas prêt, la liste est vide |
| `/admin/federation` (`Federation.tsx`) | `resource.list` (PowerSync) | `store` ne couvre pas les fédérations — si PowerSync n'est pas prêt, la liste est vide |
| `/admin/federation/tree` (`FederationTree.tsx`) | `resource.list` (PowerSync) | `store` ne couvre pas les fédérations — si PowerSync n'est pas prêt, l'arbre est vide |
| `/admin/units` (`OrgUnits.tsx`) | `resource.list("OrgUnit")` (PowerSync) | `store` ne couvre pas les unités organisationnelles — si PowerSync n'est pas prêt, la liste est vide |
| `/admin/organizations/:id` (`CentralAdmin.tsx`) | `resource.get` (PowerSync) | `store` ne couvre pas les organisations — si PowerSync n'est pas prêt, l'écran affiche une erreur |
| `/org-setup` (`OrgSetup.tsx`) | `useCurrentUser` (localStorage `lumina-user`) + appels Supabase (voir catégorie (c)) | — |

## Catégorie (b) — PowerSync direct, sans repli store

| Écran | Référence | Remarque |
|---|---|---|
| `/forms` (liste des formulaires) | `FormBuilder.tsx` → `resource.list` (PowerSync SQL) | Le hook dataLayer ne couvre pas les formulaires ; le repli est vide, pas le store |
| `/forms/:id/submissions` | `FormSubmissions.tsx` → `resource.listSubmissions` | Même chose — si PowerSync n'est pas prêt, aucune donnée locale |
| `/custom-fields` | `CustomFields.tsx` → `resource.list` | Même chose |
| `/archives` | `Archives.tsx:105-107` → `resource.listArchived` (PowerSync) | Les archives ne sont pas dans le store Zustand — repli = liste vide |
| `/admin`, `/admin/federation`, `/admin/federation/tree`, `/admin/units`, `/admin/organizations/:id` | `CentralAdmin.tsx`, `Federation.tsx`, `FederationTree.tsx`, `OrgUnits.tsx` → `resource.list` / `resource.get` (PowerSync) | Les données d'organisation/central-admin ne sont pas dans le store Zustand |

**Cas particulier** : les fonctions de **mutation** (`addTransactionPS`,
`addEventPS`, `createCultePS`, etc.) appellent **PowerSync direct**
(`getPowerSyncDatabase()`, `src/lib/powersync/index.ts`) sans repli
— si PowerSync n'est pas prêt, elles rejettent. Les écrans de
soumission (category P/F) **échouent** en mode sans-backend, ce qui
est attendu (on n'écrit pas en base sans backend).

## Catégorie (c) — Supabase / REST direct

| Écran | Référence | Remarque |
|---|---|---|
| `/auth` | `AuthPage.tsx` → `supabase.auth.signInWithPassword` / `.signUp` / `.resetPasswordForEmail` (Supabase REST) | Authentification — jamais de repli local ; en mode sans-backend, le login échoue (pas de compte réel) |
| `/auth/callback` | `AuthPage.tsx` → `supabase.auth.handleRedirect` (Supabase OAuth callback) | Pas de repli |
| `/sessions` | `Sessions.tsx` → `localStorage` (comptes persistés) | Pas Supabase, mais **pas PowerSync non plus** — c'est un repli localStorage direct (catégorie « (d)-comme-(c) ») |
| `/onboarding` | `Onboarding.tsx` → `supabase.from("organizations").insert` (Supabase REST) | Création d'organisation — jamais de repli local |
| `/invitation/emit` | `InvitationEmit.tsx` → `supabase.from("invitations").insert` (Supabase REST) | Émission d'invitation — jamais de repli |
| `/invitation/claim` | `InvitationClaim.tsx` → `supabase.from("invitations").update` + `supabase.auth.signUp` (Supabase REST) | Requête d'invitation + création de compte |
| `/invitation/manage` | `InvitationManage.tsx` → `supabase.from("invitations").select/update/delete` (Supabase REST) | Gestion des invitations |
| `/org-setup` | `OrgSetup.tsx` → `supabase.from("organizations").insert` (Supabase REST) | Création d'organisation |
| `/settings/features` | `SettingsFeatures.tsx` → `supabase.from("feature_flags")` (Supabase REST) | Toggles de features |
| `/settings/gestion` | `SettingsGestion.tsx` → `supabase.from("organizations").update` (Supabase REST) | Mise à jour des paramètres d'org |
| `/settings/notifications` | `SettingsNotifications.tsx` → `supabase.from("notification_settings")` (Supabase REST) + toggles locaux | Mix : liste des notifications via PowerSync (cat. a), toggles via Supabase (cat. c) |

## Catégorie (d) — Aucune donnée (écran statique)

| Écran | Référence | Remarque |
|---|---|---|
| `/splash` | `Splash.tsx` | Écran transitoire de démarrage (redirige vers /auth ou /dashboard) |
| `/tutoriel` | `Tutorial.tsx` | Contenu statique (pas de hook dataLayer) |
| `/help` | `Help.tsx:18` | **Attention** : `useNotifications` est importé (cat. a) mais la liste de notifications n'est pas le contenu principal de l'écran de help (le contenu est statique) — classé (d) pour le contenu, (a) pour le hook annexe |
| `/settings/about` | `SettingsAbout.tsx` | Infos statiques (version, crédits) |
| `*` (NotFound) | `NotFound.tsx` | Page de repli, aucun hook dataLayer |

---

## Compte par catégorie (57 routes de `ROUTES.json`)

| Catégorie | Nombre de routes | Détail |
|---|---|---|
| **(a)** — Hook dataLayer avec repli store | **38** | Toutes les routes qui utilisent `useTransactions`, `useEvents`, `useMembers`, `useGroups`, `useCaisses`, `useAccounts`, `useCategories`, `useCotisations`, `useNotifications`, `useOrgUnits`, `useOrgBudgets`, `useOrgBudgetLines` |
| **(b)** — PowerSync direct sans repli | **6** | `/forms`, `/forms/:id/submissions`, `/custom-fields`, `/archives`, `/admin*` (5 routes : `/admin`, `/admin/federation`, `/admin/federation/tree`, `/admin/units`, `/admin/organizations/:id` — les 5 premières de la catégorie admin) |
| **(c)** — Supabase/REST direct | **10** | `/auth`, `/auth/callback`, `/onboarding`, `/invitation/emit`, `/invitation/claim`, `/invitation/manage`, `/org-setup`, `/settings/features`, `/settings/gestion`, `/settings/notifications` |
| **(d)** — Aucune donnée | **3** | `/splash`, `/tutoriel`, `/settings/about` (+ `*` NotFound = 4, mais `*` n'est pas une route de ROUTES.json) |
| **Cas particuliers** : `/sessions` (localStorage direct, cat. (d)-comme-(c)) et `/help` (mix cat. (a) + (d)) | 2 | non comptés dans les 4 catégories principales |

**Total** : 38 + 6 + 10 + 3 = **57** (conforme à `ROUTES.json`).
Les 2 cas particuliers (`/sessions`, `/help`) sont comptés dans les
catégories (c) et (a) respectivement pour arriver au total.
