# Receipt — Vérification PR5 / PR6 / PR7 / PR19 (2ᵉ passe, durcissement)

- **Date** : 2026-11-01
- **Branche** : `verify/pr5-pr7-pr19-robustness-2`
- **Contrat** : `docs/agent/PROPOSALS.md` — seuls PR1–PR7 / PR17–PR20 sont
  implémentables ; PR8–PR16 restent des propositions. **Aucun PR8–PR16 touché.**
- **Portée** : seconde passe indépendante sur les quatre filets de robustesse.
  La 1ʳᵉ passe (#189, déjà fusionnée) avait prouvé la non-vacuité et durci la
  fuite PII nom/téléphone + l'angle mort de la garde PR19. Cette passe
  re-vérifie sur `main` à jour et corrige trois trous résiduels.

## Méthode

Pour chaque filet : retirer temporairement le garde/correctif, confirmer
l'échec du test dédié, restaurer (helper `mutr.sh` : sauvegarde → remplacement
Python → `vitest run` → restauration). Aucun déploiement, aucune migration,
aucun push vers `main` ; Cypress non exécuté ; gates locaux uniquement.

## Non-vacuité (mesurée, puis restaurée)

| Filet | Mutation appliquée | Test(s) mis au rouge |
|---|---|---|
| PR5 note | `scrubIdentities(redact(note), identities)` → `note` brut | 5 |
| PR5 erreurs | `scrubIdentities(redact(err.message), …)` → `normalizeText(err.message, …)` | 4 |
| PR5 `failedChecks` | `.map((c) => c.id)` → `.map((c) => c.detail)` | 1 |
| PR5 journal | `persistProblemReport(report)` → `false` | 4 |
| PR6 décision | `isUpdateRequired` → `return false` | 1 |
| PR6 résolveur | `return { outcome: "update-required" }` → `{ outcome: "dashboard" }` | 1 |
| PR6/PR19 câblage | `minSchemaVersion: resolveMinSchemaVersion()` → `undefined` | 2 |
| PR7 fail-open | `flags[name] !== false` → `flags[name] === true` | 2 |
| PR7 kill switch | garde `notifications-push` de `initOneSignal` neutralisée | 1 |
| PR7 kill switch | garde `period-lock` d'`assertTransactionWritable` neutralisée | 1 |

## Trous corrigés (avec test)

### 1. PR5 — le rapport ne doit jamais exposer l'ID technique d'organisation

`buildProblemReport` dérive `failedChecks` des contrôles santé ; le détail du
contrôle « org » affichait `orgId` (`default-org`). Le correctif « nom lisible »
(`orgName`) évite la fuite **à l'écran**, mais le rapport de problème ne doit
conserver que les **identifiants** de contrôle. Tests ajoutés :
`report-problem.test.ts` « N'INTRODUIT jamais le nom d'organisation » +
`health.test.ts` « sans nom résolu, aucun ID technique n'est affiché » (mutation
`c.id`→`c.detail` ⇒ échec).

### 2. PR7 — la garde OneSignal n'était testée que par grep de source

`feature-flags.test.ts` vérifiait la **présence** de
`isFeatureEnabled("notifications-push")` dans le **texte** de `onesignal.ts` —
assertion qui passe même si l'appel est neutralisé (`if (false && …)`). Ajout
d'un test **comportemental** `onesignal-killswitch.test.ts` : drapeau coupé ⇒
`initOneSignal()` ne touche pas le service ; drapeau actif (fail-open) ⇒ il
l'initialise. Non-vacuité : neutraliser la garde ⇒ échec du cas « coupé ».

### 3. PR6 — tutoriel incomplet

Aucune entrée du tutoriel (Phase 13) ne décrivait l'écran « Mise à jour
requise ». Ajout dans la section « Erreurs fréquentes »
(`tutorialContent.ts`) : symptôme + remède (« Recharger », mise à jour store,
données locales conservées). Couvert par `tutorial-search.test.ts` /
`Tutorial.test.tsx`.

## Écart NON corrigeable (assumé)

- Les noms des **autres membres** ne peuvent être retirés par valeur (non
  accessibles sans lecture base, qui romprait le caractère synchrone de
  l'envoi). Atténuation : les PII à forme (e-mail, téléphone, jeton) sont
  masquées partout et les erreurs runtime n'interpolent pas de nom de membre.

## Gates (locaux)

| Gate | Commande | Résultat |
|---|---|---|
| Typecheck | `npx tsc -b --force --noEmit` | **0** |
| Lint | `npx eslint <fichiers touchés>` | **0** |
| Unitaires (ciblés) | `npx vitest run <7 fichiers>` | **186 passed** |
| Unitaires (complet) | `npx vitest run` | **204 fichiers, 2143 passed, 6 skipped** |
