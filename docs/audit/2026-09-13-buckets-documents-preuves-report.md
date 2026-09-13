# Rapport — Buckets Supabase, documents & preuves de dépenses

Date : 2026-09-13 · Scope : 3 buckets Storage + table `documents` + UI d'upload
(nav bar / header fixés en même passe)

## 1. Ce qui a été livré

### 1.1 Buckets Supabase Storage
| Bucket | Visibilité | Contenu |
|---|---|---|
| `logos` | **public** | Logos de l'église / organisation uploadés par l'utilisateur |
| `archives` | privé | Documents archivés (nom + objet), téléchargement via URL signée |
| `expense_proofs` | privé | Photos-preuves de dépenses (reçus, factures) |

Politiques RLS `storage.objects` (restreintes aux 3 buckets) :
- `lumina_storage_read` : SELECT — `anon` + `authenticated`
- `lumina_storage_write` : INSERT — `anon` + `authenticated`
- `lumina_storage_delete` : DELETE — `authenticated`

### 1.2 Table `documents` (métadonnée, synchronisable)
Colonnes : `id` (pkey), `org_id`, `title`, `purpose` (objet), `bucket`,
`file_path`, `file_size` (bigint), `mime_type`, `entity_type`
(`ARCHIVE_DOC|EXPENSE_PROOF|LOGO|OTHER`), `entity_id`, `status`
(`ACTIVE|ARCHIVED|DELETED` — soft-delete), `uploaded_by` (uuid, nullable),
`created_at`, `updated_at`.
- Indexes : `idx_documents_org`, `idx_documents_entity`.
- Grants : `authenticated` (select/insert/update), `service_role` (full),
  `powersync_role` (select).
- RLS : `documents_select/insert/update` via `is_org_member(auth.uid(), org_id)`.
- Publication PowerSync `powersync` (FOR ALL TABLES) la couvre automatiquement.

### 1.3 Schéma PowerSync + hooks
- `schema.ts` : table `documents` ajoutée à `AppSchema`.
- `dataLayer.ts` : `PSDocument`, `useDocuments(opts?)`,
  `addDocumentPS`, `updateDocumentPS`.
- `SupabaseConnector.ts` : bornière uuid étendue —
  `documents.uploaded_by` coercée vers `null` si non-UUID (comme
  `transactions.created_by_id/approved_by_id`).

### 1.4 Accès Storage
`src/lib/storageService.ts` :
- `uploadLuminaFile(bucket, file, subpath?)` → chemin final (préfixe org).
- `getDocumentUrl(bucket, path)` → public (logos) ou URL signée 30 min.
- `deleteLuminaFile(bucket, path)`.

### 1.5 UI
- **Archives** : onglet « Documents » — formulaire (nom du document,
  objet, fichier), upload dans `archives`, liste (titre/objet/date/taille),
  télécharger (URL signée), archiver/rétablir (statut).
- **TransactionNew (dépense)** : section « Preuve de la dépense »
  (prise de photo / galerie, aperçus, suppression). À l'enregistrement,
  chaque photo est montée dans `expense_proofs` + métadonnée `documents`
  liée à la transaction (`entity_type=EXPENSE_PROOF`, `entity_id=txId`).
  Redirection vers le détail de la transaction.
- **TransactionDetail** : bloc « Preuve de la dépense » — vignettes
  (URL signée) + boutons Télécharger. Repli hors-ligne (icône, pas de crash).
- **Settings** : l'upload du logo église part dans `logos` (URL publique) ;
  repli base64 hors-ligne. Logo affichée dans `TopHeader` (à côté du logo
  Lumina).

## 2. Fixes nav bar + header (même demande)

- **Nav bar** : confirmée par e2e — `ion-tab-bar` visible, collé en bas du
  viewport sur `/dashboard`. Présente sur toutes les pages principales.
- **Header** : suppression du `IonHeader` dupliqué (bandeau par défaut
  empilé au-dessus de `TopHeader`) sur **26 pages** qui utilisent
  `TopHeader`. Plus un seul header ; boutons Notifications/Paramètres
  avec bordure + `title` explicite. `ion-content ion-header` rendu sticky
  (`src/ionic/theme.css`).

## 3. Vérifications
- `run_type_checks` : 0 erreur.
- `run_build` : OK (Vite + Nitro).
- e2e `e2e-tests/nav-header.spec.ts` : 2/2 verts
  (nav visible en bas ; header unique + boutons labellisés).
- Mocks vitest alignés : `core-components.test.tsx` (+`useAppConfig`) et
  `policy-wiring.test.tsx` (+`useOnlineStatus`, +`addDocumentPS`).

## 4. Limites & précautions
- **Stockage binaire = réseau requis** : aucun binaire n'est persisté
  localement ; hors-ligne, l'envoi d'une photo/du document échoue et un
  message l'indique (la métadonnée `documents` reste synchronisable).
- **Buckets privés** : le téléchargement des `archives` / `expense_proofs`
  passe par URL signée (30 min) — indisponible hors-ligne.
- **RLS storage ouverte (anon)** : alignée avec le modèle « local-first,
  RLS open » du projet ; resserrable ultérieurement en `authenticated`
  uniquement si le multi-org devient strict.
- La table `documents` n'est pas encore consommée par les rapports PDF ;
  l'API `useDocuments` est prête pour l'étendre.
