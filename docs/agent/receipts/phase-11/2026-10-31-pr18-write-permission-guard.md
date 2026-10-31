# Receipt — Phase 11 : PR18 — garde anti-régression de l'autorisation d'écriture

- **Date** : 2026-10-31
- **Branche** : `agent/pr18-write-guard`
- **Proposition source** : PR18 (« Migration progressive des politiques RLS vers
  `has_permission()` — décision unique »), P2.
- **Statut** : terminé (PR brouillon ouverte).

## Constat

PR18 est **réalisé** en base : R137/R141/R141.b/c/d ont migré les politiques
INSERT/UPDATE/DELETE de `is_org_member` seul vers
`is_org_member AND has_permission(...)`. Mesure en base (2026-10-31) : **93
politiques d'écriture** gardées par `has_permission`, plus les gates dédiés
(`is_org_admin`, `can_manage_invitations`).

MAIS aucune garde **repo-side** ne verrouillait cet invariant : une migration
future pouvait réintroduire une politique d'écriture gardée par la seule
appartenance, sans qu'aucun test ne s'en aperçoive (même classe que R143).

## Livré

| Fichier | Rôle |
|---|---|
| `src/lib/__tests__/pr18-write-permission-guard.test.ts` | 4 tests (analyse + invariant + tables métier + exceptions) |
| `docs/agent/COVERAGE_MATRIX.md` | 1 ligne (Phase 11, PR18) |
| `docs/agent/PROGRESS.md` | 1 ligne |

## Méthode (sans base)

Rejoue les migrations dans l'ordre, suit `CREATE`/`ALTER`/`DROP POLICY`, retient
la **dernière** définition de chaque politique d'écriture encore active, puis
vérifie qu'aucune n'est « membre-only » (`is_org_member` sans `has_permission`
ni `can_manage_invitations`), sauf l'exception justifiée `audit_entries_insert`.

## Non-vacuité

Vérifiée : ajouter une migration sonde
`CREATE POLICY pr18_probe ON public.members FOR INSERT WITH CHECK (is_org_member(...))`
fait échouer 2 tests, puis retrait → 4/4 verts.
