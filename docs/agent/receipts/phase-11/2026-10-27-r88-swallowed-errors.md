# Receipt — Phase 11 : R88 — erreurs avalées (états vides silencieux)

- **Date** : 2026-10-27
- **Branche** : `agent/phase-11-r88-swallowed-errors`
- **Contrat** : Phase 11 (pre-mortem / chaos / exploitation autonome) — ligne
  « exploitation autonome » : rendre les échecs observables et exploitables.
- **Risque** : R88 (gravité moyenne) — `docs/agent/RISQUES.md`.

## Défaut visé

Un `.catch()` vide (`.catch(() => {})` ou `.catch(() => setLoading(false))`)
transforme toute erreur (SQL, réseau, RLS, permission) en **état vide
silencieux** : l'utilisateur voit la même chose que « aucune donnée », et
aucune trace n'existe pour le développeur. C'est ce qui a rendu R87 invisible.

## Mesure (avant)

- **28** occurrences de `.catch()` vide dans `src/pages/` (mesuré par
  `grep -rnE "\.catch\(\s*\(\s*\)\s*=>"`).
- Classification (script d'inspection) : **11 sites de CHARGEMENT** (vrai
  risque) et **~9 sites de NOTIFICATION** (bénins — l'écriture a déjà réussi),
  le reste étant des nettoyages locaux.
- **Aucun helper** de capture manuelle n'existait : `clientErrors.ts` ne
  couvrait que `window.onerror` / `unhandledrejection` (erreurs **non**
  gérées). Une erreur interceptée par un `.catch()` ne laissait donc **aucune**
  trace (ni Sentry, ni page santé).

## Correctif

1. **`captureClientError(err, { message })`** dans `src/lib/clientErrors.ts` :
   capture des erreurs **gérées** (`source: "handled"`), réutilisant la
   redaction PII et le tampon `recentErrors` de la page santé. Une erreur
   interceptée est désormais aussi visible qu'une erreur non gérée.
2. **11 sites de chargement** instrumentés : `Finance`, `Members`, `Reports`,
   `ReportBuilder` (×2), `FormSubmissions` (×3), `InvitationManage` (×2),
   `Sessions`.
3. **État d'erreur + réessai** sur le site prioritaire `Finance.tsx` : état
   `loadError`, composant embarquable `LoadErrorBlock`
   (`data-screen-state="error"`, bouton « Réessayer » qui relance le
   chargement). « Vide » et « échec » ne sont plus confondus.

`LoadErrorBlock` est **embarquable** (sans `IonPage`) : `Finance` doit garder
un **seul** `<IonPage>` (sinon régression du bug d'écran noir du view-stack
Ionic documenté dans le fichier).

## Preuve

- `src/pages/__tests__/Finance-load-error.test.tsx` (2 tests) : sur échec,
  `captureClientError` est appelé **et** l'état vide n'est **pas** affiché ;
  « Réessayer » relance et affiche les données.
  **Mutation-testé** : remplacer `loadError ?` par `false ?` fait échouer les
  2 tests (donc ils gardent réellement le comportement).
- `src/lib/__tests__/client-errors.test.ts` (+3 tests) : `captureClientError`
  enregistre dans le tampon, redacte le contexte, accepte une valeur non-Error.
- Suite complète : **1462/1462** (Node 22, simulation CI), `tsc -b --noEmit` = 0,
  eslint **0 erreur**.

## Non corrigé (assumé, documenté)

Les ~9 `.catch(() => {})` sur `sendNotification` sont bénins : l'écriture
attendue a déjà réussi, seul l'effet secondaire de notification échoue — aucun
message trompeur pour l'utilisateur. Les corrections d'état d'erreur
utilisateur pour `Members`/`Reports`/`ReportBuilder`/`FormSubmissions`/
`InvitationManage` (qui ont déjà un état d'erreur ou un repli « hors ligne »
délibéré) restent hors de ce lot : seule la **trace** y a été ajoutée.
