# ESCALATIONS — blocages et replis appliqués

> Une entrée par blocage : **symptôme · preuves · hypothèses testées ·
> recommandation · repli appliqué**. Une escalade **ne bloque pas** la boucle :
> on applique le repli le plus sûr et réversible, on le consigne, on continue.
> Seuls les risques de **perte de données** ou de **fuite inter-organisation**
> arrêtent l'élément concerné (désactivé par drapeau).

## E1 — Déploiement du sync-config PowerSync Cloud — RÉSOLU (2026-10-27), **réplication re-réparée (2026-10-28)**

- **Symptôme (historique)** : `powersync deploy sync-config` échouait ;
  `PS_ADMIN_TOKEN` absent de l'environnement de l'agent.
- **Résolution (2026-10-27)** : le jeton d'administration a été rendu disponible.
  `powersync validate` → ✓ ; `powersync deploy sync-config` → *Deployment
  operation completed successfully*. Preuve : sync `org-e2e` = 6709 événements.
- **⚠️ Fausse clôture détectée le 2026-10-28** : l'instance **Production**
  (`6a9dd96302481fb31b945823`) avait en réalité une réplication **ARRÊTÉE**
  (`password authentication failed for user "postgres"`, slot `_19_179e`
  invalidé). Le marquage « RÉSOLU » portait sur le *déploiement du fichier*, pas
  sur l'état de la connexion — d'où une **panne silencieuse** de ~24 h.
- **Cause racine** : `service.yaml` visait `username: postgres` +
  `secret_ref: default_password` ; le mot de passe `postgres` avait été rotaté
  côté Supabase et était irrécupérable. Le modèle qui fonctionne (instance
  *Development*) est un **rôle de réplication dédié** créé par l'intégration
  Supabase (`powersync_*` + `secret_ref: supabase_*_password`).
- **Réparation** : instance Production réapprovisionnée par le propriétaire
  (utilisateur `powersync_28d1d97617993b66d4ee0a3b`). Vérifié : `connected`,
  slot `_21_d422`, lag 0, **`POST /sync/stream` → HTTP 200, 15,9 Mo, 30 499 lignes**.
- **Dérive corrigée au passage** : le sync-config déployé était périmé (stream
  `grants` sans cloisonnement org, R61) → redéployé ; `deployed == dépôt` (0 diff).
- **Durcissement anti-récidive** : `service.yaml` réconcilié avec la config
  canonique + commentaire interdisant le retour au modèle `postgres`/`default_password` ;
  `.gitignore` couvre `powersync/*-fetched.yaml`. Receipt :
  `phase-09/2026-10-28-r80-powersync-repair.md`.

## E2 — Suite Cypress jamais verte sur `main` (environnement E2E)

- **Symptôme** : la suite Cypress échoue de façon déterministe (10 specs) sur
  `main`, indépendamment des correctifs.
- **Preuves** : R98 (hypothèse « parallélisation » **réfutée** par mesure en
  mono-conteneur, run `40080015253`) ; cause réelle circonscrite = environnement
  E2E (PowerSync/réplique vide R53, prérequis offline R83, contexte d'org R72).
- **Hypothèses testées** : (1) parallélisation → réfutée ; (2) specs fragiles →
  partiellement (org-reports) mais pas la cause racine.
- **Recommandation** : reconstruire un environnement E2E déterministe
  (proposition P41) ; en attendant, ne pas se fier au rouge Cypress global.
- **Repli appliqué** : seuls les gates déterministes locaux (`tsc -b`, lint,
  vitest, build) sont bloquants ; les specs Cypress **indépendantes de
  PowerSync** restent le signal E2E exploitable.

## E3 — Sauvegardes automatiques : chaîne prouvée, activation = propriétaire

- **Symptôme** : `.github/workflows/backup.yml` présent mais jamais exécuté avec
  succès (secrets `SUPABASE_DB_URL` / `BACKUP_GPG_PASSPHRASE` absents).
- **Preuves** : chaîne complète **exécutée et vérifiée le 2026-10-27** — schéma
  17 838 o, données 2 166 111 o (76 tables), empreintes SHA-256 OK, chiffrement
  AES256 déchiffrable (`gpg --decrypt | zcat` → 76 tables) ; run workflow
  `40114231378` → 0 artefact publié (garde-fou « chiffré seulement » OK).
  Restauration prouvée antérieurement (R99 : 44 tables, 146 politiques, 10/10).
- **Correctif inclus** : bug latent du script (nom `.gz` conservant le point
  initial → échec des empreintes) corrigé ; cadence passée en **hebdomadaire**.
- **Hypothèses testées** : (1) activer le workflow → bloqué faute de secrets ;
  (2) sauvegarde manuelle → réussie.
- **Recommandation** : le propriétaire crée `SUPABASE_DB_URL` +
  `BACKUP_GPG_PASSPHRASE` (procédure RUNBOOK §« Sauvegarde VÉRIFIÉE »).
- **Repli appliqué** : aucune migration destructive tant que la sauvegarde
  automatique n'est pas active (principe conservateur D-S9-5) ; runbook opérateur
  livré.

## E4 — Le parcours « réclamer une invitation » ne peut pas aboutir (R111)

- **Symptôme** : un invité qui réclame une invitation (QR/code/fichier) voit
  « bienvenue » dans l'app, mais **rien n'arrive en base** : le profil PENDING
  n'est jamais uploadé, le claim n'est jamais réglé, l'utilisateur n'obtient
  jamais le rôle/organisation de l'invitation.
- **Cause racine** : `claimInvitation` crée un profil PENDING à **UUID
  aléatoire** (`crypto.randomUUID()`), or `profiles.id → auth.users(id)` et
  `org_memberships.user_id → auth.users(id)` (FK **NON deferrable**). Le
  « bridge `auth.users` » prévu par le design (edge `bridge-auth.ts`, Vague 3.5)
  n'a jamais été implémenté.
- **Preuves** : `23503` à l'upsert du profil **et** au règlement du trigger ;
  `invitation_claims = 0` et profils `pending-*@lumina.local = 0` en base ;
  contrôle négatif/positif : le flux avec un **compte Auth réel** réussit
  (claim `CONFIRMED`, profil+membership `ACTIVE`, sync filtrée `events:1`).
- **Décision requise (propriétaire)** : (a) exiger une inscription Auth avant
  le claim et porter `resulting_user_id` = id Auth du réclamant, ou (b) assouplir
  la FK `profiles.id → auth.users`. Non tranché.
- **Repli appliqué** : aucun code modifié (décision d'architecture) ; documenté
  (R111) + receipt.

## E5 — Authentification PowerSync : audience `authenticated` rejetée (401) — R132

- **Symptôme** : toute la suite Cypress reste rouge **au-delà** de E2 : les
  pages gardées par `isPowerSyncReadyNow()` (Reports, Balance, History, Members,
  Events, Groups, Versement, TransactionEdit…) affichent leur **squelette
  indéfiniment**, donc les libellés/titres attendus par les specs ne sont jamais
  rendus. Ce n'est pas une dérive d'UI : les chaînes existent dans le code.
- **Cause racine** : le service PowerSync déployé (instance
  `6a9dd96302481fb31b945823`) **rejette l'audience `authenticated`** des jetons
  Supabase : `PSYNC_S2105 — Unexpected "aud" claim value: "authenticated"`. Le
  projet Supabase signe en **ES256 asymétrique** (`kid e6d0da61-…`, JWKS public)
  et émet `aud: "authenticated"` ; la config JWKS du service n'accepte pas cette
  audience (le `service.yaml` du dépôt porte `additional_audiences: []` sans
  liste d'audiences acceptée). Résultat : `status.connected` reste `false`,
  `markPowerSyncReady()` n'est jamais appelé, `_psReady` reste `false`.
- **Preuves** : (1) jeton Supabase **valide** (`GET /auth/v1/user` → HTTP 200) ;
  (2) `POST /sync/stream` avec ce jeton → **HTTP 401 PSYNC_S2105** (reproduit
  hors navigateur) ; (3) état in-browser `window.__psDb.currentStatus` :
  `connected: false`, `downloadError` = le message ci-dessus ; (4) contre-épreuve
  : `isPowerSyncReadyNow()` forcé à `true` (patch non commité) → `reports-budgets`
  **5/5** (contre 3/5) — la variable décisive est bien la disponibilité.
- **Correctif requis (propriétaire)** : ajouter `authenticated` aux audiences
  acceptées du **service config** PowerSync
  (`client_auth.audience: ["authenticated"]` / `additional_audiences:
  ["authenticated"]` selon le schéma) puis `powersync deploy service-config`
  (exige `PS_ADMIN_TOKEN` — absent de l'environnement de l'agent, cf. E1).
  Vérification attendue : `POST /sync/stream` → **HTTP 200**.
- **Repli appliqué** : **aucun** code applicatif modifié ; les gardes R52 (qui
  exigent le squelette tant que la réplique n'a pas répondu) sont **conservées**
  (les assouplir rouvrirait R52.q et ferait passer un test en l'affaiblissant).
  Interdit respecté : `powersync/service.yaml` et `powersync/sync-config.yaml`
  non touchés. Receipt : `phase-11/2026-10-29-cypress-sync-auth-blocker.md`.
- **Défaut jumeau (R133, non corrigé — dépend de E5)** : dans
  `comprehensive-flow.cy.ts`, l'`id` dérivé de l'URL après création vaut `"new"`
  (`/transaction/new` satisfait `should('include', '/transaction/')`), donc le
  spec visite `/transaction/new/edit` → « Transaction introuvable ». Fragilité
  de **spec** (pas produit), atteignable seulement après E5.
