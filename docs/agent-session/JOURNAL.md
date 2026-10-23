# Journal de session — agent Lumina

## T0 = 2026-10-22T17:56Z (18:56 heure locale, UTC+1)

### Phase 0 — Démarrage (en cours)

| Heure (UTC) | Phase | Action | Résultat |
|-------------|-------|--------|----------|
| 17:56 | 0 | `date -Is` → T0 | 2026-10-22T17:56:53+00:00 |
| 17:57 | 0 | Branche dédiée | `agent/session-2026-10-22-stabilisation` créée |
| 17:57 | 0 | Identification projet Supabase | `hhgovvrnalibhgpakswi` / « Lumina-project » / eu-west-2 / org `joynagassi@gmail.com` |
| 17:58 | 0 | Comptage données | 108 users (87 @lumina.dev, 11 @example.com, 9 @gmail.com, 1 @mfe-jc.org), 5 orgs, 0 transaction, 0 membre. **Décision : environnement de test/dev, pas de production réelle** (domaines de test dominants, volumes faibles, 0 donnée financière) |
| 17:59 | 0 | Outillage | pnpm activé via corepack (npm -g échoue : permissions) ; Docker démarré ; postgresql-client installé ; Xvfb + deps Cypress installés |
| 18:01 | 0 | Sauvegardes | `/workspace/backups/remote_schema.sql` (125 Ko, 143 CREATE POLICY), `remote_data.sql` (1,08 Mo) via `supabase db dump --linked` |
| 18:03 | 0 | Build | `pnpm run build` → OK en 3,19 s (warning : chunks > 500 Ko) |
| 18:03 | 0 | Dev server | `pnpm run dev` → http://localhost:8080 (200) |
| 18:05 | 0 | Baseline Cypress partielle | local-smoke : 3/3 ✅ ; local-dashboard : 0/2 ❌ (spec obsolète : teste `button[aria-label="Plus d'options"]` et `ion-title`, remplacés par « Ouvrir le menu » et `TopHeader`) |
| 18:08 | 0 | Baseline Cypress complète | lancée en tâche de fond (`/tmp/cy-baseline-full.log`) |
| 18:06-18:10 | 0 | Analyse RLS + sync-config | **2 fuites inter-organisations confirmées** (voir RISQUES.md) |

### Constats majeurs de la phase 0

1. **PowerSync : 3 streams non filtrés par organisation** (`categories`, `org_units`, `caisses`)
   alors que ces tables portent un `org_id`. Tout utilisateur authentifié synchronise
   les catégories/unités/caisses de **toutes** les organisations.
2. **RLS `SELECT USING (true)`** sur `grants`, `tags`, `tag_assignments` → lecture
   cross-org par tout utilisateur authentifié via l'API REST directe.
3. `local-dashboard.cy.ts` teste des sélecteurs qui n'existent plus → test obsolète
   (défaut de test, pas de code).

---

## Phase 1 — Intégrité et isolation des données (début 18:00)

### T0 = 2026-10-22T17:56:53Z
Branche : `agent/session-2026-10-22-stabilisation`. Supabase : `hhgovvrnalibhgpakswi` (eu-west-2).

### FUITE CRITIQUE n°1 — RLS `is_org_member` (CORRIGÉE)
- **Symptôme** : un utilisateur de `org-e2e` lisait 108 profils, 5 organisations, tous les événements via l'API REST directe.
- **Cause racine** : dans `is_org_member(uid uuid, org_id text)`, l'expression `p.org_id = org_id` était **ambiguë**. PostgreSQL résout un nom non qualifié vers la **colonne** quand une colonne de même nom existe dans la requête → `p.org_id = p.org_id` → toujours TRUE. 127 policies RLS dépendent de cette fonction.
- **Preuve avant** : `GET /rest/v1/profiles` (JWT org-e2e) → 108 lignes ; `is_org_member(uid_e2e,'org-1')` → `true`.
- **Correctif** : qualification explicite `is_org_member.org_id` (méthode documentée pour lever l'ambiguïté ; renommer un paramètre est interdit par `CREATE OR REPLACE`). Idem pour `org_roles`.
- **Preuve après** : `profiles` 108→**1**, `organizations` 5→**1**, `events` 1→**0**, `categories` 9→**0**.
- **Commit** : `8515291`. Migration : `supabase/migrations/20261022000001_fix_is_org_member_param_shadowing.sql` + rollback.

### FUITE n°2 — policies `USING (true)` sur grants/tags/tag_assignments (CORRIGÉE)
3 policies `FOR SELECT USING (true)` exposaient toutes les lignes à tout authentifié. Tables vides aujourd'hui (fuite latente). Corrigées par scoping réel.

### FUITE n°3 — streams PowerSync non filtrés (CORRIGÉ, DÉPLOIEMENT EN ATTENTE)
`categories`, `org_units`, `caisses` en `SELECT *` sans filtre org → chaque appareil synchronisait les données de toutes les organisations. Filtre d'org ajouté dans `powersync/sync-config.yaml`. **`powersync deploy sync-config` reste à faire** (pas de `PS_ADMIN_TOKEN` dans cet environnement) → consigné dans RISQUES.md.

### BUG n°4 — écran vide `FormSubmissions.tsx` (CORRIGÉ)
`<EmptyState>` utilisé sans import → `ReferenceError` → page blanche dès que la liste est vide (aucune soumission ou filtres sans résultat). Commit `457f3cc`.

### 18 échecs vitest (CORRIGÉS)
Voir commit `d20aad7`. Causes : shadow DOM Ionic en jsdom (mock partagé créé), dates figées « bombe à retardement », fixture obsolète `entity_type`, `aria-expanded` manquant. **1049/1049 verts.**

### Défaut de fond — CI aveugle (CORRIGÉ)
La CI n'exécutait **aucun** job vitest : les 18 échecs ne pouvaient jamais être vus. Job `unit` ajouté à `.github/workflows/ci.yml`.

---

## Phase 1 (suite) — audit complet RLS, secrets, intégrité — 19:20 UTC

| Heure | Action | Résultat |
|-------|--------|----------|
| 18:45 | Audit RLS par table | `RLS_NO_POLICY` : `keep_alive` uniquement (RLS activée sans policy → lecture impossible par les clients, conforme : cron en superuser) |
| 18:47 | Policies permissives | **0** policy `USING(true)` restante |
| 18:48 | Fonctions `SECURITY DEFINER` | 4 (`current_org_id`, `handle_new_user`, `is_org_member`, `upsert_profile`) — **toutes** avec `search_path=public` figé (pas d'élévation) |
| 18:50 | FK sur `org_id` | **aucune** FK vers `organizations` (contrainte volontaire) ; orphelins vérifiés : seuls `profiles` (47 en `__no_org__`) — non lisibles entre eux (`profiles_select` = self OR membre) |
| 18:55 | Secrets | Aucun `service_role`/`sb_secret`/keystore suivi par git, aucun dans l'historique, aucun dans le bundle client. `.env.local` non suivi. |
| 19:00 | PII journaux | Aucun `console.*` loguant email/token/mot de passe |
| 19:02 | Rate limiting | `signup`, `login`, `onesignal-notify` : **aucun** rate-limit applicatif (R6) |
| 19:04 | RGPD | **aucune** suppression de compte ni export (R5) |
| 19:05 | Index `org_id` | 13 tables sans index → migration `20261022000002` (Seq Scan → Index Scan, preuve EXPLAIN) |
| 19:07 | Isolation cross-org | Preuve 2 comptes : A ne voit que `org-e2e`, B que `org-e2e-unconf` ; écriture cross-org → **HTTP 403**. Script `scripts/rls-isolation-check.sh` |
| 19:10 | Edge functions | Toutes en `verify_jwt:false`. `create_org` se garde seule (JWT + grant admin) ; `onesignal-notify` **non** → R1 |
| 19:14 | Correctif `onesignal-notify` | JWT obligatoire + diffusion réservée au central + `filter`→`filters`. Déployée (v10). Preuves 401/200/403 |
| 19:16 | Tâches planifiées | `keep_alive_daily` (pg_cron, `0 0 * * *`, actif, dernier ping < 19 h) → anti-pause opérationnel |

### Constats supplémentaires Phase 1
- **`onesignal-notify` = relais ouvert** (R1) : appel anonyme → 200 + envoi ;
  diffusion `All` possible. **Corrigé.**
- **Notifications ciblées jamais délivrées** (R4) : `filter` (chaîne) au lieu de
  `filters` (tableau) → OneSignal 400 → 502. **Corrigé** (preuve journal edge).
- **13 tables sans index `org_id`** (R7). **Corrigé**, preuve EXPLAIN avant/après.
- `notifyRole` côté client envoyait l'id OneSignal comme JWT (toujours invalide)
  et ne transmettait pas l'organisation. **Corrigé** (+ tag `org_id` au login).

---

## Phase 2 — invitations, rôles, intégrité — 19:35 UTC

| Heure | Action | Résultat |
|-------|--------|----------|
| 19:05 | Audit RLS `invitations` | Policy `invitations_insert` **sans restriction de rôle** (perdue en `20260926000001:115`) → escalade |
| 19:15 | Test API création d'invitation | **HTTP 400** `42804: column "is_read" is of type boolean but expression is of type integer` → **toute création d'invitation cassée** |
| 19:20 | Cause racine | 7 fonctions de notification insèrent le littéral entier `0` dans `notifications.is_read` (BOOLEAN) — forme héritée SQLite/PowerSync. Trigger AFTER INSERT → transaction entière annulée |
| 19:22 | Migration `20261022000003` | `0` → `false` dans les 7 fonctions + `SET search_path=public`. Rollback fourni |
| 19:23 | Preuve après | `POST /invitations` **400 → 201** ; `POST /events` **400 → 201** ; notifications créées `is_read=false` |
| 19:24 | Preuve escalade (avant) | Compte `MEMBRE` → `POST /invitations {target_role:PASTEUR_PRINCIPAL}` **HTTP 201** |
| 19:28 | Migration `20261022000004` | `can_manage_invitations()` appliquée à INSERT/UPDATE/DELETE. Rollback fourni |
| 19:29 | Preuve après | Non-gestionnaire → **`42501` row-level security policy** (bloqué) ; gestionnaire → INSERT accepté ; SELECT → 200 |

### Défaut n°2 — 7 parcours métier refusaient toute écriture (CRITIQUE)
Les triggers de notification (`invitations`, `invitation_claims`, `events`,
`transactions` INSERT+UPDATE, `form_submissions`, `budget_lines`) échouaient tous
sur `is_read = 0` (int) vs `boolean`. Comme le trigger est AFTER INSERT, la ligne
était insérée puis **la transaction annulée** : l'utilisateur voyait l'action
échouer sans rien enregistrer. Corrigé et prouvé (400 → 201).

### Défaut n°3 — escalade de privilèges sur `invitations` (CRITIQUE)
La policy d'insertion avait perdu sa liste de rôles ; `UPDATE`/`DELETE` n'étaient
gardés que par l'appartenance. Un simple membre pouvait émettre une invitation
`PASTEUR_PRINCIPAL` et révoquer/supprimer toutes les invitations. Corrigé et
prouvé (201 → 42501).

### Incohérence de modèle constatée (à trancher par le propriétaire)
`profiles.role` et `org_memberships.role` **divergent** pour le compte de test
(`MEMBRE` vs `PASTEUR_PRINCIPAL`). Le gate de rôle lit les deux sources. Voir
RISQUES.md.

## 2026-10-22 ~20:15 UTC — Phase 1 : intégrité et isolation des données

**T0** = 2026-10-22T17:56:53Z. Branche `agent/session-2026-10-22-stabilisation`.

### Fait
- Baseline vitest : **60 fichiers / 1050 tests verts**.
- Correction du défaut d'invitation (code + id divergents) — commit `6468b3c`.
  Test `invitation-code-consistency.test.ts` écrit ROUGE puis VERT.
- Audit de l'isolation des données par appels REST réels (compte neuf).
  **Découverte majeure** : tout nouvel inscrit était rattaché à `org-1` et
  lisait 59 profils (dont adresses réelles).
- Migrations `20261022000005`, `000006`, `000007` appliquées, avec rollback :
  - régression `used_count` (introduite par mon durcissement invitations) ;
  - `profiles.org_id` injectable ;
  - fuite PII inter-utilisateurs (`handle_new_user` + sentinelle).
- Commit `7ce1711`.
- Comptes de test nettoyés (0 restant).

### Preuves
| Test | Avant | Après |
|---|---|---|
| Profils lisibles par un compte neuf | 59 (`org-1`) puis 48 (`__no_org__`) | **1** (le sien) |
| `used_count` après claim (`max_uses=1`) | 0 | **1** |
| `UPDATE profiles SET org_id` par un tiers | accepté | `42501 ORG_ID_IMMUTABLE` |
| Membre `org-e2e` lit `org-1` | — | **0** |

### Suite
- Terminer la couverture Cypress (suite complète en tâche de fond).
- Compléter FEATURES.md, puis phases 2–7.

---

## Phase 1 (suite) — isolation et durcissement (~20:00–21:00 UTC)

T0 = 2026-10-22T17:56:53Z.

### Défauts découverts et corrigés

| # | Défaut | Preuve avant | Correctif | Migration |
|---|---|---|---|---|
| R24 | Vue `org_family` sans `security_invoker` → énumération de TOUTES les organisations, **même sans jeton** | `GET /org_family` (anon) → 5 organisations | `security_invoker` + policy via `org_descendants(uid)` | `…000008` |
| R25 | 5 fonctions SECURITY DEFINER exécutables par `anon` ; `initplan_uid` à `search_path` mutable | Advisors Supabase (4+1) | REVOKE anon/PUBLIC ; `search_path` figé | `…000009` |
| R27 | `org_memberships` : auto-ajout dans N'IMPORTE quelle organisation | `POST /org_memberships{org_id:'org-1'}` → 201 puis `POST /org_units{org_id:'org-1'}` → 201 | policies par commande, INSERT/UPDATE → admins | `…000010` |
| R28 | `profiles.role` modifiable par l'utilisateur → MEMBRE→ADMIN ; `upsert_profile` contournait le trigger | `PATCH /profiles{role:'ADMIN'}` → 200 puis `POST /org_admins` → 201 ; `POST /rpc/upsert_profile{p_role:'ADMIN'}` → 200 | trigger `guard_profile_role_immutable` + contrôle `p_role` | `…000011`, `…000012` |
| R26 | Les specs RLS s'authentifiaient avec la clé **anon**, jamais le jeton utilisateur | lecture de `rls-leak.cy.ts` | nouveau spec `rls-isolation-hardened.cy.ts` (jeton réel) | — |

### Vérifications saines (preuves)

| Contrôle | Résultat |
|---|---|
| Écritures cross-org (`groups`, `events`, `transactions`, `categories`, `members`, `notifications`, `audit_entries`, `accounts`) | **403 / 42501** (toutes refusées) |
| Secrets : `.env` suivis, clés en dur, secrets dans l'historique | **aucun** ; seules des clés publiques (`VITE_*`) |
| Intégrité : doublons e-mail, doublons de code, orphelins (profils, memberships, invitations, notifications) | **0** partout |
| `org_admins` : INSERT/UPDATE bornés à sa propre organisation | conforme |
| Non-régression après durcissement : `upsert_profile` authentifié, lecture RLS, `org_units` | **200 / 200 / 200** |

### Nettoyage
Toutes les lignes injectées par les tests d'attaque ont été supprimées et les
rôles restaurés (`org-e2e` → `PASTEUR_PRINCIPAL`, `org-e2e-unconf` → `MEMBRE`,
`first_name` remis à `null`, `org_admins` purgé pour `org-e2e-unconf`).

### Suite
- Isolation du stockage de fichiers (buckets Storage).
- Invitations : parcours complet (phase 2).
- Sauvegarde vérifiée ; fin de la suite Cypress.

### Sauvegardes (phase 0/1)
`GET /v1/projects/…/database/backups` → `walg_enabled: true`,
`pitr_enabled: false`, **`backups: []`** (aucune sauvegarde listée) : R18 confirmé.
Exports produits **hors dépôt** (données réelles, non commitées) :
- `/tmp/lumina-schema-20261022.sql` (133 Ko, schéma complet) ;
- `/tmp/lumina-data-20261022.sql` (1,1 Mo, données).
Commande : `npx supabase@latest db dump --linked [-f … | --data-only -f …]`.
R18 reste **ouvert** côté propriétaire : activer les sauvegardes
planifiées / PITR (action de facturation, hors de ma portée).

### Incident d'environnement (~20:45–21:05 UTC)
Un redémarrage du conteneur a interrompu la session : processus arrêtés
(Vite, Xvfb, Cypress), `/tmp` vidé (exports de sauvegarde et logs perdus),
binaire Cypress effacé. Mesures prises :
- reprise depuis le dernier commit (`9ad1280`), arbre propre ;
- vérification : **Vitest 1050/1050 verts** (aucune régression introduite) ;
- sauvegardes de 18:02 intactes (`/workspace/backups/`) ;
- binaire Cypress réinstallé, Xvfb + serveur de dev relancés ;
- **branche poussée** sur GitHub (sécurisation du travail, consigne du
  propriétaire) : `agent/session-2026-10-22-stabilisation`.
Les exports `/tmp/lumina-*` doivent être régénérés (RUNBOOK.md à jour).

## Phase 4 — défaut majeur de saisie : `onIonChange` (21:15–21:45 UTC)

### Symptôme
Sur `/members`, le bouton « Ajouter » restait **désactivé** après saisie du
prénom et du nom. L'utilisateur ne pouvait pas créer de membre.

### Diagnostic (prouvé, pas supposé)
`onIonChange` d'un `<IonInput>` Ionic ne se déclenche **qu'au blur**. Un clic
sur un bouton **désactivé** ne déclenche aucun `blur` → l'état React
(`firstName`, `lastName`) reste vide → le bouton reste désactivé → **impasse
utilisateur**. Preuve : test Cypress temporaire `tmp-diag.cy.ts` →
`expected <button…> to be 'enabled'` (échec après 120 s de retry).

### Correctif
`onIonChange` → `onIonInput` (événement émis **à la frappe**) pour
`<IonInput>` et `<IonTextarea>` : **95 remplacements sur 34 fichiers**.
`IonSelect` (57) et `IonCheckbox` (2) **conservent** `onIonChange` : Ionic
n'expose pas d'événement `ionInput` pour eux (vérifié dans
`node_modules/@ionic/core/dist/types/components/`).

### Preuves
- Avant (Members en `onIonChange`) : test `tmp-diag` **échoue**.
- Après (Members en `onIonInput`) : test `tmp-diag` → **1 passing (11 s)**.
- `npx tsc --noEmit` → **OK**.
- `npx vitest run` → **60 fichiers / 1050 tests verts**.
- Le mock de test `src/test/ionic-mock.tsx` acceptait déjà `onIonInput`.

## Phase 1/4 — DÉFAUT CRITIQUE : write path PowerSync → Supabase (22:20–22:42 UTC)

### Symptôme
`/members` : le membre semblait créé (formulaire fermé, aucun message
d'erreur) mais **n'apparaissait jamais** dans la liste, et **aucune ligne
n'arrivait en base**.

### Diagnostic (prouvé)
1. Interception réseau Cypress (`cy.intercept('**/rest/v1/members*')`) :
   le corps de l'op d'upload valait `{"id":"4e1c1db3-…"}` — **une seule
   clé**. Toutes les autres colonnes (dont `org_id`) étaient absentes.
2. Console navigateur :
   `[PowerSync] uploadData FAILED members op=PUT org_id=org-e2e
   code=42501 msg=Could not update Supabase: new row violates row-level
   security policy for table "members"`.
3. `pg_policies` : `members_insert` a `WITH CHECK is_org_member(uid, org_id)`.
   `is_org_member(uid, NULL)` → `false` (le CASE renvoie false dès que
   `org_id` est NULL). D'où le 42501.
4. Reproduction REST : un upsert `POST members?on_conflict=id` avec
   `org_id` renseigné → **HTTP 201**, puis **200** au 2e passage. Donc
   l'utilisateur satisfait bien la RLS ; c'est bien l'op PowerSync qui
   était amputée.

### Cause racine (2 défauts, même commit d379ec0 du 2026-10-18)
- **`SCHEMA_COLUMNS`** (`src/lib/powersync/SupabaseConnector.ts:27`)
  faisait `new Set(["id", ...table.columns])`. Or `table.columns` expose
  des instances `Column` (getter `ResolvedTable.columns` →
  `options.columns`), **pas des chaînes**. Preuve exécutable :
  `node probe-columns.mjs` →
  `set contents: [ 'id', '[object Object]', '[object Object]', … ]`.
  `filterOpDataToSchema` supprimait donc **toutes** les colonnes sauf
  `id`. → **Toute écriture client échouait en 42501.**
- **`NOT_NULL_DEFAULTS`** fournissait `org_id: "org-e2e"` (l'organisation
  de test) : une op dont `org_id` manquait était réécrite vers une
  **autre organisation** → faille d'isolation multi-tenant (PATCH inclus).

### Correctif (commit 9bb2059)
- `buildSchemaColumns()` : `table.columns.map((c) => c.name)`.
- `org_id` retiré de `NOT_NULL_DEFAULTS` (aucune valeur par défaut pour
  la colonne d'isolation ; une op sans `org_id` doit échouer
  visiblement).

### Preuves
- `src/lib/__tests__/connector-schema-filter.test.ts` : **5/5 verts** ;
  en réintroduisant les deux défauts, **4/5 échouent** (régression
  verrouillée).
- Cypress : corps du PUT =
  `{"created_at":…,"first_name":"Diag","joined_at":…,"last_name":"Write",
  "org_id":"org-e2e","status":"ACTIVE","updated_at":…,"id":…}` — complet,
  plus aucune 42501.
- Postgres : `52f659e4… "Diag Write"` et `0bd1b0e6… "Jean E2e29918"`
  persistés avec `org_id='org-e2e'`.
- `npx tsc --noEmit` → exit 0 ; `npx vitest run` → **61 fichiers /
  1055 tests verts**.
- Branche poussée : `agent/session-2026-10-22-stabilisation`.

### Reste à traiter
La liste `/members` n'affiche toujours pas les membres créés alors que la
base les contient : investigation du chemin de lecture (PowerSync local
`members` / `isPowerSyncReady` / repli `useLocalStore`).

## Bug C — provider PowerSync jamais monté (cause racine du bug de lecture)
- **Symptôme** : `/members` affichait « 0 actifs / Aucun membre » alors que la
  base SQLite locale contenait bien 5 membres (`hasSynced=true`,
  `connected=true`).
- **Preuve de la course écartée** : instrumentation `console.info` du hook →
  `orgId=__no_org__` au 1er rendu puis `orgId=org-e2e` (4 re-rendus). L'org
  finit donc bien par être résolue : ce n'était PAS une course React.
- **Cause racine** : `src/components/PowerSyncProvider.tsx` définit un
  `<PowerSyncContext.Provider>` mais **n'était monté nulle part**
  (`grep` sur tout le dépôt : seule occurrence = sa propre définition ;
  `git log -S PowerSyncProvider -- src/App.tsx src/main.tsx` = vide, il n'a
  jamais été monté). `useQuery()` de `@powersync/react` fait
  `usePowerSync()` → `null` → renvoie
  `{ data: [], isLoading:false, error: Error("PowerSync not configured.") }`.
  Toutes les listes de l'app retombaient donc sur le repli `useLocalStore`
  (vide au premier lancement).
- **Correctif** : monter le provider autour de `<App />` dans `src/main.tsx`.

## Bug D — `usePowerSyncStatus` utilisait une API inexistante
- **Symptôme** : après le correctif C, `useQuery` renvoyait bien 5 lignes mais
  l'UI restait vide : `isPowerSyncReady()` renvoyait `false` en permanence.
- **Preuve** : sonde `window.__diagUseMembers` → `{ org:"org-e2e", n:5,
  ready:false }`. Or `useMembers` exige `psData.length>0 && isPowerSyncReady()`
  pour retourner les données PowerSync.
- **Cause racine** : `usePowerSyncStatus` appelait `sync.addListener("statusChanged")`
  et `sync.getStatus()`. Vérification des `.d.ts` du SDK
  (`@powersync/common@2.2.0`) : ces membres **n'existent pas**. L'API réelle est
  `registerListener({ statusChanged })` et la propriété `currentStatus`
  (`get connected()`, `get hasSynced()`). Les appels optionnels
  (`?.`) ne levaient pas mais n'enregistraient rien → `markPowerSyncReady()`
  n'était jamais appelé → `_psReady` restait `false` → repli local partout.
- **Correctif** : `registerListener({ statusChanged: applyStatus })` +
  lecture initiale de `currentStatus`.

**Preuve de validation (locale, `--config baseUrl=http://127.0.0.1:8080`)** :
sonde après correctifs → `{ org:"org-e2e", n:5, ready:true, err:"none" }`.

## Bug E — refresh token en rotation par deux clients Supabase concurrents
- **Symptôme** : session perdue de façon non déterministe pendant la suite
  Cypress (le test 2 retombait sur l'écran `/auth` : `h1.text-2xl` d'AuthPage).
- **Cause racine** : deux `createClient` Supabase partagent le même
  storageKey (`sb-<ref>-auth-token`) : client A (`src/lib/auth.ts`) et client B
  (`SupabaseConnector`). Le client B avait `persistSession: true` **et**
  `autoRefreshToken: true` → son propre timer de refresh. Supabase fait
  tourner le refresh token à chaque refresh ; le second refresh concurrent
  était rejeté (« Already Used ») et Supabase révoque la famille de tokens →
  déconnexion. Le commentaire du code affirmait que B « ne possède pas le
  timer », ce qui était faux.
- **Correctif** : `persistSession: false` + `autoRefreshToken: false` sur le
  client B. A reste l'unique propriétaire de la persistance et du refresh ;
  B consomme la copie mémoire posée par `mirrorAppSessionIntoConnector()`.

## Bug F — perte de session entre les tests Cypress (testIsolation)
- **Symptôme** : dans `members.cy.ts`, le 1er test passait puis les suivants
  retombaient sur `/auth` (assertion sur `h1.text-2xl` = AuthPage).
- **Preuve du cycle de vie** : trace du token `sb-hhgovvrnalibhgpakswi-auth-token` :
  visite 1 → `exp=1792715840` (valide, ~1 h de marge) ; visite 2 →
  **ABSENT dès le début du test**, avant même `ensureAuth()`. Seules les clés
  de thème survivaient.
- **Cause racine** : Cypress 16 active `testIsolation` par défaut → cookies +
  `localStorage` sont effacés avant chaque `it()`. Le token Supabase vit
  UNIQUEMENT en `localStorage` (supabase-js ne pose pas de cookie http-only),
  donc `ensureAuth()` (qui se contentait de re-router via `/splash` en
  supposant un cookie persistant) ne pouvait rien restaurer → session perdue
  dès le 2e `it()`.
- **Correctif** : `ensureAuth()` utilise désormais `cy.session('lumina-org-account', …)`
  (setup = `loginOrgAccount()`), mécanisme canonique qui met en cache et
  restaure cookies + localStorage avant chaque test, et rejoue le setup si le
  cache est invalide.
- **Validation** : `members.cy.ts` → **3/3 passing** (contre 0/3 au départ).

## 2026-10-23 ~02:00–02:15 UTC — Bug R34 (critique) trouvé et corrigé
- Redémarrage de session : Vite relancé (port 8080), **Xvfb réinstallé**
  (`sudo apt-get install -y xvfb` — perdu au redémarrage, Cypress 16 en a
  besoin même en `run` headless).
- Suite Cypress relancée (run 2) : `auth-real` 5/5 ; `forms-fields` 2/4
  (mon correctif de sélecteur a fait passer « renders the form-submissions
  page ») ; `finance-deep` 4/5 ; `events-tasks` 0/1.
- **Investigation du champ montant** (`/transaction/new`) : `cy.clear()`
  échoue « element is not visible » alors que le sélecteur matche. Sonde DOM
  ciblée → l'`<input>` a un rect **0×0**, `checkVisibility()=false`.
- **Cause racine** : `ion-item` (Ionic 9.0.2, `encapsulation: "shadow"`) ne
  déclare que les slots `start` / `end` / défaut. Tout enfant portant
  `slot="input"` n'est assigné à aucun slot → **jamais rendu**.
- **Ampleur** : 61 occurrences dans 20 fichiers (tous les formulaires).
- **Preuve avant/après** sur `/event/new` :
  `checkVisibility false→true`, rect `0×0 → 316×44`, `offsetParent false→true`.
- **Correctif** : suppression des 61 `slot="input"` + commentaire obsolète
  (`OrgReportSend.tsx`) ; `tsc --noEmit` OK ; commit `86670ef`.
- **Docs** : RISQUES.md → R34 (critique, corrigé).
- Suite complète relancée en tâche de fond (run 3) pendant la rédaction.

## 2026-10-23 ~02:35–02:42 UTC — Bug R35 (header recouvrant) + suite finale
- **Bug 2 identifié** : `cy.clear()` sur le montant échoue car le `TopHeader`
  recouvre l'input. Sonde Cypress : `headerH=110px`, `contentPadTop=64px`,
  `scroll-padding-top=auto`.
- **Correctif** : `ion-content::part(scroll) { scroll-padding-top: 7rem; }`.
  Après : `headerBottom=111`, `inputTop=281`, `covered=false`.
- **Validation** : `finance-deep.cy.ts` **5/5** (baseline 2/5). Commit `dff2cbe`.
- **Vitest** : **61 fichiers / 1055 tests, 100 % verts** (baseline 1030/1048,
  18 échecs). Commande : `npx vitest run`.
- Suite Cypress complète relancée (run 4, `/tmp/cy-final.log`) après les
  correctifs R34 + R35 + Events.
- Docs : RISQUES.md → R35.

## 2026-10-23 ~02:42–02:50 UTC — suite finale (run 4) et livrables
- Suite Cypress complète relancée en tâche de fond (`/tmp/cy-final.log`).
- Résultats confirmés du run 4 : `auth-real` **5/5**, `calendar` **1/1**
  (baseline 0/1 → correctif `?date=` validé), `cloud-sync` 0/1 (échec
  **préexistant**, identique aux runs 2 et 3 avant correctifs).
- Build production : `✓ built in 4.34s`.
- **Livrables créés** : `PROPOSITIONS.md` (17 propositions priorisées),
  `RAPPORT_FINAL.md`.
- Branche poussée, **PR #3** ouverte (non fusionnée) :
  https://github.com/joynagassi-cyber/luminap/pull/3
- Sauvegardes vérifiées : `/workspace/backups/` (schéma 125 Ko / 42 tables,
  données 1,1 Mo / 21 INSERT) — hors dépôt.

## Statut des specs Cypress — run 4 (fin de session)

| Spec | Baseline | Run 4 |
|---|---|---|
| auth-real | 5/5 | 5/5 |
| calendar | 0/1 | **1/1** |
| cloud-sync | 1/1 | 0/1 (préexistant, instable) |
| finance-deep | 2/5 | **5/5** (spec isolée) |
| members | 0/3 | **3/3** |
| forms-fields | 0/4 | 3/4 |
| forms-v2 | 0/6 | 0/6 (défaut de test) |
| autres | variable | suite interrompue à la clôture |

## 2026-10-23 ~02:47–02:55 UTC — audit slots Ionic (famille R34) et gel
- Audit exhaustif des slots utilisés dans `src` : `start` (28), `end` (6),
  `footer` (1), `label` (1).
- **Corrigé** : `slot="label"` dans `InvitationEmit.tsx:230` — `ion-item`
  n'expose que `start`/défaut/`end` (source `item.js`), donc le libellé
  « Rôle cible » n'était pas rendu. Retiré ; `tsc` = 0.
X
  `<IonButtons slot="footer">` alors qu'`ion-alert` n'a **aucun slot** → le
  dialogue de mise à jour n'a **aucun bouton cliquable**. Correctif identifié
  (prop `buttons` d'`IonAlert`) mais **non appliqué** : règle de gel T0+9 h
  et changement non testable dans le délai. Documenté dans RISQUES.md (R36).
- Gel atteint : plus de complétion de fonctionnalité ni de changement
  structurel à partir de maintenant.

## 2026-10-23 ~02:50–02:58 UTC — R36 : faux positif écarté par la preuve
- **Suspicion** : `UpdateDialog` (actions dans `IonButtons slot="footer"`) alors
  qu'`ion-alert` n'expose aucun slot → boutons non rendus (famille R34).
- **Vérification en navigateur réel** (Cypress) : `ion-alert` rend bien ses
  enfants light-DOM (`hostText="PLUSTARD_PROBEProbe"`, enfant `hydrated`).
  `ion-alert` est `encapsulation: "scoped"` (pas `shadow`) : le contenu est
  conservé sur place. **R36 n'est PAS un défaut.**
- RISQUES.md corrigé (R36 → vérifié, pas un défaut) ; leçon consignée :
  vérifier l'encapsulation du composant avant de conclure.
- Sondes supprimées (`zz-probe-alert.cy.ts`, `zz-upd.test.tsx`).
- **R37 prouvé** : sonde Cypress comparant deux `ion-item` — `slot="label"`
  → hauteur **0** (invisible) ; sans slot → hauteur **24** (visible).
  Correctif `bdd1f5b` validé par la mesure. Sonde supprimée.

## 2026-10-23 ~03:10–03:30 UTC — R38 (critique) : utilisateur factice
- **Découverte** : `lumina-user` jamais écrit au login → `useCurrentUser()`
  renvoie `{id:'local-user', role:'TREASURIER'}` → `federation.canAccess`
  TOUJOURS faux → FAB « Créer un groupe », export de rapports masqués à tort.
- **Preuve** : base = `profiles.role=MEMBRE` + `org_memberships.role=
  PASTEUR_PRINCIPAL` ; localStorage `lumina-user` = **absent** ; sonde
  `window.__psDb` : `om=[{role:PASTEUR_PRINCIPAL,status:ACTIVE}]` correct.
- **Correctif** (`60830d4`) : persistance dans `authService.setState` +
  `useCurrentUser` lit le profil live et se re-rend sur auth.
- **Preuve après** : `lumina-user` = id réel ; FAB présent après reload
  (1re visite encore sans FAB → R39, course de synchronisation).

## 2026-10-23 04:00–04:40 UTC — R40/R42 (critiques) : listes vides et création « perdue »
- **R40** : `getOrganizationId()` restait `__no_org__` au 1er rendu. Trois
  causes imbriquées : variable de module non réactive, résolution au seul
  montage d'`AppContext`, aucune restauration au boot.
  → `subscribeOrganization` + `useOrganizationRevision` (13 hooks),
  résolution déplacée dans `authService.setState` (là où le profil arrive),
  restauration synchrone depuis `lumina-active-org`.
  **Preuve** : « 143 événements » dès la 1re visite sans reload ; login neuf
  (`cy.clearLocalStorage()`), correct en **6,2 s**.
- **Tentative R41 écartée** : un `isLoading` borné à 10 s masquait les
  formulaires (`input[aria-label="Nom de l'événement"]` introuvable) →
  **réverté**. Décision D-R41 consignée.
- **R42** : après création, `navigate("/events")` — la liste est triée par
  date décroissante et tronquée, donc un événement à date ancienne
  n'apparaissait pas : création perçue comme perdue. **Sonde** : `p2.json`
  → `url=/events`, `hasName=false`, pourtant 149 événements en base.
  → redirection vers `/event/<id>` (déjà attendu par `cross-tenant.cy.ts`).
- **Sauvegarde** : export REST par table dans `backups/rest-export/`
  (hors git). L'anon key ne lit presque rien (RLS) : les volumes de
  référence restent ceux mesurés via MCP.
- Gel (T0+9 h) dépassé : passage en clôture, plus de complétion.

## Clôture — 2026-10-23T12:2xZ (gel dépassé, passage en clôture)

- **R44 trouvé et corrigé** : `BottomNav` en `--z-overlay` (50) recouvrait
  les boutons des bottom-sheets. Découvert par le spec `events-tasks` :
  « Enregistrer » couvert par l'icône de l'onglet. → `--z-nav` (40).
  Test unitaire de non-régression ajouté.
- **Specs E2E fiabilisés** : `cross-tenant.cy.ts` **1 passing** (isolation
  REST + réplica local + UI). `events-tasks.cy.ts` : la création
  d'événement passe (hydratation + `typeIonicInput`), l'étape tâches
  progresse après la correction R44.
- **Causes racines identifiées** (toutes documentées) :
  1. URL REST interpolées **hors** `cy.then()` → variables vides → 401 ;
  2. `cy.contains` global tombant sur des pages Ionic **cachées** →
     « not visible » alors que l'élément existe dans la page active ;
  3. remplissage du formulaire **avant** le montage React → valeur écrasée ;
  4. artefact `DataCloneError` du worker PowerSync sous Electron/Cypress.
- **Tests unitaires** : **1049/1049 verts** (`npx vitest run`), dont le
  nouveau test z-index (37/37 sur `core-components.test.tsx`).

## Clôture — 2026-10-23T13:20Z — specs E2E au vert (preuve)

- **`events-tasks.cy.ts` : 1/1 passing (35,6 s)** — parcours complet :
  création d'événement → onglet Tâches → tâche parente → sous-tâche liée →
  statut « En cours » → « Terminer » → compteur de progression `1/N` →
  **rechargement F5** → les deux tâches survivent.
- **`cross-tenant.cy.ts` : 1/1 passing (28 s)** — isolation vérifiée sur
  trois plans indépendants : REST (`org_id` étranger → 0 ligne),
  réplica local PowerSync (`SELECT DISTINCT org_id FROM events` = 1 seule
  org), et UI (événement visible dans sa propre organisation).
- **Corrections de fiabilité des specs** (aucune ne masque un défaut) :
  - étape 5 de `cross-tenant` : navigation directe vers `/event/<id>`
    capturé à l'étape 1, au lieu de la liste `/events` tronquée (R42) ;
  - `events-tasks` : ciblage du `ion-checkbox` (et non d'un `label`
    ambigu), ouverture du `ion-select` **hôte**, sélection dans
    `ion-popover` filtrée `:visible`, assertions scoppées à la page ACTIVE.
- **Tests unitaires : 1050/1050 (60 fichiers), 0 échec** — confirmé par
  une passe `--reporter=json`. `tsc --noEmit` : aucune erreur.
- **Incident d'environnement** : le serveur Vite est tombé en cours de
  session (cause des `exit 139` de Cypress, log vide). Relancé
  (`npx vite --port 8080`) ; Cypress doit être lancé **détaché**
  (`setsid nohup … &`) dans cet environnement, sinon SIGSEGV.

## Clôture — 2026-10-23T14:1xZ — stabilité E2E prouvée (3 passes)

`cross-tenant.cy.ts` + `events-tasks.cy.ts` rejoués **3 fois de suite**,
en séquentiel, serveur Vite relancé et `Xvfb :99` rétabli :

| Passe | Résultat | Durée |
|---|---|---|
| 1 | **2/2 passing** (`All specs passed`) | 01:01 |
| 2 | **2/2 passing** (`All specs passed`) | 00:55 |
| 3 | **2/2 passing** (`All specs passed`) | 00:55 |

Aucun échec aléatoire, aucune reprise. La suite ciblée est donc déclarée
**stable** (critère : 3 passes consécutives sans échec).

Incidents d'environnement rencontrés et résolus (à connaître) :
- `Xvfb` **avait disparu** de l'image en cours de session → Cypress
  mourait en `exit 139` avec un log vide. Réinstallé
  (`sudo apt-get update && sudo apt-get install -y xvfb`).
- Le serveur Vite s'était arrêté → toutes les specs échouaient. Relancé.
