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
| **Pitfall 1 — schéma PowerSync ↔ colonnes réelles** | ✅ `transactions` aligné (colonnes vérifiées contre la DB). `cotisations` DÉRIVAIT → **résolu par l'Option A** (§ RÉSOLU ci-dessous). |

### De drifts de sync cloud (historique — les deux sont résolus, voir § RÉSOLU)

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

## RÉSOLU — Décision de l'utilisateur : Option A (2026-09-13)

Le **sens retenu** (cohérent avec « DB = source de vérité, pas de migration
manuelle ») : **corriger l'application**, pas la base. Implémenté :

- **Option A (applied)** — alignement complet sur les noms bas-casse réels de la DB :
  - `src/lib/powersync/schema.ts` : table `cotisations` en colonnes
    `montantobligatoire, montantpaye, datepaiement, notes, createdat, updatedat`
    (comment de contexte ajouté).
  - `src/lib/dataLayer.ts` : `PSCotisation` bas-casse ; `useCotisations`
    normalise les lignes PS vers le type canonique `Cotisation` (camelCase) —
    les deux branches du hook renvoient désormais `Cotisation[]` (UI inchangée) ;
    `addCotisationPS`/`updateCotisationPS` : colonnes + clés bas-casse.
  - `src/lib/cotisation-service.ts` : INSERT `persistCulte` en bas-casse
    (corrige au passage un bug latent : le SQL disait `created_at`/`updated_at`
    alors que la table locale n'a que `createdat`/`updatedat`) ; persistance
    canonique→PS traduite explicitement.
  - `src/capabilities/cotisation/index.ts` : SQL brute (INSERT/UPDATE/SELECT/
    GROUP BY/ORDER BY) en bas-casse ; `rowToCotisation` bas-casse en priorité,
    repli camelCase pour lignes locales héritées.
  - Pages : `CulteDetail` (normalisation `culteId`/`membreId` + clés PS
    `updateCotisationPS`), `Cotisations` (L43 `c.culteId`), `MembreDetail`
    (L80 `c.membreId`), `GroupCotisation` (L97/L249 `c.culteId`).
    Les lectures restantes (SaisieRapide, GroupCotisation L347/387) utilisent
    déjà des motifs de double-lecture `canon ?? snake` → compatibles.
  - Tests : `versement-cotisation.test.ts` L494 → `row.montantobligatoire`
    (le store factice PARSE les colonnes du SQL, donc suit le rename).
- **Note migration locale** : le changement de schéma PowerSync reconstruit la
  table locale `cotisations` au prochain boot (les lignes locales dev sont
  perdues et re-synchronisées depuis le cloud) — attendu, sans action.
- Option B (migration DB) : **non retenue**. Le SQL alternatif reste documenté
  dans `2026-09-13-stabilisation-phase-1-db-audit.md` §4 si on change d'avis.

## RÉSOLU — Drift uuid `created_by_id`/`approved_by_id` (2026-09-13)

Approche « judicieuse » retenue = **bornière d'upload**, zéro changement de
comportement offline :

- `src/lib/powersync/SupabaseConnector.ts` : `sanitizeTransactionsOpData()`
  coercée `created_by_id`/`approved_by_id` à `null` si la valeur n'est pas un
  UUID valide (regex stricte), appliquée sur PUT + PATCH de `uploadData` pour
  la table `transactions` (seul le cas des FK uuid). Colonnes nullable en PG →
  jamais d'« invalid input syntax for type uuid », plus de file d'upload
  bouchée. Les écritures locales conservent l'identité de session texte
  (`"local-user"`), utile pour l'audit offline.
- Aucune migration DB, aucun changement de type TS, aucun flow cassé.
- Conséquence documentée : côté cloud, les acteurs offline non authentifiés
  apparaîtront avec `created_by_id = null` (pas d'altération d'audit : la
  table `audit_entries.user_id` reste en `text`).

Les deux sections « Option B (migration DB) » / « option B2 camelCase guillé »
ci-dessous sont archivées.

## ————— (archive de l'option B, non retenue) —————

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

## Cycle live G3 — résultats partiels (2026-09-13, preview en réseau)

Vérifié via les logs client de la session live :

- **Boot sync** ✅ : `hasSynced: true` dès le premier `statusChanged` ;
  `lastSyncedAt` progresse à chaque connect (15:00 → 18:50 → 18:52) ;
  cycle `connecting → downloading → lastSyncedAt` stable.
- **Erreurs** ✅ : 0 erreur client ; aucune erreur d'upload uuid
  (« invalid input syntax for type uuid » n'apparaît pas — cohérent,
  pas encore d'écritures offline faites dans la session).
- **Bug schéma PowerSync trouvé et corrigé** ⚠️→✅ : warning
  `Schema validation failed — An id column is automatically added, custom id
  columns are not supported`. Cause : 6 tables déclaraient `id: column.text`
  explicitement (`form_definitions`, `form_submissions` dans `schema.ts` ;
  `invitations`, `invitation_claims` dans `invitation-schema.ts` ;
  `organizations`, `org_admins` dans `org-admin-schema.ts`). Les 4 tables
  PG concernées ont bien une colonne `id` pkey → PowerSync l'ajoute
  automatiquement ; les 6 déclarations sont retirées (comment ajouté).
  **Après ce fix, le preview doit être rafraîchi** pour re-initialiser la
  base locale avec le schéma valide (et les colonnes bas-casse
  `cotisations` d'Option A).
- **Restant (nécessite l'UI)** : stabilité login/logout (Pitfall 5), 8 flux
  cloud (G4) — la checklist §Phase 4 reste applicable ; les événements
  `uploading: true` confirmeront le passage de la bornière uuid et du
  naming cotisations au moment des écritures offline.

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
| G3 | Sync : `hasSynced` au boot, cycle offline, stabilité login/logout | ⚠️ boot sync + cycle de connexion **vérifiés en live** ✅ ; stabilité login/logout **⬜** (requiert l'UI) |
| G4 | Les 8 flux passent offline + cloud | offline ✅ ; 2 drifts résolus (Option A + bornière uuid) ; **upload cloud ⬜** (à confirmer via écritures offline en live) |
| G5 | Skeleton structuré par page (shimmer) au 1er chargement | ✅ 12 pages câblées + 19 structures prêtes |
| G6 | Boucle test autonome + rapport final | ✅ ce rapport ; suite vitest/cypress ⬜ (outillage à dispo) |

**Prochaine action conseillée** : DECISION tranchée (Option A + bornière uuid,
§ RÉSOLU). Il reste : (1) rafraîchir le preview pour re-initialiser la base
locale avec le schéma PowerSync corrigé (`id` auto, cotisations bas-casse) ;
(2) faire 1-2 écritures offline (ex. payer une cotisation, créer une
transaction) puis recharger en réseau → contrôler les événements
`uploading: true` et l'absence d'erreurs Supabase pour clôturer G4 ;
(3) test login/logout (Pitfall 5) pour clôturer G3.
