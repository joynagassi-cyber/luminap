# Receipt — RBAC session 11 : contrat d'interface

- **Date** : 2026-10-27
- **Branche** : `agent/rbac-contrat` (PR #60, mergée)
- **Tâche** : figer les interfaces avant de paralléliser le travail RBAC.
- **Statut** : **terminé**

## Livrable

`docs/agent/CONTRAT_RBAC.md` — état mesuré, décisions D1–D5, interfaces
figées (§3), périmètre de fichiers exclusif par chantier (§4), ordre de merge.

## Pourquoi

La parallélisation de 4 chantiers RBAC (SQL, modèle, UI, preuve) ne peut pas
se faire sans un contrat : sans lui, deux agents éditeraient le même fichier.
Le contrat est le seul mécanisme qui garantit des diffs disjoints.

## Preuves

- `docs/agent/CONTRAT_RBAC.md` mergé sur `main` (commit `812f60f`).
- 4 worktrees git isolés créés depuis cette base : `/workspace/wt-b`,
  `/workspace/wt-c`, `/workspace/wt-d` (+ chantier A sur `main`).
