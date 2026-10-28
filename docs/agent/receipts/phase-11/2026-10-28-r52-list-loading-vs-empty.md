# Reçu — phase 11 / R52.b + R52.c : « en cours de lecture » ≠ « vide »

- **Date** : 2026-10-28
- **Branche** : `agent/r52-list-loading-vs-empty`
- **Famille** : « déclaré mais jamais câblé » (R105/R106/R107/R108/R113/R126/R127)

## Défaut

Trois écrans confondaient « la liste n'a pas encore été lue » avec « la liste
est vide », et annonçaient donc un fait **faux** pendant le chargement :

| Écran | Message faux pendant la lecture | Ressource de chargement disponible mais ignorée |
|---|---|---|
| `/giving` (4 onglets) | « Aucune campagne », « Aucun donateur », … | `isLoading` des 4 hooks + `ListSkeleton` **non câblé** |
| `/membre/:id` | « Membre introuvable » | `MembreDetailSkeleton` **non câblé** |
| `/membres/en-avance` | « Aucun membre en avance » **et total à 0** | `MembresEnAvanceSkeleton` **non câblé** |
| `/budgets` | « Aucun budget » | `isLoading` des 2 hooks + `ListSkeleton` **non câblé** |
| `/reports/builder` | « Aucun rapport sauvegardé » | `reportDefinitionRepo.list()` en cours + `ListSkeleton` |
| `/admin/organizations/:id` | « aucun admin » / « aucun candidat » | `Promise.all` en cours + `ListSkeleton` |
| `/budget/:id` | « Budget introuvable. » | `isPowerSyncReadyNow()` absent |
| `/giving/campaign/:id` | « Campagne introuvable. » | `isPowerSyncReadyNow()` absent |
| `/admin/roles` | « Aucun membre » | `isPowerSyncReadyNow()` absent |
| `/cultes/:id` | « Culte introuvable » | `isPowerSyncReadyNow()` absent |
| `/groups/:id/cotisation` | « Groupe introuvable. » | `isPowerSyncReadyNow()` absent |
| `/transaction/:id` | « Transaction introuvable » | `isPowerSyncReadyNow()` absent |
| `/saisie-rapide/:id` | « Culte introuvable. » | `isPowerSyncReadyNow()` absent |

Le cas est piégeux : les hooks PowerSync renvoient `data: []` **ET**
`isLoading: true` tant que la première lecture n'a pas abouti. Lire `data`
seul produit un état vide indétectable du vrai état vide.

## Correctif (minimal, sans changement de données)

- `Giving.tsx` : composant local `ListArea({ loading, isEmpty, empty, children })`
  — `loading` → `ListSkeleton` (déjà présent, désormais câblé) ; `isEmpty` →
  état vide ; sinon contenu. Appliqué aux 4 onglets.
- `MembreDetail.tsx` : garde `isPowerSyncReadyNow()` (le motif **déjà éprouvé**
  dans `EventDetail.tsx:92`) → `MembreDetailSkeleton` tant que la réplique
  n'est pas disponible ; « Membre introuvable » seulement ensuite.
- `MembresEnAvance.tsx` : même garde → `MembresEnAvanceSkeleton`.
- `Budgets.tsx` : `ListSkeleton` pendant `budgetsLoading || linesLoading`.
- `ReportBuilder.tsx` : drapeau `reportsLoaded` posé dans un `finally`.
- `CentralAdmin.tsx` : drapeau `detailLoaded` posé dans un `finally`.
- `BudgetDetail.tsx` / `GivingCampaign.tsx` : garde `isPowerSyncReadyNow()`.
- `OrgRoles.tsx` : garde `isPowerSyncReadyNow()` sur la liste des membres.
- `OrgReportDetail.tsx` : **déjà** couvert (drapeau `loading`) — rien changé.
- `CulteDetail.tsx` / `GroupCotisation.tsx` / `TransactionDetail.tsx` /
  `SaisieRapide.tsx` : garde `isPowerSyncReadyNow()`.

## Garde anti-récurrence

Neuf rechutes (R52.b → R52.i) justifient une garde **statique** :
`src/lib/__tests__/r52-readiness-guard.test.ts` échoue si une page affiche
« introuvable » sans aucun signal de disponibilité. Allowlist motivée :
`NotFound.tsx` (le verdict est la route), `Tutorial.tsx` (contenu pédagogique).
Non-vacuité : une page sonde fautive fait échouer la garde.

Deux mocks de tests préexistants ont dû être complétés
(`isPowerSyncReadyNow: () => true` dans `CulteDetail-hooks.test.tsx`) : ces tests
portent sur le comportement **après** lecture (Rules of Hooks), pas sur la
fenêtre de chargement — ils restent significatifs.

Les deux drapeaux sont posés dans un `finally` : un échec de lecture ne
laisse jamais un squelette **infini** (le message vide devient alors exact).

Aucune donnée, aucun schéma, aucune migration touchés.

## Preuve

| Vérification | Résultat |
|---|---|
| `npx tsc -b` | **0** |
| `npx eslint src` | **0 erreur** (warnings préexistants) |
| `npx vitest run` | **1610/1610** (132 fichiers) |
| Non-vacuité (retrait du câblage) | les **13** assertions « squelette » échouent |

Nouveaux tests :
- `src/pages/__tests__/Giving-loading.test.tsx` (2) — chargement → squelette
  **et** lecture terminée → état vide exact ;
- `src/pages/__tests__/list-loading-vs-empty.test.tsx` (6) — idem pour
  `/membre/:id`, `/membres/en-avance` et `/budgets` ;
- `src/pages/__tests__/async-loading-vs-empty.test.tsx` (2) — lecture
  asynchrone hors hooks (`/reports/builder`, `/admin/organizations/:id`).

Les deux directions sont verrouillées : un correctif qui afficherait le
squelette **à tort** (état vide réel masqué) échoue aussi.

## Limite assumée

La preuve E2E de `/sessions` (R52.a) reste rouge : la réplique PowerSync ne se
peuple pas dans l'environnement de test (R53/R98). Le correctif produit est en
place et couvert par un test unitaire de comportement, pas par un test E2E.
