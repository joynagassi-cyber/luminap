# Receipt — R17 : durcissement de la garde anti-dérive (empreinte de l'ensemble)

- **Date** : 2026-10-29
- **Branche** : `agent/r17-drift-fingerprint`
- **Classe** : garde qui **passe sans rien vérifier** dans un cas non couvert
  (variante de R116/R134 — « filet déclaré, jamais déclenché »).

## Défaut

`migration-drift-guard.test.ts` comparait l'instantané au dépôt par des
**comptes** : `repo_timestamped_files` (63), `repo_sequential_files` (63),
`repo_total_sql_files` (126). Une **substitution net-zéro** — retirer une
migration horodatée et en ajouter une autre — laisse les 3 comptes **inchangés**
→ les 3 tests restent **verts** alors que l'ensemble des versions a changé
(dérive R17 invisible).

## Correctif

- `docs/agent/migration-drift.json` : ajout du champ `repo_filenames_sha256`
  (SHA-256 de l'ensemble trié des noms `*.sql`, séparateur `\n` + `\n` final).
- `migration-drift-guard.test.ts` : 4ᵉ test qui compare l'empreinte calculée à
  l'empreinte figée ⇒ **toute** modification de l'ensemble (ajout, retrait,
  renommage, substitution) échoue et force une re-mesure.

## Gates (mesurés localement)

| Gate | Commande | Sortie | Extrait |
|---|---|---|---|
| Garde R17 (après correctif) | `vitest run migration-drift-guard` | **0** | `4 passed` |
| Empreinte JS == shell | `node` vs `sha256sum` | identiques | `8f93962d…cd07` |
| Mutation : **substitution net-zéro** (retirer 1 horodaté, ajouter 1) | `vitest run` | **1 failed** | échec **uniquement** sur le test d'empreinte ; **les 3 tests de comptage restent verts** |
| Mutation : ajout simple (+1 fichier) | `vitest run` | **2 failed** | comptage **et** empreinte |

## Preuve que le trou était réel

La mutation « net-zéro » est le cas décisif : **avant** le correctif, elle
passait les 3 tests de comptage. **Après**, elle est attrapée par le seul test
d'empreinte (les 3 comptages restant verts) — le correctif comble exactement le
trou, sans faire échouer le reste.

## Risque résiduel

- R17 lui-même reste **ouvert** (régularisation de l'historique = décision
  propriétaire). Cette tâche ne fait que rendre la garde non contournable.
