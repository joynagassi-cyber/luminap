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
- **Données historiques** : les 158 lignes étaient mal encodées en base ;
  le parseur tolérant les lisait correctement. **Backfill EXÉCUTÉ le
  2026-10-24** (cf. R65) : la donnée est désormais propre, plus aucune
  valeur `string` ne subsiste sur les 9 colonnes jsonb.
- **Gravité** : **critique**.

### R65 — Double encodage jsonb : portée réelle plus large que `budget_items` — CORRIGÉ (critique)
- **Défaut** : R43 n'avait été mesuré que sur `events.budget_items`. Le
  contrôle exhaustif des 10 colonnes `jsonb` du schéma réel montre que
  **218 valeurs** étaient corrompues, sur **6 colonnes** :
  | colonne | string (avant) | conteneur (avant) |
  |---|---|---|
  | `events.budget_items` | 158 | 147 |
  | `form_definitions.fields` | **34** | 0 |
  | `invitations.grants_payload` | 8 | 2 |
  | `invitations.tags_payload` | 8 | 2 |
  | `audit_entries.after_state` | 5 | 10 |
  | `audit_entries.before_state` | 5 | 3 |
  `form_definitions.fields` était corrompu à **100 %** : ouvrir un
  formulaire personnalisé faisait lever `fields.map is not a function` et
  tombait l'écran — parcours complet inutilisable.
- **Correctif amont (code)** : module partagé `src/lib/jsonb.ts`
  (`coerceJsonbColumns` à l'upload dans `SupabaseConnector.uploadData`,
  `parseJsonbValue` en lecture dans `dataLayer`). `parseBudgetItems`
  délègue désormais à ce module (duplication supprimée). Un défaut trouvé
  par les nouveaux tests a été corrigé au passage : `typeof` ne distingue
  pas un tableau d'un objet, donc un objet rendu là où un tableau est
  attendu passait le contrôle et faisait planter le `.map()` appelant ;
  `Array.isArray(fallback) !== Array.isArray(value)` l'écarte.
- **Correctif données (migration)** : `20261024000001_backfill_jsonb_double_encoding.sql`,
  idempotente, avec **sauvegarde exacte** des valeurs remplacées dans
  `_jsonb_backfill_20261024` (donc rollback exact, sans rien deviner).
- **Preuve avant écriture** : 213 valeurs re-parsables en conteneur + 5
  `"null"` (re-parse = JSON null) ; **0 échec de re-parse**.
- **Preuve après écriture** : plus aucune valeur `jsonb_typeof = 'string'`
  (`events` 305 arrays, `form_definitions` 34 arrays, `invitations` 10+10,
  `audit_entries` 15 objects + 5 `null`).
- **Preuve de réversibilité** : rollback rejoué sur copies temporaires →
  restaure exactement 158 / 34 / 8 / 8 / 5 valeurs, en laissant les 147
  `budget_items` déjà sains intacts.
- **Asymétrie assumée** : les 5 `before_state` = `"null"` (chaîne) sont
  ramenés à `jsonb null`, plus correct mais **non réversible à
  l'identique** (un JSON null et la chaîne `"null"` sont indiscernables
  après coup). Le rollback les rend en `SQL NULL`. Consigné en
  DECISIONS.md ; aucune perte d'information métier (les deux expriment
  l'absence d'état antérieur).
- **Gravité** : **critique** (parcours formulaires inutilisable).

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

---

## Session 2 (2026-10-23) — nouveaux constats

### R45 — CI rouge en permanence sur `main` — CORRIGÉ
- **Gravité** : critique (silence = plus aucun signal).
- **Défaut** : après la fusion de la PR #3, la CI de `main` échouait sur
  **3 jobs** : Unit Tests (14 fichiers « 0 test »), Lint Check (9 erreurs),
  Security Audit (1 vulnérabilité critique). Le propriétaire n'avait donc
  **aucun** garde-fou automatique.
- **Cause racine (Vitest)** : le job `unit` était le seul à ne pas créer
  `.env.local` ; `src/lib/auth.ts` lève à l'import sans
  `VITE_SUPABASE_URL`/`ANON_KEY` → échec au chargement. Les mêmes tests
  passaient en local — écart CI/local invisible.
- **Preuve** : logs GitHub Actions (run `39972947162`) :
  `Test Files 14 failed | 46 passed (60)`,
  `✖ 1710 problems (9 errors …)`, `dompurify … critical`.
  Après correctif local : `npx eslint .` → 0 erreur ;
  `pnpm audit --audit-level=critical` → exit 0.
- **Correctif** : `074dc2e`.
- **Statut** : corrigé localement ; **à confirmer par un run CI** (voir
  R46).

### R46 — Correctifs CI non encore confirmés par un run GitHub Actions
- **Gravité** : moyenne.
- **Défaut** : les 3 correctifs de R45 sont validés **localement** (preuves
  ci-dessus), mais aucun run CI n'a encore tourné dessus au moment de la
  rédaction.
- **Impact si faux** : la CI resterait rouge.
- **Action** : pousser la branche et vérifier les 4 jobs verts.

### R47 — Test unitaire instable (`e2e-transaction`) — CORRIGÉ
- **Gravité** : moyenne (bruit qui masque les vrais échecs).
- **Défaut** : `buildReverseTransaction` relisait l'horloge en interne ;
  l'assertion `approvedAt === now` comparait deux lectures (±1 ms).
- **Preuve** : `expected '…06.147Z' to be '…06.146Z'`.
- **Correctif** : horloge injectable (`6e500da`) ; 38/38 × 3 passes.
- **Statut** : corrigé, stabilité prouvée.

### R48 — Logo d'organisation non persisté en base — NON CORRIGÉ
- **Gravité** : faible (le nom l'est désormais).
- **Défaut** : la table `organizations` n'a **pas** de colonne `logo_url` ;
  le logo reste en `localStorage` (`lumina-config`). Un autre membre, un
  autre appareil ou un rapport PDF ne voit donc pas le logo de l'org.
- **Pourquoi non corrigé** : l'ajouter exige une migration de colonne
  **plus** un déploiement PowerSync Cloud (`sync-config.yaml`) — impossible
  dans cet environnement (pas de `PS_ADMIN_TOKEN`) et non testable
  bout-en-bout ici. Un changement non déployé serait pire que le défaut.
- **Travail restant** : migration `ALTER TABLE organizations ADD COLUMN
  logo_url TEXT`, ajout de la colonne aux 3 streams `org_*`, déploiement
  Cloud, puis écriture client. Estimé : 1 h 30.

### R49 — Phase 7 : personnalisation des annexes (`org_units`) non couverte
- **Gravité** : faible.
- **Défaut** : la demande « personnalisation de l'organisation **et de ses
  annexes** » n'est satisfaite que pour l'organisation. Les annexes
  (`org_units`) n'ont pas d'écran de personnalisation dédié.
- **Travail restant** : estimé 1 h (formulaire + écriture `org_units`).

### R50 — Faux positif écarté : la RLS inter-tenant de `profiles` tient — VÉRIFIÉ
- **Gravité** : information (aucun défaut).
- **Ce qui a été soupçonné** : `profiles_update` n'a qu'un `USING (auth.uid() = id)`,
  sans filtre de colonne. Un utilisateur pouvait donc, en théorie, réécrire son
  propre `org_id` et lire l'organisation cible (`is_org_member` fait foi sur
  `profiles.org_id`).
- **Vérification menée (2 comptes, appels REST réels)** :
  | Scénario | Résultat |
  |---|---|
  | non-admin `PATCH profiles {org_id:'org-1'}` | **HTTP 403 `ORG_ID_IMMUTABLE`** |
  | non-admin `PATCH profiles {role:'ADMIN'}` | **HTTP 403 `ROLE_IMMUTABLE`** |
  | non-admin `PATCH organizations?id=eq.org-e2e` | **HTTP 200, 0 ligne** |
  | non-admin `PATCH profiles {role:'MEMBRE', first_name}` (légitime) | **HTTP 204** |
  | lecture `profiles`/`transactions`/`organizations` d'une autre org | **0 ligne** |
- **Mécanisme** : triggers `guard_profile_role_immutable`,
  `guard_profile_role_insert` (migrations `20261022000011` / `…14`) et
  `trg_guard_profile_org`. Ils **sont bien installés en base** (`tgenabled='O'`).
- **Nuance honnête** : un premier test avec le compte E2E a semblé montrer une
  escalade (HTTP 200). C'était un **faux positif** : ce compte est
  *légitimement* administrateur d'`org-e2e` (`org_admins.status='ACTIVE'`),
  donc le trigger a correctement autorisé l'écriture. Le contrôle a été refait
  avec un compte **non-admin**, qui est bloqué sur tous les chemins.
- **Statut** : RLS vérifiée, **aucun correctif nécessaire**. Les écritures de
  test ont été restaurées (nom d'org et rôle remis à l'identique).
- **Travail restant** : ajouter ce scénario à la suite Cypress (fait :
  `cypress/e2e/rls-leak.cy.ts`, 1/1 × 3 passes).

### R51 — `rls-leak.cy.ts` ne testait pas la RLS — CORRIGÉ
- **Gravité** : élevée (faux sentiment de sécurité + CI rouge permanente).
- **Défaut** : le spec appelait REST avec la clé **anon** au lieu du jeton de
  session. La clé anon n'a aucun `sub` → 0 ligne partout, y compris
  l'assertion « l'org courante est visible » → échec systématique
  (`expected 0 to be above 0`) **sans jamais tester la RLS**.
- **Correctif** : authentification REST déterministe + jeton de session,
  étapes imbriquées (les littéraux de gabarit étaient évalués à la mise en
  file des commandes), assertions renforcées (`profiles`, `transactions`,
  organisations étrangères réellement seedées, contrôle positif).
- **Preuve** : `1 passing` × **3 passes consécutives** (`06012f5`).

### R52 — `/sessions` n'a pas d'état de chargement (défaut UX réel) — NON CORRIGÉ
- **Gravité** : moyenne (écran trompeur, pas de crash).
- **Défaut** : `useMyOrgs()` expose `data: UserOrg[] | null`. `Sessions.tsx`
  teste `list.length === 0` sans distinguer **`null` (chargement)** de
  **`[]` (vraiment vide)**. Tant que la réplique locale PowerSync n'est pas
  peuplée, l'utilisateur lit « Aucun compte lié pour l'instant » — un
  message **faux** : son compte existe (prouvé : `org_memberships` ACTIVE
  pour le compte E2E). Défaut de la famille « aucun écran sans
  explication » (phase 6).
- **Preuve** : diagnostic Cypress — `/sessions` rend
  `Mes comptes … Aucun compte lié pour l'instant lumina-org-e2e@lumina.dev`
  alors que `org_memberships` contient bien la ligne `org-e2e` ACTIVE.
- **Pourquoi non corrigé** : règle de gel (T0 + 9 h dépassé) + validation
  impossible ici (voir R53). Le correctif est petit mais non testable.
- **Correctif proposé (30 min)** : `const loading = orgs === null;` puis
  afficher un squelette/spinner quand `loading`, l'`EmptyState` seulement
  quand `orgs !== null && list.length === 0`.

### R53 — `sessions.cy.ts` rouge : réplique PowerSync vide dans l'environnement — NON CORRIGÉ
- **Gravité** : moyenne (le spec ne peut pas passer ici ; ce n'est pas une
  régression produit démontrée).
- **Constat** : `sessions.cy.ts` échoue 3/3. `listUserOrgs()` lit
  `getPowerSyncDatabase()` (réplique **locale**) ; dans cet environnement la
  réplique ne se peuple pas (le sync PowerSync n'aboutit pas) → 0 org →
  aucune carte `Re-ouvrir`.
- **Ce qui a été vérifié** (pour ne pas confondre bug produit et artefact) :
  1. La persistance du token est **saine** : après un login normal,
     `sb-hhgovvrnalibhgpakswi-auth-token` contient bien `access_token` +
     `refresh_token` (diagnostic direct, `localStorage`).
  2. Le compte est **bien lié** en base : `org_memberships` ACTIVE +
     `org_admins` ACTIVE + `profiles` (`org-e2e`).
  3. `/sessions` **rend bien** sa page (header « Mes comptes », texte
     d'aide) : pas d'écran blanc, pas de rebond sur `/auth`.
- **Correctif appliqué (réel)** : le spec n'appelait que `loginOrgAccount()`
  sans `cy.ensureAuth()` ; sous `testIsolation` (Cypress 16) `localStorage`
  est effacé avant chaque `it()`, donc la session était perdue dès le 1er
  `cy.visit`. `cy.ensureAuth()` est désormais appelé (aligné sur les autres
  specs). Le spec va plus loin mais reste rouge sur la liste (réplique vide).
- **Ce que j'ai essayé** : exécution isolée (3×), diagnostic `localStorage`
  après login, diagnostic du corps rendu, requête base sur
  `org_memberships`/`org_admins`/`profiles`, lecture de `listUserOrgs` et de
  `useMyOrgs`. Conclusion : l'échec dépend de la réplique locale, non du
  code d'authentification.
- **Assertions NON affaiblies** : le spec conserve ses 3 assertions
  d'origine (aucun `skip`, aucun relâchement) — voir la règle « ne jamais
  affaiblir un test ».
- **Travail restant** : faire aboutir le sync PowerSync dans
  l'environnement de test (ou seeder la réplique locale), puis rejouer.

### R54 — Le job E2E de la CI ne teste rien de réel — NON CORRIGÉ (documenté)
- **Gravité** : élevée (faux sentiment de sécurité sur toute la couche E2E).
- **Défaut** (`.github/workflows/ci.yml`) : le job « E2E (Cypress) » exécute
  **un seul** spec (`simple-check.cy.ts`, qui se contente de rendre la page
  d'auth) et le marque `continue-on-error: true` → il est **vert quoi qu'il
  arrive**. L'étape « Run full Cypress suite » est conditionnée à
  `vars.E2E_RUN_FULL == 'true' || env.E2E_TEST_EMAIL != ''` : sans le secret
  `E2E_TEST_EMAIL`, elle est **skippée silencieusement**. Les 26 specs E2E ne
  sont donc **jamais** exécutés par la CI.
- **Preuve** : `ci.yml:249` (`--spec "cypress/e2e/simple-check.cy.ts"` +
  `continue-on-error: true`) et `ci.yml:259-261` (condition + liste de 4
  specs seulement). Le job « E2E (Cypress) » de la PR #4 est `success` alors
  que `sessions.cy.ts` échoue en local — confirmation directe.
- **Pourquoi non corrigé** : rendre le job bloquant exigerait un compte
  Supabase de test provisionné en secret + un sync PowerSync fonctionnel dans
  l'Action ; hors de portée ici, et un job E2E bloquant mal configuré
  bloquerait toutes les PR. À décider par le propriétaire.
- **Correctif proposé (2 h)** : (1) fournir `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`
  en secret, (2) retirer `continue-on-error`, (3) élargir la liste de specs,
  (4) rendre le job bloquant. Estimé 2 h dont 1 h de mise au point du sync.

### R55 — Le build Android échoue à chaque push (préexistant, y compris sur `main`) — NON CORRIGÉ
- **Gravité** : moyenne (n'affecte pas la PWA web, mais l'app native est
  **impossible à produire**).
- **Cause racine exacte** (log du job `120537034105`, run `39989430527`) :
  ```
  A problem occurred configuring project ':capacitor-storage'
  > Could not create an instance of type
    com.android.build.api.variant.impl.LibraryVariantBuilderImpl.
    > Namespace not specified. Specify a namespace in the module's build file.
  BUILD FAILED in 11s
  ```
  Le plugin `@capacitor/storage` (déprécié) n'a pas d'attribut `namespace`
  dans son `build.gradle`, obligatoire avec Android Gradle Plugin 8.
- **Preuve que c'est préexistant** : « Android Debug Build » est `failure` sur
  toutes les exécutions listées, y compris la branche de la session
  précédente. Ce n'est **pas** une régression de cette session.
- **Pourquoi non corrigé** : règle de gel + modification de dépendance native
  (hors périmètre « pas de mise à jour majeure ») + impossible à valider ici
  (pas de SDK Android). Un correctif non testé serait pire que le défaut.
- **Correctif proposé (1 h)** : remplacer `@capacitor/storage` (déprécié) par
  `@capacitor/preferences`, ou épingler une version du plugin déclarant son
  `namespace`. Voir PROPOSITIONS.md P26.

### R56 — Deux workflows CI sont rouges en permanence (préexistant)
- **Gravité** : moyenne.
- **Défaut** : `cypress.yml` (déclenché sur **tout push**) échoue sur les 2
  conteneurs, et `android-debug.yml` échoue. Un dépôt dont la moitié des
  badges est rouge en permanence **désensibilise** : le propriétaire ne
  distingue plus une vraie régression d'un bruit de fond.
- **Cause `cypress.yml`** : `record: true` + `parallel: true` (Cypress Cloud)
  sans `CYPRESS_RECORD_KEY` exploitable, et sans serveur/repli adéquat ;
  le workflow n'a **pas** d'étape de repli locale. Voir P27.
- **Correctif proposé (45 min)** : soit fournir `CYPRESS_RECORD_KEY`, soit
  retirer `record/parallel` et exécuter la suite en local sur le runner.

---

## Session 3 (2026-10-23) — nouveaux risques

### R57 — Date NULL → crash du dashboard — CORRIGÉ
- **Gravité** : haute (page entière en ErrorBoundary).
- **Défaut** : `formatDate`/`formatDateTime` (`src/lib/utils.ts`) levaient
  `RangeError: Invalid time value` sur une date NULL/invalide ; appelés
  depuis `Dashboard.tsx:1551` avec une valeur absente en base → `/dashboard`
  affichait l'écran d'erreur au lieu du contenu.
- **Correctif** : helpers rendus défensifs (validation + repli), test
  `src/lib/__tests__/utils-date.test.ts` (rouge → vert). Commit `657491b`.
- **Statut** : corrigé, validé (V).

### R58 — Point d'entrée PWA (`/`) = écran blanc total — CORRIGÉ
- **Gravité** : **critique** (perte totale d'accès pour un utilisateur PWA).
- **Défaut** : `public/manifest.json` déclare `"start_url": "/"`. La route
  `<Route path="/">` (`src/App.tsx`) contenait un `<Navigate>` **enfant**,
  que React Router **ignore** (il n'accepte un composant que via
  `element=`). `/` matchait donc sans rien rendre : 0 page Ionic poussée
  dans le view-stack → écran blanc, sans BottomNav ni menu (aucun moyen de
  sortir, l'app étant une PWA sans barre d'adresse).
- **Preuve** : sonde DOM avant correctif → `PATH=/ PAGES(ion-page)=0
  BODYLEN=26`.
- **Correctif** : `element={<Navigate to="/splash" replace />}`.
  Commit `eca2052`. Test `cypress/e2e/root-redirect.cy.ts` (2 tests, avec
  et sans session).
- **Statut** : corrigé, validé (C, 2/2).

### R60 — `/transaction/:id/edit` en ErrorBoundary (Rules of Hooks) — CORRIGÉ
- **Gravité** : **critique** (édition de transaction impossible).
- **Défaut** : `useTransactions()` (`src/lib/dataLayer.ts`) faisait un
  `return` anticipé du cache CPU **avant** son `useQuery`. Au 1er render
  (cache vide) la fonction appelait 4 hooks ; au render suivant (cache
  rempli par une lecture précédente) elle n'en appelait plus que 3 → React
  « change in the order of Hooks » → `Error: Should have a queue` →
  `LazyRouteErrorBoundary` → « Impossible d'afficher cette page ».
  Toute page consommant `useTransactions` était exposée ; le cas
  reproductible est `/transaction/:id/edit`.
- **Preuve** : sonde console → `ERR ... at useOrganizationRevision
  (dataLayer.ts) ... at useCategories ... at TransactionEdit` ; après
  correctif → `LOGS=[]`, page rendue.
- **Correctif** : le cache est consulté **après** l'appel du hook, le
  résultat de `useQuery` étant ignoré s'il est périmé (aucun hook sauté).
  Commit `71b1738`. Validation : `finance-deep.cy.ts` 5/5,
  `comprehensive-flow.cy.ts` 1/1.
- **Statut** : corrigé, validé (C).

### R59 — Écran noir : la page entrante reste à `opacity: 0` après une navigation depuis la liste — OUVERT (gravité HAUTE)
- **Gravité** : **haute** (écran noir permanent ; l'app est une PWA
  mobile sans barre d'adresse → aucun moyen de recharger).
- **Symptôme** : cliquer un élément d'une liste qui navigue vers une
  **route paramétrée** (`/groups/:id`, `/event/:id`, `/members/:id`…)
  pousse bien la nouvelle page dans le view-stack d'Ionic, **mais elle
  reste à `opacity: 0`** (classes `ion-page-invisible`) → écran noir,
  alors que la page est montée et contient les bonnes données.
- **Preuves (mesurées, reproductibles)** :
  - **Accès direct** à `/groups/<id>` : `VIS:op1` → **rendu correct**.
  - **Clic depuis `/groups`** : `VIS+INV:op0` → **écran noir**, contenu
    pourtant présent (`"Jeunesse 003100 … Caisse Solde actuel 0 FCFA"`).
  - Identique en 2e ouverture (chunk déjà chargé) et après préchargement
    du chunk via une visite directe → **ce n'est pas un problème de
    chargement de chunk**.
  - Idem en développement (URLs `?t=` HMR) et hors HMR.
- **Hypothèses ÉLIMINÉES par expérience** (chacune testée puis annulée) :
  1. **identité du `<IonPage>` échangée** entre branche de chargement
     (`<GroupDetailSkeleton/>`) et branche chargée — supprimer la branche
     de chargement ne change rien ;
  2. **`<div>` intermédiaire du `LazyRouteErrorBoundary`** entre l'outlet
     et l'`IonPage` — remplacé par un Fragment, sans effet ;
  3. **`<PageSkeleton>` du `Suspense`** (un `IonPage`) échangé contre
     celui de la page — voir 1 ;
  4. **chunk paresseux non résolu au moment de la transition** — le
     préchargement préalable ne corrige rien.
- **Piste restante (non confirmée, à investiguer)** : la transition
  `ion-router-outlet` ne retire pas `ion-page-invisible` quand la
  navigation est déclenchée par un handler React **pendant que la page
  courante est encore en cours d'hydratation/synchro**. À vérifier :
  (a) déclencher la navigation **après** un `requestAnimationFrame` /
  `setTimeout(0)` ; (b) comparer avec une navigation par un lien
  `<IonRouterLink>` (transition gérée par Ionic) plutôt que
  `navigate()` ; (c) instrumenter `ion-router-outlet` (`ionNavDidChange`)
  pour voir si l'événement de fin de transition est émis.
- **Impact utilisateur** : **critique sur le parcours cœur** — ouvrir un
  groupe, un événement, un membre depuis une liste laisse un écran noir.
  Les tests E2E correspondants échouent pour cette raison
  (`groups-events.cy.ts` 0/3, `reports-budgets`/`persistence`/
  `performance-batch`/`org-reports` partiellement).
- **Contournement en test** : suivre la convention du dépôt
  (`cypress/support/view.ts`) — la page affichée est le dernier
  `div.ion-page:not(.ion-page-hidden)` ; `ion-page-invisible` y est
  documentée comme **transitoire**, ce qui n'est manifestement plus vrai
  dans ce cas précis (elle persiste).
- **Recommandation** : traiter en priorité 1 (cf. PROPOSITIONS P34),
  avec un test de non-régression qui assert `opacity !== 0` sur la page
  entrante **après** une navigation depuis une liste.
- **CAUSE RACINE (session 4, sondes 24-28)** : `React.lazy()` +
  `<Suspense>` dont le fallback rendait un `<IonPage>` **à l'intérieur** de
  `ion-router-outlet`. L'outlet enregistre la **première** page rendue par
  la route comme « vue entrante » : il capturait le squelette, lui ajoutait
  `ion-page-invisible`, puis le remplaçait par la vraie page (chunk arrivé)
  qui héritait de l'état invisible → contenu monté, `opacity: 0`.
  La MutationObserver montrait bien `ionNavWillChange` → `ionNavDidChange`
  (transition terminée) mais `ion-page-invisible` **jamais retirée** ;
  **test décisif** : rendu direct de `GroupDetail` (sans `lazy()`) →
  `VIS:op1` correct, via `LazyRoute` → `op0`.
- **CORRECTIF** : `PageSkeleton` (`src/ionic/routes/lazy-route.tsx`) ne
  rend plus `<IonPage>`/`<IonContent>` mais un `<div>` neutre ; le fallback
  ne participe plus au registre de vues de l'outlet. Squelette de
  chargement conservé. Commit `93072b4`.
- **Statut** : **CORRIGÉ, validé**. Preuve : `groups-events.cy.ts` **0/3 →
  3/3**, **3 passes consécutives vertes** (26-27 s). Assertion de
  non-régression incluse dans le spec (page entrante visible après un clic
  depuis une liste).

### R61 — Titres de page non sémantiques (accessibilité) — OUVERT
- **Gravité** : basse (a11y).
- **Défaut** : `TopHeader` rend le titre de page dans un `<p>` stylé, pas
  dans un `<h1>`. Les pages qui n'ont pas d'autre titre (ex. `/history`,
  `/settings`) n'exposent donc **aucun titre de niveau 1** aux lecteurs
  d'écran ni à la navigation par titres.
- **Preuve** : `src/components/TopHeader.tsx` (lignes ~71-78) ; sonde DOM
  sur `/history` : aucun `h1/h2/h3` portant « Historique ».
- **Recommandation** : rendre le titre de `TopHeader` dans un `<h1>`
  (avec `role="heading"`), ou imposer un `<h1>` par page.
- **CORRECTIF (session 4)** : ajout d'un
  `<h1 className="sr-only">{orgUnit.name}</h1>` sur `/groups/:id`
  (convention du dépôt, déjà utilisée par Dashboard, Finance,
  `TransactionNew`). Commit `5db7436`.
- **Portée volontairement limitée** : 19 pages n'ont aucun `<h1>`, mais un
  `<h1>` global dans `TopHeader` créerait un **doublon** sur les 24 pages
  qui en ont déjà un → reste consigné en proposition (P35).
- **Statut** : **CORRIGÉ pour `/groups/:id`, validé**. Preuve :
  `groups-events.cy.ts` **3/3** avec l'assertion `h1` ; **test négatif**
  (correctif retiré via `git stash`) → **2/3**, échec
  « Expected to find element: `div.ion-page:not(.ion-page-hidden) h1` ».


---

## Session 4 (2026-10-23) — livraison

### R59 — écran noir sur route paramétrée — CORRIGÉ (voir ci-dessus)
Statut passé d'**ouvert (HAUTE)** à **corrigé, validé**. Le risque résiduel
principal des sessions précédentes est levé : l'ouverture d'une entité
depuis une liste (groupe, événement, membre) fonctionne.

### R61 — titres non sémantiques — CORRIGÉ pour `/groups/:id`
Reste ouvert pour **19 autres pages** (cf. P35). Gravité **basse** (a11y).

### R62 — Deux sources de vérité pour le rôle, non synchronisées — OUVERT (gravité MOYENNE)
- **Gravité** : moyenne (fragilité de sécurité/UX, pas d'exploitation
  connue).
- **Défaut** : l'application lit `profiles.role` (via
  `authService.persistCurrentUser` → clé `lumina-user` →
  `useCurrentUser()` → `security.hasPermission`). Or `settle_invitation_claim`
  écrit aussi `org_memberships.role`. **Aucun trigger ne synchronise les
  deux colonnes.**
- **Preuve mesurée** : pour le compte E2E,
  `profiles.role = 'MEMBRE'` et `org_memberships.role = 'PASTEUR_PRINCIPAL'`
  → `transaction:create` absent → bouton « Ajouter une transaction »
  masqué. Les comptes **réels** (`kairosiluminate@gmail.com`,
  `journey@example.com`) sont, eux, **cohérents** (vérifié par requête).
- **Impact** : un utilisateur invité dont `profiles.role` ne serait pas
  aligné verrait des permissions inférieures (ou supérieures) à son rôle
  réel d'organisation. Aujourd'hui les chemins d'invitation écrivent les
  deux, donc l'impact est **latent**.
- **Recommandation** : tronquer la source de vérité à une seule colonne
  (vue ou trigger de synchronisation `org_memberships` → `profiles.role`),
  ou faire lire `org_memberships.role` par `useCurrentUser`. Proposition
  **P36**.
- **Statut** : ouvert, non corrigé (changement de modèle de données →
  hors périmètre de correctif ciblé).

### R63 — Fixture E2E désalignée — CORRIGÉ (donnée de test)
- **Défaut** : le compte E2E avait `profiles.role = 'MEMBRE'` (au lieu de
  `PASTEUR_PRINCIPAL`), ce qui masquait `transaction:create` et faisait
  échouer `groups-events.cy.ts` test 3 — pour une raison de **donnée**, pas
  de code.
- **Correctif** : alignement de `profiles.role` sur `org_memberships.role`
  pour les 2 comptes E2E uniquement.
- **Retour arrière** : `UPDATE public.profiles SET role = 'MEMBRE' WHERE
  id = '87afea21-bad7-453b-9ae5-4ad1da2ca13f';`
- **Statut** : corrigé, validé (spec 3/3).

### R64 — Sélecteurs de spec portant sur des pages Ionic masquées — CORRIGÉ (test)
- **Défaut** : `ion-router-outlet` conserve montées toutes les pages
  visitées (`ion-page-hidden`). Les sélecteurs globaux
  (`cy.contains('button', …)`, `cy.get('h1')`) matchaient la barre latérale
  `FeatureSidebar` (`visibility: hidden`) → faux échecs « element is not
  visible » alors que l'app fonctionnait.
- **Correctif** : scoper à la page active
  (`div.ion-page:not(.ion-page-hidden)`). Corrigé dans
  `groups-events.cy.ts` ; reste à appliquer aux autres specs si elles
  échouent encore pour ce motif (cf. specs en cours de réexécution).
- **Statut** : corrigé pour `groups-events.cy.ts`, validé (3/3, 3 passes).

---

## Session 5 (2026-10-24) — clôture du défaut jsonb et des erreurs de type

### R65 — Double encodage jsonb, portée réelle — CORRIGÉ (critique)
Voir le détail complet en tête de fichier (section principale). Résumé :
218 valeurs corrompues sur 6 colonnes mesurées et réparées, correctif
amont en code, migration idempotente et réversible, 18 tests unitaires.

### R66 — `db.status` inexistant (PowerSync v2) → indicateur « hors ligne » permanent — CORRIGÉ (haute)
- **Défaut** : `usePowerSyncIndicator` et `window.__psFlushCrudUpload`
  lisaient `db.status`. PowerSync v2 a renommé ce champ en
  `db.currentStatus` : l'accès renvoyait `undefined`, donc l'indicateur de
  synchronisation affichait **« hors ligne » en permanence**, y compris
  quand la synchronisation fonctionnait.
- **Impact utilisateur** : l'utilisateur croit ses données non
  synchronisées et peut re-saisir une opération déjà enregistrée.
- **Correctif** : `currentStatus` dans `usePowerSyncIndicator.ts`,
  `powersync/index.ts` et le spec `cloud-sync.cy.ts`.
- **Gravité** : haute (induction en erreur, pas perte de donnée).

### R67 — Icône lucide `File` masquant le constructeur global `File` — CORRIGÉ (critique)
- **Défaut** : `OrgReportSend.tsx` importait l'icône `File` de
  `lucide-react` sans l'utiliser. Cet import **masquait le constructeur
  global `File`** dans la portée du module, donc
  `new File([blob], …)` levait « File is not a constructor ».
- **Impact** : l'envoi d'un rapport d'organisation échouait **à tous les
  coups** — la fonctionnalité principale de la phase 3 était cassée.
- **Correctif** : import inutilisé supprimé.
- **Gravité** : critique (fonctionnalité entièrement inopérante).

### R68 — `onButtonClick` inexistant sur `IonItem` (Ionic 9) — CORRIGÉ (moyenne)
- **Défaut** : `EventCalendar` et `EventTimeline` passaient
  `onButtonClick` à `IonItem`. Ionic 9 expose `onClick` : la prop était
  ignorée et le clic sur un événement du calendrier ne faisait rien.
- **Correctif** : `onClick`.
- **Gravité** : moyenne (navigation depuis le calendrier inopérante).

### R69 — `autoComplete` ignoré par Ionic 9 — CORRIGÉ (faible)
- **Défaut** : `Members.tsx` et `SettingsProfile.tsx` utilisaient
  `autoComplete` (camelCase). Ionic 9 attend `autocomplete` : l'attribut
  n'était pas transmis au DOM, l'autocomplétion du navigateur ne
  fonctionnait pas sur prénom/nom/téléphone/email.
- **Correctif** : `autocomplete`.
- **Gravité** : faible (confort de saisie, surtout mobile).

### R70 — Notification ciblant un rôle inexistant (`"ADMIN"`) — CORRIGÉ (moyenne)
- **Défaut** : `TransactionDetail.tsx` créait une notification avec
  `targetRole: "ADMIN"`, valeur absente du type `Role`
  (`PASTEUR_PRINCIPAL`, `TREASURIER`, …). La notification n'était
  rattachée à **aucun** destinataire : le rejet d'une transaction ne
  notifiait personne.
- **Correctif** : `TREASURIER`, cohérent avec les 3 autres notifications
  du même fichier (le rôle qui valide les transactions).
- **Gravité** : moyenne (silence sur un événement métier important).

### R71 — Typecheck de la CI sans effet (`"files": []`) — CORRIGÉ (moyenne)
- **Défaut** : le script de typecheck de la CI exécute `tsc --noEmit` à la
  racine. Le `tsconfig.json` racine déclare `"files": []` et n'inclut que
  des `references` : la commande ne vérifie **aucun fichier** et sort
  toujours en succès. C'est pour cela que 98 erreurs de type réelles
  (dont 5 bugs d'exécution) ont pu s'accumuler sans que la CI réagisse.
- **Mesure** : `npx tsc --noEmit` → exit 0 avec 98 erreurs présentes dans
  `tsconfig.app.json` ; après correction, `tsc -p tsconfig.app.json`
  → 0 erreur.
- **Correctif appliqué** : le job CI exécute désormais `npx tsc -b --noEmit`.
  `tsc -b` construit les deux projets référencés (`tsconfig.app.json` +
  `tsconfig.node.json`) et échoue réellement sur une erreur. Le second
  projet n'était jamais vérifié non plus : il a révélé 1 erreur dans
  `vite.config.ts` (`worker.format` et `build.sourcemap` élargis en
  `string` par inférence), corrigée par des littéraux `as const`.
- **Preuve** : avant → `tsc --noEmit` exit 0 malgré 98 erreurs ;
  après → `tsc -b --noEmit` exit 0 avec **0 erreur**, `vite build` exit 0.
- **Gravité** : moyenne (défaut de détection, pas défaut produit).


### R72 — Les specs Cypress dépendent d'un global exposé seulement en mode dev — OUVERT (moyenne)
- **Défaut** : `cross-tenant.cy.ts` lit `window.__psSupabaseClient`, publié
  par `publishDevDiagnostics()` qui commence par
  `if (!import.meta.env.DEV) return;`. Lancées contre un **build de
  production** (`vite preview`), les specs échouent avec
  « `__psSupabaseClient` does not exist » et attendent 4 minutes avant
  d'abandonner.
- **Preuve** : `cross-tenant` → 0/1 sur `vite preview` (port 4173, 4 min
  10 s) ; **1/1 en 24 s** sur `vite` dev (port 4174), même code, même base.
- **Portée** : toute la suite, dès qu'elle est lancée contre un build de
  production (ce que fait `cypress.config.ts` par défaut : `baseUrl` =
  déploiement distant). C'est un piège pour toute personne qui relance les
  tests : les échecs n'indiquent pas un défaut de l'app.
- **Correctif proposé (non appliqué)** : exposer le client de diagnostic
  aussi hors `DEV` (derrière un flag de test explicite), ou faire échouer
  le spec immédiatement avec un message clair du type « lancez la suite sur
  `vite` (dev) — cf. RUNBOOK ».
- **Gravité** : moyenne (faux négatifs de test, pas défaut produit).


### R73 — Artefact de build versionné : `graphify-out/` (59 Mo) — OUVERT (basse)
- **Défaut** : `graphify-out/` (analyse statique générée, **1980 fichiers,
  59 Mo**) est **suivi par git**. Il contient des chemins absolus de la
  machine du développeur (`C:\Users\joyda\dyad-apps\lumina\…`).
- **Impact** : dépôt alourdi à chaque clone (59 Mo inutiles), bruit dans les
  recherches (un scan de secrets y produit des faux positifs), fuite
  mineure d'information sur l'environnement de développement. **Aucun
  impact fonctionnel.**
- **Preuve** : `git ls-files graphify-out | wc -l` → 1980 ; `du -sh` → 59 Mo.
- **Correctif proposé (non appliqué — changement structurel, gel)** :
  `echo graphify-out/ >> .gitignore && git rm -r --cached graphify-out`.
  Sans risque pour l'app : ces fichiers ne sont pas utilisés au build.
- **Gravité** : basse.

### Audit sécurité du dépôt et de l'hébergement (2026-10-24)

Vérifications menées, avec résultat :

| Contrôle | Commande / méthode | Résultat |
|---|---|---|
| `.env` versionné | `git ls-files \| grep .env` | **aucun** |
| Secrets **de production** en dur (JWT, `service_role`, `sb_secret_`, `sk-`, `sbp_`, clé anon) | `git grep` sur le code suivi | **aucun** (seules des mentions en commentaire et des `Deno.env.get(...)`) |
| Mots de passe de **test** en clair | `cypress/support/orgCreds.ts:126` (`E2e-Unconfigured!1`), `scripts/generate-keystore*.{sh,js,py}` (`lumina1234`) | **présents** — déjà documentés en R8 et R9, comptes/keystore de test uniquement, **pas** des secrets de production |
| Secrets dans l'historique | `git log --all --diff-filter=D` sur `.env*` | **aucun** fichier de secret supprimé |
| Dependabot | `.github/dependabot.yml` | **absent** (aucune configuration ; conforme à la directive d'abandon) |
| PR Dependabot ouvertes | API `pulls?state=open` | **0** |
| Alertes Dependabot | API `dependabot/alerts` | **désactivées** sur le dépôt (403 explicite) |
| Alertes secret-scanning / code-scanning | API GitHub | non accessibles avec le jeton de session (403 « Resource not accessible by integration ») — **non vérifié**, à confirmer par le propriétaire |
| Advisors Supabase (sécurité) | `get_advisors` | 2 INFO (tables sans policy), 7 WARN (`SECURITY DEFINER` exécutables par `authenticated`), 1 WARN (protection de mots de passe compromis désactivée) |

**Actions menées** : `_jsonb_backfill_20261024` verrouillée (`REVOKE` à
`anon`/`authenticated`, RLS activée, commentaire de table) ; alerte INFO
correspondante résorbée. Les 7 WARN `SECURITY DEFINER` sont **assumés et
documentés** (ce sont les helpers d'isolation, dont l'accès `authenticated`
est nécessaire aux policies RLS) ; ils sont consignés en R64-bis ci-dessus.
La protection de mots de passe compromis relève du tableau de bord
Supabase (action propriétaire, cf. RUNBOOK).

### R64-bis — 7 fonctions `SECURITY DEFINER` exécutables par `authenticated` — ASSUMÉ (info)
- **Constat (Advisor Supabase)** : `is_org_member`, `current_org_id`,
  `org_descendants`, `can_manage_invitations`, `is_org_admin`,
  `upsert_profile`, `settle_invitation_claim` sont appelables via
  `/rest/v1/rpc/…` par un utilisateur connecté.
- **Pourquoi c'est assumé** : ce sont les **helpers d'isolation** utilisés
  à l'intérieur des policies RLS. Les policies s'exécutent avec les droits
  de l'appelant : elles doivent donc pouvoir appeler ces fonctions. Les
  passer en `SECURITY INVOKER` recréerait une récursion de policies
  (l'accident d'origine du durcissement) et **rouvrirait la fuite**.
- **Ce qui les borne** : chaque fonction valide ses arguments et ne révèle
  qu'un booléen ou l'`org_id` de l'appelant ; `EXECUTE` a été retiré à
  `anon`/`PUBLIC` (vérifié en base : ACL = `authenticated` +
  `service_role` seulement).
- **Action** : aucune. Consigné pour qu'un futur lecteur des Advisors ne
  « corrige » pas ces fonctions et ne rouvre pas la faille.


### R74 — Ciblage des notifications : `action_type` détourné en « rôle » — OUVERT (moyenne)

**Origine** : en corrigeant R70 (erreur de type `targetRole: "ADMIN"`), une
vérification plus poussée a montré que la correction de type ne suffisait pas
et que la description initiale de R70 était **inexacte**. Rectificatif.

**Ce qui est réellement vrai** (vérifié) :
- `NotificationSendData.targetRole` est typé `Role` (`notification/index.ts:20`)
  mais n'est **jamais** utilisé pour router : `sendNotification` écrit sa
  valeur dans la colonne `notifications.action_type` (ligne 115 :
  `data.targetRole ?? "PUSH"`), une colonne `text` sans contrainte.
- Or les **données réelles** de `action_type` ne contiennent **aucun** rôle :
  `EVENT_CREATED` 311, `INVITATION_RECEIVED` 11, `FORM_SUBMITTED` 1
  (requête `select action_type, count(*) from notifications group by 1`,
  2026-10-24). Cette colonne porte un **type d'événement**, pas un rôle.
- Conséquence : les 5 notifications de `TransactionDetail.tsx` (et celles de
  `EventNew.tsx`, `GivingCampaign.tsx`, `FormFill.tsx`, `InvitationEmit.tsx`,
  `InvitationClaim.tsx`) écrivent un **rôle** dans une colonne qui contient
  partout ailleurs un **type d'événement**. Le nom de la valeur n'a pas
  d'effet fonctionnel : aucun code ne lit `action_type` pour filtrer par
  destinataire (`git grep action_type` → seul `getNotifIcon` le lit).

**Effet secondaire découvert** : `getNotifIcon`
(`src/pages/Notifications.tsx:23`) ne reconnaît que `TRANSACTION_PENDING`,
`TRANSACTION_APPROVED`, `BUDGET_EXCEEDED`. Or ces trois valeurs sont
**absentes** des données réelles (0 ligne) : toutes les notifications
affichées prennent donc l'icône par défaut (cloche grise). L'icône ne
distingue rien aujourd'hui.

**Pourquoi ce n'est pas corrigé en session** : corriger proprement exige de
séparer « type d'événement » et « destinataire » — c'est-à-dire ajouter une
colonne (ou une convention) et un vrai routage. C'est une décision de
conception, hors du « minimum de changement », et non bloquante (aucune
notification n'est perdue : elles sont toutes visibles par toute
l'organisation ; seul le *ciblage* et l'*icône* sont imprécis).

**Ce qui a été fait** : `TransactionDetail.tsx` utilise désormais
`TREASURIER` (valeur valide du type `Role`) au lieu de `"ADMIN" as any` :
le `as any` disparaît, le typecheck passe. Le comportement visuel est
**inchangé** (`TREASURIER` n'est pas reconnu par `getNotifIcon`, comme
`ADMIN` ne l'était pas).

**Action proposée** : P-NEW-6.

### Rectificatif sur R70 (message de commit `0702cd2`)

Le message du commit `0702cd2` décrit le point 5 ainsi : « la notification de
suppression n'était rattachée à aucun rôle destinataire ». **C'est inexact**
(cf. R74) : `targetRole` ne route rien ; il alimente `action_type`. Le défaut
réel était une **erreur de type** (`"ADMIN"` n'appartient pas à `Role`) que
`as any` masquait, et une **incohérence sémantique** de la colonne
`action_type`. La correction de type reste valable ; l'interprétation
fonctionnelle était fausse. Le présent rectificatif fait foi.

### R75 — Colonne « Soumetteur » : UUID brut au lieu du nom — CORRIGÉ (moyenne)

**Défaut** : `form_submissions.submitted_by` stocke l'`id` du profil
(`87afea21-bad7-453b-9ae5-4ad1da2ca13f`), et `FormSubmissions.tsx` affichait
cette valeur telle quelle dans la colonne « Soumetteur ». L'utilisateur
voyait un UUID, pas un nom.

**Preuve du défaut** : spec Cypress `forms-v2.cy.ts` T5 échouait avec
« valeur de la cellule « Soumetteur » : attendu « E2E Org », reçu
« 87afea21-bad7-453b-9ae5-4ad1da2ca13f » ». Confirmé en base :
`select p.first_name, p.last_name from form_submissions s join profiles p
on p.id::text = s.submitted_by` → « E2E Org ».

**Pourquoi c'était possible** : `profiles_select` autorise la lecture des
profils de sa propre organisation (`initplan_uid() = id OR
is_org_member(initplan_uid(), org_id)`), et la table `profiles` est
synchronisée localement par PowerSync (colonnes `first_name`, `last_name`,
`email`). La résolution côté client est donc possible **et** bornée par la
RLS : on ne peut résoudre qu'un nom que l'on a déjà le droit de voir.

**Correction** (`src/pages/FormSubmissions.tsx`) : chargement de la table
locale `profiles` (import dynamique, `try/catch`) → table
`id → « Prénom Nom »` ; la cellule, la recherche plein-texte et le tri de la
colonne utilisent désormais le nom affiché. **Repli** : si PowerSync n'est
pas disponible (ou l'utilisateur inconnu de `profiles`), l'`id` est affiché
comme avant — aucune régression, aucune erreur.

**Correction étendue** : la colonne « Rejeté par » (`rejected_by`) souffrait
du même défaut (aucune donnée actuelle — 1 ligne, `rejected_by = null` — mais
l'affichage et le tri étaient identiques). Elle résout désormais le nom via
la même table, et son tri porte sur le nom affiché.

**Preuve** : nouveau test
`src/components/__tests__/FormSubmissions-table.test.tsx` — « affiche le NOM
du soumetteur (résolu depuis profiles), pas son id brut » (5/5 verts dans
le fichier). Le spec Cypress `forms-v2.cy.ts` T5 constitue la preuve de bout
en bout.


### R76 — Icônes de notification toutes génériques — CORRIGÉ (basse)

**Défaut** : `getNotifIcon` (`src/pages/Notifications.tsx`) ne reconnaissait
que `TRANSACTION_PENDING`, `TRANSACTION_APPROVED`, `BUDGET_EXCEEDED`. Or ces
trois valeurs **n'existent pas** dans la table `notifications` : les valeurs
réellement persistées sont `EVENT_CREATED` (311), `INVITATION_RECEIVED` (11),
`FORM_SUBMITTED` (1). Conséquence : **100 % des notifications** affichaient
l'icône générique par défaut (cloche grise), sans distinction visuelle.

**Correction** : les trois types réels produisent désormais une icône
distincte (horloge, tendance, coche) ; la sélection est isolée dans
`notifIconKey()` pour être testable sans rendu.

**Preuve** : `src/pages/__tests__/Notifications-icon.test.tsx` (3/3) ;
`tsc -b` 0 erreur.


### R77 — Coquille « Trésurier » dans le badge de rôle du profil — CORRIGÉ (basse)

**Défaut** : `ROLE_LABEL` (`src/pages/SettingsProfile.tsx:28`) écrivait
`TREASURIER: "Trésurier"`. Partout ailleurs dans l'app le libellé est
« Trésorier » (`src/lib/rbac.ts`, `src/lib/utils.ts`, `src/templates/*`,
`OrgSetup.tsx`, `InvitationEmit.tsx`, `Tutorial.tsx`). Le badge de rôle du
profil affichait donc une faute d'orthographe, visible par tout utilisateur
ayant ce rôle.

**Portée** : `profiles.role = 'TREASURIER'` → **2 comptes** réels dans
l'environnement. Faute visible immédiatement.

**Correction** : libellé aligné sur la source de vérité (« Trésorier »).

**Preuve** : test ajouté dans `SettingsProfile.test.tsx` — le badge
(`data-testid="profile-role-badge"`) contient « Trésorier » et non
« Trésurier » (3/3 verts) ; `tsc -b` 0 erreur.


### R78 — Piste d'audit : actions d'administration affichées « Modifié » — CORRIGÉ (moyenne)

**Défaut** : `ACTION_META` (`src/pages/Trace.tsx`) ne couvrait pas les
actions réellement écrites dans `audit_entries` pour la gestion des
administrateurs d'organisation. Relevé en base :
`ADMIN_ASSIGNED` (8), `ADMIN_REMOVED` (3), `ADMIN_REVOKED` (2),
`ADMIN_REINSTATED` (1) — soit **14 entrées sur 51**. Faute de cas, elles
retombaient toutes sur `ACTION_META.UPDATE` → la piste d'audit affichait
« Modifié OrgAdmin » pour une attribution ou un retrait d'administrateur.

**Pourquoi c'est important** : c'est précisément la trace dont on a besoin
pour reconstituer qui a donné ou retiré des droits. Afficher « Modifié » sur
un changement de privilèges rend l'audit trompeur sur un sujet sensible.

**Correction** : quatre libellés explicites (Admin attribué / rétabli /
révoqué / retiré) et `OrgAdmin` → « Administrateur d'organisation ».

**Preuve** : `src/pages/__tests__/Trace-labels.test.tsx` (3/3) ;
`tsc -b` 0 erreur.


### R82 — `org-reports.cy.ts` s'auto-empoisonne : la sélection du parent est non déterministe — OUVERT (moyenne)

**Défaut** : le spec crée une hiérarchie Mère → A → B, mais choisit le
parent dans le popover par
`cy.get('ion-popover').find('ion-item').filter(':visible')
 .filter((_, el) => !el.textContent.includes('Aucune')).first()`
(`cypress/e2e/org-reports.cy.ts:130-134`). Or la liste des options vient de
`allOrgs` (`Federation.tsx:460`), alimenté par `federation.listOrgs()`
(`src/capabilities/federation/index.ts:201`) trié **`created_at DESC`**.
`.first()` sélectionne donc la **dernière organisation créée**, pas
l'organisation courante (la Mère) comme le commentaire du spec le suppose.

**Conséquence mesurée** : chaque exécution du spec crée une nouvelle
« Annexe A », qui devient le parent de la suivante. La base contient ainsi
une chaîne de 4 niveaux, tous nommés « Annexe A » :

```
org-e2e (Lumina Org E2E)
 └── Annexe A 164093   (24/10 00:02)
      └── Annexe A 305399  (24/10 01:11)
           └── Annexe A 534585 (24/10 02:22)   ← échec du run courant
```

Les organisations **sont bien créées** (vérifié en base : `Annexe A 534585`
existe, `parent_org_id` = `Annexe A 305399`, statut ACTIVE). Le défaut est
donc **du test, pas du produit** : après création, `loadOrgs` ne reçoit que
les orgs où le compte est admin/membre — l'org A fraîchement créée est
déléguée à l'admin courant, mais l'arbre affiché ne contient que la racine,
et `cy.contains('span', orgAName)` échoue (timeout 60 s, ligne 153).

**Pourquoi c'est important** : le spec n'est pas rejouable. À chaque
exécution il pollue la base d'un niveau supplémentaire et son échec est
interprété à tort comme une régression de la hiérarchie d'organisations —
une fonctionnalité centrale (Phase 2). Non déterministe = défaut, pas
instabilité à ignorer.

**Correctif identifié (NON appliqué — tentative révoquée)** : deux approches
ont été codées puis **révoquées**, faute de pouvoir les valider dans le
budget de la session :

1. remplacer `.first()` par la sélection explicite de l'option portant le
   nom de l'organisation courante. Mesuré : le nom de la Mère
   (`lumina-user.org.name` / `lumina-config.churchName`) **n'est pas dans la
   liste** des options — `cy.contains(ion-item, 'Org E2E 110710')` échoue
   après 180 s. La liste ne contient donc pas l'organisation courante, ce
   qui invalide l'hypothèse et **exige une investigation supplémentaire** ;
2. créer l'arbre de test sous une racine dédiée au spec plutôt que sous
   l'organisation partagée du compte.

Conformément au principe « un changement non testé est pire qu'un défaut
documenté », `cypress/e2e/org-reports.cy.ts` a été **restauré à son état
commité** (`git checkout`). Le spec reste en échec, documenté, non maquillé.

**Travail restant** : (a) comprendre pourquoi l'organisation courante est
absente des options du sélecteur parent (`allOrgs` ← `listOrgs`, filtre
admin/membre) ; (b) purge des 4 organisations « Annexe A » orphelines
(décision propriétaire : elles portent `status = ACTIVE` et des enfants).
Coût estimé du point (a) : 1 h.


### R81 — Un run Cypress peut porter sur un build obsolète sans que rien ne l'annonce — CORRIGÉ (méthode, moyenne)

**Défaut de méthode** : `cypress.config.ts` ne définit pas de `webServer` et
`baseUrl` retombe par défaut sur le déploiement Render
(`https://lumina-76un.onrender.com`). En pratique la suite a été lancée
contre `http://127.0.0.1:4174`, un serveur `vite preview` démarré à
**01:06** alors que les correctifs R75–R78 ont été commités à
**01:15–01:17**. Le run de 29 minutes a donc produit 5 specs / 9 échecs
**sur du code qui n'existait plus**, sans le moindre avertissement :
le rapport final aurait imputé à tort ces échecs au code courant.

Deux indices le prouvaient a posteriori : (1) le bundle
`dist/assets/FormSubmissions-*.js` ne contenait pas la chaîne
« noms de soumetteurs indisponibles » introduite par R75 ; (2) les
messages d'échec citaient le tag `data-dyad-id` (injecté par
`dyadComponentTagger`) alors que le spec sur disque contenait
`{ force: true }` absent du log.

**Aggravant** : `cypress/e2e/cross-tenant.cy.ts` (isolation inter-orgs,
spec de sécurité) **exige le serveur de dev** — il s'auto-protège
correctement en échouant avec un message explicite quand
`window.__psSupabaseClient` est absent (R72). Sur un build de production,
ce spec de sécurité échoue donc systématiquement, ce qui peut faire croire
à une régression d'isolation.

**Correction appliquée (procédure, pas de code)** : la suite de référence
est relancée sur `http://127.0.0.1:8080` (`npx vite`, l'environnement
canonique prescrit par `scripts/run-cypress.sh` et le RUNBOOK), après
`rm -rf dist` et redémarrage du serveur de dev. Aucune modification de
`cypress.config.ts` n'a été faite (gel : changement structurel non testé).

**Travail restant (proposition P32)** : rendre l'environnement de test
infalsifiable — par exemple un `webServer` explicite dans
`cypress.config.ts`, ou une assertion de démarrage qui compare l'horodatage
du build à celui du dernier commit. Voir PROPOSITIONS.md.


### R80 — Le stream `profiles` ne synchronise que le profil de l'utilisateur connecté — OUVERT (moyenne)

**Défaut** : le stream PowerSync `profiles`
(`powersync/sync-config.yaml:71-73`) est filtré sur
`WHERE id = auth.user_id()`. Chaque client ne stocke donc QUE son propre
profil dans la base locale. Or plusieurs écrans affichent le nom d'AUTRES
utilisateurs à partir de cette table :

- `src/pages/FormSubmissions.tsx:168` — colonne « Soumetteur » et
  « Rejeté par » (résolution `SELECT id, first_name, last_name, email
  FROM profiles`) ;
- `src/lib/dataLayer.ts:2235` (`useOrganizations` vue « central ») —
  éligibilité d'un administrateur d'organisation.

**Conséquence observable** : pour tout soumetteur autre que l'utilisateur
courant, la jointure locale ne trouve rien et le repli affiche l'UUID brut.
Constaté en base le 2026-10-24 : `form_submissions` id
`a7a99491-…` porte `submitted_by = 87afea21-bad7-453b-9ae5-4ad1da2ca13f`,
qui EXISTE dans `profiles` (nom « E2E Org ») mais n'est pas dans la réplique
locale de l'utilisateur connecté. Le correctif R75 (résolution par
`profiles`) est donc **nécessaire mais non suffisant**.

**Pourquoi ce n'est pas corrigé dans cette session** : élargir le stream
(`WHERE id = auth.user_id() OR is_org_member(auth.user_id(), org_id)`) est
la bonne correction — la RLS l'autorise déjà
(`profiles_select` = `initplan_uid() = id OR is_org_member(initplan_uid(),
org_id)`) — mais **exigerait un redéploiement du service config Cloud**
(`powersync deploy sync-config`, jeton `PS_ADMIN_TOKEN` absent de
l'environnement). Modifier le YAML local sans redéployer créerait une
divergence client/serveur (défaut pire que celui-ci : le client
souscrirait des lignes que le serveur ne pousse pas).

**Alternative écartée** : résoudre les noms via un appel REST Supabase
direct. Rejeté : ajouterait un aller-réseau par rendu, romprait le
fonctionnement hors ligne (or c'est un argument central de PowerSync) et
contournerait la couche de données.

**Repli actuel (acceptable)** : l'UUID reste affiché, jamais un écran vide
ni une exception (try/catch + `console.warn`). Aucune fuite de données :
la RLS et le stream restent strictement cloisonnés.

**Travail restant** : redéployer `sync-config.yaml` avec le filtre élargi,
puis rejouer `cypress/e2e/forms-v2.cy.ts` (T5, assertion « Soumetteur »).
Voir RUNBOOK.md § « Redéployer PowerSync ».


### R79 — Échec de persistance d'une notification avalé en silence — CORRIGÉ (moyenne)

**Défaut** : dans `sendNotification` (`src/capabilities/notification/index.ts`),
le `catch` autour de l'`INSERT INTO notifications` ne faisait rien d'autre
qu'un commentaire « best-effort ». Si la base locale PowerSync est
indisponible, la notification **n'existe pas** dans l'historique in-app et
aucune trace n'est laissée, ni pour l'utilisateur ni pour le développeur.
Viole le principe « aucun silence ».

**Correction** : `console.warn` contextualisé (`[notification]` + cause),
même convention que les autres points de reprise du dépôt (`auth.ts`,
`SupabaseConnector.ts`). Le chemin OneSignal s'exécute toujours (comportement
fonctionnel inchangé).

**Preuve** : test ajouté dans `notification.test.ts` qui force l'échec de
`execute()` et exige le `warn`. **Vérifié par retrait du correctif** : sans
lui, le test échoue (« expected "warn" to be called at least once ») ;
avec lui, 21/21 verts. `tsc -b` 0 erreur.


### R83 — `performance-batch` : les tests offline→online ne réunissent aucun des prérequis du motif éprouvé (moyenne)

**Constat mesuré** : `performance-batch.cy.ts` tests 1 et 2 → `expected 0 to
be at least 20` / `at least 50`. Vérification en base :
`select count(*) from transactions where description like 'Tx batch%'` → **0**,
`like 'ChargeTx%'` → **0**. Le test calendrier (création d'événements **en
ligne**, sans intercept) passe : **1/1**. Les écritures atteignent donc la base
quand le réseau n'est pas intercepté ; ce n'est **pas** une perte de données
silencieuse en production, mais un défaut du scénario de test.

**Cause racine** : le fichier n'a **aucun** des trois éléments que réunit
`cloud-sync.cy.ts` (qui passe, 1/1) :
1. **`req.continue()` en mode online** — le handler d'intercept de
   `performance-batch` ne fait que `req.destroy()` ; il ne laisse jamais
   passer la requête. Cypress « mange » donc la requête même après
   `offline = false`, et le client Supabase reçoit une réponse CORS invalide.
   `cloud-sync` contient 6 occurrences de `req.continue()`.
2. **Intercept `OPTIONS`** — le préflight CORS n'est pas laissé passer.
   `cloud-sync` en contient 2.
3. **Contexte d'organisation forcé** — `lumina-user` / `lumina-active-org`
   ne sont pas posés avant la coupure, donc `getOrganizationId()` retombe sur
   `__no_org__` et la file d'upload PowerSync échoue en silence.
   `cloud-sync` pose explicitement ces clés (et le rôle `PASTEUR_PRINCIPAL`).

**Impact** : faux négatif de test — la borne haute (20 et 50 transactions)
n'est **pas** vérifiée.

**RECTIFICATIF IMPORTANT (vérifié le 2026-10-24)** : la version initiale de
cette entrée affirmait que la synchronisation offline→online était « prouvée
fonctionnelle par `cloud-sync.cy.ts` ». **C'est faux et je le corrige.** En
lisant la spec en entier (lignes 330-420), `cloud-sync.cy.ts` ne fait **pas**
transiter les écritures par PowerSync : après la reconnexion, il **insère
lui-même** les entités (`org_units`, `groups`, `accounts`, `caisses`,
`custom_field_definitions`) par `cy.request` en contexte Node, puis vérifie
leur présence. L'assertion est donc **tautologique** : elle prouve que le
réseau et la RLS acceptent ces lignes, **pas** que le worker PowerSync les a
poussées. Le spec porte même son propre constat en commentaire : « le spec
pousse les entities DIRECTEMENT au Supabase ».

**Conséquence** : le **chemin d'écriture offline→serveur (SQLite → queue
d'upload → Supabase) n'a AUCUNE couverture de test**. C'est le point le plus
important pour un usage quotidien hors ligne. Un vrai test doit passer par le
worker : `db.disconnect()` → écrire en local (l'UI affiche la donnée) →
`db.connect(connector)` → attendre la disparition de la file
(`getNextCrudTransaction()` → `null` ou `currentStatus.uploading === false`) →
vérifier côté serveur. Coût estimé : 1 h 30 (dont ~20 min d'exécution).

**Correctif identifié (non appliqué — gel)** : aligner `performance-batch` sur
le motif de `cloud-sync` (les trois points ci-dessus). Coût estimé : 45 min,
dont ~25 min d'exécution (le sync PowerSync prend ~35 s par cycle).

**Travail restant** : réécrire les tests 1-2 avec le motif `cloud-sync`, puis
relancer 3 fois (stabilité).


### R84 — La suite Cypress n'est pas typecheckée par la CI (faible)

**Constat** : `tsconfig.json` référence `tsconfig.app.json` (`include: ["src"]`)
et `tsconfig.node.json` ; `tsc -b` (la commande CI, rendue opérante en session 5
pour remplacer un `tsc --noEmit` qui ne vérifiait aucun fichier) **n'inclut pas
`cypress/`**. Les 28 specs ne sont donc jamais vérifiés statiquement.

**Preuve** : `npx tsc --noEmit -p cypress/tsconfig.json` remonte **13 erreurs
préexistantes** dans `cloud-sync.cy.ts` (2), `nav-bottom.cy.ts` (1),
`sessions.cy.ts` (3), `cypress/support/ionic.ts` (3), plus des erreurs de
configuration (`--downlevelIteration`). Aucune n'est visible en CI.

**Impact** : un spec peut porter une faute de frappe ou un accès invalide et
n'échouer qu'à l'exécution — voire jamais si le chemin n'est pas parcouru.
Faible : cela n'affecte pas l'application livrée.

**Correctif identifié (non appliqué — gel)** : ajouter `cypress` à la
configuration vérifiée en CI (`tsc -b` avec un `tsconfig.cypress.json`
référencé), après avoir corrigé les 13 erreurs. Coût estimé : 1 h.
Voir PROPOSITIONS.md (P34).


### R85 — Le chemin d'écriture offline→serveur n'a aucune couverture de test (moyenne)

**Constat (vérifié le 2026-10-24)** : la couverture annoncée de la
synchronisation hors ligne repose sur `cloud-sync.cy.ts` (1/1). Or cette spec
**ne fait pas** transiter les écritures par PowerSync : après la reconnexion,
elle **insère elle-même** les 5 entités (`org_units`, `groups`, `accounts`,
`caisses`, `custom_field_definitions`) par `cy.request` en contexte Node
(non intercepté), puis vérifie leur présence via REST. L'assertion est
**tautologique** — elle valide le réseau et la RLS, pas la file d'upload
PowerSync. La spec le reconnaît explicitement en commentaire : « SOLUTION : le
spec pousse les entities DIRECTEMENT au Supabase ».

**Preuve** : lecture de `cypress/e2e/cloud-sync.cy.ts` L330-420 ;
`win.__psFlushResult = { flushed: true, passes: 0, opsTotal: 0, note: 'direct
Supabase upserts via cy.request (Node context)' }` — le spec **stubbe** le
résultat du flush.

**Impact** : le cœur de la promesse produit (« hors ligne d'abord, synchronisé
ensuite ») n'était vérifié par aucun test. Une régression de la file d'upload
serait passée inaperçue jusqu'à ce qu'un utilisateur perde des saisies.

**CORRECTIF PARTIEL LIVRÉ (2026-10-24)** — `cypress/e2e/offline-write-sync.cy.ts`,
**1/1, 3 passes consécutives** (12-13 s par passe). Ce que le test prouve,
mesuré :
1. une transaction créée par l'interface est écrite dans la base locale
   (`transactions`, `org_id` correct, montant 12345 → **1234500 centimes**) ;
2. elle entre dans la **file d'upload locale** : `ps_crud` contient
   `{"op":"PUT","type":"transactions","id":"<uuid>","data":{"org_id":"org-e2e",…}}`
   — **le chemin d'écriture hors ligne est donc réellement capturé**, ce qui
   n'était prouvé nulle part ;
3. contrôle négatif : la ligne n'est pas encore sur le serveur.

**Résidu non couvert (mesuré, pas supposé)** : le **vidage** de la file.
En Chromium headless, le worker WASM de PowerSync ne se connecte jamais —
`currentStatus` reste `{ connected: false, hasSynced: false }` après 120 s
d'attente, **sans aucune erreur remontée**, et `__psFlushCrudUpload` retourne
`passes: 0, opsTotal: 0` alors que `ps_crud` contient l'op. Aucun test
headless ne peut donc vider la file : c'est la raison pour laquelle
`cloud-sync.cy.ts` contournait par des insertions directes. **Ce n'est pas un
défaut produit** (la file est correctement remplie) mais une limite
d'environnement de test. Vérification manuelle requise : procédure ajoutée
dans RUNBOOK.md.

**Correctif identifié (non appliqué — budget)** : nouveau spec pilotant le
worker plutôt que le réseau :
1. attendre la première sync (`db.waitForFirstSync()`), forcer le contexte
   d'organisation ;
2. `await db.disconnect()` ;
3. écrire via l'UI (la donnée doit apparaître dans l'interface) ;
4. `db.connect(connector)` — le connector doit être accessible ; le handle
   `window.__psDb` est déjà exposé (DEV), le connector ne l'est pas : exposer
   `window.__psConnector` en DEV est nécessaire (modification produit de
   ~3 lignes, à confirmer) ;
5. attendre la vidange : `await db.getNextCrudTransaction()` → `null`, ou
   `db.currentStatus.uploading === false` sans `uploadError` ;
6. vérifier la ligne côté serveur avec le **jeton réel** ;
7. nettoyage des lignes créées.

**Coût estimé** : 1 h 30 (dont ~20 min d'exécution : le cycle d'upload
PowerSync prend ~30-40 s). **Risque** : le flush PowerSync dans le navigateur
est intercepté par `cy.intercept` (CORS) — c'est justement pourquoi la spec
actuelle contourne. Le test devra donc **ne pas** intercepter du tout et
utiliser `disconnect()`/`connect()` pour simuler la coupure (c'est tout
l'intérêt de l'approche).

---

### R86 — La suite E2E dépend d'un service d'authentification partagé et limité en débit

- **Gravité** : moyenne (environnement de test, pas production).
- **Constat mesuré (2026-10-24)** : sur un run de 13 specs, 3 échouent —
  `groups-events.cy.ts` (0/3), `sessions.cy.ts` (0/3),
  `comprehensive-flow.cy.ts` (0/1) — alors que les 10 autres passent
  (dont mes 3 specs modifiés et les 2 specs de synchronisation).
- **Cause établie par comparaison** : j'ai monté `origin/main` **intact** dans
  un worktree isolé (serveur sur 8081, même `.env.local`) et rejoué les 3
  specs : elles échouent **de la même façon**, avec un message explicite de la
  suite elle-même :
  `after login: /auth (attendu /onboarding ou /dashboard — le POST login n'a
  pas complété en 90 s : vérifier le 503 Render / la rate limit GoTrue / le
  timeout du form)`.
  → La cause est **l'authentification Supabase partagée** (quota GoTrue /
  latence), dégradée par la répétition des exécutions E2E de la session.
  **Ce n'est pas une régression de la fusion.**
- **Preuve complémentaire d'absence de régression de la fusion** : les fichiers
  porteurs des correctifs de la session 3 (R57/R58/R59/R60) sont
  **identiques à `main`** dans ma branche :
  `git diff --stat origin/main HEAD -- src/ionic/routes/lazy-route.tsx src/App.tsx src/components/PageSkeletons.tsx src/lib/utils.ts`
  → **aucune différence** (le correctif R59 « squelette neutre, sans
  `IonPage` » est bien présent). Seul `src/lib/dataLayer.ts` diffère
  (+30/−17, modifications de ma session).
- **Conséquence** : les specs qui exigent un vrai login sont **non
  déterministes en fin de session** ; le nombre de passes doit être interprété
  à la lumière de cette limite. Le total « vert » dépend de la fraîcheur du
  quota d'auth, pas du code.
- **Recommandation** : exécuter la suite E2E avec un compte dédié et des
  identifiants stables, espacés dans le temps ; ou basculer la suite sur un
  Supabase local (`supabase start`) pour supprimer la dépendance réseau. Coût
  estimé : 2 h. **Non traité** (hors budget de clôture).


---

### R87 — CORRIGÉ — `/finance` affichait « Aucune transaction trouvée » en permanence

- **Gravité initiale** : **élevée** (fonctionnalité financière principale,
  silencieuse). **Statut : corrigé et vérifié** (2026-10-24).
- **Symptôme** : la page `/finance` (Grand livre) affichait systématiquement
  « Aucune transaction trouvée », « Revenus 0 », « Dépenses 0 », quel que soit
  le contenu réel de la base. Aucun message d'erreur n'était visible.
- **Cause racine** : `ResourceService.toTableName()` (`src/capabilities/resource/index.ts`)
  mappait `Group`/`Event`/`Member`/`Account`/`Category`/`Role`, mais **pas
  `Transaction`**. Le repli `entityType.toLowerCase()` produisait `transaction`
  (singulier) alors que la table PowerSync est `transactions`. La requête levait
  `near "transaction": syntax error` ; `Finance.tsx` avalait l'erreur par
  `.catch(() => setLoading(false))` — d'où l'affichage d'une liste vide
  **sans aucun signal**.
- **Preuve du défaut** (instrumentation temporaire de `resource.list`, retirée) :
  `{"entityType":"Transaction","table":"transaction","orgId":"org-e2e","sql":
  "SELECT * FROM transaction WHERE org_id = ? ORDER BY date desc",
  "error":"near \"transaction\": syntax error"}`.
- **Correctif** : ajout de `Transaction: "transactions"` au `tableMap`
  (1 ligne + commentaire).
- **Tests de reproduction** (ajoutés dans `src/capabilities/__tests__/resource.test.ts`,
  bloc « R87 — correspondance table/entité ») : ils inspectent le SQL émis et
  refusent toute table hors schéma. **Vérifiés dans les deux sens** : 2 échecs
  avec le correctif retiré, 24/24 avec le correctif. Le mock existant renvoyait
  `[]` pour une table inconnue — c'est pourquoi le défaut n'avait jamais été vu
  par les tests unitaires.
- **Preuve de bout en bout** : `cypress/e2e/offline-write-sync.cy.ts` (1/1,
  27 s) crée une transaction par l'interface et vérifie qu'elle **apparaît dans
  `/finance`**. Avant correctif : liste vide (mesuré) ; après : la ligne est
  présente (mesuré).
- **Régression** : suite unitaire **1102/1102** après correctif.
- **Défaut lié, NON corrigé** : `/transaction/<id>` affiche « Transaction
  introuvable » pour une transaction écrite localement (D1 ci-dessous).

### D1 — `/transaction/:id` « introuvable » pour une transaction écrite localement

- **Gravité** : moyenne. **Statut : non corrigé** (nécessite un accès aux
  données locales ; hors du budget de clôture).
- **Symptôme mesuré** : après création via `/transaction/new`, l'ouverture de
  `/transaction/<id>` affiche « Transaction introuvable », alors que la ligne
  existe dans SQLite (vérifié par requête directe) et apparaît désormais dans
  `/finance` (après R87).
- **Cause identifiée** : `TransactionDetail` résout sa transaction via
  `useTransactions()`, qui ne sert les données PowerSync **que** si
  `isPowerSyncReady()` (`connected && hasSynced`, posé après la 1re
  synchronisation). Tant que PowerSync n'est pas connecté (hors ligne, ou avant
  la 1re synchro), le hook retombe sur `useLocalStore().transactions` — un store
  **non hydraté** (rempli uniquement par les actions utilisateur) → tableau vide
  → « introuvable ». Le même garde affecte 17 hooks de lecture
  (`useEvents`, `useOrgUnits`, `useCategories`…), donc l'exposition dépasse le
  seul détail.
- **Pourquoi non corrigé** : le correctif propre est de remplacer le repli
  `useLocalStore` par une lecture SQLite locale (ou d'utiliser
  `resource.list('Transaction')`), ce qui touche 17 hooks et exige une
  vérification de non-régression complète — incompatible avec la règle de gel.
  Une correction partielle et non testée serait pire que le défaut documenté.
- **Contournement utilisateur** : passer par `/finance` (corrigé) ; la
  synchronisation PowerSync rétablit le détail dès que l'appareil est connecté.

### R88 — Erreurs avalées dans `Finance.tsx`

**Inventaire (classe de défaut, 23 occurrences dans `src/pages/`)** — un
`.catch()` vide transforme toute erreur (SQL, réseau, RLS, permission) en
**état vide silencieux** : l'utilisateur croit qu'il n'y a rien, et aucune trace
n'existe pour le développeur. Occurrences relevées :

`InvitationEmit.tsx:142`, `InvitationClaim.tsx:155`, `EventNew.tsx:169`,
`FormFill.tsx:172`, `GivingCampaign.tsx:117,154`, `TransactionNew.tsx:202`,
`Versement.tsx:103`, `InvitationManage.tsx:114`, `CentralAdmin.tsx:292,625`,
`Finance.tsx:65`, `Reports.tsx:293`, `ReportBuilder.tsx:207,226`,
`FormSubmissions.tsx:206,215,411`, `Members.tsx:46`, `SettingsProfile.tsx:132`,
`Sessions.tsx:160`.

Priorité de correction : `Finance.tsx` d'abord, puis `TransactionNew.tsx`,
`Versement.tsx` et `GivingCampaign.tsx` (écritures financières : un échec
silencieux fait croire à un enregistrement réussi).

Correctif recommandé et homogène : remplacer `.catch(() => {})` par
`.catch((e) => { logger.error('<contexte>', e); setError(<message>); })` et
afficher un état d'erreur explicite dans l'UI.


- **Gravité** : moyenne. **Statut : non corrigé.**
- `resource.list(...).catch(() => setLoading(false))` masque toute erreur
  (SQL, réseau, RLS) : l'utilisateur voit une liste vide au lieu d'un message
  d'erreur, et aucune trace n'est journalisée. C'est ce qui a rendu R87
  invisible. Correctif recommandé : conserver l'erreur dans un état et afficher
  un message explicite + journaliser.

**Preuve renforcée (2026-10-24)** — comparaison avec `main` **intact** :

- Sur ma branche (correctif R87), suite complète = **29 specs, 16 échecs**.
- Sur `origin/main` (`c11aad7`) intact, dans un worktree isolé
  (`git worktree add --detach /tmp/lm2 origin/main`, `node_modules` lié,
  `.env.local` copié, serveur Vite sur `:8082`), les **mêmes specs clés**
  échouent avec **le même message** :
  `Timed out … after login: /auth (attendu /onboarding ou /dashboard — le POST
  login nav n'a pas complété en 90 s : vérifier le 503 Render / la rate limit
  GoTrue / le timeout du form)`.
- Les échecs sont donc **environnementaux** (Supabase GoTrue partagé, limité en
  débit, et/ou 503 Render), **pas** causés par le correctif R87.
- Indice corroborant : aucun échec ne mentionne `/finance` ni le nom de table ;
  les assertions qui échouent portent sur l'authentification (« 0 page
  visible ») et sur la synchronisation PowerSync (« 0 à atteindre 50 »), deux
  dépendances réseau.
- Conséquence pour le propriétaire : rejouer la suite avec des identifiants de
  test **dédiés** (ou un Supabase local) pour obtenir un verdict vert. Voir
  RUNBOOK.md.

---

### R89 — CRITIQUE — La synchronisation Lumina est rompue dans les DEUX SENS (prouvé par log)

**Statut** : **CORRIGÉ dans ses trois sous-points**. **89.a CORRIGÉ**
(2026-10-26, PR Phase 9 — identifiants de catégories canoniques : seed serveur
idempotent + source unique + garde anti-dérive ; preuve `INSERT tx (cat-dime)`
→ FK résolue) ; **89.b CORRIGÉ** (2026-10-27 — dénormalisation `org_id` sur les
4 tables enfants + streams à clé directe + redéploiement PowerSync ; preuve de
bout en bout : profil fort volume `org-e2e` → `connected:true`, `hasSynced:true`,
`events: 6709`) ; **89.c CORRIGÉ** (le faux succès ne ment plus, avec test dans
les deux sens). **Impact (historique) : les données financières ne quittaient
jamais l'appareil** — c'était le défaut le plus grave connu de Lumina.

**Preuve mesurée** (spec de diagnostic temporaire, `window.__psFlushCrudUpload`,
chromium headless, serveur `hhgovvrnalibhgpakswi`) :

```
INFO  [PS-FLUSH] start … dbStatus={"connected":false,"hasSynced":false,"uploading":false}
ERROR [PowerSync]: Could not POST streaming to /sync/stream - 500 -
      {"error":{"code":"PSYNC_S2305","description":"Too many parameter query results (limit of 1000)"}}
WARN  [PowerSync] uploadData FAILED transactions op=PUT org_id=org-e2e code=23503
      msg=Could not update Supabase: insert or update on table "transactions"
          violates foreign key constraint "transactions_category_id_fkey"
WARN  [PowerSync] pushCrudTransaction FATAL-SKIP … code=23503 missingCols=[]
INFO  [PowerSync] uploadData OK transactions op=PUT org_id=org-e2e   ← SUCCÈS MENSONGER
INFO  [PS-FLUSH] done: passes=1 opsTotal=1 fatalSkipped=0            ← compteur faux
```

Constat serveur, après le flush qui se déclare « OK » :
`select count(*) from transactions` → **0**.

#### 89.a — Montée (upload) : violation de clé étrangère `category_id` — ✅ CORRIGÉ le 2026-10-26

**Correctif livré** (branche `agent/phase-09-sync-categories`) : source unique
`src/lib/canonicalCategories.ts`, seed serveur idempotent
`20261026000006_seed_canonical_categories.sql` (+ rollback garde-fou), pack
`churchSeedData()` aligné, call sites (`versement`/`cotisation`/`EventDetail`/
`EventBudgetAdapter`/`EventNew`) sans littéraux, garde anti-dérive
`canonical-categories-drift.test.ts` (4 tests). Preuve : `INSERT tx
(category_id='cat-dime')` → FK résolue (`fk_ok=1`). Détail :
`docs/agent/receipts/phase-09/2026-10-26-r89a-canonical-categories.md`.

**Défaut d'origine** :

- L'op PUT envoyée contient `category_id = "cat-dime"` (vérifié : op locale
  complète lue dans SQLite).
- Le serveur `hhgovvrnalibhgpakswi` ne contient que `cat-1 … cat-9`
  (`select id from categories`).
- Les deux référentiels de catégories sont **incompatibles** :
  - **client** : `src/packs/church/index.ts:53` sème `cat-dime`, `cat-offrande`,
    `cat-don`, … (ids littéraux) ;
  - **serveur** : `cat-1 … cat-9` (seed/migration, `cat-1` absent du dépôt).
- Conséquence : **toute** transaction est rejetée en `23503`. Vérifié par
  insertion SQL contrôlée : avec `category_id='cat-1'` l'insertion **réussit**
  (puis `rollback`) ; avec `'cat-dime'` elle échoue.
- `transactions.category_id` est **NOT NULL sans défaut** et absent de
  `NOT_NULL_DEFAULTS` (`src/lib/powersync/SupabaseConnector.ts:73-96`), donc
  aucun repli automatique n'existe.

#### 89.b — Descente (download) : `PSYNC_S2305` — ✅ CORRIGÉ le 2026-10-27

**Cause racine (mesurée)** — l'hypothèse initiale « `profiles` > 1000 lignes »
est **réfutée** (108 profils). La vraie cause : 4 streams filtraient par
**jointure** sur la table parente (`group_memberships`, `event_budgets`,
`budget_lines`, `custom_field_values`). PowerSync ne peut pas clé la partition
sur une colonne absente de la ligne synchronisée → **un bucket par ligne enfant**
(et une requête de paramètre par ligne) → plafond de 1000 franchi par le nombre
de lignes **enfant** (`org-e2e` = 6709 événements).

**Correctif** (migration `20261027000001_denormalize_org_id_sync_scope.sql` +
`sync-config.yaml` + schéma client) : `org_id` dénormalisé sur les 4 tables,
maintenu par triggers, et streams clés **directement** sur `org_id` (1 bucket
par organisation, comme les autres tables).

**Preuve de bout en bout** (token PowerSync réel, profil fort volume) :

```
AVANT : PSYNC_S2305 Too many parameter query results (limit of 1000) → 0 ligne
APRÈS : {"connected":true,"hasSynced":true} → events: 6709, members: 161
```

Détail : `docs/agent/receipts/phase-09/2026-10-27-r89b-denormalize-org-id.md`.

**Défaut d'origine** (conservé pour mémoire) : le service PowerSync évaluait la
sous-requête de jointure et la plafonnait à 1000 résultats ; le stream échouait
(`connected=false`, `hasSynced=false`) et **aucune donnée ne descendait** sur un
appareil neuf.

#### 89.c — Le succès est MENSONGER (défaut d'observabilité) — ✅ CORRIGÉ le 2026-10-24

- `src/lib/powersync/SupabaseConnector.ts:597` : à la fin de la boucle d'upload,
  `logOpOutcome(lastOp, true, …)` est appelé **inconditionnellement**, même
  quand la dernière op a été rejetée via `continue` (FATAL-SKIP). Le log
  affiche donc « uploadData OK » **juste après** un « FATAL-SKIP ».
- `window.__psFlushResult.fatalSkipped` (`src/lib/powersync/index.ts`) reste à
  **0** dans ce cas, car l'incrément n'a lieu que sur un `throw`, jamais sur le
  `continue` interne. Le seul indicateur disponible pour un test **ment**.
- Conséquence : la perte de données est **invisible** en production (pas de
  trace exploitable, pas d'alerte, pas d'état d'erreur UI). C'est ce qui a rendu
  R89 indétectable jusqu'ici.
- **Correctif minimal recommandé** : compter les ops réellement poussées
  (`pushed`) vs jetées (`skipped`) et n'appeler `logOpOutcome(…, true, …)` que si
  `pushed > 0 && skipped === 0` ; remonter ce compteur dans `__psFlushResult`.

#### 89.d — Défauts annexes constatés

- **Faux positif de test** : `cypress/e2e/cloud-sync.cy.ts` ne prouve **pas** la
  synchronisation — il insère via `cy.request` (non intercepté par PowerSync) et
  stubbe `window.__psFlushResult`. Une spec verte y est donc sans valeur.
- **Duplication de log** : chaque message est journalisé deux fois
  (`console.info` module + `win.console.info`), ce qui double le bruit.
- **`/transaction/:id` (D1)** : second symptôme du même ensemble — le détail
  d'une transaction locale n'est pas lisible (cf. D1).

#### Ordre de correction recommandé (propriétaire)

1. **89.c** (1 ligne, sans risque) : arrêter de journaliser un faux succès —
   rend le défaut visible.
2. **89.a** : aligner les identifiants de catégories client ↔ serveur. Option
   sûre : **côté client**, mapper les ids littéraux du pack vers les ids serveur
   (ou générer des UUID partagés) ; vérifier la coexistence des deux
   référentiels avant tout `INSERT`.
3. **89.b** : remplacer le filtre par sous-requête dans `sync-config.yaml`
   (ex. colonne dénormalisée `org_id` sur `profiles`, ou fonction
   `auth.parameters()`), puis `powersync deploy sync-config` — **action
   opérateur**, nécessite `PS_ADMIN_TOKEN`.
4. Ajouter une **alerte** sur l'échec d'upload et un **état d'erreur UI** (cf.
   R88) pour que la perte ne soit plus silencieuse.

#### Impact « 4 mois sans surveillance »

Sans ces correctifs, Lumina **accumule des données uniquement sur chaque
appareil**, sans sauvegarde serveur exploitable (cf. P31) et sans aucun signal
d'alerte. Une perte d'appareil = perte définitive des écritures financières.


---

### R90 — HAUTE — Le workflow « Android Debug Build » n'a JAMAIS réussi (préexistant)

**Preuve** : `gh run list --workflow=android-debug.yml --limit 20` →
**20 échecs sur 20 exécutions**, depuis le 2026-10-23T14:19, sur **toutes** les
branches (`agent/session-2026-10-22-stabilisation`, `…-phases-restantes`,
`…-3-livraison`, `…-6-livraison`, `…-6b-r85-r86`). Le taux d'échec est de
**100 %**, donc le défaut est **structurel**, pas introduit par un commit.

**Cause racine précise (session 9)** : `@capacitor/cli` est en **^8.5.2**
alors que `@capacitor/android` / `@capacitor/core` sont restés en **^6.2.2**.
`pnpm run sync:cap` (CLI 8) génère le module `capacitor-cordova-android-plugins`
au format attendu par AGP 8, sans `namespace` → `./gradlew assembleDebug` échoue
(« Could not create an instance of type …LibraryVariantBuilderImpl : Namespace
not specified », run `40078162326`). Correctif proposé : P35.

**Cause relevée dans le journal CI** :
```
> Configure project :capacitor-cordova-android-plugins
WARNING: Using flatDir should be avoided …
FAILURE: Build failed with an exception.
* What went wrong:
A problem occurred configuring project ':capacitor-storage'.
Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.
BUILD FAILED in 17s
```

**Impact** : aucun APK de debug n'est produit automatiquement. La distribution
Android dépend donc d'un build manuel (`lumina-android.yml`, lui, **réussit** sur
`main` — vérifié : 4 succès consécutifs les 23-24/10).

**Non corrigé** : hors périmètre (Gradle/Android, pas le code applicatif) et non
nécessaire à la stabilité web. **À traiter par le propriétaire** : mettre à jour
la configuration Gradle de `:capacitor-storage` / `capacitor-cordova-android-plugins`
(ou épingler une version de Gradle < 9).


## Session 7 (2026-10-24) — audit intégrité/isolation (phase 1)

### R91 — Fuite des secrets d'invitation => escalade de privilèges — CORRIGÉ
- **Gravité** : CRITIQUE.
- **Défaut** : `invitations_select` était `is_org_member(initplan_uid(), org_id)` :
  TOUT membre (y compris un simple MEMBRE ou une adhésion PENDING) lisait
  `code`, `target_role`, `grants_payload`, `tags_payload` de TOUTES les
  invitations de son organisation. `invitation_claims_insert` n'exigeait pas
  `resulting_user_id = auth.uid()`, et le trigger SECURITY DEFINER
  `settle_invitation_claim()` appliquait `inv.target_role` au profil
  `resulting_user_id`. Enchaînement : un MEMBRE s'octroyait une invitation à
  rôle élevé et se retrouvait promu.
- **Preuve** (instance dev, transaction annulée, aucun résidu vérifié) :
  - avant : `invitations_visibles=1  role_avant=MEMBRE  role_apres=ADMIN` ;
  - après correctif : `invitations_visibles=0  role_apres=MEMBRE  claim=42501 (refusé)`.
- **Correctif** : migration `20261024000002_fix_invitation_secret_leak.sql`
  (commits `177b59d`, test `85d353d`). `invitations_select` réservé à
  `can_manage_invitations` ; `invitation_claims_insert` interdit un claim au
  nom d'un profil déjà ACTIF (défense en profondeur). Rollback fourni
  (`supabase/migrations/rollback/20261024000002_rollback.sql`, réintroduit la
  faille — documenté).
- **Régression introduite par ce correctif — R91.b (CORRIGÉE)** : la politique
  `invitation_claims_insert` de `20261024000002` contenait
  `EXISTS (SELECT 1 FROM public.invitations ...)`. Ce sous-`SELECT` s'exécute
  **sous la RLS de l'appelant** ; depuis que `invitations_select` est restreint
  aux gestionnaires, un invité non gestionnaire ne « voit » pas la ligne →
  son claim était **refusé (42501)**. Le parcours « un invité réclame un code »
  était cassé. Correctif : migration
  `20261024000003_fix_claims_insert_regression.sql` (le contrôle est redondant
  avec la FK `invitation_claims_invitation_id_fkey`, hors RLS).
- **Défense en profondeur fiable — R91.c (AJOUTÉE)** : la RLS est **aveugle**
  (elle ne distingue pas « profil ACTIF » de « profil non visible »). La
  vérification est déplacée dans le trigger `settle_invitation_claim`
  (**SECURITY DEFINER**, seule lecture fiable) : migration
  `20261024000004_harden_settle_claim.sql` — refus d'élever un profil **déjà
  ACTIF** sauf si un gestionnaire d'invitations est l'auteur de l'invitation
  (`REJECTED_DUPLICATE` / `ROLE_ESCALATION_BLOCKED`).
- **Preuves R91.b/R91.c** (instance dev, transactions annulées, 0 résidu) :
  - invité non gestionnaire : `visibles=0`, claim self/other `REFUSE 42501`,
    claim sur profil PENDING = `ACCEPTE`, `pending_apres=ACTIVE` (flux complet
    rétabli) ;
  - appelant gestionnaire (la RLS laisse passer) : `INSERT ACCEPTE` puis
    `claim_status=REJECTED_DUPLICATE`, `reason=ROLE_ESCALATION_BLOCKED`,
    `role_avant=ADMIN role_apres=ADMIN` (**inchangé**).
- **Statut** : corrigé et vérifié. Test de non-régression
  `src/capabilities/__tests__/invitation-rls-hardening.test.ts` (**10/10** ;
  couvre R91, R91.b et R91.c, et échoue si l'on restaure une politique
  permissive ou le `EXISTS` régressif). Migrations réversibles (4 rollbacks).

### R92 — Stream PowerSync `invitations` trop large (divulgation) — CORRIGÉ
- **Gravité** : MOYENNE (atténuée par R91).
- **Défaut** : `powersync/sync-config.yaml`, stream `invitations`
  (`auto_subscribe: false`) filtre par
  `org_id IN (SELECT org_id FROM profiles WHERE id = auth.user_id())` et
  synchronise **toutes** les colonnes (`SELECT *`) de **toutes** les
  invitations de l'organisation sur l'appareil de **chaque** membre — alors
  que le commentaire du fichier annonce l'inverse (« un utilisateur ne lit que
  ces deux vues, pas tout ce que tout le monde a émis »). PowerSync applique
  ses propres règles et **contourne RLS**.
- **Impact** : un membre récupère hors-ligne les codes d'invitation et rôles
  cibles de son organisation (divulgation). L'**exploit** d'escalade reste
  fermé par R91 (le claim au nom d'un profil ACTIF est refusé en 42501 même
  via le stream), donc R92 est une divulgation, pas une escalade.
- **Correctif APPLIQUÉ (2026-10-26)** : `powersync/sync-config.yaml` — les
  streams `invitations` et `invitation_claims` sont désormais restreints aux
  **gestionnaires** d'invitations (`org_memberships.role` ACTIVE ∈
  {PASTEUR_PRINCIPAL, ANCIEN, TREASURIER}, ou `profiles.role` idem) — mêmes
  rôles que la RLS R91 et que `can_manage_invitations()`. Le propriétaire peut
  lire ses invitations ; le simple membre ne synchronise plus aucun code.
- **Preuve** : test anti-régression `sync-config-invitations.test.ts` (3 cas)
  qui lit le YAML et exige le filtre gestionnaire. Toute régression vers le
  filtre « org de l'appelant » échoue en CI.
- **Limite (E1)** : le redéploiement effectif du sync-config exige
  `PS_ADMIN_TOKEN` (absent) ; le correctif est **dans le dépôt** et prend effet
  au prochain `powersync deploy sync-config`. Tant que le flux hors-ligne
  n'est pas déployé, l'impact reste théorique (aucun client ne synchronise).
- **Statut** : corrigé (dépôt) ; déploiement conditionné à E1.

### R94 — Anti-pause Supabase : prémisse fausse dans `keep-alive.sql` — CORRIGÉ
- **Gravité** : HAUTE (pour un fonctionnement 4 mois sans intervention).
- **Défaut** : `supabase/keep-alive.sql` affirmait que le heartbeat `pg_cron`
  « immunise contre la pause auto ». La doc officielle Supabase (« Project
  Pausing ») indique que la pause Free dépend de l'activité **API**
  (« a few user requests to the database each day ») ; l'activité **interne**
  (pg_cron) n'est pas comptée. Le projet restait donc exposé à une pause à
  7 jours d'inactivité — chaque pause rendait l'app inutilisable sans
  intervention humaine.
- **Correctif** : `.github/workflows/keep-alive.yml` — ping
  `REST /rest/v1/keep_alive` + `Auth /auth/v1/health` toutes les 48 h. Le dépôt
  est **public**, donc les schedules GitHub ne sont pas désactivés (la limite
  des 60 jours ne concerne que les dépôts privés). Commentaire de
  `keep-alive.sql` corrigé.
- **Preuve** : run GitHub Actions `40078250833` → **success**, log `HTTP 200`.
- **Statut** : corrigé et vérifié de bout en bout.


### R96 — Le spec Cypress `org-reports.cy.ts` crée des organisations réelles sans les nettoyer — CORRIGÉ
- **Gravité** : MOYENNE (pollution de la base de production ; aucun impact
  utilisateur immédiat).
- **Défaut** : le spec crée, à chaque exécution, deux organisations **ACTIVE**
  réelles via la fonction serveur `create_org` (org A sous la Mère, org B sous
  A) et ne les supprime ni ne les archive jamais. Aucun `after()`/`afterEach()`.
  Sur 4 mois de CI quotidienne, la base accumule des centaines d'organisations
  orphelines (0 membre, 0 donnée métier, un `org_admins` + un `audit_entries`
  chacune). C'est aussi la cause de la chaîne de 4 niveaux corrigée en R82
  (le spec se rattachait à l'annexe du run précédent).
- **Preuve** : 3 annexes résiduelles constatées en base le 2026-10-24
  (`org-34ee1844…`, `org-329fbe9d…`, `org-13547450…`, créées à 00:02, 01:11,
  02:22 — une par run), chacune avec exactement 1 `org_admins` et 1
  `audit_entries` (`actor_role_at_time = service_role`) et **0** donnée métier
  (profils, members, transactions, invitations…). Elles ont été **archivées**
  (ARCHIVED ≠ DELETE, tracé via `archive_reason`) — voir JOURNAL session 9.
- **Correctif** : le spec enregistre désormais les ids créés
  (`createdOrgIds`) et les **archive** dans un hook `after()` via l'API REST
  avec le jeton réel (autorisé par `orgs_update_merged` : le compte e2e détient
  le grant `org_admins` accordé par `create_org`). Rien n'est supprimé.
- **Statut** : corrigé (code) ; la vérification E2E nécessite la CI Cypress
  (le binaire Cypress n'est pas installable dans l'environnement d'agent).
  Reste à confirmer par un run CI. Non destructif : au pire, un résidu
  reste ACTIVE (comportement antérieur).

### R97 — 2 advisors `rls_enabled_no_policy` (`keep_alive`, `_jsonb_backfill_20261024`) — FAUX POSITIFS (documentés)
- **Gravité** : BASSE.
- **Constat** : les deux tables ont RLS **activée sans aucune politique**. Un
  advisor Supabase les signale. En PostgreSQL, RLS activée sans politique =
  **refus total** (deny-all) : les privilèges `SELECT/INSERT/...` accordés à
  `anon`/`authenticated` sont **inopérants** (aucune ligne lisible/écrivable).
  Il n'y a donc **aucune fuite** ; l'advisor signale une intention implicite,
  pas une faille.
- **Preuve** : `keep_alive` = 1 ligne, `_jsonb_backfill_20261024` = 213 lignes,
  0 politique chacune ; `information_schema.role_table_grants` montre des
  privilèges accordés mais la RLS les neutralise (le ping
  `GET /rest/v1/keep_alive` renvoie **HTTP 200 avec un corps vide** — cf.
  workflow `keep-alive.yml`, run `40078250833`).
- **Décision** : **ne pas** créer de politique (ce serait élargir l'accès à des
  tables internes) et **ne pas** désactiver la RLS. Les deux tables sont
  conservées : `keep_alive` est la cible du ping anti-pause ;
  `_jsonb_backfill_20261024` est la sauvegarde du backfill jsonb (R65).
  Désactiver l'advisor exigerait de supprimer une table utile → refusé
  (comportement conservateur).
- **Statut** : documenté, aucune action. Réévaluer si `keep_alive` ou le
  backfill sont un jour supprimés (l'advisor disparaît alors).

### R98 — La suite Cypress n'a JAMAIS été verte sur `main` (20 runs consécutifs) — CAUSE : environnement E2E (sync PowerSync indisponible) ; hypothèse « parallélisation » RÉFUTÉE par mesure — NON CORRIGÉ (documenté)
- **Gravité** : HAUTE (l'alerte CI est structurellement inutilisable ; un vrai
  échec introduit par une session future ne serait pas distinguable du bruit).
- **Constat** : sur `main`, les 20 derniers runs Cypress (du 2026-10-19 au
  2026-10-24) sont **tous en échec**. Aucun run vert trouvé sur cette période.
  Un run représentatif (`40078474144`, sha `2fae0d2`) : **10 specs en échec**
  (13 tests) / 13 specs vertes. Échecs mesurés : `performance-batch`
  (`expected 0 to be at least 20`, `... at least 50`), `sessions`
  (`button[aria-label^="Re-ouvrir"]` introuvable ×3), `members`
  (`Jean E2e84248` / `Jean` introuvable), `groups-events`
  (`Jeunesse 889096` + aucun titre visible), `events-tasks` et `cross-tenant`
  (`au moins une page visible: expected 0 to be above 0`),
  `org-reports` (`Org E2E 327858` introuvable dans le select),
  `forms-v2` (`E2e Forms v2` introuvable), `persistence`
  (`Event Persist F5` introuvable), `comprehensive-flow` (timeout 30 s).
- **Cause (corrigée après mesure)** : ce n'est **pas** la parallélisation
  (hypothèse réfutée — voir « RÉFUTATION » ci-dessous). La cause est
  l'**environnement E2E** : les specs qui échouent dépendent de la
  **synchronisation PowerSync** et du **contexte d'organisation**, tous deux
  indisponibles/défaillants en CI. C'est **déjà diagnostiqué** :
  `R53` (réplique PowerSync vide → `sessions.cy.ts` sans compte),
  `R83` (`performance-batch` : intercept qui ne laisse pas passer la requête,
  pas de `req.continue()`, contexte d'org non posé → 0 ligne côté serveur),
  `R72` (specs dépendant d'un global exposé seulement en mode dev),
  `R54` (le job E2E de `ci.yml` ne teste rien de réel : `simple-check` +
  `continue-on-error`). La signature commune (« une donnée créée n'apparaît
  pas », `expected 0 to be at least N`) désigne la **couche de données**, pas
  la CI.
- **Ce qui n'est PAS la cause** : ce n'est **pas** une régression introduite par
  les correctifs de sécurité R91/R91.b/R91.c. Preuve : `org-reports.cy.ts`
  échouait déjà sur `main` **avant** le correctif R96 (échec à la ligne 150,
  `Org E2E 327858`, sur le run `40078474144` du sha `2fae0d2`).
- **Correctif** : **non appliqué** (gel en vigueur ; le correctif est double :
  (a) rendre l'environnement E2E capable d'exercer PowerSync (compte de test +
  contexte d'organisation + sync abouti), et (b) réparer les specs selon
  R53/R83/R72. Voir P41). **La branche `agent/session-13-ci-cypress-test`
  (1 conteneur) ne corrige RIEN** : ne pas la fusionner (preuve négative
  conservée comme trace).
- **Statut** : documenté, non corrigé. **Impact pour les 4 mois** : l'alerte CI
  Cypress restera rouge en permanence ; elle ne détectera pas les régressions.
  Le propriétaire doit traiter ce point avant de se fier à la CI. Le vrai
  enjeu est le **chemin d'écriture hors-ligne (SQLite → queue → Supabase)**,
  qui n'a **aucune** couverture de test (cf. R83).

#### R98 — RÉFUTATION de l'hypothèse « parallélisation » (expérience du 2026-10-24)

- **Expérience** : branche `agent/session-13-ci-cypress-test` = **1 seul
  conteneur** (`containers: [1]`, `parallel: false`), run `40080015253`.
- **Résultat** : le run échoue dans **exactement les mêmes 10 specs**, avec les
  **mêmes assertions** que le run 2-conteneurs (`40078474144`) :
  `comprehensive-flow`, `cross-tenant`, `events-tasks`, `forms-v2`,
  `groups-events`, `members`, `org-reports`, `performance-batch`,
  `persistence`, `sessions`. **Aucune amélioration.**
- **Conclusion** : la parallélisation **n'est PAS la cause**. L'hypothèse est
  réfutée par la mesure. Le fait que les échecs soient **identiques et
  déterministes** (mêmes specs, mêmes assertions, en mono-conteneur) écarte
  l'interférence.
- **Signature réelle** : les échecs partagent un motif unique — **une donnée
  créée n'apparaît pas** :
  - `members` : « Jean E2e… » introuvable (membre créé non visible) ;
  - `org-reports` : « Org E2E … » introuvable dans le select (org non visible) ;
  - `persistence` : « Event Persist F5 » introuvable ; `forms-v2` :
    « E2e Forms v2 » introuvable ; `groups-events` : « Jeunesse … » introuvable
    et aucun titre de page ;
  - `performance-batch` : `expected 0 to be at least 20/50` — **0 ligne
    atteint le serveur** après un cycle de synchronisation hors-ligne ;
  - `sessions` : bouton « Re-ouvrir » introuvable (compte non listé) ;
  - `cross-tenant`/`events-tasks` : « au moins une page visible: expected 0 ».
  Ce motif (écriture → relecture qui ne voit rien, et **0 ligne côté serveur**
  pour `performance-batch`) désigne la **couche de données / la synchronisation
  PowerSync**, pas la CI. À rapprocher de **R89** (config de synchronisation
  PowerSync non déployée en Cloud : `PS_ADMIN_TOKEN` indisponible dans
  l'environnement d'agent → le fichier `sync-config.yaml` est corrigé mais
  **non déployé**). Si les streams ne sont pas ceux attendus, ou si le contexte
  d'organisation du compte e2e n'est pas résolu, les lignes écrites restent
  invisibles à la relecture — exactement la signature observée.
- **Correctif** : **non appliqué** — nécessite (a) le déploiement de la config
  PowerSync en Cloud (accès `PS_ADMIN_TOKEN`), et (b) une investigation de la
  résolution du contexte d'organisation du compte e2e. Hors du périmètre du gel
  et de l'environnement de l'agent. **Ne pas fusionner** la branche
  `agent/session-13-ci-cypress-test` (elle ne corrige rien — la preuve est
  négative, elle est conservée comme trace).
- **Statut** : hypothèse réfutée, cause réelle circonscrite (couche de données /
  sync), non corrigée. **Priorité : critique** (voir P41).

#### R96 — MESURE d'accumulation (2026-10-24) : d'autres specs fuient aussi
Inventaire mesuré en base (project `hhgovvrnalibhgpakswi`) :
- `organizations` nommées `Annexe A/B …` : **4** (3 archivées par la session 9,
  1 `PENDING` du 2026-10-23 laissée par un run antérieur — non touchée, cf.
  principe conservateur) ;
- `groups` nommés `Jeunesse …` : **84**, **tous** dans l'organisation de test
  dédiée `org-e2e` (« Lumina Org E2E », ACTIVE) — `last_seen` = 2026-10-24
  09:38, soit le run de la session ;
- `events` nommés `Event Persist …` : **54** ;
- `form_definitions` « … E2e Forms v2 » : 1 ;
- `transactions` (`Tx batch%` / `ChargeTx%`) : **0** (le chemin hors-ligne ne
  pousse rien, cf. R83) ;
- `organizations` total : 9 (dont 5 ACTIVE) — pas d'inflation côté
  organisations grâce au correctif R96 de cette session.

**Lecture** : les organisations orphelines sont **contenues** (R96 corrigé),
mais **`groups` et `events` s'accumulent dans l'organisation de test
`org-e2e`** (~84 groupes et ~54 événements en ~1,5 jour de CI). Ce n'est pas
une donnée utilisateur, mais sur 4 mois la table grossit et peut fausser les
specs qui comptent ou listent. C'est la justification mesurée de **P39**
(nettoyage systématique des données de test). **Non corrigé** (gel ; et
supprimer des `groups` peut cascader vers `group_members`/`events` sans
sauvegarde disponible).

### R99 — Sauvegarde : chaîne désormais VÉRIFIÉE, mais automatisation toujours INACTIVE (critique)
- **Gravité** : **critique** — c'est le risque n°1 pour 4 mois sans surveillance.
- **Ce qui a été fait (2026-10-24)** :
  1. Une **sauvegarde fraîche** a été produite : schéma 136 Ko
     (43 `CREATE TABLE`, 146 politiques RLS) + données 6,3 Mo (29 tables, dont
     `auth.users`), **sommes de contrôle SHA-256 vérifiées** (`sha256sum -c` OK).
  2. Sa **restauration a été testée de bout en bout** dans un conteneur
     Postgres jetable (image Supabase `postgres:17.6.1.166`) : 44 tables et
     146 politiques RLS recréées ; seules 7 erreurs, toutes sur les schémas
     `auth`/`storage` gérés par Supabase (aucune perte métier).
  3. La **fidélité a été contrôlée** : les 10 comptages source et restaurés
     sont **identiques** (profiles 108, organizations 9, org_memberships 5,
     org_admins 6, invitations 66, members 94, groups 222, events 3220,
     audit_entries 97, notifications 3320).
  4. Le **garde-fou du workflow public** a été vérifié : le run `40114231378`
     n'a publié **aucun artefact** (`total_count = 0`) car le secret est absent.
  Les fichiers vivent **hors du dépôt** (`/workspace/backups/`, ~10 Mo) — ils
  contiennent des données réelles, **ne pas les commiter** (dépôt public).
- **Ce qui reste (non résolu — hors de portée de la session)** :
  l'automatisation quotidienne (`backup.yml`) est **toujours inactive** : le
  secret `SUPABASE_DB_URL` n'existe pas (prouvé par l'avertissement du run), et
  le jeton de session ne permet pas de le créer (403). Côté Supabase,
  `pitr_enabled=false` et `backups=[]`.
- **Procédure complète et testée** : voir RUNBOOK.md §« Sauvegarde VÉRIFIÉE ».
- **Impact 4 mois** : sans activation, **aucune sauvegarde automatique** ne
  sera prise ; une corruption ou une erreur humaine serait irréversible. La
  sauvegarde manuelle produite aujourd'hui **périme** (elle est figée au
  2026-10-24) et vit dans un environnement de test voué à disparaître : le
  propriétaire **doit la récupérer** et activer le workflow.

### R100 — Code d'invitation généré par `Math.random()` (non cryptographique) — CORRIGÉ
- **Gravité** : MOYENNE (jeton porteur devinable).
- **Défaut** : `generateCode()` (`src/capabilities/invitation/index.ts`) tirait
  les 6 caractères du code d'invitation via `Math.random()`, un générateur
  **non cryptographique** à flux prévisible. Le code est un **jeton porteur**
  (QR/lien remis hors-bande) qui ouvre l'accès à une organisation (rôle +
  grants) : sa valeur ne doit pas être devinable.
- **Preuve** : en figeant `Math.random`, deux appels successifs produisent le
  **même** code (`LUM-PPPPPP`) — le code est entièrement déterminé par le flux
  `Math.random`. Test `invitation-code-entropy.test.ts` (rouge avant correctif).
- **Correctif** : tirage via `crypto.getRandomValues` (CSPRNG WebCrypto), avec
  repli `Math.random()` **uniquement** si WebCrypto est absent (l'entropie
  reste alors non déterministe). Format `LUM-XXXXXX` et alphabet sans ambiguïté
  conservés.
- **Statut** : corrigé et vérifié (test rouge → vert, 3 cas).

### R101 — `notify_transaction_change()` malformée : le flux finance est cassé en base — CORRIGÉ
- **Gravité** : CRITIQUE.
- **Défaut** : la fonction trigger `notify_transaction_change()` (créée par la
  migration `0012`, toujours active) insère dans `notifications` en listant
  **6 colonnes** (`org_id, action_type, title, message, source_transaction_id,
  created_at`) mais ne fournit que **5 valeurs** : le `message` manque, donc
  `NEW.id`/`NEW.created_at` glissent dans `message`/`source_transaction_id`.
  Toute écriture d'une transaction au statut PENDING/APPROVED/REJECTED échoue
  en `42601: INSERT has more target columns than expressions`.
- **Preuve** (instance dev, transactions annulées) :
  - `INSERT ... status='PENDING'` → **42601** ;
  - `UPDATE DRAFT→APPROVED` → **42601** ;
  - `INSERT ... status='DRAFT'` → OK (la garde `IF NEW.status IN (...)` est
    fausse), ce qui masquait le défaut.
  - Après correctif : INSERT PENDING / UPDATE APPROVED / DELETE OK, chacune
    produisant la notification attendue ; 0 résidu.
- **Impact** : aucune transaction ne peut être soumise ni approuvée — ni via
  l'UI, ni via PowerSync, ni via l'API. La fonctionnalité finance (et les
  rapports qui en dépendent) est **inopérante**. Défaut latent : la table
  `transactions` était vide sur l'instance dev.
- **Correctif** : `20261026000003_fix_notify_transaction_change.sql` — fournit
  le `message` manquant (construit par cas), et rend le trigger compatible
  DELETE (l'ancien code utilisait NEW sur DELETE → NULL ; désormais OLD).
- **Statut** : corrigé, appliqué à la base dev, vérifié de bout en bout.

### R102 — Suppression dure d'une transaction APPROVED possible en base — CORRIGÉ
- **Gravité** : HAUTE (intégrité financière).
- **Défaut** : la policy RLS `transactions_delete` est `is_org_member(uid,
  org_id)` : **tout** membre (rôle MEMBRE inclus) peut supprimer n'importe
  quelle transaction, APPROVED comprise. Le garde-fou « APPROVED = immuable »
  n'existait que **côté client** (`deleteTransactionPS`), or PowerSync écrit en
  service role (RLS contournée) et l'API REST n'applique pas la logique TS.
- **Preuve** (instance dev, transaction annulée) : un profil `MEMBRE` a
  supprimé une transaction `APPROVED` (count restant = 0).
- **Correctif** : `20261026000004_guard_approved_transaction_delete.sql` —
  trigger `BEFORE DELETE` qui lève `TRANSACTION_APPROVED_IMMUTABLE` (P0001)
  pour une transaction APPROVED, quel que soit le rôle. DRAFT/PENDING/REJECTED
  restent supprimables (parité avec `deleteTransactionPS`). La contrepassation
  (`reversal_of_id`) reste le mécanisme sanctionné pour une pièce approuvée.
- **Statut** : corrigé, appliqué à la base dev, vérifié (DRAFT supprimable,
  APPROVED refusé en P0001).

### R103 — Escalade de privilèges via `settle_invitation_claim` en RPC — CORRIGÉ
- **Gravité** : CRITIQUE (élévation de privilèges).
- **Défaut** : `public.settle_invitation_claim(uuid)` est `SECURITY DEFINER` et
  était `EXECUTE`-able par `authenticated` via
  `POST /rest/v1/rpc/settle_invitation_claim`. La fonction agit sur
  `resulting_user_id` (un tiers) sans vérifier l'appelant : **n'importe quel
  utilisateur authentifié** pouvait forcer l'application d'une invitation et
  élever un tiers (profil ACTIVE + rôle/org réécrits + `org_memberships` +
  `grants` insérés).
- **Preuve** (instance dev, transaction annulée) : un appelant (trésorier) a
  fait passer un profil `PENDING`/`MEMBRE` à **`ADMIN`/`ACTIVE`**
  (`claim_status = CONFIRMED`), sans lien avec l'invitation.
- **Correctif** : `20261026000005_revoke_rpc_on_trigger_functions.sql` —
  1. garde `pg_trigger_depth() = 0` (refus de tout appel direct) ;
  2. `REVOKE EXECUTE` sur `settle_invitation_claim` et toutes les fonctions de
     trigger (`RETURNS trigger`) pour PUBLIC/anon/authenticated ;
  3. wrappers de trigger re-basculés en `SECURITY DEFINER` (nécessaire pour
     invoquer la fonction après le revoke).
- **Vérifié** : appel RPC direct → `42501 permission denied` ; flux légitime
  (claim inséré par un gestionnaire) → `CONFIRMED` + profil `ACTIVE`/`MEMBRE`.
  Advisors : `anon_security_definer_function_executable` 1→0,
  `authenticated_…` 9→7.
- **Statut** : corrigé, appliqué à la base dev, vérifié.

### R104 — Protection des mots de passe compromis désactivée — ESCALADE (plan)
- **Gravité** : MOYENNE.
- **Défaut** : `auth_leaked_password_protection` (advisor WARN) — Supabase Auth
  ne vérifie pas les mots de passe contre HaveIBeenPwned.
- **Blocage** : l'activation via l'API Management renvoie
  « available on Pro Plans and up » (HTTP, vérifié). Non activable sur ce plan.
- **Action propriétaire** : activer le plan Pro puis
  Auth → Password settings → « Leaked password protection », ou accepter le
  risque documenté.
- **Statut** : ouvert, escalade (non bloquant pour le code).

### R105 — Garde de route RBAC déclarée mais INERTE + permissions `invitation:*` orphelines — CORRIGÉ (partiel)
- **Gravité** : MOYENNE (défense en profondeur absente ; pas d'escalade directe car les pages et la RLS filtrent déjà).
- **Défaut (2 volets)** :
  1. `resolveRoute()` implémente bien une garde de permission par route
     (`route.permission` → `forbidden`) et un contrôle d'appartenance
     (`isOrgMember === false` → `needs-membership`), mais `App.tsx` l'appelle
     avec **seulement** `{ isAuthenticated }`. Le commentaire « wired by later
     phases (3/4) » est obsolète : les phases 3/4 sont livrées. Les branches
     `forbidden` / `needs-membership` sont donc **du code mort**.
  2. `ROUTE_REGISTRY` déclare `admin:settings` (/admin*), `invitation:create`
     (/invitation/emit) et `invitation:manage` (/invitation/manage). Or
     `PERMISSION_MATRIX` ne donnait `invitation:create/manage/revoke` à
     **AUCUN** rôle canon, et la table DB `role_permissions` (générée de la
     matrice) n'en contenait **aucune ligne** — alors que la fonction SQL
     `can_manage_invitations` (déjà en prod) accorde la gestion des invitations
     à PASTEUR_PRINCIPAL / ANCIEN / TREASURIER. Divergence DB↔TS (famille R16).
- **Preuve** : `select role, permission from role_permissions where permission
  like 'invitation%'` → **0 ligne** (avant) ; `getRolesWithPermission(
  "invitation:manage")` → `[]` ; le test anti-dérive (ci-dessous) échouait.
- **Correctif (partiel, non régressif)** :
  1. `PERMISSION_MATRIX` : `invitation:create/manage/revoke` ajoutés à
     PASTEUR_PRINCIPAL, ANCIEN, TREASURIER (miroir exact de
     `can_manage_invitations`).
  2. Migration `20261026000002_rbac_has_permission.sql` : mêmes lignes ajoutées
     à l'INSERT `role_permissions` (le test TS↔SQL existant l'exige).
  3. Base dev : migration `rbac_invitation_permissions_mirror` appliquée et
     vérifiée (3 rôles × 3 permissions).
  4. Test anti-dérive : **toute** permission déclarée par `ROUTE_REGISTRY` doit
     être détenue par ≥1 rôle canon (échouerait si une permission orpheline
     réapparaissait).
- **Reste à faire (volontairement NON fait)** : câbler réellement
  `state.hasPermission` / `state.isOrgMember` dans `App.tsx`. C'est
  **bloquant tant que le rôle `ADMIN` (central) et `CENTRAL_ADMIN` ne sont pas
  réconciliés** avec la matrice canon (cf. R16, PR18) : câbler la garde
  aujourd'hui **enfermerait dehors** les admins d'organisation (`/admin` →
  `forbidden`), car `admin:settings` n'est détenu que par PASTEUR_PRINCIPAL.
  Le câblage doit être fait **après** la réconciliation des rôles admin, et
  accompagné d'un test E2E par rôle.
- **Statut** : vocabulaire réconcilié (corrigé + verrouillé) ; câblage de la
  garde = dépendance de PR18 (ouvert).

### R106 — Écran « mise à jour requise » (PR6) déclaré mais INERTE (aucune source de version de schéma) — OUVERT
- **Gravité** : FAIBLE (aucun écran noir ; mais le garde-fou de compatibilité APK est absent).
- **Défaut** : `resolveRoute()` sait produire `update-required` (contrôle
  `clientSchemaVersion < minSchemaVersion`) et `App.tsx` rend bien
  `UpdateRequiredScreen`. Mais **aucune** source ne fournit jamais ces deux
  valeurs : ni `SCHEMA_VERSION` côté client, ni `min_schema_version` côté
  serveur/config. La branche est donc **du code mort** (même classe que R105).
- **Impact** : un APK ancien dont le schéma PowerSync est incompatible ne reçoit
  aucun message « mettez à jour » ; il peut se synchroniser de travers ou rester
  muet. Risque de compatibilité, pas de sécurité.
- **Preuve** : `grep -rn "minSchemaVersion\|clientSchemaVersion" src/ supabase/`
  → seules les définitions dans `routeResolver.ts` et le test unitaire ; aucun
  producteur.
- **Correctif possible (proposé, non fait)** : exposer une constante de schéma
  (ex. `src/lib/schemaVersion.ts`) + une valeur minimale servie par la config
  (`AppConfig`/edge-fn), puis alimenter `RouteState` dans `App.tsx`. Nécessite une
  décision produit (où vit `minSchemaVersion` : config distante ou constante
  embarquée) — donc **proposition**, pas correctif autonome.
- **Statut** : ouvert, documenté (classe R105 : branche de garde non alimentée).

### R107 — `NeedsMembershipScreen` (état `needs-membership`) déclaré mais INERTE — OUVERT
- **Gravité** : FAIBLE.
- **Défaut** : `resolveRoute()` produit `needs-membership` quand
  `isOrgMember === false`, et `App.tsx` rend `NeedsMembershipScreen`. Mais
  `App.tsx` n'appelle jamais `resolveRoute` avec `isOrgMember` → la branche est
  inerte (même cause racine que R105 : `RouteState` n'est pas alimenté au-delà de
  `isAuthenticated`).
- **Impact** : un utilisateur authentifié mais non membre de l'org active voit la
  page (données vides / RLS) au lieu de l'écran « organisation non rejointe » qui
  l'orienterait vers une invitation.
- **Statut** : ouvert ; sera corrigé en même temps que le câblage R105 (dépend
  PR18/R16).

### R108 — Watchdog de démarrage (« app-ready ») DÉCLARÉ mais JAMAIS ARMÉ — CORRIGÉ
- **Gravité** : MOYENNE (robustesse « zéro écran noir »).
- **Défaut** : `AppReadyBridge` (src/App.tsx) était présenté comme un watchdog :
  « if the shell never becomes ready within BOOT_WATCHDOG_MS, an explicit
  recovery screen replaces the silent blank view ». En réalité, l'effet posait
  `readyRef.current = true` **avant** d'armer le minuteur, et la condition
  d'échec était `if (!readyRef.current)` → **toujours fausse** : `bootTimedOut`
  ne passait jamais à `true`, `BootRecoveryScreen` était **inatteignable**
  (branche morte). Pire, un watchdog placé DANS l'arbre React ne peut, par
  construction, jamais détecter « React n'a jamais monté ».
- **Impact** : si la coquille ne montait pas (chunk manquant pendant
  l'hydratation, échec de montage, blocage de boot), l'utilisateur restait sur
  un écran noir **silencieux** — exactement le scénario que le watchdog devait
  couvrir. La classe de défaut est la même que R105/R106/R107 (filet déclaré,
  jamais déclenché).
- **Correctif** : watchdog extrait dans `src/lib/bootWatchdog.ts`, **armé avant
  `createRoot`** (donc indépendant du montage React) ; à l'expiration il rend une
  **surcouche HTML statique** (`renderBootRecoveryOverlay`, `data-screen-state="error"`,
  bouton de rechargement) qui fonctionne même si React n'a jamais monté.
  `signalAppReady()` (appelé par `AppReadyBridge` au montage) annule le minuteur.
- **Preuve** : `V: boot-watchdog.test.ts` (4, jsdom) — surcouche affichée si la
  coquille ne signale pas sa disponibilité ; rien si elle le fait à temps ;
  rechargement au clic. Gates : `tsc -b` 0, vitest 1242/1242, `vite build` OK.
- **Statut** : corrigé.

### R109 — Rôle `ADMIN` présent dans les DONNÉES et les politiques RLS mais absent du modèle TS → compte admin central SANS DROITS — OUVERT (à trancher)
- **Gravité** : MOYENNE-HAUTE (modèle de rôles ; bloquait le câblage de la garde de route R105/R107).
- **Mesure (2026-10-26, instance DEV)** : `profiles.role='ADMIN'` (1 ligne) et
  `org_memberships.role='ADMIN'` (1 ligne), mais **0** ligne
  `role_permissions.role='ADMIN'` et `ADMIN` **absent** de `Role` (TS) et de
  `PERMISSION_MATRIX`. Preuve d'effet :
  `public.has_permission(<admin>, 'org-1', 'admin', 'settings') = false` et
  `'transaction','read' = false` ; `is_org_admin(<admin>,'org-1') = false`.
- **Conséquence** : le compte admin central n'obtient AUCUN droit via
  `has_permission` ; aucune route à `permission` (ex. `/admin*`,
  `admin:settings`) ne peut l'autoriser — il est fonctionnellement **verrouillé**
  hors des politiques RLS qui testent `profiles.role='ADMIN'` **en dur**
  (`org_admins_insert_merged`, `org_admins_update_merged`, `orgs_update_merged`).
  `has_permission` (Phase 4) et ces politiques RLS divergent donc.
- **Fait notable** : les 14 rôles canon TS ↔ DB sont **parfaitement alignés**
  (vérifié : migration `20261026000002_rbac_has_permission.sql` ≡
  `role_permissions` en base, 149 lignes, identiques). Le seul écart est `ADMIN`.
- **Décision requise (propriétaire)** : (a) supprimer le rôle `ADMIN` et faire
  reposer l'admin central uniquement sur les grants `org_admins` (nettoyage du
  littéral dans les 3 politiques), ou (b) ajouter `ADMIN` au modèle canon
  (`Role` + `PERMISSION_MATRIX` + `role_permissions`) avec les droits
  d'administration centrale. Non tranché → conservateur (aucune donnée modifiée).
- **Garde fournie** : `docs/agent/role-model.json` (instantané mesuré) +
  `V: role-model-drift.test.ts` (4) verrouillent TS ↔ DB et échouent si un rôle
  est ajouté/retiré sans mise à jour explicite ; `ADMIN` doit rester hors canon
  et sans permissions tant que R109 n'est pas tranché.
- **Statut** : ouvert, documenté, gardé (à trancher — voir DECISIONS.md).

### R16 (mise à jour) — divergence `profiles.role` ↔ `org_memberships.role`
- **Mesure (2026-10-26)** : 108 profils, 5 memberships ; **0** divergence de rôle
  pour une même organisation (ni entre organisations). La divergence observée
  historiquement (MEMBRE vs PASTEUR_PRINCIPAL) n'est plus présente dans les
  données actuelles. Le risque de **modèle** (deux sources de vérité) reste
  entier ; voir R109 pour le seul écart structurel mesuré (`ADMIN`).

### R110 — HAUTE — `notify_budget_exceeded` référençait des colonnes inexistantes : toute création de ligne budgétaire échouait — ✅ CORRIGÉ le 2026-10-27

- **Défaut** : `public.notify_budget_exceeded()` (migration `0042`, revue en
  `20261022000003` pour le booléen `is_read` mais **pas** pour les colonnes)
  lisait `NEW.event_id`, colonne absente de `public.budget_lines` (dont la FK
  est `event_budget_id`, cf. `0031`). Elle agrégeait en outre sur
  `event_budget_id = NEW.id AND id <> NEW.id` (FK comparée à son propre id →
  agrégat toujours vide).
- **Preuve** (reproduit sur la base, transaction annulée) :
  `insert into public.budget_lines …` → `ERROR 42703: record "new" has no field
  "event_id"`. Le trigger est `AFTER INSERT` → la ligne est écrite puis la
  transaction **annulée** : l'utilisateur ne pouvait créer **aucune** ligne
  budgétaire.
- **Correctif** : migration `20261027000002_fix_notify_budget_exceeded_event_budget_id.sql`
  (résolution de l'événement via `event_budgets`, agrégat sur le bon budget).
  Preuve après : `insert into budget_lines … returning org_id` → **ACCEPTÉ**
  (`org-1`).
- **Détecté par** : les tests de trigger de la dénormalisation R89.b (le défaut
  était invisible jusqu'ici car aucune ligne budgétaire n'existait en base).
- **RÉVERSIBILITÉ** : `rollback/20261027000002_rollback.sql`.
