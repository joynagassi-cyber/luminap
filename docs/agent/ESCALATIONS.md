# ESCALATIONS — blocages et replis appliqués

> Une entrée par blocage : **symptôme · preuves · hypothèses testées ·
> recommandation · repli appliqué**. Une escalade **ne bloque pas** la boucle :
> on applique le repli le plus sûr et réversible, on le consigne, on continue.
> Seuls les risques de **perte de données** ou de **fuite inter-organisation**
> arrêtent l'élément concerné (désactivé par drapeau).

## E1 — Déploiement du sync-config PowerSync Cloud — RÉSOLU (2026-10-27)

- **Symptôme (historique)** : `powersync deploy sync-config` échouait ;
  `PS_ADMIN_TOKEN` absent de l'environnement de l'agent.
- **Résolution** : le jeton d'administration a été rendu disponible (coffre
  local `~/.ps-secrets`, non versionné). `powersync validate` → ✓ ; `powersync
  deploy sync-config` → *Deployment operation completed successfully*.
- **Preuve de bout en bout** : après déploiement, la synchronisation du profil
  à fort volume (`org-e2e`, 6709 événements) réussit — `connected:true`,
  `hasSynced:true`, **`events: 6709`** (avant : `PSYNC_S2305`, 0 ligne).
- **Repli (historique)** : fichier source corrigé et versionné pendant la
  période où le déploiement était bloqué.

## E2 — Suite Cypress jamais verte sur `main` (environnement E2E) — CAUSE RACINE MESURÉE (2026-10-29)

- **Symptôme** : la suite Cypress échoue de façon déterministe (10 specs) sur
  `main`, indépendamment des correctifs.
- **Preuves** : R98 (hypothèse « parallélisation » **réfutée** par mesure en
  mono-conteneur, run `40080015253`) ; cause réelle circonscrite = environnement
  E2E (PowerSync/réplique vide R53, prérequis offline R83, contexte d'org R72).
- **CAUSE RACINE (mesurée le 2026-10-29, reproductible)** : l'instance PowerSync
  Production `6a9dd96302481fb31b945823` rejette **tout** jeton d'utilisateur
  Supabase avec `401 PSYNC_S2105 — Unexpected "aud" claim value: "authenticated"`.
  Le service config déployé n'accepte pas l'audience `authenticated` (que
  Supabase impose dans ses jetons) : `client_auth.additional_audiences` est vide.
  Preuve : corps de sync **valide** + jeton réel (`lumina-org-e2e@lumina.dev`)
  → `401 PSYNC_S2105` **5×/5** ; JWKS public ES256 `kid=e6d0da61-…` bien résolu ;
  jeton legacy HS256 → `S2101` (kid introuvable). Détail + commandes :
  `docs/agent/receipts/phase-12/2026-10-29-cypress-powersync-audience.md`.
- **Conséquence** : la base locale SQLite reste vide → toutes les specs « cloud »
  (sessions, members, forms-v2, persistence, cross-tenant, org-reports,
  groups-events, events-tasks, calendar, finance-deep, performance-batch)
  échouent ; les specs **offline** (`local-dashboard.cy.ts`) passent (2/2).
- **Hypothèses testées** : (1) parallélisation → réfutée ; (2) specs fragiles →
  partiellement (org-reports) mais pas la cause racine ; (3) réplication arrêtée
  → réparée (R80), plus la cause ; (4) **audience JWT PowerSync → CONFIRMÉE**.
- **Recommandation (propriétaire)** : ajouter `authenticated` à
  `additional_audiences` (tableau de bord → Client Auth → JWT Audience, ou
  `powersync deploy service-config` après application de
  `docs/agent/patches/powersync-service-audience.patch`). Doc PowerSync :
  « PSYNC_S2105 … Add `authenticated` to your audience configuration. »
- **Repli appliqué** : `powersync/service.yaml` **non modifié** (config
  déployée) ; correctif livré en patch + receipt ; aucune spec affaiblie.

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
