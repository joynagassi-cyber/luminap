# Receipt — R17 : dérive migrations ↔ base (instantané gelé + garde repo-side)

- **Date** : 2026-10-29
- **Branche** : `agent/r17-migration-drift-guard`
- **Tâche** : figer la mesure de la dérive R17 et fournir une **garde
  exécutable en CI** (le tracker Supabase n'y est pas accessible).

## Mesure (2026-10-29)

| Ensemble | Nombre |
|---|---|
| Versions appliquées (tracker `schema_migrations`) | **70** |
| Fichiers horodatés du dépôt (`supabase/migrations/`) | **63** |
| Fichiers séquentiels `NNNN_*` du dépôt | **63** |
| **Total fichiers `.sql` du dépôt** | **126** |
| Versions communes (appliquée **et** fichier présent) | **2** (`20261001000001`, `20261027000003`) |
| Appliquées sans fichier | **68** |
| Fichiers jamais tracés | **61** |
| **Ratio de dérive** | **2/70** |

## Livrables

- `docs/agent/migration-drift.json` — instantané **mesuré** (machine-lisible) de
  l'état de dérive + consignes (`do_not`, `mitigation`, `owner_recommendation`).
- `src/lib/__tests__/migration-drift-guard.test.ts` (3) — garde repo-side :
  - le nombre de fichiers horodatés / séquentiels / total correspond à
    l'instantané (échoue dès qu'une migration est **ajoutée ou retirée**) ;
  - les versions communes déclarées existent bien comme fichiers ;
  - le ratio de dérive reste documenté (`2/70`) — un changement force à
    re-décider (régularisation vs « base = source de vérité »).

## Pourquoi une garde repo-side et pas base-side

Le tracker `supabase_migrations.schema_migrations` exige des identifiants
Supabase, absents en CI (même contrainte que `scripts/rls-isolation-check.sh`,
cf. D-S10-2). On garde donc ce qui est vérifiable **sans base** : la forme du
dépôt. Une migration appliquée via l'éditeur SQL (jamais tracée) déclenche la
garde → l'agent/propriétaire doit re-mesurer la dérive.

## Gates (mesurés localement)

| Gate | Commande | Sortie | Extrait |
|---|---|---|---|
| Typecheck | `npx tsc -b` | **0** | (aucune sortie) |
| Garde R17 | `vitest run src/lib/__tests__/migration-drift-guard.test.ts` | **0** | `Test Files 1 passed` · `Tests 3 passed` |

## Honnêteté (R12)

- **[Prouvé]** : les 70/63/63/126 et le ratio 2/70 (SQL + `ls` mesurés).
- **[Probable]** : que la cause soit l'application via éditeur SQL/MCP (le
  tracker n'a jamais vu `db push`).
- **[Non vérifié]** : un `db push` réel (volontairement **non** tenté —
  destructif potentiel, cf. `do_not`).

## Risque résiduel

- La régularisation de l'historique reste une **décision propriétaire** ; la
  garde empêche que la dérive s'aggrave **silencieusement**.
