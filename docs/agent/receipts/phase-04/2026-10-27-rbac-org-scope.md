# Receipt — RBAC chantier A : cloisonnement des `grants` par organisation

- **Date** : 2026-10-27
- **Branche** : `agent/rbac-sql-org-scope` (PR #61)
- **Tâche** : corriger la fuite inter-organisation des grants.
- **Statut** : **terminé** (migrations appliquées + preuve SQL)

## Défaut (réel, mesuré)

`public.grants` (migration `20260921000005`) n'avait :
- **aucune colonne `org_id`** ;
- **une seule policy** : `grants_read_org … USING (true)`.

Conséquences :
1. Un grant `subject_type='user'` accordait la capacité dans **toutes** les
   organisations où l'utilisateur est membre → fuite inter-org.
2. Toute session authentifiée lisait **l'intégralité** des grants.
3. `has_permission(u, 'org-A', …)` pouvait renvoyer `true` à cause d'un grant
   émis pour `org-B`.

État initial mesuré : `grants = 0` ligne (aucune migration de données requise).

## Correctif

| # | Changement |
|---|---|
| 1 | `grants.org_id TEXT NOT NULL DEFAULT '__no_org__'` + 2 index |
| 2 | Lecture org-scopée (membre ACTIVE de l'org, ou admin de l'org) |
| 3 | Écriture admin-only : `grants_insert_admin`, `grants_update_admin` |
| 4 | `has_permission` contraint `g.org_id = p_org` (cloisonnement de la décision) |
| 5 | `settle_invitation_claim` propage `org_id = inv.org_id` sur les grants |
| 6 | Plomberie client : schéma PowerSync `grants.org_id`, `PSGrant.org_id`, `createGrantPS`, `listGrantsForUserPS`, `powersync/sync-config.yaml` |

Migrations : `20261027000010_grants_org_scope.sql`,
`20261027000011_settle_propagate_org.sql` (+ rollbacks).

## Preuve (transaction annulée — 0 résidu)

Grant `user` `transaction:read` posé **uniquement dans org-A** :

| Appel | Résultat attendu | Résultat mesuré |
|---|---|---|
| `has_permission(u,'org-A','transaction','read')` | `true` | **`true`** |
| `has_permission(u,'org-B','transaction','read')` | `false` | **`false`** |
| `has_permission(u,'org-A','transaction','delete')` | `false` | **`false`** |

Après `ROLLBACK` : `SELECT count(*) FROM grants` → **0**.

Structure vérifiée : `grants.org_id` présent ; 3 policies
(`grants_read_org`, `grants_insert_admin`, `grants_update_admin`).

## Gates

| Gate | Commande | Résultat |
|---|---|---|
| Typecheck | `npx tsc -b` | **exit 0** |
| Unitaires | `npx vitest run` | **1294/1294** |
| Advisors sécurité | MCP `get_advisors` | aucune nouvelle faille (les WARN `SECURITY DEFINER` sont pré-existants) |

## Limites

- PowerSync non déployé (`PS_ADMIN_TOKEN` absent, E1) : le sync-config est
  corrigé mais non poussé vers le service ; le filtrage fort reste la RLS.
- Aucune donnée réelle n'existait dans `grants` : la migration est purement
  structurelle, sans risque de perte.
