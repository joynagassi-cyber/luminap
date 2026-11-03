# PowerSync — déploiement du service de synchronisation (Sync Streams)

> Dernière mise à jour : 2026-11-03 (double-scope multi-org, « Étape 2 »).
> Instance : `6a9dd96302481fb31b945823` (« Production », région eu) —
> voir `powersync/cli.yaml`. Projet Supabase : `hhgovvrnalibhgpakswi`.

## 1. Ce qui a été fait (2026-11-03)

**Problème.** Les streams filtraient les données par
`profiles.org_id` uniquement. Or `profiles` ne porte qu'**une**
organisation par utilisateur : les organisations secondaires
(`org_memberships`) ne synchronisaient jamais. Après un changement
d'organisation, l'application restait vide — PowerSync étant
l'unique source de données, en ligne comme hors ligne. Le fichier
portait d'ailleurs ce chantier en commentaire (« Modèle à répliquer
aux 22 autres streams en Étape 2 »).

**Changement** (`powersync/sync-config.yaml`, édition 3, 43 streams) —
le scope de chaque stream organisationnel devient :

```sql
WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.user_id())
   OR org_id IN (SELECT org_id FROM org_memberships
                  WHERE user_id = auth.user_id() AND status = 'ACTIVE')
   OR org_id IN (SELECT org_id FROM org_memberships
                  WHERE user_id = auth.user_id() AND status = 'PENDING')
```

- **32 streams** au pattern simple élargis mécaniquement
  (transactions, members, groups, cotisations, audit_entries,
  documents, budgets, giving, formulaires, …).
- **Variantes traitées à la main** : `org_memberships` et `org_admins`
  (branche `OR` existante), `org_families` / `org_owned`
  (les organisations des memberships descendent aussi), `org_reports`
  (émis **et** reçus par toutes les orgs de l'utilisateur).
- **Inchangés** (scope déjà multi-org ou dédié) : `profiles`,
  `invitations`, `invitation_claims` (rôles admin), `grants`,
  `org_administered`, `tag_assignments`.
- Pour un utilisateur mono-org (backfill 1:1 `profiles` ↔
  `org_memberships`), le jeu de données est strictement inchangé.

**Vérifié le 2026-11-03** (via Supabase, projet `hhgovvrnalibhgpakswi`) :

- publication `powersync` : les 48 tables publiques y sont
  (aucune table à ajouter) ;
- les 42 tables du schéma client (`src/lib/powersync/schema.ts` +
  fichiers annexes multi-org/invitations/admins/reports) ont toutes
  leur stream — gardé par `sync-stream-coverage.test.ts` ;
- `service.yaml` inchangé (réplication + auth JWKS + audience
  `authenticated`) — **pas** de `deploy service-config` requis.

**Gardes automatiques** (exécutées en CI) :
`sync-multi-org-scope.test.ts` (nouveau : tout stream scopé par
`profiles` doit aussi scoper par `org_memberships` ACTIVE+PENDING),
`sync-streams-drift`, `sync-stream-coverage`, `sync-param-limit-guard`,
`powersync-schema-drift-guard`, `sync-config-invitations`.

## 2. Déployer les streams (à exécuter par l'équipe)

> ⚠️ L'environnement de développement automatisé n'a **ni accès réseau
> à PowerSync Cloud ni les identifiants CLI** : la configuration et sa
> validation locale sont faites et commitées, mais la commande
> `deploy` ci-dessous doit être lancée par une personne authentifiée
> (PAT PowerSync). Aucune autre étape n'est requise.

Prérequis : [CLI PowerSync](https://docs.powersync.com/tools/cli)
installée, jeton personnel (PAT) du compte propriétaire de l'instance.

```bash
# 1. S'authentifier (navigateur → PAT), une seule fois par machine
powersync login

# 2. Lier le dépôt à l'instance Production (déjà fait si powersync/cli.yaml
#    est celui du dépôt — instance 6a9dd96302481fb31b945823)
powersync link cloud --instance-id=6a9dd96302481fb31b945823

# 3. Déployer UNIQUEMENT les Sync Streams (depuis la racine du dépôt,
#    dossier powersync/ versionné)
powersync deploy sync-config
```

Ne **pas** lancer `powersync deploy service-config` pour ce
changement : `service.yaml` (connexion de réplication, JWKS,
`additional_audiences: ["authenticated"]`) est inchangé et fragile
— voir les avertissements en tête de ce fichier.

## 3. Validation post-déploiement

1. **Dashboard PowerSync** (https://dashboard.powersync.com) →
   instance Production → vérifier que le déploiement est accepté sans
   erreur de validation SQL et que la réplication reste à 0 lag.
2. **Statut CLI** : `powersync fetch status` doit refléter les
   nouvelles requêtes (branches `org_memberships`).
3. **Test fonctionnel** : avec un compte membre de **deux**
   organisations (une via `profiles.org_id`, l'autre via
   `org_memberships`), ouvrir l'app, basculer sur l'organisation
   secondaire : ses transactions/membres/groupes doivent apparaître
   (avant ce changement : listes vides). Recommencer **hors ligne**
   après une première synchro complète.
4. **Effet attendu sur les clients** : la redéfinition des buckets
   provoque un re-téléchargement unique des données concernées à la
   prochaine connexion — normal, sans perte (les écritures locales en
   file sont conservées et poussées par le cycle d'upload habituel).

## 4. Retour arrière

Le fichier versionné fait foi : restaurer la version précédente et
redéployer.

```bash
git checkout <commit-avant-changement> -- powersync/sync-config.yaml
powersync deploy sync-config
```

Effet : les clients reviennent au scope mono-org au prochain
checkpoint (les données des orgs secondaires déjà descendues
sortent des buckets ; aucune écriture serveur n'est affectée).
