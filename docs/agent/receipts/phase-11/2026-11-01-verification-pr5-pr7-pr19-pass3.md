# Receipt — Vérification indépendante PR5 / PR6 / PR7 / PR19 (passe 3) + robustesse finance

- **Date** : 2026-11-01
- **Branche** : `verify/pr5-pr7-pr19-robustness` (repart de `origin/main` = `3b4ec87`,
  qui contient déjà la passe 1 fusionnée `79109ae` / #189)
- **Contrat** : `docs/agent/PROPOSALS.md` — seuls PR1–PR7 / PR17–PR20 implémentables ;
  **aucun PR8–PR16 touché**. Aucun déploiement, aucune migration, Cypress non exécuté.

## Méthode

Pour chaque filet : retirer/neutraliser le garde, confirmer l'échec du test dédié,
restaurer. Gates locaux uniquement (`vitest`, `tsc -b`, `eslint`).

## Non-vacuité (mesurée, puis restaurée)

| Filet | Mutation appliquée | Tests mis au rouge |
|---|---|---|
| PR5 note/erreurs | `scrubIdentities(..., scopedIdentities)` → `identities` | 1 |
| PR5/PR4 santé | `orgName \|\| "organisation active"` → `orgId` | 2 |
| PR6 décision | `isUpdateRequired` → `return clientVersion < minVersion` | **0 — MUTANT ÉQUIVALENT** (voir ci-dessous) |
| PR6 résolveur | branche `update-required` → `render` | 1 |
| PR6 tutoriel | retrait du titre « Mise à jour requise » | 1 |
| PR7 `notifications-push` | garde `if (!isFeatureEnabled(...))` → `if (false)` | 1 |
| PR7 `period-lock` | garde → `if (false)` (jamais coupé) | 1 |
| PR7 `period-lock` | garde → `if (true)` (toujours coupé) | 6 |
| PR19 `hasPermission` | câblage retiré de `App.tsx` | 2 |
| PR19 `isOrgMember` | câblage → `undefined` | 2 |

### PR6 — le mutant « fail-open retiré » est ÉQUIVALENT, pas un trou

La mutation `minVersion !== undefined && clientVersion < minVersion` →
`clientVersion < minVersion` **survit** (12 tests passent). Analyse : en JS,
toute comparaison numérique avec `undefined` vaut `false` (`2 < undefined`,
`0 < undefined`, `-1 < undefined` sont tous `false`). Les deux expressions sont
donc **sémantiquement identiques** pour toute entrée valide — c'est un *mutant
équivalent*, pas un angle mort. Le comportement fail-open lui-même est bien
verrouillé par `isUpdateRequired(1, undefined) === false`.

## Écarts corrigés (avec test)

1. **PR5 — fuite de l'ID technique d'organisation par texte libre (P2).**
   `redact` masque les PII à *forme* (e-mail, jeton, téléphone) mais **pas** un
   identifiant d'organisation, qui n'a pas de forme détectable. Une sonde a
   montré qu'une note libre (ou un message d'erreur) citant `org-1` partait
   **verbatim** dans le rapport — alors que le module promet « jamais l'ID
   d'organisation ». Correctif : `buildProblemReport` ajoute `inputs.orgId` aux
   identités à masquer **par valeur** (`scopedIdentities`), appliquées à la note
   ET aux messages d'erreur. Test : `report-problem.test.ts` — bloc
   « audit PII adversarial » (5 tests) couvrant e-mail/jeton/téléphone/**nom de
   membre**/**orgId** sur les 3 canaux (rapport sérialisé, `extra.report` Sentry,
   journal local).
2. **PR7 — kill switch `notifications-push` testé par grep seulement.**
   La garde de `feature-flags.test.ts` cherchait l'appel dans la source ; une
   garde neutralisée (`if (false && …)`) passait. Ajout d'un test
   **comportemental** `onesignal-killswitch.test.ts` : drapeau coupé ⇒
   `initOneSignal()` no-op ; drapeau absent (fail-open) ⇒ initialise.
3. **PR6 — tutoriel non verrouillé.** L'entrée « Écran “Mise à jour requise”
   au démarrage » existait déjà dans `tutorialContent.ts` (apportée par #192,
   fusionné sur `main`), mais **aucun test ne la protégeait** : la retirer
   passait la CI. Ajout du test de garde dans `tutorial-search.test.ts`
   (non-vacuité : retirer l'entrée ⇒ test rouge).

### Note de rebase

`#192` (passe 2) a été **fusionné sur `main`** pendant la session (`origin/main`
= `1871170`, inclut aussi #193/#195/#196). Cette branche a été rebasée dessus :
les apports déjà présents via #192 (écran santé sans ID technique, test
comportemental du kill switch, entrée de tutoriel) ont été **dé-dupliqués** —
il ne reste ici que ce qui est réellement nouveau (scrub `orgId` par valeur,
audit PII adversarial, garde du tutoriel, robustesse finance/money-format).

## Robustesse finance (bugs silencieux)

- `TransactionNew.tsx` : la catégorie ne se réinitialisait pas au changement de
  type (dépense ↔ recette) → `categoryId` pointait une catégorie de l'autre
  type. Correctif : `useEffect` de reset sur changement de `type`.
  Tests : `finance-silent-bugs.test.tsx`.
- `Versement.tsx` : le préremplissage depuis `location.search`/`location.state`
  (caisse, montant par défaut) n'était pas pris en compte. Tests :
  `versement-prefill.test.tsx`.
- `export.ts` : « FCFA » était doublé (la devise est déjà incluse par
  `formatCurrencyCompact`). Correctif : ne plus la ré-ajouter.

## Passe 3.b — audit « la feature est-elle robuste à long terme ? » (2ᵉ vague)

Après avoir affirmé que la feature money-format était « finie », un audit a
montré qu'elle avait introduit une **régression de masse** : `formatCurrencyCompact`
rend désormais la devise (« 50 000 FCFA »), mais ~20 sites d'appel y ajoutaient
encore « F » → « 50 000 FCFA F » sur tous les écrans finance.

1. **Devise doublée (régression introduite par ce lot).** 20 sites corrigés
   (GroupDetail, EventNew, EventDetail, Cotisations, Events, MembreDetail,
   GroupCotisation, Versement, SaisieRapide, MembresEnAvance, TransactionDetail).
   Garde statique `money-unit-guard.test.ts` (non-vacuité : réintroduire un
   suffixe ⇒ rouge) — la classe est désormais fermée par construction.
2. **Solde de caisse faux (`Versement.tsx`).** Le filtre testait
   `sourceCaisseId` (camelCase), champ **inexistant** sur les lignes PowerSync
   (`PSTransaction` est snake_case) : la 2ᵉ branche du `||` était morte, donc
   les dépenses **DRAFT/PENDING non approuvées** étaient comptées → solde
   fantôme, plafond de versement faux. Correctif : n'admettre que
   `source_caisse_id === caisse && status === "APPROVED"` (même invariant que
   `account.ts::getAccountBalance`). Non-vacuité : restaurer le filtre fautif
   ⇒ 1 test rouge.
3. **Solde affiché 100× trop petit.** `balanceFCFA` (déjà en FCFA) était passé
   à `formatCurrencyCompact`, qui attend des **centimes** → « 10 FCFA » au lieu
   de « 1 000 FCFA ». Correctif : passer `balance` (centimes).

Résultat : le solde de caisse affiché ET le plafond de versement sont désormais
exacts et cohérents avec le solde dérivé côté service.

## Gates (locaux)

| Gate | Commande | Résultat |
|---|---|---|
| Typecheck | `npx tsc -b --force --noEmit` | **0** |
| Lint | `npx eslint <fichiers touchés>` | **0 erreur** (warnings `any` préexistants) |
| Unitaires (ciblés) | `npx vitest run <9 fichiers PR5-PR19>` | **191 passed** |
| Unitaires (complet) | `npx vitest run` | **215 fichiers, 2212 passed, 6 skipped** |

## Écart CORRIGÉ en passe 4 (2026-11-01) — PII des TIERS (noms de membres)

- **Écart** : un nom de **membre tiers** cité dans la note libre ou un message
  d'erreur (« échec pour Jean-Baptiste Kouassi ») traversait le rapport vers
  Sentry et le journal local. `redact` ne masque que les PII à FORME (e-mail,
  jeton, téléphone) ; un nom propre n'a pas de forme détectable et ce n'est pas
  l'identité de l'utilisateur courant, donc `scrubIdentities` ne le voyait pas.
- **Preuve de non-vacuité initiale** : sonde `buildProblemReport(base,
  [{message:"échec pour Jean-Baptiste Kouassi"}], "t", "voir Jean-Baptiste
  Kouassi")` → `JSON.stringify(report)` contenait `Kouassi` (test vert avant
  correctif).
- **La passe 3 avait conclu à tort que c'était non corrigeable** (« les noms des
  autres membres ne sont pas accessibles sans lecture base »). FAUX : les
  membres de l'org active sont **synchrones** via `useMembers()` (cache
  PowerSync/indexeddb), donc disponibles côté UI sans I/O bloquante.
- **Correctif** : `memberIdentities(members)` extrait nom complet + prénom + nom
  (tolérant snake_case PowerSync / camelCase store) ; `sendProblemReport` /
  `sendProblemReportToIssues` acceptent une liste `members` et l'ajoutent aux
  identités à masquer par valeur ; `Health.tsx` passe `useMembers().data`.
- **Non-vacuité** : retirer `memberIdentities(members)` du calcul
  `scopedIdentities` ⇒ `report-problem.test.ts` rouge (1 test).
- **Contrepartie assumée** : masquer aussi le prénom isole les homonymes d'un mot
  courant dans la note ; la sécurité PII prime sur la lisibilité du rapport.

## Écarts NON corrigeables (assumés)

- Aucun restant connu pour PR5 après passe 4.
