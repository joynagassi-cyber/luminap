# Receipt — Phase 7 : suppression de membre sans perte financière (PM8)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-07-member-deletion`
- **Défaut visé** (pre-mortem PM8, impact **5**, priorité **20**) :
  `cotisations.membre_id REFERENCES members(id) ON DELETE CASCADE`
  (migration 0036). Supprimer un membre **détruisait silencieusement** toutes
  ses cotisations — l'historique financier disparaissait sans trace.

  Preuve avant (base de dev) :
  ```
  SELECT conname, confdeltype FROM pg_constraint
   WHERE conrelid='public.cotisations'::regclass AND contype='f';
  → cotisations_culte_id_fkey  | c   (CASCADE)
    cotisations_membre_id_fkey | c   (CASCADE)   <-- perte financière
  ```

## Livré (défense en profondeur)

| Couche | Fichier |
|---|---|
| Base (barrière finale) | migration `20261026000008` : FK `ON DELETE RESTRICT` + trigger `trg_members_audit_delete` (AFTER DELETE → trace `audit_entries`) |
| Réversibilité | `rollback/20261026000008_rollback.sql` |
| Client | `member-service.ts` documente le chemin sanctionné (archivage) |

La migration ne supprime aucune ligne : elle ajoute une contrainte de refus et
un trigger d'audit.

## Preuve — base de dev (transaction annulée, 0 résidu)

| Cas | Mesuré | Attendu |
|---|---|---|
| T1 supprimer un membre **avec** cotisations | REFUSÉ (`foreign_key_violation`) | REFUSÉ |
| T2 supprimer un membre **sans** cotisation | ACCEPTÉ | ACCEPTÉ |
| T3 trace d'audit après suppression | PRÉSENTE (1) | PRÉSENTE |
| T4 cotisations du membre protégé | PRÉSENTES (1) | PRÉSENTES |

## Preuve — anti-dérive (CI)

| Gate | Sortie |
|---|---|
| `vitest run` (member-deletion-guard) | **4/4** |
| `vitest run` (suite) | **1279/1279** (92 fichiers) |
| `npx tsc -b --noEmit` | **0** |
| `eslint` | **0** erreur |

## Reste (assumé)

Les liens `group_memberships.member_id` et `groups.responsable_member_id` sont
déjà `NO ACTION` (ils bloquaient la suppression). Le défaut était le **CASCADE
financier** ; il est corrigé. L'anonymisation « douce » d'un membre (remplacer
l'identité tout en gardant la ligne) n'est pas implémentée : l'archivage couvre
le besoin (la ligne et le lien financier sont conservés).
