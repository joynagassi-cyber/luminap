# Reçu — PR10 : rappels de rapport à envoyer

- **Date** : 2026-10-31
- **Branche** : `agent/pr10-report-reminders`
- **Phase** : 11 (durcissement / exploitation autonome)
- **Priorité** : P3
- **Feature du contrat** : `docs/agent/PROPOSALS.md` → **PR10** (Notifications —
  rappels de rapport à envoyer)
- **Dépend de** : OneSignal (déjà intégré).

## Valeur

Rappeler au responsable d'une annexe qu'il doit transmettre le rapport de
gestion périodique à son organisation parente, sans jamais dupliquer la
notification ni mentir sur l'état (aucun rappel avant la première lecture
PowerSync).

## Ce qui a été livré

### Cœur PUR — `src/lib/reportReminders.ts`

- `computeReportReminder({ lastSentAt, now, cadenceDays })` — **aucune E/S**,
  horloge **injectée** → déterministe, testable sans navigateur.
  - jamais envoyé (ou date illisible) → **dû** (`reason: "never-sent"`) ;
  - sinon **dû** quand `now - lastSentAt >= cadenceDays` (borne **inclusive**) ;
  - `now` illisible mais `lastSentAt` valide → **non dû** (jamais de faux rappel) ;
  - cadence absente/0/négative/NaN → `DEFAULT_CADENCE_DAYS` (30), jamais 0
    (un 0 rendrait le rappel permanent).
  - message FR **borné** (≤ 240 caractères), titre « Rapport à envoyer ».
- Marqueur d'idempotence : `REMINDER_MARKER_KEY = "lumina-report-reminder-last"`
  (clé de **jour** `YYYY-MM-DD`) ; `readReminderMarker` / `writeReminderMarker`
  best-effort (stockage indisponible → aucune exception).
- `deliverReportReminder(params)` — évalue puis **livre** via la capacité de
  notification **existante** (`@/capabilities/notification.sendNotification`,
  qui fait l'in-app + le push OneSignal) :
  - idempotent (le marqueur empêche une 2ᵉ émission le même jour) ;
  - un échec d'envoi est instrumenté (`captureClientError`) et **n'est pas**
    marqué comme émis → nouvelle tentative possible (jamais avalé) ;
  - **kill switch** `featureFlags` (`report-reminders`, fail-open) → aucun envoi
    quand coupé, raison `"disabled"`.
- **Aucun cron serveur** : le rappel est évalué à l'ouverture de l'écran.

### Lecture du dernier envoi — `src/lib/dataLayer.ts`

- `useLastSentReport(orgId?)` : dernier `org_reports` **émis** par l'org
  (`from_org_id = current`), `ORDER BY period_start DESC LIMIT 1` ;
  `lastSentAt = created_at ?? period_start` ; renvoie `loaded` pour distinguer
  « pas encore lu » de « aucun rapport envoyé » (règle **R52**).

### UI — `src/components/ReportReminderBanner.tsx`

- Bannière « Rapport à envoyer » montée en haut de `/admin/report-send`
  (`OrgReportSend.tsx`).
- Visible seulement si : `isPowerSyncReadyNow()` **et** `loaded` **et** org avec
  mère (`federation.getOrgParent`) **et** rappel dû **et** non masquée.
- « Envoyer maintenant » → `/admin/report-send` ; croix → masquée pour le jour
  (`lumina-report-reminder-dismissed`).
- Jetons de design uniquement (`var(--data-pending)`, `var(--accent-primary)`,
  `var(--surface-hover)`…) — **aucun hex**.

## Non-vacuité (prouvée par mutation, puis source restaurée)

`src/lib/__tests__/report-reminders.test.ts` :

| Mutation appliquée | Test(s) qui échoue(nt) |
|---|---|
| `elapsed >= cadence * DAY` → `elapsed > cadence * DAY` | « borne INCLUSIVE : exactement à la cadence → dû » (1) |
| garde du marqueur neutralisée (`if (false)`) | « IDEMPOTENT : deux évaluations le même jour n'émettent qu'UNE fois » (1) |
| garde `isFeatureEnabled(REPORT_REMINDER_FLAG)` neutralisée | « kill switch : drapeau coupé » (1) |
| `writeReminderMarker(now, storage)` retiré | « dû → notification émise ET marqueur posé » + « IDEMPOTENT … » (2) |

`src/components/__tests__/ReportReminderBanner.test.tsx` :

| Mutation appliquée | Test(s) qui échoue(nt) |
|---|---|
| `const visible = ready && loaded && hasParent === true && reminder.due && !dismissed` → `const visible = true` | 5 tests (« pas dû », « PowerSync non prêt », « historique non lu », « org racine », « fermeture du jour ») |

Chaque mutation a été appliquée, la suite relancée (échec observé), puis la
source restaurée (diff vide vérifié).

## Tests

- `src/lib/__tests__/report-reminders.test.ts` — **20** tests (décision pure,
  borne inclusive, cadence invalide, déterminisme, marqueur, livraison
  idempotente, échec instrumenté, kill switch).
- `src/components/__tests__/ReportReminderBanner.test.tsx` — **8** tests
  (visibilité conditionnelle, émission, non-prêt R52, org racine, fermeture).
- `src/pages/__tests__/Tutorial.test.tsx` — seuils relevés à 21 / 84 / 75 / 14
  après ajout de la section « Rappels de rapport ».

## Fichiers modifiés / ajoutés

- **A** `src/lib/reportReminders.ts`
- **A** `src/components/ReportReminderBanner.tsx`
- **A** `src/lib/__tests__/report-reminders.test.ts`
- **A** `src/components/__tests__/ReportReminderBanner.test.tsx`
- **M** `src/lib/dataLayer.ts` (`useLastSentReport`)
- **M** `src/pages/OrgReportSend.tsx` (montage de la bannière)
- **M** `src/pages/Tutorial.tsx` (section « Rappels de rapport »)
- **M** `src/pages/__tests__/Tutorial.test.tsx` (seuils)
- **M** `docs/agent/COVERAGE_MATRIX.md` (1 ligne ajoutée en fin)
- **M** `docs/agent/PROGRESS.md` (1 ligne ajoutée en fin du tableau)

## Portes (gates)

- `npx tsc -b --force --noEmit` : **vert**
- `npm run lint` : **vert**
- `npx vitest run` : **vert**
- `npm run build` : **vert**

## Limites / décisions

- Aucune table ni colonne nouvelle : on lit `org_reports` existant (contrainte
  « préférer étendre l'existant »).
- La cadence est fixée à 30 jours côté client (`DEFAULT_CADENCE_DAYS`). Un
  réglage par organisation via `org_settings` (PR8/PR13) est une extension
  possible, hors périmètre de ce PR.
- Aucune migration PowerSync/Supabase : le stream `org_reports` est déjà
  déclaré (on-demand) et souscrit après login.
