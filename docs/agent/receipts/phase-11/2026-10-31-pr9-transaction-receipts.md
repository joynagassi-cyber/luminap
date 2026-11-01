# PR9 — Pièces justificatives (reçus) sur transactions

- **Date** : 2026-10-31
- **Branche** : `agent/pr9-transaction-receipts`
- **Contrat** : `docs/agent/PROPOSALS.md` → PR9 (priorité P2, dépendance : storage)
- **Valeur** : attacher un justificatif (image ou PDF) à une transaction, pour la
  conformité comptable — la preuve de chaque dépense est rattachée à la
  transaction, sans paperasse séparée.

## Ce qui a été livré

### 1. Table `transaction_attachments` (migration `20261031000008`)

Table **dédiée** reliée par clé étrangère à `transactions(id)` (TEXT, comme la PK
de `transactions`), `ON DELETE CASCADE` :

| colonne | type | rôle |
|---|---|---|
| `id` | text PK | identifiant de ligne (généré client) |
| `org_id` | text NOT NULL | isolation multi-tenant |
| `transaction_id` | text NOT NULL → `transactions(id)` | FK, cascade |
| `path` | text NOT NULL | chemin du blob dans le bucket `expense_proofs` |
| `mime` | text | type MIME du fichier |
| `size` | bigint | taille en octets |
| `uploaded_by` | uuid | auteur (coercé à `null` si identifiant offline non-UUID) |
| `created_at` | timestamptz | date d'ajout |

**Pourquoi une table dédiée plutôt que `documents` (`entity_type='EXPENSE_PROOF'`)** :
il existait déjà une preuve de dépense portée par `documents` (`entity_id`=id de
transaction), **mais** cette table n'a aucune clé étrangère vers `transactions`,
aucun index sur `entity_id`, et surtout **n'est reliée à aucune transaction par un
lien fort** — et surtout son stream n'est pas dans le sync config (les lignes ne
sont donc pas lisibles côté client pour lister les justificatifs d'une
transaction). La table dédiée donne la garantie d'intégrité (FK + cascade) et la
synchronisation.

**Sécurité (RLS)** — pattern `event_tasks` (`FORCE ROW LEVEL SECURITY`, une policy
par commande) :
- `SELECT` : tout membre de l'organisation (`is_org_member`);
- `INSERT` / `DELETE` : membre **et** `has_permission(uid, org, 'transaction', 'update')`.

Le chemin d'écriture applicatif passe par PowerSync (rôle `BYPASSRLS`) ; ces
policies ferment le client REST direct. Grants : `anon/authenticated/service_role`
(Data API) + `powersync_role` (réplication, convention du dépôt).

### 2. Stream PowerSync `transaction_attachments` (sync config déployé)

Ajouté à `powersync/sync-config.yaml` (`auto_subscribe: true`, borné à
l'organisation via `profiles`). **Déployé sur Production** le 2026-10-31.

### 3. Déblocage : grants de réplication (migration `20261031000009`)

`powersync deploy` échouait en `permission denied for table org_settings` : la
table `org_settings` (PR #162) n'avait de grant que pour `powersync_role`, alors
que l'instance Production se connecte avec un rôle de réplication **propre à
l'instance** (`powersync_28d1d97617993b66d4ee0a3b`). La migration accorde
`SELECT` à **tout** rôle dont le nom commence par `powersync` (générique,
idempotent) pour `transaction_attachments` **et** `org_settings`. Le sync config a
pu être déployé (`✓ Validate Sync Config`, diff = ajout du seul stream PR9).

### 4. Service `src/lib/receipts.ts`

- `listReceipts(txId)` — lignes de **cette** transaction, bornées à l'org ;
- `addReceipt(txId, file)` — valide (taille ≤ 10 Mo, MIME images/PDF **et**
  extension), upload le blob via `storageService` (`uploadLuminaFile`,
  bucket `expense_proofs`, sous-chemin `tx/<txId>`), puis insère la ligne ;
- `removeReceipt(id)` — supprime la ligne puis le blob (best-effort instrumenté) ;
- `purgeReceiptsForTransaction(txId)` — purge lignes + blobs (suppression de la
  transaction : pas de blob orphelin) ;
- `useReceipts(txId)` — hook réactif, `isLoading` **vrai** tant que la réplique
  n'a pas répondu (règle R52).

Aucune seconde mécanique d'upload : tout passe par `storageService`, comme
`DocumentPicker`.

### 5. UI `JustificatifsSection` dans `TransactionDetail`

Section « Justificatifs » : liste (aperçu image / lien signé), bouton « Ajouter un
justificatif » (`<input type=file>`, `accept` borné), bouton de suppression.
**R52** : squelette (`ListSkeleton`) tant que la réplique n'a pas répondu — jamais
un faux « aucun justificatif ».

### 6. Suppression de transaction → purge des blobs

`TransactionDetail.handleDelete` appelle `purgeReceiptsForTransaction(tx.id)`
avant `deleteTransactionPS`. Un échec de suppression de blob est instrumenté via
`captureClientError` (jamais avalé), sans bloquer la suppression.

## Tests (comportementaux, non-vacuité prouvée)

- `src/lib/__tests__/receipts.test.ts` (12) : PowerSync **stateful** (les vraies
  requêtes SQL sont exercées). Couvre : validation taille/MIME (rejet `.exe` et
  fichier > 10 Mo), ajout (upload + ligne, mime/taille conservés), cloisonnement
  (`listReceipts` ne renvoie que la transaction demandée), suppression ligne+blob,
  instrumentation d'un échec de blob, purge.
- `src/components/__tests__/justificatifs-loading.test.tsx` (3) : squelette avant
  la première lecture, verdict vide une fois la lecture terminée, liste lue.

**Non-vacuité (mesurée, chaque retrait fait échouer un test nommé)** :

| retrait | tests qui échouent |
|---|---|
| contrôle de taille dans `validateReceiptFile` | « rejette un fichier trop volumineux » (×2) |
| contrôle MIME/extension | « rejette un exécutable (.exe) » (×2) |
| filtre `transaction_id` de `listReceipts` | « ne renvoie QUE … » + « purge » |
| `deleteLuminaFile` dans `removeReceipt` | « supprime la ligne ET le blob » + « instrumente un échec » |
| branche `isLoading` du composant | « n'annonce pas “Aucun justificatif” avant la première lecture » |

## Portes (toutes vertes)

- `npx tsc -b --force --noEmit` → 0 erreur
- `npm run lint` → 0 erreur
- `npx vitest run` → 170 fichiers, 1810 verts / 6 ignorés
- `npm run build` → succès
- `powersync deploy` → succès (stream déployé)

## Fichiers

- `supabase/migrations/20261031000008_transaction_attachments.sql` (+ rollback)
- `supabase/migrations/20261031000009_powersync_replication_grants.sql` (+ rollback)
- `powersync/sync-config.yaml` (stream `transaction_attachments`)
- `src/lib/receipts.ts` (nouveau)
- `src/components/JustificatifsSection.tsx` (nouveau)
- `src/pages/TransactionDetail.tsx` (section + purge à la suppression)
- `src/lib/powersync/schema.ts` (table client)
- `src/lib/powersync/SupabaseConnector.ts` (sanitizer `uploaded_by` uuid)
- `src/pages/Tutorial.tsx` (section « Justificatifs (reçus) »)
- `docs/agent/COVERAGE_MATRIX.md`, `docs/agent/PROGRESS.md`, `docs/agent/migration-drift.json`
- tests : `src/lib/__tests__/receipts.test.ts`, `src/components/__tests__/justificatifs-loading.test.tsx`
