# Receipt — R80 : réparation de la réplication PowerSync + élargissement du stream `profiles`

**Date** : 2026-10-28 (session de nuit)
**Branche** : `fix/powersync-replication-r80`
**Priorité** : P1 (débloque la synchronisation de toutes les fonctionnalités)

## 1. Contexte — E1 était marqué « RÉSOLU » alors que la réplication était tombée

`ESCALATIONS.md` (E1) et `PROGRESS.md` déclaraient le déploiement PowerSync
« RÉSOLU depuis le 2026-10-27 ». En réalité, l'instance **Production**
(`6a9dd96302481fb31b945823`) avait une réplication **arrêtée** :

- connexion `default` : `password authentication failed for user "postgres"` ;
- le mot de passe du rôle `postgres` avait été **rotaté** côté Supabase et était
  irrécupérable (non superutilisateur → `ALTER ROLE postgres PASSWORD` = 42501) ;
- slot de réplication `powersync_6a9dd96302481fb31b945823_19_179e` **INACTIF**,
  `restart_lsn` NULL (invalidé).

**Cause racine** : le `service.yaml` du dépôt visait `username: postgres` +
`secret_ref: default_password`, alors que l'intégration Supabase crée un rôle
de réplication **dédié** et un secret vault nommé d'après le projet. Le modèle
qui fonctionne est celui de l'instance *Development* (utilisateur
`powersync_*`, `secret_ref: supabase_*_password`).

## 2. Réparation (côté propriétaire) puis vérification (côté agent)

Le propriétaire a **réapprovisionné** l'instance Production : elle utilise
désormais `username: powersync_28d1d97617993b66d4ee0a3b` +
`secret_ref: supabase_6ae28a41b82cab873076dfc9_password`.

Vérifications (jeton admin `PS_ADMIN_TOKEN`) :

| Contrôle | Résultat |
|---|---|
| `powersync status` | connexion `connected`, slot `..._21_d422`, `Initial replication done: true`, **lag 0 octet**, keepalive frais |
| `powersync validate` | ✓ schéma, ✓ connexion, ✓ sync config |
| **Preuve de bout en bout** | `POST /sync/stream` (jeton client) → **HTTP 200, 15,9 Mo, 30 499 lignes** (13 336 `events`, 13 862 `notifications`, 607 `org_units`, 606 `groups`, …) |

## 3. Dérive corrigée : le sync-config déployé était périmé

Comparaison `deployed` vs dépôt : **31 streams, 1 seul diff** — le stream
`grants` n'avait **pas** le cloisonnement par organisation (correctif R61 /
migration `20261027000010`, déjà appliquée en base). Déployé via
`powersync deploy sync-config` (dry-run conforme, diff exactement attendu).

**Après déploiement** : `deployed == dépôt` (31 streams, 0 diff).

## 4. Correctif produit R80 — stream `profiles` trop étroit

**Défaut** : `profiles` n'était synchronisé que pour l'utilisateur courant
(`WHERE id = auth.user_id()`), alors que des écrans affichent le nom d'AUTRES
membres (`/forms` colonne « Soumetteur ») → repli sur l'UUID brut.

**Correctif** : le stream reproduit **exactement** la politique RLS
`profiles_select` = `(initplan_uid() = id) OR is_org_member(initplan_uid(), org_id)`,
où `is_org_member` = appartenance via `profiles.org_id` OU `org_memberships`
(ACTIVE/PENDING) OU `org_admins` (ACTIVE), **sentinelles `__no_org__`/`no-org`/vide exclues**.

Contraintes du moteur Sync Streams (découvertes par `validate`, puis
contournées) : `IN (a, b)` multi-valeurs **non supporté** → deux sous-requêtes
séparées ; `btrim()` **inconnu** → comparaisons `<>` simples.

**Preuve après déploiement** (jeton de l'utilisateur `org-e2e`) :
`profiles|0.16.6["org-e2e"]` **count = 1** → les profils de l'organisation sont
bien synchronisés (avant : seuls les buckets `profiles|…[<uid>]` existaient).

## 5. Durcissement anti-récidive

- `powersync/service.yaml` réconcilié avec la config canonique qui fonctionne
  (utilisateur dédié + `secret_ref` ; `client_auth` par **JWKS public**, pas le
  secret JWT legacy). Commentaire explicite interdisant le retour au modèle
  `postgres`/`default_password`.
- `.gitignore` : `powersync/*-fetched.yaml` (artefacts de `powersync pull instance`).
- `powersync validate` → **toutes les validations passent**.

## 6. Limites assumées

- `powersync deploy service-config` a été **volontairement non exécuté** : le
  dry-run signalait une re-résolution cosmétique du `secret_ref` (blocs
  `replication` sémantiquement identiques). Ne pas risquer de casser une
  connexion qui fonctionne.
- Aucune donnée supprimée ; aucun secret en clair dans le dépôt (le dépôt reste
  public : seuls des `secret_ref` sont versionnés).
