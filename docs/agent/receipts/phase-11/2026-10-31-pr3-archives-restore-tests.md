# Receipt — Phase 11 : corbeille / restauration (PR3) — tests du câblage UI

- **Date** : 2026-10-31
- **Branche** : `agent/pr3-archives-tests`
- **Proposition source** : PR3 (« Corbeille / restauration (soft-delete) »), P2.
- **Statut** : terminé (PR brouillon ouverte).

## Problème

La corbeille existe déjà : `src/pages/Archives.tsx` liste les entités archivées
(groupes, membres, événements, documents) et appelle `lifecycle.restore(...)`.
La logique est couverte (`src/capabilities/__tests__/lifecycle.test.ts`).

MAIS le **câblage de la page** n'avait AUCUN test, et PR3 n'avait aucune ligne
dans `COVERAGE_MATRIX.md`. Le contrat impose : « toute feature effectivement
implémentée doit avoir ses tests, son tutoriel (Phase 13) et sa ligne dans
COVERAGE_MATRIX.md ». Sans test de page, un bouton « Restaurer » rendu inerte
(régression type R52) serait passé inaperçu.

## Livré

| Fichier | Rôle |
|---|---|
| `src/pages/__tests__/Archives-restore.test.tsx` | 3 tests : listing, restauration (bon type + id), filtre par type |
| `docs/agent/COVERAGE_MATRIX.md` | 1 ligne (Phase 11, PR3) |
| `docs/agent/PROGRESS.md` | 1 ligne (Phase 11, PR3) |

Le tutoriel existe déjà (`src/pages/Tutorial.tsx`, section « Archives »).

## Non-vacuité

Vérifiée : remplacer le corps de `handleRestore` par `navigate(-1)` seul fait
échouer le test « Restaurer appelle lifecycle.restore » (1 échec), puis
restauration du code → 3/3 verts.
