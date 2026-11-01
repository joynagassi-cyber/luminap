# Phase 11 — remontée d'erreurs PRÉ-LOGIN (anonyme, rate-limitée)

- **Date** : 2026-11-01
- **Branche** : `feat/observability-github-issues`
- **Priorité** : P1 (observabilité ; le défaut rendait invisible la classe
  d'incidents la plus utile au diagnostic : ceux qui empêchent la connexion)
- **Statut** : terminé (portes vertes, non-vacuité prouvée, E2E cloud réel)
- **Périmètre** : 1 edge function (voie anonyme), 1 table + 1 RPC (migration),
  1 transport client, tests + documentation.

## Défaut corrigé (R145)

`report-error` exigeait un appelant **authentifié** (`verify_jwt: true` +
`auth.getUser`). Tout incident survenant AVANT la connexion — crash de l'écran
d'auth, échec du flux d'invitation, perte réseau au boot — restait en file
locale et n'était remonté qu'APRÈS login. Il était **perdu** si l'utilisateur ne
parvenait jamais à se connecter : précisément le cas qu'on cherche à
diagnostiquer.

## Correctif

1. **Edge function `report-error`** (`verify_jwt: false`, déployée v3) : la
   fonction identifie elle-même l'appelant (`auth.getUser`).
   - **Voie authentifiée** : plafond large (`USER_MAX_PER_HOUR` = 20), bucket
     `user:<uuid>`.
   - **Voie anonyme** : plafond serré (`ANON_MAX_PER_HOUR` = 5), bucket =
     `sha256(salt + ip)`. **L'IP n'est jamais stockée en clair.**
   - Un JWT **forgé** ne lève pas `auth.getUser` → retombe sur la voie anonyme
     (donc plafonné) : pas de contournement du plafond par en-tête forgé.
   - Sans `service_role`, la voie anonyme est **REFUSÉE** (503) : jamais
     d'endpoint public non plafonné.
2. **Migration `20261101000002`** : table `error_report_throttle`
   (`(bucket, window_start) → count`, RLS deny-all, grants `service_role`
   seulement) + RPC `register_anonymous_report(bucket, max)` SECURITY DEFINER
   dont l'EXECUTE est **révoqué** de `PUBLIC`/`anon`/`authenticated` (seul
   `service_role` peut l'appeler). Un client ne peut donc pas gonfler un compteur
   pour bloquer autrui (déni de signalement).
3. **Transport client** (`errorReporter.ts`) : envoie le rapport sans session
   (`apikey` = clé publiable ; pas de `Authorization`) quand aucun jeton n'est
   disponible — couvre la phase pré-login.

## Preuves mesurées (cloud réel, projet `hhgovvrnalibhgpakswi`)

| Scénario | Résultat |
|---|---|
| Corps invalide (anonyme) | `400` |
| Dépôt hors allowlist | `400 {"error":"Dépôt non autorisé."}` (handler atteint) |
| 5 appels anonymes puis 6e | 5 autorisés puis `429` |
| JWT forgé (signature invalide) | traité anonyme → `429` après plafond |
| Sans `apikey` | `429` (voie anonyme, plafonnée) |
| Rapport réel (anonyme) | `200 {"ok":true,"issueNumber":203}` — Issue créée avec le label `openhands`, puis fermée |
| Rapport réel (JWT valide) | `200 {"ok":true,"issueNumber":204}` — Issue créée label `openhands` ; 2e appel même signature → `deduped:true` ; bucket `user:<uuid>` vérifié en base ; Issue + utilisateur de test supprimés |

## Non-vacuité des gardes

- `V: report-error-throttle.test.ts` (12) — logique pure de fenêtre/plafond
  (bornes inclusives, reset de fenêtre, `max` invalide).
- `V: error-to-issue-integration-guard.test.ts` (26) — gardes statiques :
  `verify_jwt:false` + `auth.getUser` DANS la fonction, voie anonyme câblée,
  bucket d'IP haché, `429`, refus sans `service_role`, EXECUTE révoqué dans la
  migration.

## Risque résiduel (accepté, borné)

Point d'écriture public : un tiers peut faire créer une Issue au texte qu'il
contrôle (dépôt public). Borné par le plafond par IP (5/h), la déduplication par
signature, l'allowlist de dépôt et la troncature des champs. Documenté dans le
README de la fonction et dans R145.

## Portes

`tsc -b` = 0 · eslint 0 erreur · `vitest run` = 209 fichiers, **2231 passés**,
6 ignorés (2237).
