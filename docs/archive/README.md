# Archive documentaire

Ce dossier contient les documents **historiques** déplacés hors de `docs/` lors
du gel de la documentation (chantier #1 de `docs/PLATFORM-GOVERNANCE.md`, 2026-11-04).

## Pourquoi une archive ?

`docs/` comptait 260 fichiers `.md`, dont plusieurs snapshots « terminés »
(« FINAL », « COMPLETE », états de migration successifs) qui **contredisaient
l'état réel** et rendaient impossible de savoir quel document faisait foi.

## Règle de gouvernance

- Un fait technique n'existe que dans la **source de vérité unique (SSOT)** de
  son domaine (voir `docs/PLATFORM-GOVERNANCE.md` §4.1).
- Toute autre mention est un **lien**, jamais une copie.
- Rien n'est supprimé : l'historique est conservé ici, hors du chemin de lecture
  courant, et reste consultable.

## Contenu

- `FINAL_ARCHITECTURE_VERIFICATION.md` → remplacé par `docs/ARCHITECTURE.md`.
- `MIGRATION_*.md` (PLAN, STATE, STATE_FINAL, COMPLETE, 100_COMPLETE,
  FINAL_SUMMARY, VERIFICATION) → snapshots d'une migration terminée.
- `PLATFORM_COMPLETE.md`, `POST_MIGRATION_CHECKLIST.md` → snapshots « terminés ».
- `POWERSYNC_FINAL_SETUP.md`, `POWERSYNC_MIGRATION_PROGRESS.md` → remplacés par
  `docs/POWERSYNC_READY.md` et `powersync/sync-config.yaml` (SSOT des streams).

Ne pas réintroduire ces documents dans `docs/` : si une information est encore
utile, la **porter dans la SSOT** du domaine.
