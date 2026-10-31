# PR12 — Import CSV sécurisé (anti-injection de formules)

- **Date** : 2026-10-31
- **Branche** : `agent/pr12-csv-import-securise`
- **Priorité** : P2
- **Statut** : terminé

## Valeur

Permettre l'import en masse de données depuis un tableur (Excel / LibreOffice /
Google Sheets) tout en restant **immunisé contre l'injection de formules** et les
entrées malformées. Cible : **transactions** (entité à plus forte valeur, déjà
validée).

## Ce qui a été livré

### 1. Parseur défensif — `src/lib/csvImport.ts`

- Analyse RFC 4180 : champs entre guillemets, guillemets échappés (`""`),
  fins de ligne CRLF **et** LF, **BOM UTF-8** retiré en tête, délimiteur `;`
  ou `,` auto-détecté.
- **Anti-injection (OWASP, miroir de l'export)** : une cellule commençant par
  `=`, `+`, `-`, `@`, TAB ou CR est traitée comme **texte littéral** — le
  déclencheur est neutralisé (apostrophe de tête via `sanitizeImportedCell`) et
  un **avertissement de nettoyage** est enregistré. Aucune formule n'est jamais
  évaluée.
- **Entrée bornée** : `maxRows` (500), `maxCellLength` (1000), `maxBytes` (2 Mo).
  Un dépassement est refusé proprement.
- **En-tête vérifié** : l'en-tête doit correspondre EXACTEMENT aux colonnes
  attendues (ni manquante, ni superflue), sinon rejet avec message FR explicite.
- Résultat typé `{ ok, rows, errors, warnings }` — **aucune exception**.

### 2. Miroir import de l'export — `src/lib/csv.ts`

Ajout de `startsWithFormulaTrigger()` et `sanitizeImportedCell()` : **même
source de vérité** que `escapeCsvRow` (aucune logique dupliquée). Un
aller-retour export → import → export reste inerte.

### 3. Validation partagée — `src/lib/transaction-service.ts`

Extraction de `validateAddTransaction()` (type, montant > 0 borné via
`policy.transaction.validateAmount`, description, date `AAAA-MM-JJ`, catégorie).
L'import réutilise **exactement** cette source de vérité — il ne contourne
jamais la validation. Re-exportée par `dataLayer.ts`.

### 4. Import ciblé transactions

- `buildTransactionImportPlan()` : convertit chaque ligne (montant FCFA →
  centimes, séparateurs tolérés) puis valide. Une ligne invalide ne porte
  **aucun** `input`.
- **Statut `DRAFT` systématique** — jamais auto-approuvé (contrôle financier).
- `runTransactionImport(plan, persist)` : écrit **uniquement** les lignes
  valides via la fonction de persistance injectée (testable sans PowerSync).
  Une erreur d'écriture est rapportée sans interrompre les lignes suivantes.

### 5. UI — `src/components/CsvImportPanel.tsx`

Monté dans **Paramètres → Gérer → Sauvegarde des données**
(`src/pages/SettingsGestion.tsx`), à côté de l'export existant.

- Affordance « Importer des transactions (CSV) » + « Télécharger le modèle ».
- **Prévisualisation** (5 premières lignes) + **rapport d'erreurs par ligne**
  AVANT toute écriture, puis confirmation explicite.
- Toasts FR (succès / partiel / échec) ; erreurs instrumentées via
  `captureClientError`.
- Gated par `featureFlags` (`csv-import`, fail-open) et par la permission
  canonique `transaction:create` (`security.hasPermission`).
- Jetons de design uniquement (`var(--…)`).

## Garde-fous respectés

| Règle | Application |
|---|---|
| Réutilisation | `csv.ts` (échappement), `validateAddTransaction` (validation), `dataLayer` (écriture synchronisée), `captureClientError`, `toast`, `Skeleton` |
| RBAC canonique | `security.hasPermission(role, "transaction:create")` — pas de matrice dupliquée |
| Kill switch | `isFeatureEnabled("csv-import")` (fail-open) |
| CSV via `csv.ts` | oui — sanitisation import = miroir exact de l'export |
| Erreurs | jamais avalées (`captureClientError` sur lecture + écriture) |
| FR-only | toute l'UI et les messages d'erreur sont en français |
| Tokens | `var(--…)` uniquement, aucune couleur brute |
| Minimal | aucun refactor hors périmètre |

Aucune migration Supabase ni modification du schéma PowerSync : l'import écrit
via la couche existante (`addTransaction` → `addTransactionPS`), donc l'audit et
les notifications sont **automatiques** (déclencheur `on_transaction_change`,
migration `0012`).

## Tests

| Fichier | Cas | Nature |
|---|---|---|
| `src/lib/__tests__/csv-import.test.ts` | 24 | module pur (parseur + plan + exécution) |
| `src/components/__tests__/CsvImportPanel.test.tsx` | 6 | comportement UI (jsdom) |

Cas clés :
- guillemets / `""` / BOM / CRLF / délimiteur `,` ;
- `=SUM(1+1)` importé comme **texte littéral** (`'=SUM(1+1)`) + avertissement ;
- en-tête non conforme → rejet FR, aucun bouton d'import ;
- entrée hors bornes (lignes / octets / cellule) → rejet propre ;
- ligne invalide **jamais écrite** (`persist` non appelé) ;
- aucune écriture AVANT confirmation ;
- toute ligne importée en `DRAFT`.

### Non-vacuité (prouvée, puis restaurée)

1. retirer `sanitizeImportedCell` dans `parseTransactionCsv` ⇒ tests
   « neutralisation `=`/`+`/`-`/`@` » **échouent** (2 échecs mesurés) ;
2. neutraliser le contrôle d'en-tête ⇒ tests « en-tête invalide » **échouent**
   (2 échecs mesurés) ;
3. écrire toutes les lignes (ignorer `status !== "valid"`) ⇒ test « ligne
   invalide non écrite » **échoue** (1 échec mesuré).

## Fichiers modifiés / créés

- `src/lib/csvImport.ts` (nouveau)
- `src/components/CsvImportPanel.tsx` (nouveau)
- `src/lib/csv.ts` (ajout `startsWithFormulaTrigger`, `sanitizeImportedCell`)
- `src/lib/transaction-service.ts` (ajout `validateAddTransaction`, `TransactionInput`)
- `src/lib/dataLayer.ts` (re-export `validateAddTransaction`)
- `src/pages/SettingsGestion.tsx` (montage du panneau)
- `src/pages/Tutorial.tsx` (section « Importer des transactions (CSV) »)
- `src/lib/__tests__/csv-import.test.ts` (nouveau)
- `src/components/__tests__/CsvImportPanel.test.tsx` (nouveau)
- `docs/agent/COVERAGE_MATRIX.md`, `docs/agent/PROGRESS.md`

## Gates

- `npx tsc -b --force --noEmit` — 0 erreur
- `npm run lint` — 0 erreur
- `npx vitest run` — suite verte
- `npm run build` — OK
