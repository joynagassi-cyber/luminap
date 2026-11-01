## Lumina v1.2.1 — Durcissement de la robustesse & suite E2E de nouveau verte

Release de **correctifs** : aucune nouvelle fonctionnalité produit, uniquement
de la robustesse, de l'intégrité et des fuites de données personnelles fermées —
plus la remise au vert de la suite E2E.

### Confidentialité (corrigé)
- **Diagnostic de santé (PR4)** — « Copier le diagnostic » recopiait verbatim le
  message d'erreur brut. Il applique désormais `redact()` (e-mail, JWT, clé API
  masqués). Preuve de non-vacuité : le test échoue sans le `redact`.
- **« Signaler un problème » (PR5)** — une note libre contenant un nom propre ou
  un téléphone partait verbatim vers Sentry et le journal local.
  `scrubIdentities()` retire par valeur l'e-mail, le prénom et le nom de
  l'utilisateur courant, dans la note **et** les messages d'erreur repris ;
  `redact()` masque aussi les numéros français.

### Robustesse & intégrité (corrigé)
- **`/archives`** — la sous-liste « Documents archivés » affichait « Aucun
  document archivé » avant la fin de la première lecture PowerSync (invariant
  R52 « pas encore lu » ≠ « vide »). Garde de disponibilité rétablie.
- **Câblage RBAC (PR19)** — la garde `route-state-wiring` vérifiait la présence
  de la clé `hasPermission`, pas sa valeur : `hasPermission: undefined`
  (fail-open silencieux) passait la garde et `tsc`. Elle détecte désormais les
  clés câblées au littéral `undefined`.
- **`useBackupData` (PR2)** — test direct ajouté (le hook portait deux
  invariants jamais vérifiés : garde R52 `ready`, cloisonnement à l'organisation
  active). Non-vacuité prouvée par mutation.

### Suite E2E de nouveau verte
- **Fin de l'id d'organisation `org-e2e` figé** (disparu depuis R161
  self-serve) : résolution dynamique de l'organisation active.
- **Reseed idempotent des catégories canoniques** : `categories` était vide en
  base, toute écriture financière échouait en `23503` (FK).
- **Flush déterministe de la file d'upload PowerSync** après création d'un
  formulaire (`forms-v2`).
- Bilan : les 10 specs Cypress rouges sur `main` passent désormais (51 + 182
  tests, « All specs passed! »).

### Vérification indépendante
Trois revues croisées des filets de robustesse PR1–PR7 / PR19, chacune avec
**preuve de non-vacuité par mutation** (retirer le correctif → le test dédié
échoue → restaurer). Périmètre respecté : aucune proposition produit
(PR8–PR16) implémentée.

### Détails de la signature
- APK signé v1+v2+v3 avec le keystore lumina (fingerprints enregistrés dans la
  console Firebase / Google Play).
- Assets : `app-release.apk` + `app-release.apk.sha256` (hash compagnon POSIX
  lu par le self-updater, format `sha256sum`).

### Mise à jour
- Depuis l'app Android : Paramètres → Mise à jour, ou notification automatique
  (vérification `releases/latest` toutes les 6 h).
- `versionCode` 13, `versionName` 1.2.1.
