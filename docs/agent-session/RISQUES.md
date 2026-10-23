# Risques et défauts — Lumina

> Session agent 2026-10-22. Classement par gravité décroissante.
> Chaque entrée indique : gravité, statut, preuve, action.

## Gravité CRITIQUE

### R1 — Relais de notification non authentifié (`onesignal-notify`) — CORRIGÉ
- **Défaut** : `verify_jwt:false` et vérification JWT « au mieux » (échec =
  simple `console.warn`, l'envoi continuait). Un appel anonyme atteignait
  OneSignal avec la clé REST serveur ; un corps sans ciblage diffusait à
  `included_segments:["All"]` → **tous les appareils de toutes les
  organisations**. Un attaquant pouvait spammer/effacer la confiance des
  utilisateurs de tous les tenants.
- **Preuve** : appel anonyme avant correctif → 200 + envoi OneSignal ; après →
  `HTTP 401 {"error":"Non authentifié"}`.
- **Correctif** : JWT obligatoire (401), diffusion non ciblée réservée à un
  admin central (403). Commit `39474da`, fonction déployée (v10).
- **Statut** : corrigé, vérifié par appel HTTP réel.

### R2 — Fuite RLS inter-organisations (`is_org_member`) — CORRIGÉ
- **Défaut** : dans `is_org_member(uid uuid, org_id text)`, l'expression
  `p.org_id = org_id` était ambiguë — PostgreSQL résolvait `org_id` vers la
  **colonne** au lieu du paramètre → `p.org_id = p.org_id` → toujours TRUE.
  127 policies RLS dépendaient de cette fonction.
- **Preuve** : avant, un compte de `org-e2e` lisait 108 profils / 5
  organisations ; après, 1 profil / 1 organisation (`scripts/rls-isolation-check.sh`).
- **Statut** : corrigé (qualification `is_org_member.org_id`), test de
  non-régression pérennisé.

### R14 — 7 triggers de notification écrivaient `0` dans une colonne BOOLEAN — CORRIGÉ
- **Défaut** : `notifications.is_read` est `BOOLEAN` (migration 0011) mais les 7
  fonctions de notification insèrent le littéral entier `0` (hérité de SQLite/
  PowerSync). PostgreSQL refuse la conversion → le trigger `AFTER INSERT`
  échoue → **la transaction métier entière est annulée**.
- **Parcours cassés** : créer une invitation, accepter une invitation, créer un
  événement, créer une transaction, approuver une transaction, soumettre un
  formulaire, dépasser un budget. L'utilisateur voyait l'action échouer sans
  rien enregistrer — **aucune invitation ni transaction n'était possible**.
- **Preuve** : `POST /rest/v1/invitations` → `HTTP 400 {"code":"42804",
  "message":"column \"is_read\" is of type boolean but expression is of type
  integer"}`. Après correctif → `HTTP 201`. Idem `POST /rest/v1/events` :
  400 → 201.
- **Correctif** : migration `20261022000003`, `0` → `false` dans les 7 fonctions
  (+ `SET search_path=public`). Rollback fourni.
- **Statut** : corrigé, prouvé par appels HTTP réels sur l'API REST.

### R15 — Escalade de privilèges sur `invitations` — CORRIGÉ
- **Défaut** : `invitations_insert` avait perdu sa liste de rôles
  (`20260926000001:115` l'a réécrite en `is_org_member(...)` seul).
  `invitations_update` / `invitations_delete` n'étaient gardés que par
  l'appartenance. Un **simple membre** pouvait émettre une invitation portant
  `target_role = PASTEUR_PRINCIPAL` (élévation), révoquer et **supprimer** toutes
  les invitations de son organisation. Aucune garde côté front (la page
  `/invitation/emit` est accessible à tout connecté) : le serveur était la seule
  barrière, et il ne l'était plus.
- **Preuve** : compte `org-e2e` (rôle `MEMBRE` côté `profiles`) →
  `POST /invitations {target_role:"PASTEUR_PRINCIPAL"}` → **HTTP 201**. Après
  correctif, même utilisateur → `42501 new row violates row-level security
  policy` (transaction de test annulée).
- **Correctif** : migration `20261022000004`, fonction
  `can_manage_invitations(uid, org_id)` (rôle lu dans `profiles` ET
  `org_memberships`) appliquée à INSERT, UPDATE (USING + WITH CHECK) et DELETE.
  Rollback fourni.
- **Statut** : corrigé, prouvé. Non-régression vérifiée : un gestionnaire
  (`PASTEUR_PRINCIPAL`) crée toujours (INSERT accepté) et un membre lit
  toujours (`GET` → 200).

### R16 — `profiles.role` et `org_memberships.role` divergent — OUVERT
- **Défaut** : pour le compte de test, `profiles.role = 'MEMBRE'` mais
  `org_memberships.role = 'PASTEUR_PRINCIPAL'` pour la même organisation. Deux
  sources de vérité du rôle coexistent et peuvent se contredire.
- **Impact** : un gate qui ne lirait qu'une des deux tables accorderait ou
  refuserait à tort. Le correctif R15 lit les deux pour être sûr ; mais la
  divergence reste un **risque de modèle** (rôle affiché ≠ rôle effectif).
- **Décision conservatrice** : ne pas « réparer » les données (risque
  d'aggraver), documenter et faire trancher le propriétaire.
- **Statut** : ouvert, à trancher (voir DECISIONS.md et RAPPORT_FINAL.md).


### R17 — Dérive majeure migrations ↔ base (les fichiers du dépôt ne sont pas la source de vérité) — OUVERT
- **Défaut** : les 39 migrations enregistrées dans
  `supabase_migrations.schema_migrations` portent des versions d'horodatage
  (`20260910123851`, …, `20261022192658`) qui **n'ont AUCUN fichier
  correspondant** dans `supabase/migrations/`. Inversement, les **34**
  migrations horodatées du dépôt (`20260909000002_create_invitation_system.sql`,
  etc.) n'ont **jamais** été enregistrées comme appliquées. Les 63 migrations
  historiques `NNNN_*.sql` (0000→0062) ne sont pas traçables non plus.
- **Conséquence** : `supabase db push` rejouerait 34 migrations non tracées sur
  une base où leur contenu existe déjà → erreurs (objets existants) voire
  altérations. `supabase db pull` produirait un diff trompeur. **Ne pas lancer
  `db push` sans revue manuelle.**
- **Cause probable** : le schéma a été appliqué via l'éditeur SQL / MCP (versions
  auto-générées à l'heure d'application), pas via `supabase db push`. Mes propres
  correctifs suivent ce chemin : les fichiers `20261022000003/4` du dépôt
  correspondent aux versions `20261022192320` / `20261022192658` en base.
- **Mitigation fournie** : `scripts/schema-snapshot.sql` capture le DDL réel
  (colonnes, fonctions, policies, triggers, index, contraintes, versions) →
  source de vérité de secours, utilisable pour reconstruire un objet ou vérifier
  une dérive avant tout `db push`.
- **Recommandation propriétaire** : régulariser l'historique (marquer les
  migrations appliquées avec `supabase migration repair --status applied <version>`)
  ou adopter « base = source de vérité » et ne plus se fier au tracker. À
  trancher — voir DECISIONS.md et RAPPORT_FINAL.md.
- **Statut** : ouvert, documenté, contourné (instantané).

### R18 — Aucune sauvegarde ni PITR sur le projet Supabase — OUVERT (CRITIQUE pour 4 mois)
- **Défaut** : l'API Management renvoie `backups: []` et `pitr_enabled: false`
  pour `hhgovvrnalibhgpakswi` (plan gratuit). Aucun point de restauration.
- **Preuve** : `GET /v1/projects/hhgovvrnalibhgpakswi/database/backups` →
  `{"walg_enabled":true,"pitr_enabled":false,"backups":[]}`.
- **Conséquence** : une erreur de schéma ou une suppression accidentelle est
  **irréversible**. Aucun retour arrière automatique possible.
- **Mitigation fournie** : `scripts/schema-snapshot.sql` (DDL complet) +
  migrations réversibles (`rollback/`). Ne couvre PAS les données.
- **Recommandation** : activer les sauvegardes (plan payant) ou exporter
  régulièrement les données ; voir RUNBOOK.md.
- **Statut** : ouvert — hors périmètre de correction (dépend d'une décision
  d'abonnement du propriétaire).


### R19 — Régression `used_count` (durcissement invitations) — CORRIGÉ
- **Défaut** : mon durcissement R15 a bloqué l'écriture de `used_count` par
  `settle_invitation_claim` (SECURITY INVOKER) : la policy `invitations_update`
  filtrait silencieusement l'UPDATE, sans erreur. `max_uses` n'était donc plus
  appliqué (invitation réutilisable au-delà de sa limite).
- **Preuve** : claim d'une invitation `max_uses=1` → claim CONFIRMED mais
  `used_count=0`. Après correctif (SECURITY DEFINER) → `used_count=1`.
- **Statut** : corrigé (migration `20261022000005`). Rollback fourni.

### R20 — `profiles.org_id` injectable par UPDATE direct — CORRIGÉ (rôle self-service ouvert)
- **Défaut** : la policy `profiles_update` autorisait l'utilisateur à modifier
  toute colonne de son propre profil, dont `org_id`. Comme `is_org_member` lit
  `profiles.org_id`, un utilisateur pouvait se rattacher à une organisation
  arbitraire et lire ses données.
- **Preuve** : `UPDATE profiles SET org_id='org-e2e'` par un utilisateur hors
  org → accepté avant ; `42501 ORG_ID_IMMUTABLE` après.
- **Statut** : corrigé (migration `20261022000005`).
- **Reste ouvert** : le **rôle** reste modifiable par l'utilisateur
  (`upsert_profile` accepte un `p_role` arbitraire, et `profiles_update` laisse
  passer `role`). Un utilisateur peut donc s'attribuer `PASTEUR_PRINCIPAL`.
  C'est peut-être voulu (self-service d'onboarding) : décision produit à
  trancher (voir DECISIONS.md). Non modifié pour ne pas casser l'onboarding.

### R21 — Fuite PII inter-utilisateurs via `handle_new_user` / sentinelle — CORRIGÉ
- **Défaut** : `handle_new_user` rattachait chaque nouvel inscrit à `org-1`
  (organisation contenant de vraies adresses personnelles). Tout compte neuf
  lisait les 59 profils de `org-1`. En corrigeant, la fuite se déplaçait sur le
  sentinelle `__no_org__` (48 profils). `upsert_profile` acceptait aussi un
  `p_org_id` arbitraire.
- **Preuve** : compte neuf → `GET /profiles` = 59 profils (org-1) puis 48
  (`__no_org__`) ; après correctif → 1 profil (le sien).
- **Statut** : corrigé (migrations `20261022000006` et `20261022000007`).
- **Résiduel** : les 59 profils **déjà** rattachés à `org-1` restent liés entre
  eux (données potentiellement réelles : non déplacées). Voir R22.

### R22 — 59 comptes rattachés à `org-1` (dont des adresses réelles) — OUVERT
- **Constat** : `org-1` contient 59 profils mêlant comptes de test et adresses
  personnelles réelles (`joynagassi@gmail.com`, `kairosiluminate@gmail.com`, …).
  Ces comptes peuvent se lire entre eux (même organisation).
- **Risque** : si ces adresses sont des utilisateurs réels distincts, il y a
  divulgation croisée d'e-mails. Le propriétaire doit décider : purger `org-1`,
  ou éclater ces comptes en organisations réelles.
- **Décision conservatrice** : ne rien déplacer automatiquement (risque
  d'aggraver). Documenté, à trancher.

### R23 — `settle_invitation_claim` était exécutable par `anon`/PUBLIC — CORRIGÉ
- **Défaut** : la fonction (règlement de claim) était `EXECUTE`-able par `anon`
  et PUBLIC, alors qu'elle est appelée uniquement par des triggers.
- **Statut** : corrigé (migration `20261022000005`, droits restreints à
  `authenticated`/`service_role`).


## Gravité HAUTE

### R3 — Streams PowerSync non filtrés par organisation — CORRIGÉ FICHIER, DÉPLOIEMENT CLOUD À CONFIRMER
- **Défaut** : `categories`, `org_units`, `caisses` en `SELECT *` sans filtre
  `org_id` dans `powersync/sync-config.yaml` → chaque client synchronisait les
  données de **toutes** les organisations sur son appareil.
- **Statut** : le fichier local est corrigé ; le déploiement Cloud
  (`powersync deploy sync-config`) reste à confirmer. Tant qu'il n'est pas
  déployé, le défaut persiste en production.
- **Vérification** : voir RUNBOOK.md (procédure de déploiement + contrôle).

### R4 — Notifications ciblées jamais délivrées (`filter` vs `filters`) — CORRIGÉ
- **Défaut** : le payload envoyait `filter` (chaîne) au lieu de `filters`
  (tableau). OneSignal répondait 400 → 502 systématique. Toute notification
  ciblée (trésorier, membre) échouait **silencieusement** côté utilisateur.
- **Preuve** : journal edge `OneSignal API error 400 "You must include which
  players, segments, or tags you wish to send this notification to"` ; après
  correctif, envoi ciblé → 200.
- **Statut** : corrigé (commit `39474da`, v10).

## Gravité MOYENNE

### R5 — Aucune suppression de compte ni export de données (RGPD)
- **Défaut** : aucun parcours de suppression de compte, aucun export des
  données personnelles. Un utilisateur ne peut pas exercer ses droits.
- **Statut** : non corrigé (hors périmètre 45 min). Proposé : PROPOSITIONS.md
  P1. Consigné pour le propriétaire.

### R6 — Pas de limitation de débit sur les endpoints sensibles
- **Défaut** : les edge `signup`, `login` et la connexion Supabase directe
  n'ont aucun rate-limit applicatif. Le brute-force de mot de passe dépend
  uniquement des protections Supabase (présentes mais non paramétrées ici).
- **Statut** : non corrigé. Proposé : PROPOSITIONS.md P2.

### R7 — 13 tables sans index sur `org_id` — CORRIGÉ
- **Défaut** : chaque policy RLS et chaque stream PowerSync filtre par
  `org_id` ; sans index, PostgreSQL faisait un Seq Scan complet par requête.
- **Preuve** : `Seq Scan on transactions Filter: (org_id = ...)` avant ;
  `Index Scan using idx_transactions_org_id` après.
- **Statut** : corrigé (migration `20261022000002`, rollback fourni).

## Gravité FAIBLE

### R8 — Mot de passe de test en clair dans le dépôt
- **Défaut** : `cypress/support/orgCreds.ts` contient `E2e-Lumina!1` en clair.
- **Analyse** : comptes de test sur un environnement de test ; risque limité
  mais à ne pas confondre avec un secret de production.
- **Statut** : documenté, non modifié (changement de mot de passe invaliderait
  les specs). Proposé : PROPOSITIONS.md P3.

### R9 — Mot de passe de keystore Android codé en dur (`lumina1234`)
- **Défaut** : `scripts/generate-keystore*.{sh,js,py}` codent le mot de passe
  du keystore de signature Android en clair.
- **Analyse** : aucun keystore n'est suivi par git ; les scripts sont des
  générateurs. Si un keystore de release est un jour généré avec ce mot de
  passe, la clé de signature est compromise.
- **Statut** : documenté. Proposé : PROPOSITIONS.md P4.

### R10 — 47 profils orphelins (`org_id = '__no_org__'`)
- **Défaut** : 47 profils portent la sentinelle `__no_org__` (avant onboarding),
  sans FK vers `organizations`.
- **Analyse** : **pas une fuite** — `profiles_select` exige
  `initplan_uid() = id OR is_org_member(uid, org_id)` ; les orphelins ne sont
  pas lisibles entre eux. Artefact d'onboarding (pas de FK volontaire).
- **Statut** : documenté, aucun correctif nécessaire. À surveiller (croissance).

### R11 — Suite Cypress obsolète (sélecteurs pré-Ionic)
- **Défaut** : 108 usages de `cy.contains('button', …)` alors que l'app rend
  `IonButton` (custom element, texte dans le light DOM slotté). Les specs
  échouent massivement alors que **l'app fonctionne** (vérifié manuellement :
  création d'événement de bout en bout OK).
- **Impact** : la CI ne protège plus rien ; les régressions réelles passent
  inaperçues.
- **Statut** : en cours de correction (voir JOURNAL.md).

### R12 — Warning « Multiple GoTrueClient instances » au chargement
- **Défaut** : plusieurs instances `GoTrueClient` partagent la clé de session
  `sb-…-auth-token` → comportement non défini en concurrence.
- **Statut** : documenté. Proposé : PROPOSITIONS.md P5.

### R13 — Fuites d'abonnements PowerSync (« subscription leaked »)
- **Défaut** : de nombreux avertissements `[PowerSync]: A subscription to <table>
  with params null leaked!` au fil de la navigation → abonnements non
  `unsubscribe()` → fuite mémoire progressive sur une session longue.
- **Statut** : documenté. Proposé : PROPOSITIONS.md P6.

### R24 — Vue `org_family` sans `security_invoker` : fuite inter-organisations — CORRIGÉ
- **Défaut** : la vue `org_family` (clôture transitive de la fédération)
  s'exécutait avec les droits de son propriétaire et **ignorait la RLS** de
  `organizations`. Tout le monde — y compris un visiteur NON authentifié —
  pouvait énumérer toutes les organisations ; un simple membre lisait en outre
  les `organizations` de la fédération d'autrui via
  `orgs_select_federation_recursive`.
- **Preuve** : `GET /rest/v1/org_family` sans jeton → 5 organisations
  (`org-1`, `org-central`, `e2e-auth-org-1`, `org-e2e`, `org-e2e-unconf`).
  Membre `org-e2e` → 5 lignes. Après correctif : anon → 0 ; membre → 1 (la
  sienne).
- **Correctif** : `security_invoker=true` sur la vue + policy de fédération
  réécrite via une fonction SECURITY DEFINER `org_descendants(uid)` (la lecture
  directe de la vue dans la policy provoquait une récursion infinie).
- **Statut** : corrigé (migration `20261022000008`). Rollback fourni.

### R25 — Fonctions SECURITY DEFINER exposées à `anon` + `search_path` mutable — CORRIGÉ
- **Défaut** : `upsert_profile`, `is_org_member`, `current_org_id`,
  `org_descendants`, `can_manage_invitations` étaient exécutables par le rôle
  `anon` (visiteur non authentifié) via `/rest/v1/rpc/…` ; `initplan_uid`
  (appelée par ~143 policies) avait un `search_path` mutable.
- **Preuve** : advisors Supabase `anon_security_definer_function_executable`
  (4 fonctions) et `function_search_path_mutable` (1) ; `POST /rpc/upsert_profile`
  sans jeton → 401 après correctif.
- **Statut** : corrigé (migration `20261022000009`). Rollback fourni.
- **Note** : `upsert_profile` reste exécutable par `authenticated` (nécessaire à
  l'onboarding) ; il vérifie `p_user_id = auth.uid()` et n'écrit plus `org_id`.

### R26 — Lacune des tests RLS (clé anon au lieu du jeton utilisateur) — CORRIGÉ
- **Défaut** : `cypress/e2e/rls-leak.cy.ts` et `cross-tenant.cy.ts` envoient
  `Authorization: Bearer <anonKey>` : ils testent le rôle `anon`, pas
  l'utilisateur connecté. Ils ne peuvent donc pas détecter une fuite
  inter-utilisateurs, et `rls-leak` échoue sur son assertion « l'organisation
  courante est visible ».
- **Correctif** : nouveau spec `rls-isolation-hardened.cy.ts` lisant le vrai
  `access_token` depuis `localStorage` (4 assertions : profil, org-1, org_family,
  anon).
- **Statut** : corrigé.

### R27 — Escalade de privilèges : `org_memberships` (auto-ajout dans toute org) — CORRIGÉ
- **Défaut** : la policy `om_all_merged` (FOR ALL) autorisait tout utilisateur à
  écrire une ligne dont il est le `user_id` → **s'ajouter lui-même dans
  n'importe quelle organisation**, avec le rôle de son choix. Comme
  `is_org_member()` s'appuie sur `org_memberships` ACTIVE, l'écriture dans les
  données d'autrui s'ouvrait en cascade.
- **Preuve** : `POST /org_memberships {org_id:'org-1', role:'PASTEUR_PRINCIPAL'}`
  → 201, puis `POST /org_units {org_id:'org-1'}` → 201 (le même INSERT sans
  membership préalable → 42501). Lignes supprimées après la preuve.
- **Correctif** : policies par commande ; INSERT/UPDATE réservés aux
  administrateurs de l'organisation ; SELECT/DELETE conservent l'accès à soi.
- **Statut** : corrigé (migration `20261022000010`). Rollback fourni.

### R28 — Escalade de privilèges : `profiles.role` modifiable par l'utilisateur — CORRIGÉ
- **Défaut** : `profiles_update` autorise chaque utilisateur à modifier sa
  propre ligne, y compris `role`, qui sert de barrière (`org_admins_insert_merged`
  exige `role='ADMIN'` ; l'UI teste `CENTRAL_ADMIN`). Un MEMBRE pouvait
  s'auto-promouvoir ADMIN puis devenir administrateur de son organisation.
  Le RPC `upsert_profile` (SECURITY DEFINER) contournait en outre tout trigger
  `current_user`-based.
- **Preuve** : `PATCH /profiles {role:'ADMIN'}` → 200 puis
  `POST /org_admins` → 201 ; `POST /rpc/upsert_profile {p_role:'ADMIN'}` → 200.
  Lignes supprimées et rôles restaurés après la preuve.
- **Correctif** : trigger `guard_profile_role_immutable` (UPDATE direct) +
  contrôle de `p_role` dans `upsert_profile` (via `is_org_admin`).
- **Statut** : corrigé (migrations `20261022000011` et `20261022000012`).
  Rollbacks fournis.

### R29 — Storage sans isolation par organisation (lecture anonyme des documents privés) — CORRIGÉ
- **Défaut** : les policies de `storage.objects` ne filtraient que le
  `bucket_id` :
  * `lumina_storage_read` accordait SELECT à `{anon, authenticated}` sur
    `logos`, `archives`, `expense_proofs` → **un visiteur SANS COMPTE** pouvait
    télécharger tout document privé (archives, justificatifs de dépense) en
    connaissant le chemin `<org_id>/…` ;
  * `lumina_storage_delete` laissait tout `authenticated` supprimer les
    documents de n'importe quelle organisation ;
  * `lumina_storage_write` acceptait les INSERT de `anon` sans contrôle de
    chemin ; `org_reports` (rapports financiers) était lisible par tout
    authentifié.
- **Preuve** : `pg_policies` (rôles `{anon,authenticated}`, `qual` sans
  condition de chemin). Aucun objet n'existait dans ces buckets : pas de fuite
  réelle, mais exploitation possible dès le premier dépôt.
- **Correctif** : chaque accès est borné à l'organisation du chemin
  (`is_org_member`) ; `logos` reste public en lecture ; `org_reports` est
  réservé à l'émetteur ou au destinataire.
- **Vérification** : anon ne liste plus `archives` (vide) ni n'accède aux
  buckets privés ; un membre ne voit que le préfixe de son organisation.
- **Statut** : corrigé (migration `20261022000013`). Rollback fourni.

### R30 — Cypress `nav-bottom` : onglets non cliquables (vues Ionic conservées) — OUVERT
- **Symptôme** : `cy.click()` sur `button[role="tab"][aria-label="Finances"]`
  échoue avec « not visible per `Element.checkVisibility()` » alors que les
  styles calculés sont visibles (`display:flex`, `visibility:visible`,
  `opacity:1`).
- **Analyse** : Ionic conserve la vue précédente dans le DOM pendant/après la
  transition (`ion-page` sortant masqué). Le sélecteur
  `button[role="tab"][aria-label=…]` matche donc **plusieurs** boutons ; le
  premier trouvé appartient à la vue sortante (zone nulle). `filter(":visible")`
  ne suffit pas (jQuery considère la vue sortante « visible »).
- **Impact** : défaut de **test** (synchronisation), pas de l'application — les
  3 tests échouaient déjà au baseline, à l'identique.
- **État** : non corrigé. Piste : scoper au `ion-page.ion-page-invisible:not(…)`
  / attendre `ion-view` actif, ou utiliser `{ force: true }` après assertion du
  `pathname` (le spec asserte déjà le pathname).
- **Gravité** : moyenne (couverture de navigation non obtenue).
- **Correction partielle apportée** : suppression du libellé d'accessibilité
  dupliqué (`aria-label="Navigation principale"` sur `<nav>` **et** sur le
  `div[role=tablist]` interne) → deux repères de navigation identiques
  (défaut WCAG). Le `tablist` porte désormais « Onglets de navigation ».

### R31 — Contournement de R28 par DELETE + INSERT du profil — CORRIGÉ
- **Défaut** : le trigger de protection ne couvrait que UPDATE. Un utilisateur
  pouvait supprimer sa ligne puis la recréer avec `role='ADMIN'`.
- **Preuve** : `DELETE /profiles?id=eq.<moi>` → 204, puis
  `POST /profiles {id:<moi>, role:'ADMIN'}` → 201 (role=ADMIN). Profil restauré.
- **Correctif** : trigger `guard_profile_role_insert` — un profil créé par
  `authenticated`/`anon` ne peut pas naître avec un rôle privilégié.
- **Vérification** : INSERT `role='ADMIN'` → 403 ; INSERT `role='MEMBRE'` → 201.
- **Statut** : corrigé (migration `20261022000014`). Rollback fourni.

### R32 — Saisie bloquée par `onIonChange` (Ionic) — CORRIGÉ
- **Défaut** : `onIonChange` ne part qu'au blur ; cliquer sur un bouton
  désactivé ne blur pas → l'état React reste vide → l'utilisateur ne peut pas
  valider (ex. créer un membre). Touchait **34 fichiers**, 87 `IonInput`.
- **Preuve** : test Cypress → bouton « Ajouter » toujours désactivé après frappe.
- **Correctif** : `onIonInput` pour `IonInput`/`IonTextarea` (95 remplacements).
- **Vérification** : test cypress vert (1 passing) ; `tsc` OK ; 1050 tests verts.
- **Reste** : `IonSelect`/`IonCheckbox` conservent `onIonChange` (aucun
  événement `ionInput`) — à surveiller (cf. R33).

### R33 — `IonSelect`/`IonCheckbox` sans équivalent `ionInput` — OUVERT (faible)
- Ionic n'expose pas d'événement `ionInput` pour `<IonSelect>` (57 usages) ni
  `<IonCheckbox>` (2). `onIonChange` y reste la seule option.
- Impact : un `<IonSelect>` dont la valeur conditionne l'activation d'un bouton
  peut présenter le même blocage qu'R32 si aucun blur ne survient.
- **Gravité** : faible (un `<IonSelect>` émet `ionChange` dès la sélection sur
  la plupart des plateformes). À vérifier par un test dédié si le temps le permet.

### R34 — `slot="input"` : 61 champs de saisie jamais rendus — CORRIGÉ (critique)
- **Défaut** : `IonInput` / `IonSelect` / `IonTextarea` placés dans un
  `<IonItem>` portaient `slot="input"`. Or `ion-item` (Ionic 9.0.2,
  `encapsulation: "shadow"`) n'expose que les slots **`start`**, **`end`** et
  le slot par défaut. Un enfant assigné à un slot inexistant n'est distribué
  dans aucun slot → il **n'est jamais rendu**.
- **Conséquence** : le champ existe dans le DOM (donc `should('exist')` passe)
  mais il a un rectangle **0×0**, `checkVisibility()` = `false` et
  `offsetParent` = `null` → **invisible et non interactif**. L'utilisateur ne
  peut pas saisir : formulaire de transaction, d'événement, de groupe, de
  budget, de versement, d'invitation, de champ personnalisé, de rapport,
  fédération, unités d'organisation, etc.
- **Preuve avant/après** (spec de diagnostic, `/event/new`, input
  « Nom de l'événement ») :
  - avant : `checkVisibility=false`, rect `0×0`, `offsetParent=false`
  - après : `checkVisibility=true`, rect `316×44`, `offsetParent=true`
- **Corrélation** : `members.cy.ts` (IonInput **nu**, sans IonItem) passait
  3/3 ; les specs touchant les formulaires `IonItem + slot="input"`
  échouaient (`finance-deep` : `cy.clear()` « element is not visible »).
- **Correctif** : suppression des 61 attributs `slot="input"` dans 20 fichiers
  (commit `86670ef`). Aucun CSS du dépôt ne re-slotait ces éléments.
- **Vérification** : sonde DOM avant/après ci-dessus ; `tsc --noEmit` OK ;
  suite Cypress relancée.
- **Cause racine probable** : une passe de refonte UI (« M24 — grammaire
  canonique IonItem + IonLabel + IonInput », commit `9c59103`) a ajouté
  `slot="input"` en croyant à un slot Ionic documenté. Il n'existe pas.
- **Gravité** : **critique** (blocage total de la saisie sur l'essentiel de
  l'application).

### R35 — Le TopHeader collant recouvre les champs de saisie — CORRIGÉ (majeur)
- **Défaut** : le `TopHeader` (IonHeader **dans** `ion-content`, donc
  `position: sticky; top: 0` via `theme.css`) mesure **110px** (64px de barre
  + 46px de bandeau organisationnel), mais les pages ne réservent que **64px**
  (`pt-safe-calc` = `4rem`). Le conteneur de scroll Ionic n'avait pas de
  `scroll-padding-top` (`auto`).
- **Conséquence** : tout champ amené en vue (focus clavier, scroll
  programmatique, `cy.clear()`) se cale à `y=0` → il passe **derrière** le
  header, devient invisible et non saisissable. Frappe réelle : un utilisateur
  qui fait défiler le formulaire et tape dans le montant ne peut plus
  interagir avec le champ.
- **Preuve mesurée** (sonde Cypress, `/transaction/new`) :
  - avant : `headerBottom=110`, `inputTop=0` (sous le header) → `cy.clear()`
    échoue « element is being covered by another element » (le `<p>` du
    `TopHeader` désigné comme l'élément recouvrant)
  - après : `headerBottom=111`, `inputTop=281`, `covered=false`,
    `clear().type('7500')` → valeur `7500` (OK)
- **Correctif** : `ion-content::part(scroll) { scroll-padding-top: 7rem; }`
  (commit `dff2cbe`). `7rem` = 112px ≥ 110px mesurés.
- **Validation** : `cypress/e2e/finance-deep.cy.ts` **5/5** (baseline 2/5).
- **Gravité** : majeure (blocage de saisie sur les formulaires longs).

### R36 — VÉRIFIÉ : PAS un défaut — les enfants de `ion-alert` sont rendus
- **Suspicion initiale** : `UpdateDialog.tsx` place ses actions dans
  `<IonButtons slot="footer">` et `ion-alert` n'expose **aucun slot** (source
  `@ionic/core/.../alert/alert.js`) → les boutons semblaient ne jamais être
  rendus (famille R34).
- **Vérification empirique (Cypress, navigateur réel)** : un `<ion-alert>` avec
  un enfant `<ion-buttons slot="footer"><ion-button>PLUSTARD_PROBE` rend
  `hostText = "PLUSTARD_PROBEProbe"`, l'enfant est `hydrated` et
  `ion-activatable`. **Conclusion : les enfants light-DOM sont rendus.**
- **Cause de la non-pertinence de la suspicion** : `ion-alert` a
  `encapsulation: "scoped"` (et non `"shadow"`). En mode scoped, Stencil
  n'utilise pas de Shadow DOM : le contenu light-DOM est **conservé et rendu
  sur place**, qu'il porte un `slot` ou non. La règle R34 ne s'applique qu'aux
  composants à **Shadow DOM** (`ion-item`, `ion-select`, `ion-input`…).
- **Conséquence** : `UpdateDialog` **fonctionne** ; aucun correctif nécessaire.
  Consigné ici pour éviter une ré-investigation inutile.
- **Leçon** : vérifier l'`encapsulation` du composant avant de conclure qu'un
  `slot` inconnu supprime le rendu. R34 (shadow) et R36 (scoped) s'opposent.


### R37 — `slot="label"` sur `IonLabel` dans `ion-item` — CORRIGÉ et prouvé
- **Défaut** : `InvitationEmit.tsx:230` portait `slot="label"` sur un
  `IonLabel` enfant d'`ion-item`. `ion-item` (Shadow DOM) n'expose que
  `start` / défaut / `end` → le libellé « Rôle cible » **n'était pas rendu**.
- **Preuve mesurée (sonde Cypress, navigateur réel, deux `ion-item` créés
  côte à côte)** :
  - `ion-label slot="label"` → `rect.height = 0` (`visible: false`),
    `ion-item.shadowRoot` **sans** `slot[name="label"]`
  - `ion-label` sans slot → `rect.height = 24` (`visible: true`)
- **Correctif** : retrait de l'attribut `slot="label"` (commit `bdd1f5b`).
- **Gravité** : faible (un libellé de formulaire d'invitation). Corrigé.

### R38 — `useCurrentUser()` renvoyait un utilisateur factice — CORRIGÉ (critique)
- **Défaut** : `lumina-user` (localStorage) n'était **jamais écrit au login**
  (seule la page Profil l'écrivait). `useCurrentUser()` lisait uniquement
  cette clé et retombait sinon sur son repli **factice**
  `{ id: "local-user", role: "TREASURIER" }`.
- **Conséquence prouvée** : `useCanAccessMulti` → `federation.canAccess(
  "local-user", …)` compare `org_memberships.user_id` à `"local-user"` →
  **toujours faux**. Les gardes d'accès réels masquaient donc à tort des
  actions légitimes : FAB « Créer un groupe », export de rapports, onglets de
  transaction. Prouvé : `profiles.role=MEMBRE` +
  `org_memberships.role=PASTEUR_PRINCIPAL` en base, et FAB **absent** sur
  `/groups` alors que le rôle autorise `group:create`.
- **Correctif** (commit `60830d4`) :
  1. `authService.setState` persiste `lumina-user` dès que le profil est connu ;
  2. `useCurrentUser()` lit d'abord le **profil Supabase live**
     (`authService.getState().profile`), puis `lumina-user`, puis le repli ;
  3. le hook se **re-rend** sur les changements d'auth (un seul pont
     d'abonnement partagé, pas un listener Supabase par composant).
- **Preuve** : `lumina-user` passe de `null` à l'id réel
  `87afea21-…` ; FAB `Créer un groupe` **présent après rechargement**
  (absent à la 1re visite, cf. R39).
- **Gravité** : **critique** (contrôle d'accès réel inopérant pour tous).

### R39 — Cache d'accès négatif figé avant la 1re synchro — CORRIGÉ (haute)
- **Défaut** : `useCanAccessMulti` mémorise `fedResult` au niveau module. Au
  premier chargement d'une page, la base SQLite locale n'est pas encore
  synchronisée (`org_memberships` / `grants` vides) → `canAccess` → `false`,
  **mis en cache définitivement**. Les actions légitimes (FAB « Créer un
  groupe », export de rapports) restaient masquées jusqu'au rechargement.
- **Preuve** : FAB **absent** à la 1re visite de `/groups` alors que
  `org_memberships.role = PASTEUR_PRINCIPAL` (autorise `group:create`) ;
  **présent après `cy.reload()`** (base locale alors peuplée).
- **Correctif** (commit `6f6065d`) : à la fin du premier sync
  (`hasSynced === true`), purge du cache + notification des hooks montés, qui
  re-résolvent via un jeton de résolution. Les composants re-rendent avec la
  bonne valeur, **sans rechargement**.
- **Preuve après** : FAB présent dès la 1re visite ; `V` :
  `useCanAccessMulti` 46/46.
- **Gravité** : **haute** (même symptôme que R38, mais transitoire).

### R40 — Organisation jamais résolue → toutes les listes vides — CORRIGÉ (critique)
- **Défaut** : `getOrganizationId()` (`orgContext._orgId`, variable de
  module) valait `__no_org__` au premier rendu de chaque page :
  1. le poser ne re-rend aucun composant (aucun abonnement) ;
  2. `AppContext` ne le résolvait qu'au **montage** (jamais après un login
     depuis `/auth`, car `AppProvider` est monté à la racine) ;
  3. aucune restauration synchrone depuis `lumina-active-org` au boot.
- **Impact** : toutes les lectures PowerSync filtrées par `org_id` renvoyaient
  `[]` — « 0 événements », « Aucun membre », alors que 141 événements et
  14 membres étaient synchronisés en local. Après **création d'un événement**,
  l'app renvoyait sur `/events` vide : l'utilisateur croyait la création
  perdue (la ligne était pourtant bien en base).
- **Mesure avant** : `/events` affichait « 0 événements » pendant ~30 s
  (`SelfHeal`) ; « 143 événements » seulement après re-rendu spontané.
- **Correctif** (commit `29e7cdb`) : `subscribeOrganization()` +
  `useOrganizationRevision()` dans les 13 hooks de lecture ; résolution depuis
  le profil auth déjà hydraté, réabonnement sur `authService.subscribe` ;
  restauration synchrone depuis `lumina-active-org`.
- **Preuve après** : « 143 événements » dès la 1re visite sans reload ;
  après `cy.clearLocalStorage()` + login neuf : correct en **6,2 s**.
- **Gravité** : **critique**.

### R41 — État vide trompeur pendant l'initialisation — CORRIGÉ (haute)
- **Défaut** : les hooks de lecture renvoyaient `isLoading: false` en dur,
  même quand `useQuery` répondait `[]` **avant la fin de la 1re synchro**
  (base SQLite encore vide, sans erreur). Les pages affichaient « Aucun
  événement » / « Aucun membre » au lieu de leur squelette de chargement.
- **Correctif** : `isInitializingRead()` — « chargement » seulement si aucune
  donnée n'est disponible ET que PowerSync n'est pas prêt ET qu'on est dans
  les 10 s suivant le boot. Un utilisateur hors ligne avec des données locales
  les voit immédiatement ; l'état réel n'est jamais masqué indéfiniment.
- **Preuve** : `V` 1049/1049 ; specs Cypress des listes revérifiées.
- **Gravité** : **haute**.

### R42 — Création d'événement perçue comme perdue — CORRIGÉ (critique)
- **Défaut** : après création, `EventNew` renvoyait vers `/events`. La liste
  est triée par `start_date` décroissante et tronquée (50) : un événement
  créé avec une date ancienne n'y figurait pas.
- **Impact** : l'utilisateur recréait l'événement → **doublons**, ou croyait
  l'app cassée. La ligne était pourtant bien persistée et synchronisée.
- **Preuve du défaut** : sonde Cypress → `url=/events`, `hasName=false`,
  corps de page « 149 événements » sans l'élément créé.
- **Correctif** : `navigate(\`/event/${newEventId}\`)` (`EventNew.tsx`).
- **Gravité** : **critique** (perte de confiance + doublons de données).

### R43 — `budget_items` doublement encodé → page de détail en erreur — CORRIGÉ (critique)
- **Défaut** : `events.budget_items` est `jsonb` en base, mais le client la
  stocke en `text` (schéma PowerSync) et poussait la valeur **déjà
  sérialisée**. Supabase écrivait alors un jsonb de type *string*
  (`"\"[]\""`). En relecture, `JSON.parse` renvoyait une chaîne ; le premier
  `.reduce()` de `EventDetail` levait.
- **Mesure** : `jsonb_typeof(budget_items)` → **string = 158**, array = 1.
  Donc ouvrir n'importe quel événement ancien cassait l'écran.
- **Preuve du crash** : sonde Cypress interceptant `console.error` →
  `budgetItems.reduce is not a function`, error boundary
  « Impossible d'afficher cette page ».
- **Correctif** :
  - `SupabaseConnector.coerceJsonbColumns()` : désérialise les colonnes
    jsonb stockées en text avant l'upsert (idempotent, 2 niveaux).
  - `dataLayer.parseBudgetItems()` : décodage tolérant, jamais d'exception ;
    utilisé par `EventDetail`, `Events`, `Dashboard`, `GroupCotisation`.
- **Données historiques** : les 158 lignes restent mal encodées en base ;
  le parseur tolérant les lit correctement. Un backfill SQL est proposé
  (PROPOSITIONS.md, P-BACKFILL-BUDGET) plutôt qu'exécuté sans validation.
- **Gravité** : **critique**.

### R44 — BottomNav au-dessus des modales : boutons inaccessibles au doigt — CORRIGÉ (haute)
- **Défaut** : la barre de navigation basse (`BottomNav.tsx`) utilisait
  `zIndex: var(--z-overlay)` (50) — la même couche que les modales et
  bottom-sheets. Elle recouvrait donc les boutons situés en bas des
  overlays. Sur le modal « Nouvelle tâche », le bouton « Enregistrer »
  était **physiquement couvert** par l'icône de l'onglet de navigation.
- **Preuve** : le spec E2E `events-tasks.cy.ts` échouait avec
  `cy.click() failed because this element is being covered by another
  element` — l'élément couvrant étant le `<svg>` `lucide-calendar-plus`
  de `BottomNav.tsx`. Cypress reproduit fidèlement ce qu'un doigt subit :
  le clic n'atteint jamais le bouton.
- **Portée** : tous les bottom-sheets qui placent une action en bas
  (tâches d'événement, ajout de dépense, drawers) — c'est-à-dire le
  parcours de saisie le plus fréquent sur mobile.
- **Correctif** : `zIndex: var(--z-nav)` (40), conformément à la pile
  documentée dans `src/App.css` (M15 : 40 nav < 50 overlays < 60 float
  < 70 toasts). Le code contredisait sa propre spécification.
- **Preuve de la correction** : le clic passe (`events-tasks.cy.ts`
  progresse au-delà de l'étape 3) + test unitaire de non-régression
  « la nav reste SOUS les overlays » (`core-components.test.tsx`).
- **Gravité** : **haute** (fonctionnalité inutilisable au doigt, invisible
  en test unitaire jsdom qui n'évalue pas le chevauchement visuel).
