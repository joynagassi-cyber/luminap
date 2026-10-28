# Receipt — Phase 11 : R65.b — garde d'inventaire jsonb (dérive corrigée)

- **Date** : 2026-10-28
- **Branche** : `agent/phase-11-r65b-jsonb-inventory`
- **Risque** : R65.b (invariant d'intégrité jsonb non gardé en CI) → CORRIGÉ.

## Défaut visé

L'invariant d'intégrité jsonb (aucune valeur de type `string`) n'était vérifié
que **manuellement** (requête du RUNBOOK). C'est pourquoi la rechute R65
(`audit_entries.before_state = "null"`, 88 lignes) a persisté 3 jours sans
détection.

## Analyse — la cause racine est visible dans le dépôt

Le double encodage vient d'une **dérive de code** : les colonnes `jsonb` du
schéma PostgreSQL et la table de conversion `JSONB_COLUMNS` (`src/lib/jsonb.ts`)
peuvent diverger silencieusement. Une garde d'inventaire déterministe (lecture
de fichiers, hors-ligne) suffit donc — pas besoin d'accès base en CI.

## Dérive réelle détectée

En relevant les colonnes `jsonb` déclarées dans `supabase/migrations/` :

| Constat | Détail |
|---|---|
| **Manquante** | `custom_field_values.value` (`jsonb NOT NULL DEFAULT '{}'`, table **synchronisée**) absente de `JSONB_COLUMNS` → un objet écrit hors ligne partait en chaîne et devenait un jsonb de type `string`. **Corrigée.** |
| Faux positif écarté | `custom_field_definitions.options` est `text[]` en base mais **délibérément** dans `JSONB_COLUMNS` (le client le sérialise en chaîne JSON) — couverture légitime, reconnue par la garde. |

Justesse du parseur : l'inventaire extrait des migrations correspond **exactement**
aux 10 colonnes `jsonb` de `information_schema.columns` (base de dev,
2026-10-28) — assertion de contrôle incluse.

Données en base : `custom_field_values` est **vide** (aucune corruption
existante) — correctif **préventif**.

## Correctif

1. `src/lib/jsonb.ts` : ajout de `custom_field_values: ["value"]` (+ commentaires).
2. `src/lib/__tests__/jsonb-inventory.test.ts` (nouveau) : garde à 3 invariants —
   (a) justesse du parseur (contrôle vs base), (b) toute colonne `jsonb` couverte,
   (c) aucune entrée morte dans `JSONB_COLUMNS`.

## Preuve (gates)

| Gate | Commande | Sortie |
|---|---|---|
| Garde ciblée | `vitest run jsonb-inventory` | **3/3** |
| **Non-vacuité** | retrait du correctif | **échec** nommant `custom_field_values.value` ; remise → vert |
| Typecheck | `tsc -b --noEmit` | **0** |
| Lint | `eslint .` | **0 erreur** |
| Tests (suite complète) | `vitest run` | **1468/1468** (114 fichiers) |
| Build | `vite build` | **OK** |

## Effet

Toute colonne `jsonb` ajoutée au schéma sans être déclarée dans `JSONB_COLUMNS`
fait désormais échouer la CI — la rechute R65 devient détectable à la source,
sans requête SQL manuelle.
