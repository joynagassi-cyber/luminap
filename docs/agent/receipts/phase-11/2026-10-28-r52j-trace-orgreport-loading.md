# Receipt — R52.j + R52.k : verdicts vides annoncés avant la première lecture

- **Date** : 2026-10-28
- **Priorité** : P2 (famille R52 : « pas encore lu » présenté comme « vide »)
- **Périmètre** : R52.j (`/trace`, `/admin/reports/send`) + R52.k (`/forms`, `/forms/custom-fields`)
- **Branche** : `agent/r52j-trace-orgreport-loading`
- **Statut** : corrigé, non-vacuité prouvée, garde anti-récurrence étendue

## Défaut

Deux écrans dérivaient un verdict « vide » de données encore non lues (motif
R52, déjà traité en R52.b→R52.i) :

1. `src/pages/Trace.tsx` — la liste de la piste d'audit affichait
   **« Aucune entrée trouvée »** tant que `audit_entries` n'était pas lue
   (`useAuditEntries()` renvoie `store.auditEntries` = `[]` au premier rendu,
   sans signal de disponibilité).
2. `src/pages/OrgReportSend.tsx` — l'historique « Rapports envoyés (récent) »
   affichait **« Aucun rapport envoyé pour le moment. »** avant que la requête
   PowerSync `org_reports` n'ait répondu (`refreshHistory` est asynchrone ;
   `sentReports` valait `[]` entre-temps).

## Correctif

- `Trace.tsx` : `filteredEntries.length === 0 && !isPowerSyncReadyNow()` →
  `<ListSkeleton count={4} />` ; le message « Aucune entrée trouvée » n'apparaît
  qu'une fois la lecture faite.
- `OrgReportSend.tsx` : drapeau `historyLoaded` (posé dans le `finally` de
  `refreshHistory`) ; squelette tant que `!(isPowerSyncReadyNow() && historyLoaded)`.
  Un `finally` (et non le seul `catch`) garantit que l'état n'est jamais
  bloqué en « chargement » si la lecture échoue.

## Preuves

- `npx tsc -b --force --noEmit` → **0 erreur**.
- `npx vitest run src/pages/__tests__/list-loading-vs-empty.test.tsx` →
  **15/15** (2 nouveaux tests R52.j).
- **Non-vacuité** : en retirant le garde des deux pages, les 2 tests R52.j
  échouent (`2 failed | 13 passed`) ; restaurés → 15/15.
- Suite complète : `npx vitest run` → **1612/1612** (132 fichiers).
- `npx eslint` sur les 4 fichiers → **0 erreur** (warnings pré-existants).

## Garde anti-récurrence étendue

`src/lib/__tests__/r52-readiness-guard.test.ts` ne couvrait que le mot
« introuvable ». Il couvre désormais les verdicts vides réels
(`Aucun(e) … trouvé(e)`, `… pour le moment`, `… pour l'instant`) via
`VERDICT_PATTERN`, avec des signaux de disponibilité élargis
(`isPowerSyncReadyNow`, `loading`/`Loading`, `ShimmerList`, `Skeleton`,
`listError`, `Loaded`). Le motif exclut volontairement les libellés de
formulaire (« Aucun événement », « Aucune (racine) ») et les boutons
(« Aucune notification à vider ») pour éviter les faux positifs.

- **Non-vacuité de la garde** : une page sonde temporaire
  (`src/pages/__R52Probe.tsx`) affichant « Aucune entrée trouvée » sans garde
  fait échouer le test (`expected [ '__R52Probe.tsx' ] to deeply equal []`).
  La sonde a été supprimée.

---

## R52.k — `/forms` (FormBuilder) et `/forms/custom-fields` (CustomFields)

Même motif, deux pages qui lisent en asynchrone
(`formDefinitionRepo.list` / `customFieldRepo.list`) et rendaient
« Pas encore de formulaire » / « Pas encore de champ personnalisé » dès le
premier rendu (liste `[]`).

- `CustomFields.tsx` : drapeau `fieldsLoaded` posé dans un `finally` ;
  `catch` instrumenté via `captureClientError` (R88 : plus d'erreur avalée) ;
  `ListSkeleton` tant que `!fieldsLoaded`.
- `FormBuilder.tsx` : drapeau `formsLoaded` posé dans le `finally` de
  `loadForms` (qui est aussi rappelé après création/édition) ; `catch`
  instrumenté ; `ListSkeleton` tant que `!formsLoaded`.

### Preuves R52.k

- `npx tsc -b --force --noEmit` → **0 erreur**.
- `src/pages/__tests__/r52k-forms-loading.test.tsx` → **3/3** (2 « squelette »
  + 1 « le message vide exact apparaît une fois la lecture terminée », avec
  résolution contrôlée de la promesse).
- **Non-vacuité** : en retirant le garde des deux pages → `2 failed | 1 passed`.
- Garde statique étendue à `Pas encore de ` ; non-vacuité prouvée par sonde
  (`__R52Probe2.tsx` → `expected [ '__R52Probe2.tsx' ] to deeply equal []`).
- Suite complète : **1615/1615** (133 fichiers) ; eslint 0 erreur.

---

## Extension de la garde aux composants partagés

Le balayage statique couvrait `src/pages/` uniquement. Il couvre désormais
**`src/components/`** : un verdict vide dérivé d'une lecture asynchrone dans un
composant partagé (DocumentPicker, OrgChildren, …) se propage sur toutes les
pages qui l'utilisent. Deux composants portent le motif et sont **sains** :

- `DocumentPicker.tsx` — « Aucun document uploadé pour le moment. » n'est rendu
  que si `documents` est défini et vide (sinon rien).
- `OrgChildren.tsx` — « Aucune annexe pour le moment. » est protégé par un
  drapeau `loading` explicite.

Non-vacuité de l'extension prouvée par une sonde dans `src/components/`
(`__R52ProbeC.tsx` → `expected [ 'src/components/__R52ProbeC.tsx' ] to deeply
equal []`) ; sonde supprimée.
