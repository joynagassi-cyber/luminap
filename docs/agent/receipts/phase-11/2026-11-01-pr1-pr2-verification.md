# Receipt — vérification PR1 + PR2 (journal d'audit consultable, sauvegarde/export)

- **Date** : 2026-11-01
- **Branche** : `verify/pr1-pr2-robustness`
- **Périmètre** : audit indépendant de PR1 (`/trace` + détail d'entrée) et PR2
  (export/sauvegarde JSON+CSV) — non-vacuité, invariant R52, tutoriel,
  COVERAGE_MATRIX. Aucune PR8–PR16 touchée ; aucun déploiement ni migration.

## Ce qui a été vérifié (implémentation réelle)

- PR1 : `src/pages/Trace.tsx` (bouton accessible `aria-expanded`/`aria-controls`
  qui déplie `<AuditEntryDetail>`), `src/components/AuditEntryDetail.tsx`
  (rôle, commentaire, diff before→after, décodage tolérant, valeur brute +
  `captureClientError` si illisible).
- PR2 : `src/lib/backup.ts` (module pur : `buildBackupBundle`/`serializeBackup`/
  `backupToCsv`/`backupFilename`), `src/hooks/useBackupData.ts` (collecte org
  active + `ready = isPowerSyncReadyNow()`), `src/pages/SettingsGestion.tsx`
  (section « Sauvegarde des données », garde R52, téléchargement JSON/CSV).
- Tutoriel (Phase 13) : sections `id: "trace"` et `id: "sauvegarde"` présentes
  dans `src/lib/tutorialContent.ts`, consommées par `Tutorial.tsx`
  (`TUTORIAL_SECTIONS`) et couvertes par `Tutorial.test.tsx`.
- `COVERAGE_MATRIX.md` : lignes PR1/PR2 pointent vers des fichiers existants.

## Non-vacuité (mutations exécutées, source restaurée à chaque fois)

| Mutation | Test mis au rouge |
|---|---|
| `Trace.tsx` : `<AuditEntryDetail …/>` → `null` | `Trace-detail.test.tsx` 4/4 |
| `AuditEntryDetail.tsx` : `if (true) continue;` (ignore tout diff) | `Trace-detail.test.tsx` « champ MODIFIÉ » |
| `AuditEntryDetail.tsx` : instrumentation `before_state` désactivée | `Trace-detail.test.tsx` « JSON illisible » |
| `Trace.tsx` : garde R52 (`!isPowerSyncReadyNow()`) désactivée | `list-loading-vs-empty.test.tsx` « /trace squelette » |
| `backup.ts` : `escapeCsvRow` → `join(";")` brut | `backup.test.ts` « neutralise les formules » |
| `backup.ts` : `counts` jamais dérivé de `data` | `backup.test.ts` 3 tests |
| `SettingsGestion.tsx` : garde `{!backup.ready ? …}` désactivée | `SettingsGestion-backup.test.tsx` « pas de verdict 0 » |
| `SettingsGestion.tsx` : `downloadBlob` retiré | `SettingsGestion-backup.test.tsx` « télécharge un JSON » |

## Écarts trouvés et CORRIGÉS

1. **`useBackupData` non testé directement** (il était toujours mocké) : sa
   garde R52 (`ready = isPowerSyncReadyNow()`) et son **filtrage par
   organisation** des champs personnalisés (`listCustomFieldDefinitionsPS`
   n'est pas filtré par org côté SQL → risque de fuite inter-org dans la
   sauvegarde) n'étaient verrouillés par aucun test. Preuve du trou : forcer
   `ready: true` dans le hook ne faisait échouer **aucun** test (17/17 verts).
   → Ajout `src/hooks/__tests__/useBackupData.test.tsx` (4 tests ; non-vacuité
   prouvée par 2 mutations : `ready: true` et suppression du filtre org).
2. **Verdict faux « Modifié »** dans le détail d'audit : deux états identiques
   produisaient 0 ligne de diff mais l'entrée était libellée « Modifié » — un
   fait faux sur une piste d'audit (même classe de défaut que PR1 corrige).
   → `AuditEntryDetail.tsx` : `kind = rows.length === 0 ? "unchanged" :
   "changed"` ; test ajouté à `Trace-detail.test.tsx` (non-vacuité vérifiée).

## Écarts NON corrigés (hors périmètre / proposition)

- **Restauration/import de sauvegarde** : PR2 est un export ; l'import n'existe
  pas (limite documentée du receipt PR2, format `lumina-backup` v1 conçu pour
  être relisible). Reste une proposition produit, non implémentée ici.
- **`Trace.tsx` : symboles morts** (`ArrowLeft`, `Users`, `Shield`, `entityMap`,
  `navigate`, `transactions/groups/members/events` non utilisés) : warnings
  eslint préexistants (0 erreur). Nettoyage cosmétique laissé de côté
  (changement non minimal, sans effet fonctionnel).

## Gates (locaux)

- `npx vitest run` (fichiers PR1/PR2 + R52) : vert.
- `npx tsc -b --force --noEmit` : 0 erreur.
- `npx eslint` (fichiers touchés) : 0 erreur.
