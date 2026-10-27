# Receipt — R73 : hygiène du dépôt (artefacts de build suivis par git)

- **Date** : 2026-10-26
- **Branche** : `agent/r73-repo-hygiene`
- **Tâche** : R73 (P3, hygiène) — retirer du suivi git les artefacts générés
  volumineux et fuiteurs de chemins locaux.
- **Statut** : **terminé**.

## Défaut

`graphify-out/` (graphe de connaissance généré) était **suivi par git** :
**1980 fichiers, 59 Mo**, dont un cache de 44 Mo et `graph.json` de 15 Mo. Il
contient des chemins absolus de la machine du développeur
(`C:\Users\joyda\dyad-apps\lumina\…`). Le `.gitignore` ne couvrait que
`graphify-out/cache/`.

Artefacts connexes de la même classe :

- `Usersjoydadyad-appsluminabundle-analysis.html` (1,6 Mo) + `…-list.json`
  (204 Ko) — rapports du Vite bundle visualizer, chemin local aplati dans le nom ;
- `test_ps.db` — base SQLite PowerSync locale.

## Correctif

1. `.gitignore` : `graphify-out/` (couvre cache + `graph.json` + rapport),
   `*bundle-analysis*`, `test_ps.db`.
2. `git rm -r --cached graphify-out` + `git rm --cached` des 3 fichiers
   parasites — **fichiers conservés sur disque**, simplement plus suivis.
3. README : retrait de la ligne citant `graphify-out/GRAPH_REPORT.md`.

## Vérifications

| Contrôle | Résultat |
|---|---|
| Références build/CI/tests/scripts aux artefacts | **aucune** (`grep` vide) |
| `git check-ignore` sur les 4 motifs | tous ignorés |
| Fichiers encore présents sur disque | oui (non suivis) |
| `npx tsc -b` | 0 erreur |
| `npx vitest run` | inchangé (voir PROGRESS) |

## Gain

- ~61 Mo retirés de l'index git (clone plus léger, ~1983 fichiers en moins).
- Plus de chemins absolus de la machine du dev dans l'arbre suivi.
- Scan de secrets sans faux positifs sur `graphify-out/`.

## Honnêteté (R12)

- **[Prouvé]** : les artefacts ne sont référencés nulle part (build/CI/tests) ;
  ils restent disponibles localement (régénérables via `graphify update .`).
- **[Limite]** : `git rm --cached` ne réécrit pas l'historique — les blobs
  restent dans les objets des commits passés (réécriture = opération
  destructive, hors périmètre sans décision propriétaire). Le clone courant
  reste donc lourd jusqu'à un `git gc`/reflog expiry côté serveur.
