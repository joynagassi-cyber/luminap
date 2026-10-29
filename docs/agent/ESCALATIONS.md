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

## E5 — Audience JWT PowerSync refusée (`PSYNC_S2105`) : déploiement `service-config` = propriétaire

- **Symptôme** : toute l'app reste sur des squelettes de chargement pour un
  utilisateur connecté (P0 « écran muet », R129). PowerSync ne devient jamais
  `connected`.
- **Cause racine (mesurée)** : l'instance Production
  (`6a9dd96302481fb31b945823`) rejette tout jeton utilisateur Supabase avec
  `401 PSYNC_S2105 — Unexpected "aud" claim value: "authenticated"`. Le service
  config déployé a `client_auth.additional_audiences: []`, alors que le
  collecteur JWKS explicite (`jwks_uri`) valide contre cette liste (il n'a pas
  de `requiresAudience` propre) → aucune audience autorisée.
- **Preuve** : `POST /sync/stream` (JWT utilisateur réel) → `401` ;
  `__psDb.currentStatus.dataFlow.downloadError` = `PSYNC_S2105` dans le
  navigateur ; `/members` reste en `data-screen-state="loading"`.
- **Correctif prêt (dépôt)** : `powersync/service.yaml` →
  `client_auth.additional_audiences: ["authenticated"]`. Appliquer :
  ```bash
  powersync deploy service-config
  ```
  puis re-mesurer (`POST /sync/stream` doit répondre **200**) et relancer les
  specs Cypress « cloud » (elles doivent redevenir lisibles).
- **Repli appliqué (agent, ne dépend pas du déploiement)** : filet de sécurité
  produit « zéro écran muet » (R129) — au-delà de 30 s sans réplique, l'app
  affiche « Synchronisation indisponible… » + « Réessayer » au lieu d'un
  squelette perpétuel. Prouvé en local.
- **Convergence** : 2 agents Cloud ont isolé la même cause (PRs #116, #117).
- **Action propriétaire** : déployer le service config (jeton admin
  `PS_ADMIN_TOKEN` requis, absent de cet environnement).
