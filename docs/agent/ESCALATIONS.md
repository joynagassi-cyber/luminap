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
