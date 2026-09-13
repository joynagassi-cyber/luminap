# Lumina — Stabilisation : rapport Phase 2 → 6 (sync + flux + skeletons + gates)

Date de campagne : 2026-09-13
Projet Supabase (source de vérité) : `hhgovvrnalibhgpakswi`
Instance PowerSync : `6a9dd96302481fb31b945823`

> Ce rapport consolide l'état des phases 2–6 et les décisions restantes. La
> Phase 1 (audit DB) est dans `2026-09-13-stabilisation-phase-1-db-audit.md`.
> Règle permanente : **la base est la source de vérité** ; on n'effectue jamais
> de migration manuelle ; toute dérive DB est documentée (SQL prêt à l'emploi)
> et signalée, pas appliquée silencieusement.

---

## Phase 5 — Skeletons structurels (DÉLIVRÉ)

| Élément | État |
|---|---|
| Primitive `src/components/Shimmer.tsx` | ✅ créée (`ShimmerBlock`/`Line`/`Avatar`/`Card`/`List`/`StatCard`/`HeroCard`) |
| Tokens CSS `src/App.css` | ✅ `--skeleton-base #212121`, `--skeleton-highlight #2B2B2B`, `--skeleton-radius 4px`, keyframe `.shimmer` (translateX, 1400 ms, `will-change`) |
| Respect `prefers-reduced-motion` | ✅ fallback bloc statique `--surface-hover` |
| `src/components/Skeleton.tsx` | ✅ refondu sur Shimmer (exports stables, couleurs/radius corrigés) |
| `src/components/PageSkeletons.tsx` | ✅ 19 structures par page (Dashboard, Finance, Groups, GroupDetail, Events, EventDetail, Cotisations, GroupCotisation, Members, MembreDetail, MembresEnAvance, Versement, Forms, FormBuilder, FormSubmissions, FormFill, Reports, ReportBuilder, Archives, Notifications, Settings, Invitations) |
| Pages câblées (`aria-busy` + gate `isLoading`) | ✅ Dashboard, Finance, Events, EventDetail, Archives, Settings, Groups, Notifications, Versement, Cotisations, GroupDetail, Members |
| Type check | ✅ 0 erreur |

Notes :
- Le shimmer est le mouvement ; les fragments de page conservent la structure
  réelle de chaque écran (hero 48 px, pastilles pill, `tabular-nums` sur les
  montants) → pas de *layout shift* au chargement.
- `G5` = satisfait pour les pages câblées ci-dessus ; les pages secondaires
  (ReportViewer, FormFill, MembresEnAvance, Invitations) ont leur structure
  dans `PageSkeletons.tsx` mais ne sont pas encore branchées sur un gate.

---

## Phase 2 — Synchronisation (VÉRIFIÉ ce qui est testable hors réseau)

| Point (Pitfalls du plan) | Verdict |
|---|---|
| **Pitfall 2 — token PowerSync = `sub` (UUID), pas `email`** | ✅ Le `SupabaseConnector.getSyncCredentials` renvoie `session.access_token` (JWT → `sub` côté service PowerSync). Aucune utilisation de `email` comme identifiant de session PowerSync. L'identité locale (`lumina-session` = `crypto.randomUUID()`) est un concept séparé (hors-ligne), pas le token de sync. |
| **Tolérance au boot / offline** | ✅ Sans session, `getSyncCredentials` renvoie `null` → PowerSync reste en retry idle, aucun token vide (pas de 401 au gateway), le boot ne bloque pas (`initPowerSync` résout dès que le handle DB est prêt ; `waitForFirstSync` non-awaited). |
| **Pitfall 4 — Realtime Supabase** | ✅ Non requis pour un app offline-first : **c'est le push PowerSync qui joue le rôle de temps réel** (les changements pushés dans SQLite déclenchent les listeners de l'app). La publication `supabase_realtime` (transactions, notifications, …) existe en DB et reste disponible si un canal temps réel explicite est un jour souhaité. |
| **Pitfall 1 — schéma PowerSync ↔ colonnes réelles** | ⚠️ `transactions` ✅ aligné (colonnes vérifiées contre la DB). **`cotisations` DÉRIVE** → voir §Décision. |

### De drifts de sync cloud (non corrigeables sans environnement live)

**A. Naming `cotisations` (camelCase app ↔ bas-casse DB).**
La table locale PowerSync (selon `schema.ts`) est en camelCase
(`montantObligatoire`, `montantPaye`, `datePaiement`, `createdAt`, `updatedAt`) ;
Postgres a les colonnes en **bas-casse** (`montantobligatoire`, `montantpaye`,
`datepaiement`, `createdat`, `updatedat`). Le connecteur Supabase de PowerSync
mappe local→cloud par nom de colonne → la synchro cloud de `cotisations`
échouerait. La lecture/écriture **locale** reste cohérente (table SQLite créée
selon `schema.ts`).

**B. Type `created_by_id` / `approved_by_id` (uuid FK→`auth.users`).**
L'app (flux offline) écrit des id de session texte (`"local-user"`) ou l'UUID de
`lumina-session` (absent de `auth.users`). À l'upload cloud, une valeur
non-UUID / non-membre échouerait la FK `transactions_created_by_id_fkey`.

Les deux sont déjà documentés en Phase 1 (§4 et §6). **Décision requise** ci-dessous.

---

## DECISION REQUISE (à trancher)

Le **sens par défaut** recommandé (cohérent avec « DB = source de vérité, pas de
migration manuelle ») est de **corriger l'application**, pas la base :

- **Option A (recommandée, sans migration DB)** : aligner l'app sur les noms
  bas-casse réels de la DB. Blast radius ≈ 155 occurrences (SQL brute locale dans
  `cotisation-service.ts` + `capabilities/cotisation`, type `PSCotisation`/
  `Cotisation`, pages `Cotisations`/`GroupCotisation`, tests). Risque : du code
  SQL brut non couvert par le type-check ; à valider par la suite de tests +
  un cycle live.
- **Option B (migration DB)** : renommer les colonnes PG en snake_case standard
  (`montant_obligatoire`, `created_at`, …) **ou** en camelCase guillé. SQL prêt
  ci-dessous. Nécessite validation (changement de schéma, `service.yaml` PowerSync
  à resynchroniser).

```sql
-- Option B1 : snake_case standard (recommandé si migration acceptée)
ALTER TABLE public.cotisations RENAME COLUMN montantobligatoire TO montant_obligatoire;
ALTER TABLE public.cotisations RENAME COLUMN montantpaye TO montant_paye;
ALTER TABLE public.cotisations RENAME COLUMN datepaiement TO date_paiement;
ALTER TABLE public.cotisations RENAME COLUMN createdat TO created_at;
ALTER TABLE public.cotisations RENAME COLUMN updatedat TO updated_at;
-- puis aligner schema.ts / types / services / tests sur les noms snake_case.

-- Option B2 : camelCase guillé (pour servir le code tel quel)
ALTER TABLE public.cotisations RENAME COLUMN montantobligatoire TO "montantObligatoire";
ALTER TABLE public.cotisations RENAME COLUMN montantpaye TO "montantPaye";
ALTER TABLE public.cotisations RENAME COLUMN datepaiement TO "datePaiement";
ALTER TABLE public.cotisations RENAME COLUMN createdat TO "createdAt";
ALTER TABLE public.cotisations RENAME COLUMN updatedat TO "updatedAt";
```

Pour le drift **B (uuid created_by)** : soit générer un vrai `auth.users`
(UUID de profile) au login avant d'écrire, soit assouplir les colonnes en
`text` (migration DB). Les flux offline ne doivent pas être cassés.

> Je n'ai PAS fait ce rename « à l'aveugle » car le cycle cloud est le seul
> endroit qui le valide et il n'est pas dispo hors réseau ; et une migration DB
> sort du périmètre autorisé sans ton feu vert.

---

## Phase 4 — 8 flux métier (chemins offline vérifiés, tests live restants)

Chaque flux a ses **services + capacités** câblés côté offline (PowerSync/SQLite)
et son bouton de page. Ce qui reste = validation bout-en-bout **en cloud**
(download+upload cohérents), impossible hors réseau.

| # | Flux | Service/capacité | Page | Offline | Cloud (à tester) |
|---|---|---|---|---|---|
| 1 | Transaction (draft→pending→approved) | `transaction-service`, `workflow` | `TransactionNew`/`TransactionDetail` | ✅ | ⬜ upload FK (drift B) |
| 2 | Versement caisse groupe → principale | `versement-service` (2 tx liées `versement_id`) | `Versement`, `GroupDetail` | ✅ | ⬜ |
| 3 | Cotisation (payée / absente / avance) | `cotisation-service`, `capabilities/cotisation` | `GroupCotisation`, `Cotisations` | ✅ | ⬜ **drift A (naming)** |
| 4 | Événement + budget | `event-service`, `workflow` (budget) | `EventNew`/`EventDetail` | ✅ | ⬜ |
| 5 | Groupes (CRUD + membres) | `group-lifecycle`, `relationship` | `Groups`/`GroupDetail` | ✅ | ⬜ |
| 6 | Rapports | `reporting`, `capabilities/report` | `Reports`/`ReportBuilder` | ✅ | ⬜ |
| 7 | Notifications (trigger→marquage lu) | triggers DB + `dataLayer` | `Notifications` | ✅ (triggers en DB) | ⬜ `org_id` hardcodé org-1 (§4 P1) |
| 8 | Invitations / onboarding | `capabilities/invitation` | `Invitations`/`InvitationEmit` | ✅ | ⬜ |

### Checklist cycle live (à faire quand le preview est en réseau)
1. Boot **offline** (devtools : network = offline) → données seedées, aucun
   spinner infini, `hasSynced` correct, retry idle PS.
2. Reconnexion → push+pull, `hasSynced=true`, `lastSyncedAt` mis à jour,
   `sync-queue` vides.
3. 8 flux × (création → visible après re-sync), montant en centimes.
4. **Drift A** : une écriture de `cotisation` arrive-t-elle en cloud ? (naming).
5. **Drift B** : une écriture `transactions` avec `created_by_id` passe-t-elle
   la FK `auth.users` ?
6. Login/logout : stabilité de session, `onAuthStateChange` (Pitfall 5).

---

## Phase 6 — Matrice de régression + gates

| Gate | Critère | État |
|---|---|---|
| G1 | 0 erreur type + build de prod | ✅ (vérifié cette session : 0 erreur type) |
| G2 | Audit base écrit, dérives documentées + SQL | ✅ (Phase 1 + §De drifts ci-dessus) |
| G3 | Sync : `hasSynced` au boot, cycle offline, stabilité login/logout | ⚠️ logique ✅ ; **cycle live ⬜** |
| G4 | Les 8 flux passent offline + cloud | offline ✅ ; **cloud ⬜** (2 drifts bloquants) |
| G5 | Skeleton structuré par page (shimmer) au 1er chargement | ✅ 12 pages câblées + 19 structures prêtes |
| G6 | Boucle test autonome + rapport final | ✅ ce rapport ; suite vitest/cypress ⬜ (outillage à dispo) |

**Prochaine action conseillée** : trancher la DECISION ci-dessus (Option A vs B,
+ drift B), puis lancer le **cycle live** (section Phase 4) une fois le preview
en réseau pour clôturer G3/G4.
