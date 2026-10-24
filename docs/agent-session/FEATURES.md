# Matrice des fonctionnalités — Lumina

> Session agent 2026-10-22. Statuts : complète / incomplète / cassée / non analysée.
> Validation : validée (tests verts) / partielle / non validée.
> Légende des preuves : `V` = vitest, `C` = Cypress, `SQL` = requête base, `M` = manuel.

## Correctifs transverses (session 2026-10-22)

| # | Défaut | Impact | Correctif | Preuve |
|---|---|---|---|---|
| T1 | `PowerSyncProvider` défini mais jamais monté (`src/main.tsx`) | **Toutes** les listes de l'app vides au 1er lancement (repli local vide) alors que la sync fonctionnait | Monté autour de `<App/>` | `members.cy.ts` 3/3 ; sonde `{n:5, ready:true}` |
| T2 | `usePowerSyncStatus` : `addListener`/`getStatus()` inexistants dans `@powersync/common@2.2.0` | `isPowerSyncReady()` toujours `false` → repli vide permanent, silencieux | `registerListener({statusChanged})` + `currentStatus` | sonde `ready:true` ; 3/3 |
| T3 | Client Supabase B (`SupabaseConnector`) : `persistSession`+`autoRefreshToken` sur le même storageKey que le client A | Double rotation du refresh token → « Already Used » → révocation → **déconnexion aléatoire** | Client B en mémoire seule | Trace token + 3/3 |
| T4 | `ensureAuth` ne survivait pas à `testIsolation` (Cypress 16) | Session perdue dès le 2e `it()` → échecs en cascade non déterministes | `cy.session()` | Trace token ABSENT en visite 2 ; 0/3→3/3 |
| T5 (R34) | `slot="input"` sur 61 contrôles dans `<IonItem>` : `ion-item` (Shadow DOM) n'expose que `start`/défaut/`end` | **61 champs jamais rendus** (rect 0×0) dans 20 fichiers : transaction, événement, groupe, budget, versement, invitation, champ personnalisé, rapport, fédération, unités d'org — **formulaires inutilisables silencieusement** | Suppression des 61 attributs (20 fichiers) | Sonde DOM avant/après : `checkVisibility` false→true, rect 0×0→316×44, `offsetParent` false→true (`86670ef`) |
| T6 (R35) | `TopHeader` collant (110 px) recouvre les champs (64 px réservés), sans `scroll-padding-top` | Champ amené en vue (focus/scroll/`cy.clear()`) → **derrière le header**, non saisissable | `ion-content::part(scroll){scroll-padding-top:7rem}` (`dff2cbe`) | Mesure : `headerBottom=111`, `inputTop=281`, `covered=false` ; `finance-deep` 2/5→**5/5** |
| T7 | `?date=` périmé dans l'URL en quittant la timeline (`Events.tsx`) | État/URL désynchronisés : rechargement → filtre fantôme | `setSearchParams({}, {replace:true})` (`af2d79d`) | `C: calendar.cy.ts` 0/1→**1/1** |
| T8 (R37) | `slot="label"` sur `IonLabel` dans `ion-item` (`InvitationEmit.tsx`) | Libellé « Rôle cible » **non rendu** | Retrait de l'attribut (`bdd1f5b`) | Sonde : `slot="label"` → hauteur **0** ; sans slot → **24** |
| T9 (R38) | `lumina-user` **jamais écrit au login** (seule la page Profil l'écrivait) ; `useCurrentUser()` lisait uniquement cette clé → repli factice `{id:"local-user", role:"TREASURIER"}` | `federation.canAccess("local-user", …)` **toujours faux** → gardes d'accès réels masquaient à tort FAB « Créer un groupe », export de rapports, onglets de transaction (tous rôles, tous users) | `authService.setState` persiste `lumina-user` ; `useCurrentUser()` lit le profil Supabase **live** puis le storage, et se re-rend sur auth (1 seul pont) (`60830d4`) | Sonde localStorage : `lumina-user` `null`→id réel `87afea21-…` ; `C` : FAB présent |
| T10 (R39) | Résultat **négatif** de `federation.canAccess` obtenu avant la 1re synchro PowerSync **mémorisé définitivement** (cache module-level, jamais invalidé) | Actions légitimes masquées jusqu'au rechargement suivant (`org_memberships`/`grants` locales encore vides) | Invalidation du cache à `hasSynced` + jeton de re-résolution par hook (`6f6065d`) | `C` : FAB absent à la 1re visite → **présent sans rechargement** ; `V` : `useCanAccessMulti` 46/46 |
| T11 (R40) | `orgContext._orgId` (variable de module) jamais résolu de façon synchrone/réactive : posé seulement au **montage** d'`AppContext`, sans notification | **Toutes** les listes filtrées par `org_id` vides (`__no_org__`) : « 0 événements » alors que 141 synchronisés ; après création d'un événement l'app revenait sur une liste vide → **création perçue comme perdue** | `subscribeOrganization` + `useOrganizationRevision` (13 hooks) ; résolution depuis le profil auth + réabonnement ; restauration synchrone `lumina-active-org` (`29e7cdb`) | « 143 événements » dès la 1re visite sans reload ; login neuf : 6,2 s |
| T12 (R41) | Hooks de lecture renvoyant `isLoading: false` en dur même avec `useQuery` → `[]` avant la 1re synchro | État **vide trompeur** (« Aucun événement ») au lieu du squelette de chargement | `isInitializingRead()` borné à 10 s, jamais si des données locales existent (`a41`-suite) | `V` 1049/1049 ; specs de listes |

## Phase 0 — état initial

| # | Fonctionnalité | Rôle utilisateur | Points d'entrée | Statut initial | Défauts constatés | Actions menées | Tests | Validation |
|---|---|---|---|---|---|---|---|---|
| 1 | **Auth e-mail/mot de passe** | Créer un compte, se connecter | `/auth`, `src/lib/auth.ts`, edge `signup`/`login` | complète | — | — | `C: auth-real.cy.ts` (5/5) | validée (C) |
| 2 | **Déconnexion douce / reconnexion sans identifiants** | Retrouver son compte | `/sessions`, `authService.signOut/restoreSoftSession` | complète | — | — | `C: sessions.cy.ts`, `V: Sessions.test.tsx` | validée (C+V) |
| 3 | **Onboarding (création d'organisation)** | Configurer son organisation à l'inscription | `/onboarding`, edge `create_org` | complète | — | — | `C: auth-real.cy.ts` | validée (C) |
| 4 | **Isolation des données entre organisations (RLS)** | — (sécurité) | 127 policies `public.*`, `is_org_member`, `initplan_uid` | **cassée** | **`is_org_member(uid, org_id)` : le paramètre `org_id` était masqué par la colonne → `p.org_id = p.org_id` → toujours TRUE. Tout utilisateur authentifié lisait les 108 profils et les 5 organisations.** | Corrigé (migration `20261022000001`, qualification `is_org_member.org_id`) ; `org_roles` idem | `SQL` avant/après + `C: cross-tenant.cy.ts` | validée (SQL, 108→1 profils) |
| 5 | **Isolation RLS `grants` / `tags` / `tag_assignments`** | — (sécurité) | policies `grants_read_org`, `tags_read_org`, `ta_read_org` | **cassée** | Policies `FOR SELECT USING (true)` → lecture de toutes les lignes par tout authentifié | Corrigé (migration `fix_grants_tags_rls_org_scoping`) | `SQL` | validée (SQL) |
| 6 | **Synchronisation PowerSync filtrée par organisation** | — (sécurité/fiabilité) | `powersync/sync-config.yaml` (31 streams) | **cassée** | Streams `categories`, `org_units`, `caisses` en `SELECT *` **sans filtre org** → chaque client synchronisait les données de toutes les organisations | Corrigé (filtre `org_id IN (SELECT org_id FROM profiles …)`) ; **déploiement Cloud en attente** | `SQL`, à revalider en C après déploiement | partielle (fichier corrigé, pas déployé) |
| 7 | **Création d'organisation** | Ouvrir une nouvelle organisation | `/admin`, `/onboarding`, edge `create_org` | complète | — | — | `C: comprehensive-flow` | non validée (C en échec à confirmer) |
| 8 | **Invitations (code / QR / lien)** | Inviter un membre | `/invitation/*`, `invitations`, `invitation_claims`, `settle_invitation_claim` | complète | — | — | `C: invitations.cy.ts` | à valider |
| 9 | **Gestion des rôles et appartenances** | Attribuer un rôle | `org_memberships`, `org_admins`, `role_assignments`, `/admin/*` | complète | `org_roles` masquage (corrigé) | Corrigé | `V`, `SQL` | partielle |
| 10 | **Fédération (organisations parentes/enfants)** | Piloter plusieurs organisations | `/admin/federation`, `org_family`, `org_reports` | complète | — | — | `C: org-reports.cy.ts` | à valider |
| 11 | **Finances — transactions (entrée/sortie)** | Saisir un mouvement | `/finance`, `/transaction/new`, `/transaction/:id`, `transactions` | **cassée** | Saisie impossible : champ montant recouvert par le `TopHeader` (R35) + champs non rendus (R34) | Corrigé R34 + R35 | `C: finance-deep.cy.ts` **5/5** | **validée (C)** |
| 12 | **Versements entre comptes** | Transférer entre caisses | `/versement`, `versements` | complète | — | — | `V: versement-cotisation.test.ts` | partielle |
| 13 | **Cultes / cotisations** | Collecter les cotisations d'un culte | `/cotisations`, `cotisations` | complète | — | — | `V: versement-cotisation`, `C` | partielle |
| 14 | **Rapports financiers et inter-organisations** | Produire et transmettre un rapport | `/reports`, `/balance`, `/budgets`, `org_reports`, `report_definitions` | complète | — | — | `C: org-reports.cy.ts`, `V: orgReport.test.ts` | partielle |
| 15 | **Formulaires dynamiques (builder + saisie)** | Créer un formulaire, le remplir | `/forms`, `/forms/fill/:id`, `/forms/:id/submissions` | **incomplète** | **`FormSubmissions.tsx` : `<EmptyState>` utilisé sans import → `ReferenceError` → page blanche à l'état vide** | Corrigé (import ajouté) | `V: FormSubmissions.test.tsx` | validée (V) |
| 16 | **Champs personnalisés** | Ajouter des champs métier | `custom_field_definitions/values` | complète | — | — | `V` | à valider |
| 17 | **Événements et tâches** | Planifier un culte, suivre ses tâches | `/events`, `/event/*`, `events`, `event_tasks` | complète | Spec périmée (`/^\/events\//` vs route `/event/:id`) ; formulaire rempli **avant** le montage React (valeur écrasée) ; sélecteurs globaux tombant sur des pages Ionic **cachées** ; `ion-checkbox` « Sous-tâche » ciblé via un `label` ambigu | Specs corrigées : attente d'hydratation, `typeIonicInput`, `activePage`/`activePageShouldContain` (helper `view.ts`, support regex), ciblage `ion-checkbox` ; **R44** corrigé côté code | `C: cross-tenant.cy.ts` **1/1** ; `C: events-tasks.cy.ts` **1/1** (CRUD complet + F5) — **3 passes consécutives vertes** | **validée (C, 3 passes)** |
| 18 | **Groupes et appartenances de groupe** | Organiser des groupes | `/groups`, `groups`, `group_memberships` | complète | R61 (aucun `<h1>` sur le detail) — **corrige session 4** | Correctif `<h1 class="sr-only">` (`5db7436`) ; spec scopee a la page active + `ion-back-button` (`93072b4`) | `C: groups-events.cy.ts` **3/3** (nominal + navigation detail/retour + `h1`) ; **3 passes consecutives** | **validee (C, 3 passes)** |
| 19 | **Membres (annuaire)** | Gérer les personnes | `/members`, `/membres-en-avance`, `members` | **cassée** | **Provider PowerSync jamais monté** (bug C) → `useQuery` renvoyait `data:[]` + « PowerSync not configured. » → repli `useLocalStore` vide → « 0 actifs / Aucun membre » alors que la base locale contenait 5 membres. **`usePowerSyncStatus` appelait `addListener`/`getStatus()`** (inexistants dans le SDK, bug D) → `_psReady` restait `false` → repli vide permanent. **`usePowerSyncStatus` bloquait aussi les autres listes** ; `ensureAuth` perdait la session entre `it()` (bug F) ; routes `/event/*` testées en `/events/*` (spec périmée). | Corrigé C (montage provider), D (`registerListener`+`currentStatus`), E (double refresh Supabase), F (`cy.session`) ; specs `/event/` corrigées | `C: members.cy.ts` **3/3** ; sonde `useMembers` `{n:5, ready:true}` | **validée (C, 3/3)** |
| 20 | **Dons et campagnes** | Suivre les dons | `/giving`, `giving_campaigns`, `giving_donors`, `pledges`, `tax_receipts` | complète | — | — | `V: budgets-giving.test.ts` | partielle |
| 21 | **Notifications** | Être averti d'un changement | `notifications`, triggers `notify_*`, `onesignal.ts` | complète | — | — | `V: notification.test.ts` | partielle |
| 22 | **Journal d'audit** | Tracer les changements | `/trace`, `audit_entries` | complète | — | — | `V` | à valider |
| 23 | **Navigation (barre basse + menu latéral)** | Se déplacer | `BottomNav.tsx`, `FeatureSidebar.tsx`, `features.ts` | complète | **R44** : `BottomNav` en `--z-overlay` (50) recouvrait les boutons des bottom-sheets (clic impossible au doigt) | Corrigé → `--z-nav` (40), conforme à la pile M15 d'`App.css` ; test de non-régression ajouté | `V: core-components.test.tsx` (**37/37**, dont le test z-index) ; `C: events-tasks.cy.ts` (clic des modales désormais atteint) | **validée (V)** |
| 24 | **Paramètres et personnalisation du profil** | Régler son compte | `/settings/profile`, `profiles` | complète | **Session 2** : le prénom/nom n'était écrit QUE dans `localStorage` (jamais en base) → nom perdu pour les autres appareils/rapports. L'écriture base passait par `authService.updateProfile` (jamais appelé). | Appel à `authService.updateProfile` + état d'erreur visible (`role=alert`) ; cache local écrit seulement après succès (`844a248`) | `V: SettingsProfile.test.tsx` (2 — succès, échec réseau) ; `SQL/REST` : `PATCH /profiles` → **HTTP 200** | **validée (V + base réelle)** |
| 24b | **Personnalisation de l'organisation** | Nom + logo de l'org | `/settings/personalisation`, `organizations` | incomplète | Le nom/logo n'était écrit QUE dans `localStorage` (`lumina-config`) — jamais dans `organizations` → les autres membres, les rapports et l'en-tête voyaient l'ancien nom | `renameOrganizationPS` (UPDATE base, RLS `orgs_update_merged`) appelé en premier ; refus de rôle non-admin explicite ; erreur visible (`22b40ea`) | `V: SettingsPersonalisation.test.tsx` (3 — succès, rôle refusé, erreur) ; RLS `orgs_update_merged` vérifiée en base | **validée (V)** ; *reste : logo d'org en base (pas de colonne `logo_url`)* |
| 25 | **Aide / tutoriel intégré** | Apprendre l'app | `/help`, `Tutorial.tsx` (1633 l., 20 sections) | complète | Le tutoriel ne mentionne pas le nouveau guide « premiers pas » du dashboard | Ajouté au flux (voir 24c) | `V: DashboardOnboarding.test.tsx` | partielle |
| 24c | **Onboarding dynamique du dashboard** (exception demandée) | Savoir quoi faire ensuite | `DashboardOnboarding.tsx`, `/dashboard` | **nouvelle** (implémentée) | Aucun guide dans le dashboard : un nouvel utilisateur voyait une page dense sans direction | Carte « Premiers pas » : progression déduite des données réelles (mouvements, membres, événements, invitations), étape suivante mise en avant + navigation, auto-masquage à l'achèvement, masquage explicite, aucune carte sans org résolue (`844a248`) | `V: DashboardOnboarding.test.tsx` (10 — logique pure + rendu) | **validée (V)** |
| 26 | **Export de données (CSV/Excel)** | Exporter | `src/lib/export.ts`, `downloadBlob` | complète | — | — | `V: formSystem-export.test.ts` | partielle |
| 27 | **Fichiers / documents (Storage)** | Joindre une preuve | buckets `logos`, `archives`, `preuves-depense`, `storageService.ts` | complète | — | — | — | non validée |
| 28 | **Mode hors ligne / reconnexion** | Travailler sans réseau | PowerSync, `/splash`, `cloud-sync.cy.ts` | complète | — | — | `C: cloud-sync.cy.ts` (1/1) | validée (C) |

## Tests unitaires — état initial (vitest)

- **1030 / 1048 passent**, **18 échecs** dans **9 fichiers**. Vitest **n'est pas exécuté en CI** → les 18 échecs sont invisibles pour le propriétaire.
- Fichiers en échec : `a11y.test.ts` (2), `policy-wiring.test.tsx` (6), `form-submissions-rejection.test.ts` (1), `use-calendar-data.test.ts` (1), `FormBuilder.edit.test.tsx` (2), `FormSubmissions-table.test.tsx` (1), `FormFill.currency.test.tsx` (3), `FormFill.submitBy.test.tsx` (1), `FormSubmissions.test.tsx` (1).

## Baseline Cypress (24 specs) — état initial

| Spec | Résultat initial |
|---|---|
| auth-real.cy.ts | 5/5 ✅ |
| cloud-sync.cy.ts | 1/1 ✅ |
| local-smoke.cy.ts | 3/3 ✅ |
| finance-deep.cy.ts | 2/5 ❌ |
| calendar.cy.ts | 0/1 ❌ |
| comprehensive-flow.cy.ts | 0/1 ❌ |
| cross-tenant.cy.ts | 0/1 ❌ |
| events-tasks.cy.ts | 0/1 ❌ |
| local-dashboard.cy.ts | 0/2 ❌ (spec obsolète) |
| (13 autres) | voir JOURNAL.md |

---

## Phase 1 — mises à jour (session 2026-10-22, ~19:30–20:30 UTC)

Défauts découverts **pendant** la session, non listés dans le tableau initial.
Tous ont été corrigés en base par migration versionnée, avec rollback, et
prouvés par un appel réel (REST/SQL) reproductible.

| # | Fonctionnalité | Défaut découvert | Preuve avant | Correctif | Preuve après | Migration |
|---|---|---|---|---|---|---|
| 29 | **Invitations — émission (QR/code)** | `generateCode()` appelé DEUX fois : le code affiché (QR + copier) n'était pas le code persisté → aucune invitation réclamable. De plus `createInvitationPS` générait un id différent de celui du service → id affiché ≠ id persisté (export fichier et claim visant une ligne inexistante) | Test unitaire ROUGE `invitation-code-consistency.test.ts` | `createInvitation` renvoie `{ id, code }` (code persisté) ; `createInvitationPS` réutilise l'id transmis | `V: invitation-code-consistency.test.ts` vert ; `npx vitest run` 60/60 fichiers | — (code) |
| 30 | **Invitations — limite d'usage (`max_uses`)** | Régression introduite par le durcissement `invitations` : `settle_invitation_claim` (SECURITY INVOKER) ne pouvait plus écrire `used_count` (policy filtrait sans erreur) → invitation réutilisable sans limite | Claim `max_uses=1` → `used_count=0` | Fonction repassée SECURITY DEFINER + EXECUTE retiré à PUBLIC/anon | Claim → `used_count=1` | `20261022000005` |
| 31 | **Profil — appartenance organisation** | `profiles.org_id` modifiable par UPDATE direct → rattachement à une organisation arbitraire (accès lecture via `is_org_member`) | `UPDATE profiles SET org_id='org-e2e'` accepté | Trigger `guard_profile_org_immutable` (BEFORE UPDATE) | `42501 ORG_ID_IMMUTABLE` | `20261022000005` |
| 32 | **Inscription / isolation des profils** | `handle_new_user` rattachait CHAQUE nouvel inscrit à `org-1` (organisation contenant de vraies adresses) → tout compte neuf lisait 59 profils | Compte neuf → `GET /profiles` = 59 | `handle_new_user` → `__no_org__` ; `upsert_profile` n'écrit plus `org_id` | 1 profil (le sien) | `20261022000006` |
| 33 | **Isolation — sentinelle « pas d'organisation »** | Après le correctif 32, la fuite se déplaçait sur `__no_org__` : `is_org_member` considérait tous les utilisateurs sans organisation comme membres d'une même organisation fictive | Compte neuf → 48 profils | `is_org_member` retourne `false` pour le sentinelle | 1 profil | `20261022000007` |
| 34 | **Fédération — visibilité des organisations** | La vue `org_family` n'avait pas `security_invoker` → contournait la RLS d'`organizations` : énumération de TOUTES les organisations, **même sans jeton** | `GET /org_family` sans jeton → 5 organisations | `security_invoker=true` + policy réécrite via `org_descendants(uid)` (SECURITY DEFINER, borné) | anon → 0 ; membre → 1 | `20261022000008` |
| 35 | **Surface d'API (fonctions RPC)** | `upsert_profile`, `is_org_member`, `current_org_id`, `org_descendants`, `can_manage_invitations` exécutables par `anon` ; `initplan_uid` à `search_path` mutable | Advisors Supabase (4 + 1 alertes) | EXECUTE retiré à anon/PUBLIC ; `search_path` figé | `POST /rpc/upsert_profile` sans jeton → 401 ; authentifié → 200 | `20261022000009` |

### Couverture de tests ajoutée / corrigée (Phase 1)

| Test | Type | Scénario | Résultat |
|---|---|---|---|
| `src/capabilities/__tests__/invitation-code-consistency.test.ts` | V | Le code et l'id renvoyés par `createInvitation` sont EXACTEMENT ceux persistés | vert |
| `cypress/e2e/rls-isolation-hardened.cy.ts` | C | Isolation RLS avec le **jeton réel** de l'utilisateur (les specs existantes `rls-leak`/`cross-tenant` utilisent la clé **anon** et ne testent donc pas l'utilisateur connecté) | à exécuter |

### Lacune de test identifiée (RISQUES R26)

`cypress/e2e/rls-leak.cy.ts` et `cross-tenant.cy.ts` envoient
`Authorization: Bearer <anonKey>` : ils valident le rôle `anon`, pas
l'utilisateur authentifié. Ils **ne peuvent pas** détecter une fuite
inter-utilisateurs (celle corrigée en 20261022000006/7). De plus `rls-leak`
échoue sur son assertion finale (« l'organisation courante est visible ») car
la clé anon ne voit aucune organisation. Le nouveau spec
`rls-isolation-hardened.cy.ts` lit le vrai jeton et comble ce trou.

---

## Phase 2 — mises à jour (session 2026-10-22, ~20:30–21:45 UTC)

| # | Fonctionnalité | Défaut découvert | Preuve avant | Correctif | Preuve après | Migration |
|---|---|---|---|---|---|---|
| 36 | **Rôles — immuabilité (UPDATE)** | Un membre pouvait s'auto-promouvoir `ADMIN` via `PATCH /profiles {role}` | `PATCH role=ADMIN` → 204 | Trigger `guard_profile_role_immutable` (BEFORE UPDATE) | `403 ROLE_IMMUTABLE` ; `PATCH first_name` → 204 | `20261022000011` |
| 37 | **Rôles — injection via RPC** | `upsert_profile` (SECURITY DEFINER) acceptait `p_role` et contournait le trigger UPDATE | `POST /rpc/upsert_profile {p_role:'ADMIN'}` → 200 | Rôle refusé hors `authenticated` non-admin ; `EXECUTE` retiré à anon | `403 ROLE_NOT_ALLOWED` ; sans `p_role` → 200 | `20261022000012` |
| 38 | **Rôles — contournement par DELETE+INSERT** | Le trigger ne couvrait que UPDATE : `DELETE` de sa ligne (204) puis `POST {role:'ADMIN'}` (201) recréait un profil admin | `POST role=ADMIN` → 201 | Trigger `guard_profile_role_insert` (seul `MEMBRE` accepté à l'INSERT) | `403 ROLE_NOT_ALLOWED` ; INSERT `MEMBRE` → 201 | `20261022000014` |
| 39 | **Fichiers — isolation du stockage** | Buckets privés (`archives`, `expense_proofs`) sans portée d'organisation : tout authentifié listait/écrivait les objets de toute organisation | Liste anon `archives` → 200 | Policies portées sur l'org du chemin (`org_id/…`) | anon `archives` → vide ; cross-org → vide ; org courante → 200 | `20261022000013` |
| 23 | **Navigation (barre basse + menu latéral)** | `aria-label="Navigation principale"` présent sur le `<nav>` **et** sur le `div[role=tablist]` interne → deux repères de navigation de même nom (WCAG) et sélecteur de test ambigu | — | `tablist` → `aria-label="Onglets de navigation"` | `V: a11y.test.ts` 28/28 verts | — (code) |

### Statut de la suite Cypress (après durcissement)

Aucune régression : les 24 specs donnent **exactement** le même résultat
qu'au baseline (comparaison `/tmp/cy-baseline-full.log` vs `/tmp/cy-post.log`).
Les échecs sont **préexistants** (défauts de test / infra), cf. RISQUES.md R30.
`local-dashboard.cy.ts` passe de 0/2 à 2/2 (spec obsolète réparé en Phase 0).

## Phase 4 — défaut transversal de saisie (corrigé)

| # | Fonctionnalité | Défaut | Preuve avant | Correctif | Preuve après |
|---|---|---|---|---|---|
| 40 | **Toute saisie de texte** (membres, transactions, formulaires, événements, budgets, dons…) | `onIonChange` sur `<IonInput>`/`<IonTextarea>` ne se déclenche qu'au **blur** : un bouton désactivé (validation par état React) ne se débloque jamais → **impasse**. Ex. bouton « Ajouter » de `/members` | `C tmp-diag` : `expected <button…> to be 'enabled'` (échec) | `onIonChange` → `onIonInput` (95 remplacements, 34 fichiers). `IonSelect`/`IonCheckbox` inchangés (pas d'`ionInput`) | `C tmp-diag` **1 passing** ; `tsc` OK ; `V` 1050/1050 |

## Phase 5 — défaut transversal majeur : champs de saisie jamais rendus (corrigé)

| # | Fonctionnalité | Défaut | Preuve avant | Correctif | Preuve après |
|---|---|---|---|---|---|
| 41 | **Tous les formulaires à `IonItem + IonInput/IonSelect/IonTextarea`** (transaction, transaction groupée, événement, groupe, budget, versement, fédération, invitation, champ personnalisé, rapport, unités d'org, document, tâches) | `slot="input"` posé sur le contrôle à l'intérieur d'un `<IonItem>`. `ion-item` (Ionic 9.0.2, **shadow DOM**) ne déclare que les slots `start` / `end` / défaut : l'enfant n'est **assigné à aucun slot → jamais rendu**. Le champ existe dans le DOM (`should('exist')` passe) mais rect **0×0**, `checkVisibility()=false`, `offsetParent=null` → invisible et non saisissable. | Sonde DOM `/event/new` : `checkVisibility=false`, rect `0×0`, `offsetParent=false` | Suppression des **61** attributs `slot="input"` (20 fichiers) — commit `86670ef` | Sonde DOM `/event/new` : `checkVisibility=true`, rect `316×44`, `offsetParent=true` ; `tsc` OK ; `C: finance-deep` passe de 4/5 à 5/5 |

## Session 3 (2026-10-23) — fonctionnalités complétées / défauts corrigés

| # | Fonctionnalité | Statut initial | Défaut | Correctif (commit) | Tests | Validation |
|---|---|---|---|---|---|---|
| 11b | **Édition d'une transaction** (`/transaction/:id/edit`) | **cassée** | **R60** — `useTransactions()` sautait un hook (retour anticipé du cache) → « change in the order of Hooks » → ErrorBoundary « Impossible d'afficher cette page ». Édition impossible. | Cache consulté après le hook ; `key` ajoutées aux `IonSelectOption` mappés (`71b1738`) | `C: finance-deep.cy.ts` 5/5 ; `C: comprehensive-flow.cy.ts` 1/1 | **validée (C)** |
| 1b | **Point d'entrée de l'app / PWA** (`/`) | **cassée** | **R58** — `<Navigate>` en **enfant** de `<Route path="/">` (ignoré par React Router) → `/` (le `start_url` du manifest) rendait un **écran blanc total**, sans aucun moyen de sortir (PWA sans barre d'adresse). | `element={<Navigate to="/splash" replace/>}` (`eca2052`) | `C: root-redirect.cy.ts` **2/2** (avec et sans session) | **validée (C)** |
| 24d | **Dashboard** (`/dashboard`) | **cassée** | **R57** — `RangeError: Invalid time value` : `formatDate` sur une date NULL → ErrorBoundary sur toute la page. | Helpers défensifs (`657491b`) | `V: utils-date.test.ts` ; `C: local-dashboard.cy.ts` 2/2 | **validée (V+C)** |
| 23b | **Navigation (barre basse)** | complète | Specs périmées : onglet par défaut = « Cultes », sélecteurs sur pages masquées. | Specs corrigées (scoping page active) | `C: nav-bottom.cy.ts` **3/3** | **validée (C)** |
| 41b | **États de chargement / squelettes** | incomplète | Spec `responsive-skeleton` : prémisse obsolète après R57 (plus de squelette infini). | Spec alignée | `C: responsive-skeleton.cy.ts` **4/4** | **validée (C)** |
| 2b | **Déconnexion douce / reconnexion** | complète | Specs : `testIsolation` Cypress 16 effaçait la session entre `it()`. | `cy.ensureAuth()` en tête de chaque `it()` | `C: sessions.cy.ts` **3/3** ; `C: rbac-gates.cy.ts` **2/2** | **validée (C)** |
| — | **Ouverture d'une entité depuis une liste** (groupe, événement, membre) | **corrigée** | **R59** — `React.lazy()` + fallback `<Suspense>` rendant un `<IonPage>` dans `ion-router-outlet` : l'outlet enregistrait le squelette comme « vue entrante » et la vraie page héritait de `ion-page-invisible` (`opacity: 0`). | `PageSkeleton` rend un `<div>` neutre (`src/ionic/routes/lazy-route.tsx`, `93072b4`) | `C: groups-events.cy.ts` **3/3** (assertion de non-régression : page entrante visible après un clic depuis la liste) | **validée (C, 3 passes)** |

### Suite Cypress complète — session 3

`npx cypress run --browser chromium` → **27 specs, 70 tests, 50 verts, 20 rouges
(7 specs en échec)**, durée 39 min.
Specs **vertes** (20) : auth-real 5/5, calendar 1/1, cloud-sync 1/1,
comprehensive-flow 1/1, cross-tenant 1/1, events-tasks 1/1, finance-deep 5/5,
invitations 1/1, local-dashboard 2/2, local-smoke 3/3, members 3/3,
nav-bottom 3/3, rbac-gates 2/2, responsive-skeleton 4/4,
rls-isolation-hardened 4/4, rls-leak 1/1, root-redirect 2/2, sessions 3/3,
simple-check 1/1, theme-modes 3/3.
Specs **rouges** (7) : `forms-fields` 2/4, `forms-v2` 0/6, `groups-events` 0/3,
`org-reports` 0/1, `performance-batch` 0/3, `persistence` 0/1,
`reports-budgets` 1/5.
Causes : **R59** (écran noir, 4 specs) et sélecteurs globaux portant sur des
pages Ionic **masquées** + prémisses de spec obsolètes (3 specs).


---

## Session 4 — mises à jour (2026-10-23, livraison)

| Réf | Fonctionnalité | Statut initial | Statut final | Preuve |
|---|---|---|---|---|
| R59 | Ouverture d'une entité depuis une liste | **cassée** (écran noir) | **corrigée** | `C: groups-events.cy.ts` 0/3 → **3/3**, 3 passes consécutives |
| R61 | Titre de niveau 1 sur `/groups/:id` | incomplète (a11y) | **corrigée** | `C: groups-events.cy.ts` **3/3** ; test négatif (correctif retiré) → 2/3 |
| R63 | Fixture E2E : rôle `profiles` ≠ `org_memberships` | **cassée** (donnée) | **corrigée** | spec 3/3 après alignement ; retour arrière documenté (RISQUES R63) |
| R64 | Sélecteurs de spec sur pages Ionic masquées | incomplète (test) | **corrigée** (1 spec) | `groups-events.cy.ts` scopé à la page active |
| R62 | Deux sources de vérité du rôle | — | **ouverte** | Proposition P36 (RISQUES R62) |

---

## Session 5 — mises à jour (2026-10-24, clôture des défauts critiques)

| Réf | Fonctionnalité | Statut initial | Statut final | Défaut / action | Preuve |
|---|---|---|---|---|---|
| R65 | **Formulaires dynamiques — ouverture** (`/forms/:id/submissions`, builder) | **cassée** | **corrigée** | `form_definitions.fields` était un jsonb de type *string* sur **34/34 lignes** (100 %) : `fields.map is not a function` → ErrorBoundary. Portée réelle du double encodage : **218 valeurs sur 6 colonnes**, pas seulement `budget_items`. | Migration `20261024000001` ; `SQL` après : 0 valeur `string` (34 arrays) ; `V: jsonb.test.ts` 18/18 |
| R65 | **Événements — détail / budgets** (`/event/:id`) | **cassée** | **corrigée** | `events.budget_items` : 158/305 valeurs `string`. Le parseur tolérait, la donnée restait sale (toute lecture SQL cassait). | `SQL` après : 305 arrays, 0 string ; rollback prouvé exact (158 restaurées, 147 saines intactes) |
| R65 | **Invitations — payload de droits** (`invitations`) | **cassée** | **corrigée** | `grants_payload` et `tags_payload` : 8/10 `string` chacun → droits d'invitation illisibles par toute lecture naïve. | `SQL` après : 10 arrays chacun |
| R65 | **Journal d'audit** (`/trace`, `audit_entries`) | **cassée** | **corrigée** | `before_state`/`after_state` : 5 `string` chacun → comparaison avant/après impossible en SQL. | `SQL` après : 15 objects, 5 `null` |
| R67 | **Envoi d'un rapport d'organisation** (`/reports`, `OrgReportSend`) | **cassée** | **corrigée** | Import de l'icône lucide `File` (inutilisée) masquait le constructeur global `File` → `new File(...)` levait « File is not a constructor » : **l'envoi échouait à tous les coups**. | `tsc -b` 0 erreur ; import supprimé (le chemin d'envoi s'exécute désormais) |
| R66 | **Indicateur de synchronisation** | **cassée** | **corrigée** | PowerSync v2 : `db.status` n'existe plus (`db.currentStatus`) → l'indicateur affichait « hors ligne » en permanence, y compris quand la sync fonctionnait. | `tsc -b` 0 erreur ; `src/lib/powersync/index.ts`, `usePowerSyncIndicator.ts`, `cloud-sync.cy.ts` |
| R68 | **Calendrier / timeline d'événements** | **cassée** | **corrigée** | `onButtonClick` n'existe pas sur `IonItem` (Ionic 9) : le clic sur un événement du calendrier ne faisait rien. | `onClick` ; `tsc -b` 0 erreur |
| R69 | **Membres / profil — autocomplétion** | incomplète | **corrigée** | Ionic 9 attend `autocomplete` (minuscule) ; `autoComplete` n'était pas transmis au DOM. | `tsc -b` 0 erreur ; `Members.tsx`, `SettingsProfile.tsx` |
| R70 | **Rejet d'une transaction — notification** | incomplète | **corrigée** | `targetRole: "ADMIN"` n'existe pas dans le type `Role` → notification sans destinataire, silence sur un événement métier. | `TREASURIER`, cohérent avec les 3 autres notifications du fichier ; `tsc -b` 0 erreur |
| R71 | **Détection des erreurs de type (CI)** | **cassée** | **corrigée** | `tsc --noEmit` à la racine ne vérifiait **aucun fichier** (`"files": []`) → succès systématique, 98 erreurs accumulées dont 5 bugs d'exécution. | `tsc -b --noEmit` en CI : 0 erreur ; `vite build` exit 0 |

### Chiffres de validation (session 5)

- `npx tsc -b --noEmit` → **0 erreur** (contre 99 avant : 98 dans l'app + 1 dans `vite.config.ts`).
- `npx vitest run` → **1091 tests / 65 fichiers, 100 % verts** (contre 1030/1048 et 18 échecs au baseline).
- `npx vite build` → exit **0**.
- Base : 0 valeur `jsonb_typeof = 'string'` sur les 10 colonnes jsonb.


### R65 — chaîne complète vérifiée (pourquoi le défaut ne reviendra pas)

Le défaut était **silencieux** : rien ne signalait l'écriture fautive. La
correction ne tient que si les **trois** maillons sont protégés. Vérifié
dans le code :

| Maillon | Emplacement | Mécanisme | Preuve |
|---|---|---|---|
| **1. Données existantes** | migration `20261024000001` | 218 valeurs re-parsées ; sauvegarde exacte ; rollback prouvé | SQL : 0 `jsonb_typeof='string'` |
| **2. Chemin d'écriture** | `src/lib/powersync/SupabaseConnector.ts:506` | `coerceJsonbColumns(op.table, op.opData)` appliqué à `opData`, **utilisé pour PUT *et* PATCH** | lecture du code + `V: jsonb.test.ts` |
| **3. Chemin de lecture** | `src/lib/dataLayer.ts` (1726, 1749, 1907, 1943, 2570, 2613) | `parseJsonbValue` tolère chaîne, double encodage et forme correcte | `V: jsonb.test.ts` 18/18 |

`JSONB_COLUMNS` couvre **10 colonnes** : `events.budget_items`,
`form_definitions.fields`, `form_submissions.data`,
`invitations.grants_payload` / `tags_payload`, `org_reports.content`,
`report_definitions.filters`, `custom_field_definitions.options`,
`audit_entries.before_state` / `after_state`.

> Point d'attention pour un futur intervenant : `coerceJsonbValue` ne
> re-décode **pas** un double encodage déjà présent dans l'outbox (une
> chaîne `"[]"` avec guillemets reste inchangée). C'est volontaire : un
> décodage récursif transformerait une valeur scalaire légitime en objet.
> Si un défaut de double encodage réapparaît, corriger **la source de
> l'écriture**, pas `coerceJsonbValue`.


### R65 — absence de régression due au changement de TYPE en base (vérifié)

La migration a changé le **type** des valeurs côté serveur (jsonb *string* →
jsonb *array*/*object*). PowerSync transmet la colonne sous forme de **texte
JSON** au client (`src/lib/powersync/schema.ts` : `column.text`), et ce texte
change de `"[]"` (chaîne encodée) à `[]` (tableau). Il fallait donc vérifier
que les lectures directes par `JSON.parse` ne cassent pas.

| Chemin | Emplacement | Lit | Verdict |
|---|---|---|---|
| Rapports — définitions | `src/lib/reporting.ts:631` (`JSON.parse(r.filters \|\| "[]")`) | colonne **locale** `report_definitions.filters` | **amélioré** : avant, `JSON.parse('"[]"')` rendait la *chaîne* `[]` ; après, rend le *tableau* `[]` |
| Détail de rapport | `src/pages/OrgReportDetail.tsx:139` (`JSON.parse(content)`) | colonne locale `org_reports.content` | **inchangé/amélioré** (protégé par `try/catch`) |
| Rapports reçus | `src/pages/OrgReportsReceived.tsx:117` | colonne locale `org_reports.content` | idem |
| Adaptateur budget | `src/adapters/EventBudgetAdapter.ts:23` (`JSON.parse(budget_items_json)`) | argument **chaîne** | **code mort** — voir ci-dessous |

**Preuve que `EventBudgetAdapter` est mort** : `git grep -rn "EventBudgetAdapter"`
ne renvoie **aucun** importateur (hors sa propre définition). Idem pour les
4 autres fichiers de `src/adapters/` (`CaisseAdapter`, `OrgUnitAdapter`,
`TransactionLegacyAdapter`, `VersementLegacyAdapter`) : aucun import
`from "@/adapters"` dans `src/`. Le chemin **vivant** du budget passe par
`parseJsonbValue` (`dataLayer.ts:441`), appelé par `Dashboard`, `EventDetail`,
`Events`, `GroupCotisation`.

**Conclusion** : le changement de type ne casse aucun chemin de lecture
actif ; il corrige au passage les deux `JSON.parse` de `reporting.ts` et des
pages de rapport, qui recevaient auparavant une chaîne là où un tableau était
attendu.


### Isolation inter-organisations — preuve empirique en rôle `authenticated` (2026-10-24)

Les specs Cypress existantes (`rls-leak`, `cross-tenant`) utilisent la clé
**anon** : elles ne prouvent pas l'isolation pour un utilisateur **connecté**
(R26). Test mené en base, en impersonant le rôle PostgreSQL `authenticated`
avec les claims d'un vrai utilisateur (`1961752a-…`, org `e2e-auth-org-1`),
via `set local role authenticated` + `set local request.jwt.claims`.
Tout a été exécuté dans une transaction annulée (`rollback`), sauf le
contrôle positif, dont la ligne a été supprimée ensuite.

**Lecture** (l'utilisateur de `e2e-auth-org-1` ne doit rien voir d'autre) :

| Requête | Résultat | Attendu |
|---|---|---|
| `auth.uid()` | `1961752a-…` | l'utilisateur impersonné |
| `current_org_id()` | `e2e-auth-org-1` | sa propre org |
| `select count(*) from profiles` | **1** | lui seul (sur 108 au total) |
| `select count(*) from profiles where org_id='org-1'` | **0** | aucune fuite |
| `select count(*) from organizations` | **1** | la sienne |
| `... where id <> 'e2e-auth-org-1'` | **0** | aucune autre org visible |
| `transactions where org_id='org-1'` | **0** | aucune fuite |
| `events where org_id='org-1'` | **0** | aucune fuite |
| `audit_entries where org_id='org-1'` | **0** | aucune fuite |

**Écriture** (la direction la plus dangereuse) :

| Tentative | Résultat | Attendu |
|---|---|---|
| `insert into events (org_id='org-1')` | **REFUSÉ — `42501`** « new row violates row-level security policy for table "events" » | refus |
| `insert into events (org_id='e2e-auth-org-1')` | **ACCEPTÉ** (ligne créée puis supprimée) | accepté |

Les deux directions sont donc prouvées : l'utilisateur écrit chez lui et
**ne peut pas** écrire ailleurs. C'est la preuve directe que le durcissement
RLS des sessions 1-3 (migrations `20261022000001` à `20261022000014`) est
actif et correct.

**Nettoyage** : `select count(*) from events where id like 'agent-%'` → **0**.


### Formulaires — colonne « Soumetteur » (R75, corrigé)

| Élément | État |
|---|---|
| Point d'entrée | `/forms/:id/submissions`, `src/pages/FormSubmissions.tsx` |
| Défaut | affichait `submitted_by` (UUID) au lieu du nom |
| Cause | `submitted_by` référence `profiles.id`, jamais résolu à l'affichage |
| Correctif | résolution via la table locale `profiles` (RLS bornée), avec repli sur l'id ; idem pour la colonne « Rejeté par » (`rejected_by`) et les tris |
| Tests | `src/components/__tests__/FormSubmissions-table.test.tsx` (5/5) ; `cypress/e2e/forms-v2.cy.ts` T5 |
| Statut | **corrigé, validé par test unitaire** ; validation E2E à confirmer par le spec |
