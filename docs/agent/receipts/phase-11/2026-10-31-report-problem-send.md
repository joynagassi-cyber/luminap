# Receipt — Phase 11 : « Signaler un problème » — ENVOI réel du diagnostic (PR5)

- **Date** : 2026-10-31
- **Branche** : `agent/pr5-report-problem`
- **Proposition source** : PR5 (« Bouton “Signaler un problème” — contexte sans
  PII »), priorité P2.
- **Statut** : terminé (PR brouillon ouverte).

## Problème

La page Santé (`src/pages/Health.tsx`) exposait un bouton
`data-testid="health.report-problem"` (« Signaler un problème ») qui ne faisait
que **copier** un texte de diagnostic dans le presse-papiers
(`copyDiagnostic`). Rien n'était envoyé : un utilisateur qui signalait un
problème ne produisait **aucun signal durable ni exploitable par le support**
(pas de Sentry, pas de trace locale). L'intention contractuelle de PR5
(« contexte sans PII, Sentry + `client_errors` ») n'était pas satisfaite.

## Livré

| Fichier | Rôle |
|---|---|
| `src/lib/reportProblem.ts` | cœur pur `buildProblemReport` + envoi `sendProblemReport` + journal local (`getProblemReports`/`getLastProblemReport`) |
| `src/pages/Health.tsx` | bouton → note facultative → **envoi** réel ; « Copier le diagnostic » conservé comme affordance séparée ; ligne « Dernier signalement » |
| `src/lib/__tests__/report-problem.test.ts` | 13 tests (cœur pur + envoi + non-vacuité) |
| `src/pages/__tests__/health-report-problem.test.tsx` | 3 tests de comportement de la page (jsdom) |
| `src/pages/Tutorial.tsx` | section « Signaler un problème » (Phase 13) |
| `docs/agent/COVERAGE_MATRIX.md` | 1 ligne (Phase 11) |
| `docs/agent/PROGRESS.md` | 1 ligne (Phase 11, PR5) |

## Comportement

1. **`buildProblemReport(inputs, recentErrors, now, note)`** — PURE (horloge
   passée par l'appelant). Rapport structuré, **sans PII** : `kind`,
   `generatedAt`, `appVersion`, `environment`, `platform`, `online`, `overall`
   (niveau de santé global), `failedChecks` (ids des contrôles non `ok`),
   `errors` (code = source + message déjà expurgé par `redact`) et `note`
   (texte libre de l'utilisateur). **Jamais** d'e-mail, de nom, d'identifiant
   d'organisation ni de contenu brut : la note et les messages repassent par
   `redact` + `normalizeText` (caractères de contrôle retirés, longueur
   plafonnée).
2. **`sendProblemReport(...)`** — émet `Sentry.captureMessage` (niveau `info`,
   `extra` = le rapport) **si** un DSN est configuré, et conserve **toujours**
   un enregistrement local (`lumina-problem-reports`, journal borné à 10).
   Sans DSN : dégradation gracieuse → `sentToSentry = false`, `savedLocally =
   true`, l'UI affiche un toast FR « Signalement enregistré localement (envoi
   automatique indisponible). ».
3. **UI** — « Signaler un problème » ouvre une note facultative (textarea,
   1 000 caractères max) puis « Envoyer le signalement ». Un échec d'envoi est
   instrumenté via `captureClientError` (jamais avalé, règle R88). « Copier le
   diagnostic » reste disponible séparément pour le support.

## Preuve — non-vacuité (vérifiée)

Retirer chacune des lignes du correctif fait échouer un test précis, puis la
source est restaurée :

| Mutation | Test(s) qui échoue(nt) |
|---|---|
| `errors: recentErrors.map(toReportError)` → `errors: []` | 3 tests (codes d'erreur + PII message + `captureMessage`) |
| `const savedLocally = persistProblemReport(report)` → `false` | 3 tests (dont « conserve l'enregistrement local ») |
| `redact(note)` → `note` brut | 1 test (expurgation PII de la note) |
| `onClick={() => setReportOpen(...)}` → `onClick={copyDiagnostic}` | 2 tests de la page (la note/envoi ne s'ouvrent jamais) |

## Preuve — gates

| Gate | Commande | Résultat |
|---|---|---|
| Typecheck | `npx tsc -b --noEmit` | **0** (exit 0) |
| Unitaires | `pnpm exec vitest run` | **vert** |
| Lint | `pnpm run lint` | **0 erreur** |
| Build | `pnpm run build` | **OK** (exit 0) |

## Non-couvert (honnêteté)

- L'envoi réel vers Sentry n'est pas observable en CI (aucun DSN) : le test
  « Sentry configuré » stube `VITE_SENTRY_DSN` et vérifie que
  `captureMessage` est appelé avec un contexte sans PII. L'acheminement réseau
  relève de la configuration du propriétaire.
- `VITE_SENTRY_DSN` est absent du build local/CI (le SDK reste en mode
  « débranché ») : c'est exactement le cas de dégradation gracieuse couvert.
