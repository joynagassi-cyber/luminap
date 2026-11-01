# Receipt — Vérification indépendante PR5 / PR6 / PR7 / PR19 (robustesse)

- **Date** : 2026-11-01
- **Branche** : `verify/pr5-pr7-pr19-robustness`
- **Contrat** : `docs/agent/PROPOSALS.md` (PR1–PR7, PR17–PR20 = seules
  implémentables ; PR8–PR16 restent des propositions)
- **Portée** : vérifier et durcir quatre filets de robustesse déjà livrés,
  prouver leur **non-vacuité** (le test échoue-t-il vraiment si l'on retire le
  correctif ?) et corriger les trous trouvés.

## Méthode

Pour chaque filet : retirer temporairement le garde/correctif, confirmer
l'échec du test dédié, restaurer. Aucun déploiement, aucune migration, aucun
push vers `main` ; gates locaux uniquement (`vitest`, `tsc -b`, `eslint`).

## Preuves de non-vacuité (mesurées, puis restaurées)

| Filet | Mutation appliquée | Test(s) qui échoue(nt) |
|---|---|---|
| PR5 envoi | `errors: recentErrors.map(toReportError)` → `errors: []` | 3 |
| PR5 note | `redact(note)` → `note` brut | 1 |
| PR5 journal | `const savedLocally = persistProblemReport(report)` → `false` | 3 |
| PR5 (correctif ajouté) | retrait de `scrubIdentities` (note + erreurs) | 3 |
| PR6 décision | `isUpdateRequired` → `return false` | 1 |
| PR6 résolveur | suppression de la branche `update-required` de `resolveRoute` | 2 |
| PR6 câblage | `minSchemaVersion: resolveMinSchemaVersion()` → `undefined` dans `App.tsx` | 1 |
| PR7 fail-open | `flags[name] !== false` → `flags[name] === true` | 2 |
| PR7 câblage | garde `notifications-push` de `initOneSignal` neutralisée | 1 |
| PR7 câblage | garde `period-lock` d'`assertTransactionWritable` neutralisée | 1 |
| PR19 câblage | clé `hasPermission` retirée de l'appel `resolveRoute` | 2 |
| PR19 câblage | `hasPermission: undefined` (valeur morte) | **0 avant durcissement** → 2 après |

Tout est restauré ; la suite complète reste verte.

## Trous corrigés (avec test)

### 1. PR5 — fuite PII : nom propre et numéro de téléphone (P2)

`redact` ne masquait que les PII à **forme** reconnaissable (e-mail, JWT,
Bearer). Une **sonde** a montré qu'une note utilisateur
(`« contact Jean Dupont au 06 12 34 56 78 »`) partait **verbatim** vers Sentry
et dans le journal local — alors que le tutoriel promet « jamais votre nom,
votre e-mail ». Correctifs :

- `reportProblem.ts` : nouvelle fonction `scrubIdentities(text, identities)`
  qui retire **par valeur** (insensible à la casse, métacaractères échappés)
  les identités de l'utilisateur courant (e-mail + prénom + nom lus depuis
  `authService.getState().profile`, lecture locale synchrone). Appliquée à la
  note **et** aux messages d'erreur repris. Défaut injectable pour les tests.
- `clientErrors.ts` : `redact` masque aussi les **numéros de téléphone**
  (formats FR courants) — PII à forme reconnaissable, à sa place dans `redact`.
  Un identifiant numérique ne commençant pas par `0` (montant, date) n'est pas
  touché.
- Tests : `report-problem.test.ts` (+9 : `scrubIdentities`, note/erreurs,
  profil connecté), `client-errors.test.ts` (+2 : téléphone, non-sur-masquage).

### 2. PR19 — angle mort de la garde « filet déclaré, jamais câblé » (P2)

`route-state-wiring.test.ts` vérifiait la **présence** d'une clé dans l'appel
`resolveRoute(...)`, pas la **validité** de sa valeur. Un champ optionnel câblé
à `undefined` (`hasPermission: undefined`) passait donc **à la fois** la garde
**et** `tsc --noEmit` — exactement le défaut visé, déguisé. La garde détecte
désormais les clés câblées à la valeur littérale `undefined` (test ajouté, +
assertion renforcée sur les 7 champs non différés).

## Trou NON corrigeable (assumé)

- Les noms des **autres membres** ne peuvent pas être retirés par valeur : ils
  ne sont pas accessibles sans une lecture base, qui romprait le caractère
  synchrone de l'envoi. Atténuation : les erreurs runtime n'interpolent pas les
  noms de membres aujourd'hui (vérifié), et les PII à forme (e-mail, téléphone,
  jeton) sont masquées partout.

## Gates (locaux)

| Gate | Commande | Résultat |
|---|---|---|
| Typecheck | `npx tsc -b --force --noEmit` | **0** |
| Lint | `npx eslint <fichiers touchés>` | **0** |
| Unitaires (ciblés) | `npx vitest run <9 fichiers>` | **188 passed** |
| Unitaires (complet) | `npx vitest run` | **202 fichiers, 2127 passed, 6 skipped** |

Cypress non exécuté (interdit par la tâche ; specs E2E existantes :
`update-required.cy.ts`, `feature-flags.cy.ts`, `robustness-features.cy.ts`).
