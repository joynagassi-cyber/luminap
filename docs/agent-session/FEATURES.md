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
| 17 | **Événements et tâches** | Planifier un culte, suivre ses tâches | `/events`, `/event/*`, `events`, `event_tasks` | complète | Spec périmée : assertion `/^\/events\//` (pluriel) alors que la route est `/event/:id` (singulier) — échec systématique indépendant du code. | Spec corrigée (`events-tasks.cy.ts`, `cross-tenant.cy.ts`) | `C: events-tasks.cy.ts`, `cross-tenant.cy.ts` | à revalider |
| 18 | **Groupes et appartenances de groupe** | Organiser des groupes | `/groups`, `groups`, `group_memberships` | complète | — | — | `C: groups-events.cy.ts` | à valider |
| 19 | **Membres (annuaire)** | Gérer les personnes | `/members`, `/membres-en-avance`, `members` | **cassée** | **Provider PowerSync jamais monté** (bug C) → `useQuery` renvoyait `data:[]` + « PowerSync not configured. » → repli `useLocalStore` vide → « 0 actifs / Aucun membre » alors que la base locale contenait 5 membres. **`usePowerSyncStatus` appelait `addListener`/`getStatus()`** (inexistants dans le SDK, bug D) → `_psReady` restait `false` → repli vide permanent. **`usePowerSyncStatus` bloquait aussi les autres listes** ; `ensureAuth` perdait la session entre `it()` (bug F) ; routes `/event/*` testées en `/events/*` (spec périmée). | Corrigé C (montage provider), D (`registerListener`+`currentStatus`), E (double refresh Supabase), F (`cy.session`) ; specs `/event/` corrigées | `C: members.cy.ts` **3/3** ; sonde `useMembers` `{n:5, ready:true}` | **validée (C, 3/3)** |
| 20 | **Dons et campagnes** | Suivre les dons | `/giving`, `giving_campaigns`, `giving_donors`, `pledges`, `tax_receipts` | complète | — | — | `V: budgets-giving.test.ts` | partielle |
| 21 | **Notifications** | Être averti d'un changement | `notifications`, triggers `notify_*`, `onesignal.ts` | complète | — | — | `V: notification.test.ts` | partielle |
| 22 | **Journal d'audit** | Tracer les changements | `/trace`, `audit_entries` | complète | — | — | `V` | à valider |
| 23 | **Navigation (barre basse + menu latéral)** | Se déplacer | `BottomNav.tsx`, `FeatureSidebar.tsx`, `features.ts` | complète | — | — | `C: local-dashboard.cy.ts` (**obsolète**), `V: a11y.test.ts` (2 échecs) | partielle |
| 24 | **Paramètres et personnalisation du profil** | Régler son compte | `/settings`, `profiles` | complète | — | — | — | non validée |
| 25 | **Aide / tutoriel intégré** | Apprendre l'app | `/help`, `Tutorial.tsx` | complète | — | — | — | non validée |
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
