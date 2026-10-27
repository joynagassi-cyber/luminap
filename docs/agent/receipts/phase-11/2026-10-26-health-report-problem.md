# Receipt — Phase 11 : « Signaler un problème » (bouton diagnostic sur la page Santé)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-11-report-problem`
- **Exigence** : plan §Étape 9 (Phase 11) — « page de santé … **bouton
  “Signaler un problème”** ». La page Santé (PR4) livrait la vue, pas l'action.
- **Catégorie** : robustesse / exploitation autonome (autorisée pendant l'absence
  du propriétaire, contrat §6).

## Livré

- `src/lib/health.ts` :
  - `HEALTH_LEVEL_LABEL` exporté (libellés FR partagés page/diagnostic) ;
  - `buildDiagnosticReport(inputs, errors, generatedAt)` — **pur**, sans PII,
    produit un texte copiable (version, plateforme, réseau, sync, org, erreurs).
- `src/pages/Health.tsx` : bouton « Signaler un problème »
  (`data-testid="health.report-problem"`, cible ≥44 px, `aria-label`), copie le
  diagnostic dans le presse-papiers ; repli `prompt()` si le presse-papiers est
  refusé (contexte non sécurisé / permission).
- `src/lib/__tests__/health.test.ts` : +4 tests (contenu, 0 erreur, plafond 5,
  org absente).

## Preuve

| Gate | Sortie |
|---|---|
| `npx tsc -b --noEmit` | **0** |
| `vitest run` (health) | **15/15** |
| `vitest run` (suite) | **1231/1231** (81 fichiers) |
| `eslint` (fichiers modifiés) | **0** erreur |

## Note

Aucune donnée personnelle n'est incluse : les messages d'erreur proviennent déjà
du buffer `clientErrors` (expurgé par `redact`). Le diagnostic sert à un
utilisateur ou au support, sans accès à Sentry.
