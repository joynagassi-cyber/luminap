# Receipt — Phase 12 : P39 — isolation E2E (chaque spec nettoie ses artefacts)

- **Date** : 2026-10-29
- **Branche** : `agent/p39-e2e-isolation`
- **Objet** : rendre chaque spec Cypress **auto-nettoyant** (archivage, jamais
  de suppression destructive) via un helper partagé.
- **Priorité** : P1 (HAUTE).

## Défaut visé (classe, pas instance)

La suite Cypress crée des données **RÉELLES** dans l'organisation de test
« Lumina Org E2E » (`org-e2e`) et ne les nettoie **jamais**. Rien ne borne le
volume : chaque `cypress run` ajoute sa couche, la base de test ne converge pas.

### Mesure (2026-10-29)

| Artefact | Volume résiduel |
|---|---|
| Groupes « Jeunesse … » | **84** (mission) |
| Événements « Event Persist F5 » | **54** (mission) |
| Annexes « Annexe A/B … » (organisations) | plusieurs, dont `PENDING` |
| `CalEvent …` (performance-batch) | milliers cumulés |
| Membres « E2e… » | centaines cumulés |

> Les compteurs vivants **fluctuent** d'un run à l'autre (des nettoyages
> manuels partiels ont eu lieu). La mesure de référence est celle de la
> mission ; le point structurel — *aucun spec ne se nettoie* — est visible dans
> le dépôt, indépendamment des compteurs.

### Conséquences

- La base de test est polluée (listes illisibles, assertions dépendantes du
  volume — listes tronquées à 50 — instables).
- Le défaut est **structurel** : il revient à chaque exécution, y compris en CI.

## Correctif

### 1. Helper partagé `cypress/support/e2eCleanup.ts`

Commande `cy.cleanupTestArtifacts(options)` + registre `trackTestArtifact()` :

- **Non fatal par construction** : le corps s'exécute dans le **contexte
  navigateur** via `window.fetch` (pas `cy.request`), entièrement enveloppé
  dans un `try/catch`. Un échec RLS/réseau/session est **loggé**, jamais fatal.
- **Périmètre « run courant » uniquement** :
  - chemin **exact** par id suivi (`trackTestArtifact` / `options.ids`) ;
  - **repli par préfixe de nom** si le test échoue avant de capturer l'id ;
  - **borne temporelle stricte** `sinceIso` (`created_at >= instant du run`) —
    indispensable pour les noms déterministes (« Event Persist F5 ») et les
    suffixes `Date.now()` sur 6 chiffres (qui se répètent toutes les ~16,7 min).
- **Archivage, jamais de suppression destructive** pour les entités
  archivable ; suppression ciblée uniquement là où il n'existe pas de statut
  d'archivage.

| Table | Statut terminal | Source |
|---|---|---|
| `groups` | `ARCHIVED` | `groups_status_check` |
| `members` | `ARCHIVED` | `members_status_check` |
| `organizations` | `ARCHIVED` | `organizations_status_check` |
| `accounts` | `ARCHIVED` | `accounts` (ACTIVE/ARCHIVED) |
| `form_definitions` | `ARCHIVED` | `form_definitions_status_check` |
| `events` | **`CANCELLED`** | `capabilities/lifecycle` — les événements n'ont pas d'`ARCHIVED` |
| `transactions` | *aucun* | suppression ciblée `DRAFT`/`PENDING` uniquement (jamais `APPROVED` — la base le refuse déjà) |
| `org_units`, `caisses`, `custom_field_definitions`, `form_submissions` | *aucun* | suppression ciblée du run |

### 2. Câblage `after()` dans les specs créateurs de données

Liste confirmée par grep des créations (`cy.contains('Créer')`, POST REST,
`addTransactionPS`) :

- `org-reports.cy.ts` (annexes A/B — reprend/durcit le nettoyage R96)
- `groups-events.cy.ts` (groupes + événements)
- `events-tasks.cy.ts` (événement)
- `persistence.cy.ts` (événement « Event Persist F5 »)
- `performance-batch.cy.ts` (transactions + événements `CalEvent`)
- `members.cy.ts` (membre)
- `forms-v2.cy.ts` (soumissions de la fixture partagée)
- **élargissements mesurés** : `cloud-sync.cy.ts` (groupe/compte/caisse/org_unit/
  custom field POSTés en REST), `cross-tenant.cy.ts` (événement),
  `comprehensive-flow.cy.ts` (transaction), `forms-fields.cy.ts` (champ
  personnalisé).

### 3. Limite documentée — E5 (réplique PowerSync)

Si la réplique PowerSync ne se peuple pas (blocage d'auth R132/E5,
`connected:false`), les écritures de test peuvent ne **jamais** atteindre
Supabase. Dans ce cas `cleanupTestArtifacts` ne trouve rien à archiver : c'est
un **no-op loggé**, pas un échec — comportement voulu (on ne peut pas vérifier
une écriture qui n'a pas eu lieu). Le hook reste **non fatal**.

## Non-vacuité prouvée

Garde statique `src/lib/__tests__/p39-e2e-cleanup-guard.test.ts` (14 tests) :

- vérifie l'existence + l'enregistrement de la commande ;
- exige, pour chaque spec de la liste, un `after(` **et** un
  `cy.cleanupTestArtifacts(` ;
- interdit une suppression REST globale dans un spec nettoyeur.

Preuve de non-vacuité : `groups-events.cy.ts` modifié temporairement
(`cy.cleanupTestArtifacts(` → `cy.CLEANUP_DISABLED(`) → **1 échec**
(« groups-events.cy.ts archive ses artefacts dans un hook after() ») ;
restauré → **14/14**.

## Gates

- `npx tsc -b --force` → **0 erreur**.
- `npx eslint <fichiers modifiés>` → **0 erreur** (warnings `any` pré-existants).
- `npx vitest run src/lib/__tests__/p39-e2e-cleanup-guard.test.ts` → **14/14**.

## Limites / hors périmètre

- La « suite Cypress verte » reste bloquée par l'environnement E2E (R98 /
  ESCALATIONS E2), indépendamment de ce correctif.
- Aucune donnée de production ni la base Supabase n'a été modifiée (pas de
  `db push`, aucun DDL). Les migrations existantes suffisent (toutes les
  colonnes d'archivage sont déjà présentes).
