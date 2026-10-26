# ESCALATIONS — blocages et replis appliqués

> Une entrée par blocage : **symptôme · preuves · hypothèses testées ·
> recommandation · repli appliqué**. Une escalade **ne bloque pas** la boucle :
> on applique le repli le plus sûr et réversible, on le consigne, on continue.
> Seuls les risques de **perte de données** ou de **fuite inter-organisation**
> arrêtent l'élément concerné (désactivé par drapeau).

## E1 — Déploiement du sync-config PowerSync Cloud impossible

- **Symptôme** : `powersync deploy sync-config` échoue ; `PS_ADMIN_TOKEN` absent
  de l'environnement de l'agent (et non créable : le jeton de session ne permet
  pas de créer des secrets GitHub, 403 vérifié).
- **Preuves** : `powersync/sync-config.yaml` corrigé (filtres d'organisation)
  mais non déployé ; R89.b (filtre de stream plafonné à 1000) ouvert.
- **Hypothèses testées** : (1) déployer via CLI → bloqué faute de jeton ;
  (2) déployer via MCP Supabase → hors périmètre (PowerSync n'est pas Supabase).
- **Recommandation** : le propriétaire déploie `sync-config.yaml` après création
  du secret `PS_ADMIN_TOKEN` (procédure RUNBOOK §PowerSync).
- **Repli appliqué** : fichier source corrigé et versionné ; la boucle poursuit
  les chantiers non dépendants du déploiement (routage, RBAC, finance).

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

## E3 — Sauvegardes automatiques non activées

- **Symptôme** : `.github/workflows/backup.yml` présent mais jamais exécuté avec
  succès (secrets `SUPABASE_DB_URL` / `BACKUP_GPG_PASSPHRASE` absents).
- **Preuves** : run déclenché → 0 artefact publié (garde-fou « publier seulement
  si chiffré » OK) ; chaîne de sauvegarde/restauration **prouvée manuellement**
  (R99 : 44 tables, 146 politiques RLS, fidélité 10/10).
- **Hypothèses testées** : (1) activer le workflow → bloqué faute de secrets ;
  (2) sauvegarde manuelle → réussie.
- **Recommandation** : le propriétaire crée `SUPABASE_DB_URL` +
  `BACKUP_GPG_PASSPHRASE` (procédure RUNBOOK §« Sauvegarde VÉRIFIÉE »).
- **Repli appliqué** : aucune migration destructive tant que la sauvegarde
  automatique n'est pas active (principe conservateur D-S9-5) ; runbook opérateur
  livré.
