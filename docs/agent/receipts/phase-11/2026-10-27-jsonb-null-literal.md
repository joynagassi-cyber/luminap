# Phase 11 — correctif R65 (rechute) : littéral jsonb `"null"` dans `audit_entries`

- **Date** : 2026-10-27
- **Branche** : `agent/phase-11-jsonb-null-literal`
- **Priorité** : P1 (intégrité des données ; invariant d'audit)
- **Statut** : terminé (writer corrigé + données rattrapées + invariant vérifié)

## Défaut

Découvert par le **cold-test du RUNBOOK** (branche `agent/phase-11-runbook-cold-test`) :
la requête d'intégrité jsonb « doit toujours renvoyer 0 » renvoyait **88** sur
`audit_entries.before_state`.

Caractérisation (SQL) : 88 lignes `jsonb_typeof = 'string'`, **toutes** valant
littéralement `"null"` — 84 `Invitation` + 4 `FormSubmission`, toutes en action
`CREATE`, du 2026-10-24 au 2026-10-27. `after_state` = 0.

## Cause racine

`src/lib/audit.ts#write` passait `JSON.stringify(fullEntry.beforeState)` en
paramètre SQL. Pour un `CREATE`, `beforeState` vaut `null`, et
`JSON.stringify(null)` renvoie la **chaîne** `"null"` — stockée en jsonb de type
`string` au lieu de `NULL`.

La migration `20261024000001` (R65) convertissait déjà ce cas
(`before_state = 'null'::jsonb`) et affirmait « plus aucune écriture ne peut
produire ce format ». **Cette affirmation était fausse** : le writer n'avait
pas été corrigé, et 88 nouvelles lignes ont été écrites **après** la migration.
Le helper `coerceJsonbValue` ne couvre pas ce cas (il ne convertit que les
chaînes décodant vers `object`/`array`, pas `"null"`).

## Correctif

1. **Amont (code)** — `src/lib/audit.ts` : `serializeAuditState(state)` renvoie
   `null` (→ `NULL` SQL) si l'état est absent, sinon `JSON.stringify(state)`.
   Utilisé pour `before_state` **et** `after_state`.
2. **Rattrapage (données)** — migration `20261027000012_fix_audit_null_literal.sql`
   (+ `rollback/20261027000012_rollback.sql`) : sauvegarde exacte des valeurs
   dans `_jsonb_null_literal_20261027` (88 lignes), puis `"null"` → `NULL`.
   Idempotente et réversible.

## Preuve

- **Test** : `form-report-audit.test.ts` — nouveau cas « écrit un état absent en
  NULL, pas en chaîne "null" » (vérifie `params[8]`/`params[9]` = `null`).
  **Mutation** : `audit.ts` reverté → ce test **rouge** ; restauré → vert.
- **Portes** : `tsc -b --noEmit` **0**, `eslint` **0 erreur**,
  `vitest` **1426/1426**.
- **Base (SQL, après migration)** :
  - `_jsonb_null_literal_20261027` : **88** lignes sauvegardées.
  - `audit_entries.before_state` : `string` = **0**, `NULL` = 131 (43 + 88).
  - `audit_entries.after_state` : `string` = **0**, `NULL` = 34.
  - Requête RUNBOOK complète (9 colonnes) : **0 partout**.

## Honnêteté (R12)

- `[Prouvé]` : mesure avant/après (SQL), migration appliquée, invariant 0 partout.
- `[Prouvé]` : mutation du test.
- `[Probable]` : aucune autre colonne jsonb n'a ce motif — vérifié par la
  requête RUNBOOK (0 partout après correctif).
- La migration de rattrapage est **non destructive** (sauvegarde intégrale).

## Suivi

- **R65.b** (risque ouvert) : l'invariant n'est **pas gardé en CI** — c'est
  pourquoi la rechute a persisté 3 jours. Recommandation consignée
  (exécution CI de la requête d'intégrité).
