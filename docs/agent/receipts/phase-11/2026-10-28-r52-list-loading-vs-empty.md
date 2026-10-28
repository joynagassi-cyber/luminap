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

Aucune donnée, aucun schéma, aucune migration touchés.

## Preuve

| Vérification | Résultat |
|---|---|
| `npx tsc -b` | **0** |
| `npx eslint src` | **0 erreur** (warnings préexistants) |
| `npx vitest run` | **1597/1597** (130 fichiers) |
| Non-vacuité (retrait du câblage) | les **3** assertions « squelette » échouent |

Nouveaux tests :
- `src/pages/__tests__/Giving-loading.test.tsx` (2) — chargement → squelette
  **et** lecture terminée → état vide exact ;
- `src/pages/__tests__/list-loading-vs-empty.test.tsx` (4) — idem pour
  `/membre/:id` et `/membres/en-avance`.

Les deux directions sont verrouillées : un correctif qui afficherait le
squelette **à tort** (état vide réel masqué) échoue aussi.

## Limite assumée

La preuve E2E de `/sessions` (R52.a) reste rouge : la réplique PowerSync ne se
peuple pas dans l'environnement de test (R53/R98). Le correctif produit est en
place et couvert par un test unitaire de comportement, pas par un test E2E.
