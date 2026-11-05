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

## E3 — Sauvegardes automatiques : **RÉSOLUE** (secrets configurés, publication vérifiée)

- **Symptôme initial** : `.github/workflows/backup.yml` présent mais export
  *skipped* (secrets `SUPABASE_DB_URL` / `BACKUP_GPG_PASSPHRASE` absents) → runs
  **verts mais sans sauvegarde** (faux sentiment de sécurité).
- **Preuve de résolution (2026-10-29)** : déclenchement manuel → run
  `40813667253` **succès**, étapes « Export (schéma + données) » **et**
  « Publier l'export (chiffré uniquement) » **exécutées**, **1 artefact chiffré
  publié** (`supabase-backup-40813667253`, 3,9 Mo, non expiré). ⇒ Les deux
  secrets sont **désormais présents** ; les runs planifiés du dimanche
  produiront donc des artefacts (les runs antérieurs au 27/10 étaient
  antérieurs à la configuration).
- **Antériorité** : chaîne vérifiée le 2026-10-27 (schéma 17 838 o, données
  2 166 111 o, empreintes SHA-256 OK, AES256 déchiffrable) ; restauration
  prouvée (R99 : 44 tables, 146 politiques, 10/10).
- **Correctif inclus** : bug latent du script (nom `.gz` conservant le point
  initial → échec des empreintes) corrigé ; cadence **hebdomadaire**.
- **Reste à la charge du propriétaire** : rien de bloquant. Optionnel : passer
  le dépôt en privé pour une rétention hors-site durable (les artefacts CI
  restent 14 j ; dépôt public ⇒ garde-fou « chiffré seulement » actif).
- **Repli** : la sauvegarde étant **vérifiée**, les opérations destructives
  (ex. purge des données de test, phase 18) sont désormais **couvertes** par une
  restauration possible (principe conservateur D-S9-5 levé).

## E4 — Le parcours « réclamer une invitation » — **RÉSOLUE** (R111, option a)

- **Symptôme initial** : un invité qui réclame une invitation (QR/code/fichier)
  voyait « bienvenue » dans l'app, mais **rien n'arrivait en base** : le profil
  PENDING n'était jamais uploadé, le claim jamais réglé, l'utilisateur
  n'obtenait jamais le rôle/organisation de l'invitation.
- **Cause racine** : `claimInvitation` créait un profil PENDING à **UUID
  aléatoire** (`crypto.randomUUID()`), or `profiles.id → auth.users(id)` et
  `org_memberships.user_id → auth.users(id)` (FK **NON deferrable**). Le
  « bridge `auth.users` » prévu par le design (edge `bridge-auth.ts`, Vague 3.5)
  n'a jamais été implémenté.
- **Décision retenue (option a, tranchée)** : **inscription Auth obligatoire
  avant le claim**. Implémenté (PR #55, `agent/r111-claim-auth-required`) :
  - `claimInvitation` exige une session (`authService.getSession()`) ; sans
    session → `AUTH_REQUIRED` ; le profil local est un **UPSERT** lié à
    `auth.uid()` qui n'écrit QUE `status='PENDING'` (role/org_id intacts) ;
  - `InvitationClaim.tsx` : bandeau « Créez d'abord votre compte » + CTA
    `/auth` sans session.
- **Preuve du correctif** : compte Auth réel → profil `PENDING`, claim
  `PENDING_SYNC` puis règlement serveur → `role=ANCIEN`, `org_id=org-1`, profil
  `ACTIVE`, claim `CONFIRMED`, `used_count=1`, `org_memberships=1` ; contre-cas
  (UUID aléatoire) → `23503 profiles_id_fkey` (désormais impossible).
- **Statut** : **résolue** (code en `main` depuis la PR #55 ; vérifié
  `src/capabilities/invitation/index.ts` lignes 302-357). Documentée (R111) +
  receipt `phase-05-06/2026-10-26-r111-claim-auth-required.md`.
- **Reste ouvert (hors périmètre)** : le scope granulaire (event/report/ressource
  libre) n'a pas d'UI d'émission (R112).

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
- **Preuve décisive (2026-10-29)** : `POST /sync/stream` avec un JWT
  utilisateur réel (`aud: "authenticated"`, ES256, `kid=e6d0da61-…`) →
  **401 `PSYNC_S2105`** ; contre-épreuves : corps invalide + jeton bidon →
  `400 FST_ERR_CTP_INVALID_JSON_BODY` (le parseur répond **avant** l'auth — un
  400 ne prouve rien) ; jeton legacy HS256 → `401 PSYNC_S2101` (clé absente).
- **Mécanisme exact** : le collecteur JWKS explicite (`client_auth.jwks_uri`)
  n'a pas de `requiresAudience` → `KeyStore.verifyJwt` retombe sur
  `client_auth.audience` (= `additional_audiences`) ; le collecteur Supabase
  auto-dérivé (qui porte `requiresAudience: ["authenticated"]`) est **masqué**
  par le collecteur explicite (même URL, même `kid`).
- **Correctif prêt (dépôt, forme exacte)** : `powersync/service.yaml` →
  `client_auth.additional_audiences: ["authenticated"]`. Après
  `powersync deploy service-config`, `POST /sync/stream` doit répondre **200**.
- **Filet produit appliqué par l'agent (ne dépend pas du déploiement)** : au-delà
  de 30 s sans réplique, l'app affiche « Synchronisation indisponible… » +
  « Réessayer » (`SyncUnavailableBanner`) au lieu d'un squelette **perpétuel**
  muet (R132). Les gardes R52 sont **conservées**. Prouvé en local (bannière
  visible en 45 s sur l'instance cassée).
- **Convergence** : l'agent local et 2 agents Cloud ont isolé la même cause.

- **Défaut jumeau (R133, non corrigé — dépend de E5)** : dans
  `comprehensive-flow.cy.ts`, l'`id` dérivé de l'URL après création vaut `"new"`
  (`/transaction/new` satisfait `should('include', '/transaction/')`), donc le
  spec visite `/transaction/new/edit` → « Transaction introuvable ». Fragilité
  de **spec** (pas produit), atteignable seulement après E5.

## E6 — Décisions de périmètre R141 / R142 — ✅ RÉSOLUES (2026-10-31)

Deux défauts mesurés exigeaient une **décision** (l'agent ne pouvait pas trancher
sans risque de casser des flux légitimes).

### E6.a — R141 : 26 tables en écriture « membre seul » (dont FINANCIÈRES) — ✅ RÉSOLUE (2026-10-31)
- **Fait mesuré** : `INSERT INTO accounts` (table FINANCIÈRE) **accepté par la
  RLS** pour un simple membre (`is_org_member` seul). Idem pour `caisses`,
  `tax_receipts`, `org_budgets`, `pledges`, `giving_*`, etc. (26 tables).
- **Non-escalade vérifiée** : l'escalade de rôle est **impossible**
  (`org_memberships`/`grants`/`org_admins` gardés ; `profiles.role` immuable).
- **Décision prise (autonomie accordée « OK ALLONS Y », 2026-10-31)** : périmètre
  **14 tables** en 2 lots (Lot 1 = permissions canon existantes ; Lot 2 =
  nouvelle permission `finance:manage`). Réversible (rollback fourni), preuve
  `MEMBRE → 42501` / `TREASURIER → accepté`. Détail : RISQUES.md §R141, receipt
  `phase-04/2026-10-31-r141-financial-write-permission.md`.
- **Veto propriétaire possible** : rollback `rollback/20261031000001_rollback.sql`
  restaure l'état antérieur exact.

### E6.b — R142 : câblage de la garde de route (`hasPermission`) — ✅ RÉSOLUE (2026-10-31)
- **Fait mesuré** : `resolveRoute` n'est appelée qu'avec `{isAuthenticated}` →
  les branches `forbidden`/`needs-membership` étaient du code mort.
- **Décisions prises (autonomie « OK ALLONS Y »)** :
  1. `CENTRAL_ADMIN` **fail-closed** — reste hors canon (0 compte en base) ;
     l'admin central canonique est `ADMIN` (R109). La garde refuse un rôle hors
     canon.
  2. `/admin/reports*` en **appartenance seule** (aucune permission de route) —
     écran de **réception** atteint par tout membre ; `MEMBRE` ne détient pas
     `report:read`, donc l'exiger aurait enfermé dehors des destinataires.
- **Livrable** : `roleHasPermission` + câblage `App.tsx` + garde
  `r142-route-permission-wiring.test.ts` (9 assertions). Suite **1736/1736**.
- **Veto propriétaire possible** : les deux décisions sont réversibles (retirer
  la ligne `hasPermission` d'`App.tsx` restaure la garde inerte ; re-mapper
  `/admin/reports*` est une ligne du registre).


## E7 — Écritures `UPSERT` sur une VUE PowerSync (« cannot UPSERT a view ») — **CORRIGÉ pour `org_settings`**, 2 occurrences latentes consignées (2026-10-31)

- **Symptôme** : PR13 (gel de période) et PR8 (maker-checker) semblaient
  **inertes** — cliquer « Clôturer la période » / la bascule n'enregistrait rien,
  sans erreur visible. Découvert par sonde E2E (`org_settings` vide après clic).
- **Cause racine (mesurée)** : côté client, PowerSync expose chaque table comme
  une **VUE** (`CREATE VIEW org_settings AS SELECT id, json_extract(data,'$.org_id') …`).
  Toute écriture de forme `INSERT … ON CONFLICT (id|org_id,key) DO UPDATE` (ou
  `INSERT OR REPLACE`) échoue alors avec **`Error: cannot UPSERT a view`** ; un
  `INSERT` sans `id` échoue avec `Error: id is required`. Preuve :
  `cypress` probe (`SELECT name FROM sqlite_master WHERE type='view'` →
  `profiles`, `org_settings`, `organizations`).
- **Portée** : `setOrgSetting` (`src/lib/orgSettings.ts`) était le point
  d'étranglement de PR8+PR13 → **corrigé** (`SELECT id` puis `UPDATE`-ou-`INSERT`
  explicite avec `uuid`). Le mock PowerSync des tests unitaires **simulait**
  l'upsert en JS, masquant le bug : il lève désormais « cannot UPSERT a view »
  (garde unitaire) + garde E2E `robustness-features.cy.ts` (PR8/PR13).
- **Occurrences latentes restantes (même classe, non corrigées — hors périmètre
  robustesse, nécessitent une revue de schéma PowerSync)** :
  1. `src/capabilities/organization/index.ts` `registerOrg()` — `ON CONFLICT (id)`
     sur `organizations` (vue). **Aucun appelant** en prod (code mort) → risque
     nul tant que non câblé.
  2. `src/capabilities/invitation/index.ts` `claimInvitation()` — `ON CONFLICT (id)`
     sur `profiles` (vue). **Mise à jour 2026-11-04 (R184)** : la moitié
     « colonne `status` absente » est **corrigée** (`profiles.status` ajouté au
     schéma PowerSync local, aligné sur PostgreSQL, `CLIENT_SCHEMA_VERSION` 4).
     Reste seul le `ON CONFLICT` sur vue → « cannot UPSERT a view ».
- **Recommandation** : bannir `ON CONFLICT`/`INSERT OR REPLACE` des écritures
  PowerSync client ; utiliser `SELECT` + `UPDATE`/`INSERT` explicite. Envisager
  une garde statique (lint/test) qui échoue sur `ON CONFLICT` dans `src/lib` et
  `src/capabilities`.
- **Statut** : `org_settings` **corrigé + gardé** ; occurrences 1–2 **consignées**.

## E8 — 9 tables du schéma client SANS stream PowerSync — **CORRIGÉ ET DÉPLOYÉ** (2026-11-01)

- **Fait mesuré** (audit 360°, vérifié contre la config PowerSync **déployée**
  via `powersync fetch status`, instance Production `6a9dd96302481fb31b945823`) :
  9 tables déclarées dans `src/lib/powersync/schema.ts` et lues en SQL LOCAL
  (`useQuery`/`db.execute`) n'avaient **aucun stream** dans
  `powersync/sync-config.yaml` → la réplique locale reste **VIDE** en
  permanence (écran « aucune donnée ») et un appareil neuf ne les reçoit jamais,
  **sans erreur visible**. Tables : `audit_entries` (5 250 lignes en base —
  piste d'audit PR1 `/trace`), `documents` (corbeille/archives PR3),
  `org_budgets`, `org_budget_lines` (P0 budgets), `giving_donors`,
  `giving_campaigns`, `pledges`, `tax_receipts`, `transaction_giving` (P0 dons).
- **Vérifs** : toutes portent `org_id` en base (audit `information_schema`) et
  figurent dans la publication `powersync` (`pg_publication_tables`) → le filtre
  direct `org_id IN (SELECT org_id FROM profiles WHERE id = auth.user_id())`
  (motif éprouvé R89.b) suffit, sans JOIN.
- **Correctif** : 9 streams ajoutés à `sync-config.yaml`
  (`auto_subscribe: true`). `powersync validate` → **tous les tests passent**.
  Garde anti-dérive : `V: sync-stream-coverage.test.ts` (3, non-vacuité :
  retirer un stream ⇒ échec). `config` (table serveur inexistante, lue par aucun
  code) est explicitement allowlistée.
- **DÉPLOIEMENT EFFECTUÉ (2026-11-02)** : `powersync deploy sync-config` sur
  l'instance Production `6a9dd96302481fb31b945823` → **succès**. Vérifié après
  déploiement : `powersync fetch status` liste les 9 tables
  (`used_for_replication: yes`), connexion `connected`, lag 0. `POST
  /sync/stream` avec un JWT utilisateur d'org normale → **HTTP 200**. Le
  dry-run suivant indique « matches the deployed sync config, nothing to update ».
- **Statut** : config **corrigée + gardée + DÉPLOYÉE** ✅.

## E10 — `PSYNC_S2305` sur les comptes administrant >1000 organisations (2026-11-01)

- **Fait mesuré** : `POST /sync/stream` avec le JWT d'un compte
  `CENTRAL_ADMIN` (ex. `ad0cd25d-…`, admin de **2092** organisations) renvoie
  `HTTP 500 PSYNC_S2305 — Too many parameter query results (limit of 1000)`.
  Un compte d'org normale (1 org) renvoie **HTTP 200**. Le seuil est donc
  franchi par les streams `org_administered` / `org_owned`
  (`WHERE id IN (SELECT org_id FROM org_admins WHERE admin_profile_id =
  auth.user_id() …)`) : la sous-requête dépasse 1000 lignes.
- **Ce n'est PAS une régression des 9 streams E8** : le même compte échoue sur
  `org_administered`/`org_owned`, antérieurs au déploiement du 2026-11-02
  (vérifié : un compte normal passe).
- **Impact** : un administrateur central (>1000 orgs) ne peut pas synchroniser
  du tout (écran muet). Cas de bord de la base de démo (2092 orgs de test
  rattachées à un compte) ; à trancher avec le propriétaire.
- **Piste** : borner la sous-requête (les streams Sync n'autorisent pas `LIMIT`
  dans le `WHERE`), ou scinder l'administration en plusieurs streams paginés,
  ou ne pas exposer l'union complète côté client (l'UI liste déjà les orgs via
  des vues ciblées). À décider — hors périmètre d'un correctif aveugle.
- **Statut** : **consigné** (pas de correctif : cas de bord, décision requise).

## E9 — injection d'organisation via le chemin INSERT de `profiles` — **CORRIGÉ ET APPLIQUÉ** (2026-11-01)

- **Fait mesuré** (audit backend read-only, prouvé en transaction annulée sous
  rôle `authenticated` avec les claims d'un compte e2e) : le durcissement de
  `profiles.org_id` ne couvrait que le chemin **UPDATE**
  (`trg_guard_profile_org`, 20261022000005) et le chemin UPDATE de
  `upsert_profile` (20261022000006). Le chemin **INSERT** n'était gardé par
  **rien** :
  - `SELECT public.upsert_profile(<moi>,'x','y',NULL,'org-1',NULL)` →
    `profiles.org_id` devient **`org-1`** (RPC SECURITY DEFINER, aucun trigger
    INSERT ne l'arrête) ;
  - `DELETE profiles(id=<moi>)` puis `INSERT profiles(id,org_id='org-1')` →
    accepté (policies `profiles_delete` + `profiles_insert_self`).
  Comme `is_org_member()`/`current_org_id()` s'appuient sur `profiles.org_id`,
  l'attaquant obtient la **lecture inter-organisation** (profils, transactions,
  événements, audit… de l'org ciblée).
- **Preuve** : `SELECT org_id FROM profiles WHERE id=<moi>` → `org-1` après
  appel RPC (rollback immédiat). Impact démontré : la policy `profiles_select`
  (`is_org_member(uid, org_id)`) laisse alors lire les profils de `org-1`.
- **Correctif (fichier)** : migration `20261101000004_guard_profile_org_insert`
  — (1) trigger `guard_profile_org_insert` BEFORE INSERT (rôles client ⇒ org
  forcée à `__no_org__`/`no-org`) ; (2) `upsert_profile` n'honore l'organisation
  demandée que si `is_org_admin(auth.uid(), org)`, sinon `__no_org__`. Les
  chemins légitimes (`handle_new_user`, edge `create_org`/`signup` en
  service_role, `settle_invitation_claim`) s'exécutent hors rôles client et ne
  sont pas affectés. Garde repo-side : `V: profile-org-insert-guard.test.ts` (3,
  non-vacuité vérifiée).
- **APPLICATION EFFECTUÉE (2026-11-02)** : migration appliquée à la base live
  (`apply_migration`). Vérifié après application, en transaction annulée :
  (a) RPC `upsert_profile(p_org_id := 'org-1')` → `org_id` **forcé à
  `__no_org__`** (avant : `org-1`) ; (b) `INSERT profiles {org_id:'org-1'}` →
  **bloqué** (`ORG_ID_NOT_ALLOWED`) ; (c) `INSERT {org_id:'__no_org__'}` →
  accepté (chemin légitime) ; (d) un admin ACTIF de son org obtient bien son
  org via le RPC. Faille fermée.
- **Statut** : correctif **écrit + gardé + APPLIQUÉ** ✅.
