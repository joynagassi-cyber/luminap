# Receipt — RBAC chantier B : modèle de capacités + couche d'écriture admin

- **Date** : 2026-10-27
- **Branche** : `agent/rbac-capabilities` (PR #64, mergée)
- **Tâche** : rendre le RBAC lisible par un admin non technique, et fournir
  une couche d'écriture admin scoppée à une organisation.
- **Statut** : **terminé**

## Livrables

| Fichier | Rôle |
|---|---|
| `src/lib/capabilities.ts` | 14 capacités regroupant les **28 permissions** de `PERMISSION_MATRIX` — aucune permission inventée. `capabilitiesForRole` (affichage : ≥1 permission), `capabilityFullyGranted` (toutes), `capabilityGrantPayload` (paires `resource:action`) |
| `src/lib/orgAdmin.ts` | `assignMemberRole` (écrit `org_memberships`, jamais `profiles.role`, D3), `grantCapability` (grant `subject_type='user'` par permission, `org_id` de cloisonnement A), `revokeCapability` (soft delete), `listMemberCapabilities`, + helpers purs testés |
| `src/hooks/useMyCapabilities.ts` | projection en lecture de la décision |

## Décisions respectées

- **D1/D3** : le rôle est porté par `org_memberships`, pas par `profiles.role`.
- **D4** : les grants sont org-scopés (`org_id` du chantier A).
- **D2** : vocabulaire lisible (capacités) au-dessus des permissions techniques.

## Preuves

| Gate | Commande | Résultat |
|---|---|---|
| Typecheck | `npx tsc -b` | exit 0 |
| Unitaires | `npx vitest run` | **1322/1322** |
| Lint | `npx eslint` | 0 erreur |

Tests dédiés : `src/lib/__tests__/capabilities.test.ts`,
`src/lib/__tests__/orgAdmin.test.ts`, `src/hooks/__tests__/useMyCapabilities.test.tsx`.

## Note d'environnement

Les worktrees isolés n'ont pas de `.env.local` (gitignoré) → la suite échoue
d'environnement (`VITE_SUPABASE_URL manquante`) tant qu'on ne copie pas le
fichier. Ce n'est **pas** une régression.
