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

## 2026-10-23 15:25–15:45 UTC — Session 2 (continuation) : CI rouge, Phase 7, instabilité

**Constat de départ** : la PR #3 a été **mergée** dans `main`, mais la CI de
`main` est **rouge** sur 3 jobs. Une CI toujours rouge ne signale plus rien.

### Cause racine n° 1 — CI rouge en permanence (le défaut le plus grave)

| Job | Échec | Cause racine | Correctif |
|---|---|---|---|
| Unit Tests (Vitest) | 14 fichiers « 0 test » | le job `unit` était le **seul** à ne pas créer `.env.local` ; `src/lib/auth.ts` **lève à l'import** si `VITE_SUPABASE_URL`/`ANON_KEY` manquent → les fichiers échouent au chargement. En local (`.env.local` présent) les **mêmes** tests passaient : c'est l'écart CI/local. | ajout de l'étape `Create .env.local` (`074dc2e`) |
| Lint Check | 9 erreurs | faux positifs `@typescript-eslint/no-unused-expressions` sur la syntaxe Chai des specs Cypress (`expect(x).to.be.a('string').and.not.be.empty`) | exception ESLint ciblée `cypress/**` (`074dc2e`) |
| Security Audit | 1 vuln. **critique** | `dompurify` 3.4.14 (GHSA-cg2g-xh64-v4q7), transitif via `jspdf` | override `dompurify: ^3.4.17` dans `pnpm-workspace.yaml` + lockfile (`074dc2e`) |

Preuves locales après correctif : `npx eslint .` → **0 erreur** (9 avant) ;
`pnpm audit --audit-level=critical` → **exit 0, 0 critique** (1 avant) ;
`npx tsc --noEmit` → 0.

> Note pnpm 11 : `pnpm.overrides` dans `package.json` est **ignoré**
> (déplacé dans `pnpm-workspace.yaml`). Vérifié par avertissement explicite.

### Cause racine n° 2 — test instable (défaut réel, pas « flaky à ignorer »)

`buildReverseTransaction` relisait l'horloge en interne alors que le test
comparaît `approvedAt` à un `now` lu avant l'appel → échec intermittent
(« expected .147Z to be .146Z »). Correctif : horloge injectable (5e
paramètre `now`), sur le modèle de `buildApproveTransaction` (`6e500da`).
Preuve : **38/38 passés 3 fois de suite**.

### Phase 7 — exceptions explicitement demandées : TERMINÉES

1. **Onboarding dynamique** (`DashboardOnboarding.tsx`) — carte « Premiers
   pas » : progression déduite des données réelles, étape suivante mise en
   avant, auto-masquage, masquage explicite. 10 tests (`844a248`).
2. **Profil** — le prénom/nom n'était écrit QUE dans `localStorage`
   (jamais en base) ; l'écriture base passait par `authService.updateProfile`
   **jamais appelé**. Corrigé + erreur visible. 2 tests ; preuve base réelle
   `PATCH /profiles` → **HTTP 200** (`844a248`).
3. **Organisation** — le nom n'était écrit QUE dans `localStorage`. Ajout de
   `renameOrganizationPS` (RLS `orgs_update_merged`, ADMIN) + refus de rôle
   explicite + erreur visible. 3 tests (`22b40ea`).
4. **Tutoriel** mis à jour (guide « premiers pas », persistance en base)
   (`e053e7e`).

### Sauvegardes (R18) — confirmé sans changement

`GET /v1/projects/hhgovvrnalibhgpakswi/database/backups` →
`{"walg_enabled":true,"pitr_enabled":false,"backups":[]}`.
**Aucune sauvegarde exploitable.** Export manuel existant hors dépôt
(`/workspace/backups/`, 1,1 Mo de données). **Seul le propriétaire peut
activer les sauvegardes planifiées** (dashboard Supabase, plan payant) :
hors de portée de l'agent. Consigné R18 / P1.

### PowerSync Cloud — déploiement impossible ici

Aucun `PS_ADMIN_TOKEN` dans l'environnement : `powersync deploy sync-config`
ne peut pas être exécuté. Le correctif d'isolation des streams (R6 :
`categories`, `org_units`, `caisses` sans filtre org) reste donc
**non déployé**. Consigné.

### Vitest — état

`npx vitest run` → **63 fichiers / 1065 tests, 100 % verts** (après les
correctifs ; 1 échec instable avant).

### R46 CONFIRMÉ — CI verte sur la PR #4 (run `39984165908`)

Les 6 jobs sont verts, y compris les 3 qui échouaient sur `main` :

| Job | `main` (avant) | PR #4 (après) |
|---|---|---|
| Lint Check | ❌ 9 erreurs | ✅ **success** |
| Unit Tests (Vitest) | ❌ 14 fichiers | ✅ **success** |
| Security Audit | ❌ 1 critique | ✅ **success** |
| TypeScript Check | ✅ | ✅ success |
| Build Application | ✅ | ✅ success |
| E2E (Cypress) | ✅ | ✅ success |

Preuve : `GET /actions/runs/39984165908/jobs` → `conclusion=success` pour les
6 jobs. Le garde-fou automatique du dépôt est **rétabli**.

PR ouverte : **#4** (non fusionnée — décision du propriétaire).

## Session 2 — clôture

- **CI** : `CI Pipeline` **verte** (6/6 jobs) sur `636226b` — preuve
  `GET /actions/runs/39984165908/jobs`.
- **Vitest** : `63 passed (63)` fichiers, `1065 passed (1065)` tests.
- **Cypress** : `rls-leak` réécrit → `1 passing` × 3 passes ;
  `sessions` → rouge (réplique PowerSync vide, R53) ;
  `simple-check` (1) + `theme-modes` (3) → **verts**.
- **Nouveaux risques** : R50 (faux positif écarté, RLS vérifiée), R51
  (test rls-leak corrigé), R52 (état de chargement `/sessions`), R53
  (réplique vide), R54 (job E2E illusoire), R55 (build Android cassé),
  R56 (2 workflows rouges).
- **Nouvelles propositions** : P23–P27.
- **PR #4** ouverte, **non fusionnée**.

## Session 3 — 2026-10-23 (phases restantes)

- **T0 session 3** : 2026-10-22T17:56:53Z (ancre conservée). Branche
  `agent/session-2026-10-23-phases-restantes`.
- Reprise de l'état « 38/68 Cypress verts » et des 30 échecs restants.

### Correctifs produit (défauts réels, reproduits par sonde DOM)

| Réf | Défaut | Cause racine | Preuve | Correctif |
|---|---|---|---|---|
| **R57** | `/dashboard` affichait l'ErrorBoundary (page entière en erreur) | `RangeError: Invalid time value` — `formatDate`/`formatDateTime` recevaient une date NULL (Dashboard.tsx:1551) | `utils-date.test.ts` (rouge→vert) | Helpers rendus défensifs (`657491b`) |
| **R58** | Ouvrir la PWA (ou le domaine nu) → **écran totalement blanc**, 0 page Ionic, aucun moyen de sortir | `<Route path="/">` contenait un `<Navigate>` **enfant**, ignoré par React Router (il attend `element=`). `/` = `start_url` du manifest → route matchée sans rien rendre | Sonde : `PATH=/ PAGES=0 BODYLEN=26` avant ; `root-redirect.cy.ts` 2/2 après | `element={<Navigate to="/splash" replace/>}` (`eca2052`) |
| **R60** | `/transaction/:id/edit` affichait « Impossible d'afficher cette page » (ErrorBoundary) dès que le cache transactions était rempli | `useTransactions()` faisait un `return` anticipé du cache CPU **avant** son `useQuery` → 4 hooks au 1er render, 3 au suivant → React « change in the order of Hooks » → `Should have a queue` → ErrorBoundary | Sonde console : `ERR ... useOrganizationRevision / useCategories / TransactionEdit` ; après : `LOGS=[]` ; `finance-deep` 5/5, `comprehensive-flow` 1/1 | Cache consulté **après** le hook (`71b1738`) |

### Spécs Cypress corrigées (défauts de test, pas de produit)

Motif systémique identifié : **la pile Ionic conserve les pages visitées
montées** (masquées via `.ion-page-hidden`). Un sélecteur global
(`cy.contains('button', …)`, `cy.get('h1')`, `cy.get('button[aria-label=…]')`)
résolvait l'exemplaire d'une page **masquée** → « element is not visible »
alors que l'app fonctionnait.

- `nav-bottom.cy.ts` 3/3 : onglet par défaut = « Cultes » (`cotisations`), pas « Événements ».
- `responsive-skeleton.cy.ts` 4/4 : prémisse obsolète après R57 (plus de squelette infini).
- `sessions.cy.ts` : `ensureAuth()` avant chaque `it()` (`testIsolation` Cypress 16 efface `localStorage`).
- `rbac-gates.cy.ts` 2/2 : idem R39 + scoping page active.
- `comprehensive-flow.cy.ts` 1/1 : réécrit — toutes les interactions scopées
  sur la page ACTIVE, `ion-select` en interface `ion-alert` (options =
  `button.alert-radio-button`, pas `ion-radio`), pas de bouton « Retour »
  sur `/history` (page de 1er niveau), édition attendue sur le
  pré-remplissage, « Entrées »/« Sorties » sont des `<p>` (pas des boutons).
- `root-redirect.cy.ts` (nouveau) : verrouille R58 (avec et sans session).

### Session 3 — suite complète (2026-10-23, ~20:47 UTC)

- **20:47** — Suite complète `npx cypress run --browser chromium` terminée :
  **27 specs / 70 tests / 50 verts / 20 rouges / 39 min 06 s**.
  20 specs vertes, 7 rouges.
- **Investigation R59** (écran noir après navigation depuis une liste) —
  5 sondes Cypress, ~55 min :
  - Sonde 1 (`/groups`) : 1 seule page visible, liste OK, 85 groupes.
  - Sonde 2 (clic groupe) : `VIS+INV:op0` → **écran noir** (contenu présent).
  - Sonde 3 (accès direct `/groups/:id`) : `VIS:op1` → **rendu correct**.
  - Sonde 4 (2ᵉ ouverture / préchargement du chunk) : toujours `op0`
    → ce n'est pas un chargement de chunk.
  - Sonde 5 (branche de chargement neutralisée, `LazyRoute` sans `<div>`)
    : toujours `op0` → hypothèses « identité `<IonPage>` » et « `<div>`
    intermédiaire » **éliminées**.
- Décision : budget de 30 min dépassé → **R59 consigné comme défaut produit
  ouvert (gravité HAUTE)** avec preuves et pistes, aucune modification de
  code conservée (changement minimal), suite du programme reprise
  (conforme au garde-fou « blocage > 30 min »).
- État git vérifié propre : seuls les fichiers `docs/agent-session/*` sont
  modifiés ; aucun fichier source parasite ; artefact
  `cypress/downloads/lumina_export_2026-10-23.pdf` restauré.
- **T2 (sauvegardes) clos** : `/workspace/backups/` contient
  `schema-20261022-1801.sql` (125 Ko, 42 `CREATE TABLE`) et
  `data-20261022-1802.sql` (1,1 Mo) — export logique complet de
  `hhgovvrnalibhgpakswi` (plan gratuit, sauvegardes classiques
  indisponibles → export `supabase db dump`, cf. RUNBOOK §Sauvegardes).


---

## Session 4 — 2026-10-23 (livraison : R59 corrige, R61 corrige, fusion)

- **Branche** : `agent/session-3-livraison` (PR #5). Aucun changement de branche.
- **T0 session 4** : 2026-10-23T22:2xZ (voir horodatages ci-dessous).

### R59 — ecran noir apres navigation vers une route parametree : CORRIGE

Diagnostic par sondes 24-28 (MutationObserver sur `ion-router-outlet`) :

- `ionNavWillChange` -> `ionNavDidChange` est bien emis, la transition se
  termine, **mais `ion-page-invisible` n'est jamais retiree**.
- Deux navigations observees : la 1re reussit (+501 ms), la 2e (+685 ms)
  laisse la nouvelle page invisible. Un seul `pushState`, un seul
  `transition()`, mais **deux** ajouts de `ion-page-invisible`.
- **Test decisif** : rendre `GroupDetail` en DIRECT (sans `lazy()` ni
  `LazyRoute`) => `VIS:op1` (rendu correct). Via `LazyRoute` => `op0`.

**CAUSE RACINE** : `React.lazy()` + `<Suspense>` dont le fallback rendait
un `<IonPage>` **a l'interieur** de `ion-router-outlet`. L'outlet
enregistre la **premiere** page rendue par la route comme « vue
entrante » : il capturait le squelette, lui ajoutait `ion-page-invisible`,
puis le remplacait par la vraie page (chunk arrive) qui heritait de l'etat
invisible -> contenu monte mais `opacity: 0`.

**CORRECTIF** : `PageSkeleton` (`src/ionic/routes/lazy-route.tsx`) ne rend
plus `<IonPage>`/`<IonContent>` mais un `<div>` neutre ; le fallback ne
participe plus au registre de vues de l'outlet. Le squelette de chargement
(UX) est conserve. Commit `93072b4`.

**PREUVE** : `groups-events.cy.ts` **0/3 -> 3/3** ; **3 passes
consecutives vertes** (`ge4.log`, `ge-stab1.log`, `ge-stab2.log`), 26-27 s
par passe (contre 3 min en echec). L'assertion de non-regression
(`ion-page` entrante visible apres un clic depuis la liste) est dans le
spec.

### Spec `groups-events.cy.ts` — defauts de test corriges

Motif systemique : `ion-router-outlet` **conserve montees** toutes les
pages visitees (masquees par `ion-page-hidden`). Un selecteur global
(`cy.contains('button', 'Retour')`, `cy.get('h1')`) fouillait donc aussi
la barre laterale `FeatureSidebar` (`visibility: hidden`) -> faux echecs
« element is not visible » alors que l'app fonctionnait.

- Tous les selecteurs sont scopes a la page active :
  `const PAGE = 'div.ion-page:not(.ion-page-hidden)'`.
- Bouton retour reel du detail groupe : `ion-back-button` (la spec
  cherchait un bouton « Retour » inexistant sur cette page).
- Titre du detail groupe : `ion-title` (pas de `<h1>` avant R61).
- Test 3 : `navigate(-1)` depuis `TransactionNew` revient sur le **detail**
  de l'evenement, pas sur la liste -> assertion corrigee.

### R61 — titre de niveau 1 sur le detail de groupe : CORRIGE

`IonTitle` n'expose pas de `role="heading"` : `/groups/:id` n'avait aucun
titre de niveau 1. Ajout d'un `<h1 className="sr-only">{orgUnit.name}</h1>`
(convention deja utilisee par Dashboard, Finance, TransactionNew).
Commit `5db7436`.

**Portee volontairement limitee** : 19 pages n'ont aucun `<h1>`, mais un
`<h1>` global dans `TopHeader` creerait un **doublon** sur les 24 pages
qui en ont deja un. Le reste est consigne en proposition (P35) plutot
qu'improvise.

**PREUVE** : `groups-events.cy.ts` **3/3** (assertion `h1` incluse) ;
**test NEGATIF** correctif retire via `git stash` => **2/3**, echec
« Expected to find element: `div.ion-page:not(.ion-page-hidden) h1` »
(l'assertion n'est donc pas vide).

### Fusion `origin/main` — 5 conflits documentaires resolus

Fichiers : `.openhands/memory/2026-10-23.md`,
`docs/agent-session/{JOURNAL,PROPOSITIONS,RAPPORT_FINAL,RISQUES}.md`.

Resolution : version de la branche conservee. **Justification verifiee, pas
supposee** : pour chacun des 5 fichiers, les lignes ajoutees par
`origin/main` (23, 74, 101, 122 et 187 lignes non vides) sont **toutes
deja presentes** dans la version de la branche -> **0 ligne perdue**. Le
cote `main` du conflit etait vide (la branche avait deja integre puis
etendu ces sections). Aucun fichier de **code** en conflit : les apports de
`origin/main` (DashboardOnboarding, SettingsProfile/Personalisation,
Tutorial, dataLayer, ci.yml, eslint.config.js) sont fusionnes
automatiquement. Commit `fa284bc`. `tsc --noEmit` => exit 0 sur l'arbre
fusionne.

### Fixture E2E — incoherence de role (donnee de test, pas defaut produit)

Constat : `profiles.role = 'MEMBRE'` alors que
`org_memberships.role = 'PASTEUR_PRINCIPAL'` pour le compte E2E. L'app lit
`profiles.role` (via `useCurrentUser` -> cle `lumina-user`), donc les
permissions du compte de test etaient celles d'un `MEMBRE`
(`transaction:create` absent -> bouton « Ajouter une transaction » masque,
d'ou l'echec du test 3).

**Ce n'est PAS un defaut produit** : les comptes REELS
(`kairosiluminate@gmail.com`, `journey@example.com`) ont
`profiles.role = org_memberships.role` (coherents). Verification par
requete sur `profiles` JOIN `org_memberships`.

**Correction de la fixture** (2 comptes E2E uniquement) :
`UPDATE public.profiles p SET role = m.role FROM public.org_memberships m
WHERE m.user_id = p.id AND p.email IN (...) AND p.role IS DISTINCT FROM m.role;`
**Retour arriere documente** : `UPDATE public.profiles SET role = 'MEMBRE'
WHERE id = '87afea21-bad7-453b-9ae5-4ad1da2ca13f';`

**Ambiguite consignee (P36)** : le depot a deux sources de verite du role
(`profiles.role` lu par l'app, `org_memberships.role` ecrit par
`settle_invitation_claim`) et aucun trigger ne les synchronise. Impact
limite aujourd'hui (les chemins d'invitation mettent a jour les deux), mais
c'est une fragilite a traiter.

---

## Session 5 — 2026-10-24 (clôture des défauts critiques)

**Heure** : début 00:35 UTC, clôture du lot à 00:52 UTC (T0 + ~30 h).
**Phase** : clôture du défaut de corruption de données (priorité irréversible).

### Actions et résultats

1. **Quantification du double encodage jsonb (R65)** — contrôle exhaustif
   des 10 colonnes `jsonb` : **218 valeurs corrompues sur 6 colonnes**,
   dont `form_definitions.fields` à **100 %** (34/34) et
   `events.budget_items` à 158/305. R43 n'avait mesuré que `budget_items`.
2. **Sauvegarde avant écriture** — taille du payload mesurée (2,2 Ko) ;
   table de sauvegarde `_jsonb_backfill_20261024` créée par la migration
   elle-même, ce qui rend le rollback exact.
3. **Dry-run** sur copies temporaires → 0 chaîne restante, aucune perte.
4. **Migration `20261024000001`** appliquée → **0 valeur `jsonb_typeof =
   'string'`** sur toute la base.
5. **Rollback rejoué sur copies** → restaure 158/34/8/8/5 et laisse
   intacts les 147 `budget_items` déjà sains. Réversibilité prouvée.
6. **Correctif amont** : `parseBudgetItems` délègue à `parseJsonbValue`.
   Un défaut a été trouvé par les nouveaux tests : `typeof` ne distingue
   pas un objet d'un tableau, donc un objet rendu là où un tableau est
   attendu passait le contrôle et aurait fait planter le `.map()`.
   Corrigé par `Array.isArray(fallback) !== Array.isArray(value)`.
7. **18 tests unitaires ajoutés** (`src/lib/__tests__/jsonb.test.ts`).
8. **Typecheck CI réparé (R71)** : `tsc --noEmit` à la racine ne vérifiait
   aucun fichier (`"files": []`). Passage à `tsc -b --noEmit`, qui a
   révélé 1 erreur supplémentaire dans `vite.config.ts` (littéraux
   `worker.format` / `build.sourcemap`), corrigée.
9. **Commit** `cc76fb3`.

### Vérifications (preuves)

| Commande | Résultat |
|---|---|
| `npx tsc -b --noEmit` | **0 erreur** (99 avant) |
| `npx vitest run` | **1091 / 1091** verts, 65 fichiers |
| `npx vite build` | exit **0** |
| `SQL` jsonb_typeof | 0 valeur `string` |

### Décisions prises (DECISIONS.md)

- D-S5-1 : rattraper la donnée plutôt que tolérer seulement.
- D-S5-2 : table de sauvegarde → rollback exact (pas de ré-encodage global).
- D-S5-3 : `"null"` → `jsonb null`, asymétrie assumée (non réversible à l'identique).
- D-S5-4 : activer `tsc -b` en CI malgré le gel (correctif ciblé, risque vérifié nul).


### Vérification Cypress (session 5)

Lancée en tâche de fond pendant la rédaction, contre un serveur local.

| Spec | `vite preview` (prod) | `vite` (dev) |
|---|---|---|
| `cloud-sync.cy.ts` | **1/1** | — |
| `finance-deep.cy.ts` | **5/5** | — |
| `events-tasks.cy.ts` | **1/1** | — |
| `cross-tenant.cy.ts` | 0/1 (échec 4 min 10 s) | **1/1** (24 s) |

**Diagnostic de l'échec `cross-tenant`** : il lit `window.__psSupabaseClient`,
publié par `publishDevDiagnostics()` qui sort immédiatement si
`!import.meta.env.DEV`. Sur un build de production, le global n'existe pas.
**Aucune régression de l'app** : sur le serveur de dev (celui qu'utilise le
script officiel `scripts/run-cypress.sh`), le spec passe 1/1.
Consigné comme R72 (piège de lancement des tests, à documenter).


### Vérification de durabilité du correctif jsonb (R65)

Le défaut était silencieux : la seule réparation des données ne suffit pas
si le chemin d'écriture reproduit la corruption. Les trois maillons ont été
vérifiés :

1. **Données** — migration appliquée, 0 valeur `string` restante.
2. **Écriture** — `coerceJsonbColumns()` est appelé sur `opData` dans
   `pushCrudTransaction` (`SupabaseConnector.ts:506`), et cet `opData` est
   utilisé pour **PUT et PATCH**. Les écritures passent donc désormais un
   tableau/objet, pas une chaîne. `JSONB_COLUMNS` couvre 10 colonnes.
3. **Lecture** — `parseJsonbValue` (6 points d'appel dans `dataLayer.ts`)
   tolère les trois formes (chaîne, double encodage, forme correcte).

Conclusion : le défaut est fermé de bout en bout, pas seulement rattrapé.


### Rectificatif R70 / découverte R74 — « preuve avant affirmation »

En vérifiant les 5 correctifs annoncés dans le commit `0702cd2`, le point 5
(R70) s'est révélé **mal décrit**. Vérifications menées :

- `git grep 'targetRole: "ADMIN"'` → 3 occurrences restantes
  (`FormFill.tsx`, `InvitationClaim.tsx`, `InvitationEmit.tsx`).
- `NotificationSendData.targetRole` est typé `Role` **mais** n'est utilisé
  que pour remplir `notifications.action_type` (`notification/index.ts:115`).
- `select action_type, count(*) from notifications group by 1` →
  `EVENT_CREATED` 311, `INVITATION_RECEIVED` 11, `FORM_SUBMITTED` 1 :
  **aucun rôle**. La colonne porte un type d'événement.
- `getNotifIcon` ne reconnaît que `TRANSACTION_PENDING` /
  `TRANSACTION_APPROVED` / `BUDGET_EXCEEDED` → **0 ligne** en base : toutes
  les notifications prennent l'icône par défaut.

Conclusion : le défaut réel n'était pas « notification sans destinataire »
mais (a) une erreur de type masquée par `as any` — corrigée — et (b) une
incohérence sémantique de `action_type` — **ouverte**, consignée R74 et
proposée P-NEW-6. Le message de commit `0702cd2` n'est pas réécrit
(interdiction de réécrire l'historique) ; le rectificatif ci-dessus et dans
RISQUES.md fait foi.


### Bug produit corrigé — R75 « Soumetteur » affichait un UUID

Détecté par l'échec Cypress `forms-v2.cy.ts` T5 (message explicite : attendu
« E2E Org », reçu un UUID). Confirmé en base par jointure. Corrigé dans
`FormSubmissions.tsx` (résolution `profiles` locale, repli sur l'id) ;
nouveau test unitaire vert ; `tsc -b` 0 erreur ; les 4 tests unitaires
existants du fichier restent verts (repli).

Deux échecs du spec `forms-fields.cy.ts` analysés : ce sont des **défauts de
test**, pas de code —
1. `cy.contains('button', /Créer/i).last()` ne renvoie qu'**un** élément
   (le premier = bouton d'ouverture, recouvert par le scrim) : le bouton de
   soumission n'était jamais atteint. Ciblé par `aria-label` unique.
2. Le bouton de suppression est ciblé par `aria-label="Supprimer le champ
   <label>"` (la ligne n'est pas un ancêtre direct de la `<p>` du label).


---

## Suite de session (session 6) — 2026-10-24, à partir de 01:05Z

Reprise après la session 5. Ordre suivi : rectifier une affirmation inexacte,
exploiter la suite Cypress en cours comme source de défauts réels, corriger,
tester, documenter.

### 1. Rectificatif R70 propagé (docs)

Le message du commit `0702cd2` décrivait R70 comme « la notification de
suppression n'était rattachée à aucun rôle destinataire ». Vérification en
base : `targetRole` n'alimente que `notifications.action_type`, et les valeurs
réelles de cette colonne sont des types d'événement. Le rectificatif a été
propagé dans RISQUES.md (R74), FEATURES.md (ligne R70) et RAPPORT_FINAL.md.

### 2. Suite Cypress complète exploitée comme détecteur (16/28 → …)

Bilan des 15 premières specs : **38 tests verts, 3 rouges**, tous analysés :

| Échec | Nature | Cause | Traitement |
|---|---|---|---|
| `forms-fields` « creates a custom field… » | défaut de **test** | `cy.contains('button', /Créer/i)` ne renvoie qu'un élément (bouton d'ouverture, recouvert par le scrim) : `.last()` n'atteignait pas le bouton de soumission | cible `aria-label="Créer le champ"` |
| `forms-fields` « deletes a custom field… » | défaut de **test** | ligne non-ancêtre direct du label ; le bouton porte `aria-label="Supprimer le champ <label>"` | cible par `aria-label` construit depuis le texte |
| `forms-v2` T5 « Soumetteur » | **bug produit** | la colonne affichait l'UUID `submitted_by` au lieu du nom | **R75 corrigé** |

### 3. Bug produit R75 — « Soumetteur » affichait un UUID (corrigé)

`form_submissions.submitted_by` référence `profiles.id`. Preuve en base :
`87afea21-…` = profil « E2E Org ». Correction dans `FormSubmissions.tsx` :
résolution depuis la table locale `profiles` (import dynamique + `try/catch`),
utilisée par la cellule, la recherche plein-texte et le tri ; **repli** sur
l'id si PowerSync est indisponible → aucune régression. La résolution est
bornée par la RLS `profiles_select` (profils de sa propre organisation).
Même correction appliquée à la colonne « Rejeté par » (`rejected_by`), qui
souffrait du défaut identique (aucune donnée concernée aujourd'hui :
`rejected_by = null`).

Preuves : nouveau test unitaire « affiche le NOM du soumetteur » (5/5 verts
dans `FormSubmissions-table.test.tsx`, les 4 cas existants préservés par le
repli) ; `tsc -b` 0 erreur.

### 4. Bug produit R76 — icônes de notification toutes génériques (corrigé)

`getNotifIcon` ne mappait que `TRANSACTION_PENDING` / `_APPROVED` /
`BUDGET_EXCEEDED` — trois valeurs **absentes** de la table `notifications`.
Valeurs réelles : `EVENT_CREATED` (311), `INVITATION_RECEIVED` (11),
`FORM_SUBMITTED` (1). Donc 100 % des notifications affichaient l'icône
générique. Correction : les trois types réels produisent une icône distincte ;
sélection isolée dans `notifIconKey()` (testable sans rendu).
Preuve : `src/pages/__tests__/Notifications-icon.test.tsx` 3/3.

### 5. T2 (sauvegardes) — vérifié

Les exports logiques existent toujours et sont intègres
(`/workspace/backups/schema-20261022-1801.sql` 125 Ko / 3 828 lignes ;
`data-20261022-1802.sql` 1,1 Mo / 4 730 lignes). Sauvegardes Supabase
classiques impossibles en plan gratuit → alternative retenue (export
`supabase db dump` + rotation documentée). Reste propriétaire : planifier
l'export (P31) et tester une restauration.

### Note d'exécution

La suite Cypress a été lancée **avant** ces correctifs : le serveur Vite en
mode dev a rechargé les sources modifiées à chaud (HMR) en cours de run. Ce
run ne vaut donc que comme **détecteur de défauts** ; la validation finale
sera faite sur code gelé, par une nouvelle exécution complète.


### 6. Bug produit R77 — coquille « Trésurier » dans le badge de rôle (corrigé)

`SettingsProfile.tsx` écrivait `TREASURIER: "Trésurier"` alors que tous les
autres libellés de l'app disent « Trésorier ». Deux comptes réels ont ce rôle
→ faute visible. Corrigé ; test ajouté (badge `profile-role-badge`).


### 7. Bug produit R78 — piste d'audit : 14 actions admin affichées « Modifié »

`audit_entries` contient ADMIN_ASSIGNED (8), ADMIN_REMOVED (3),
ADMIN_REVOKED (2), ADMIN_REINSTATED (1). `ACTION_META` ne les couvrait pas →
toutes retombaient sur « Modifié ». Sur un changement de privilèges, la
piste d'audit devenait trompeuse. Quatre libellés explicites ajoutés, plus
`OrgAdmin` → « Administrateur d'organisation ». Test : `Trace-labels.test.tsx`
(3/3).


### 8. Défaut R79 — échec de persistance de notification avalé en silence (corrigé)

`sendNotification` avalait l'échec d'INSERT dans `notifications` : si la base
locale était indisponible, la notification disparaissait sans trace. Ajout
d'un `console.warn` contextualisé (le chemin OneSignal reste inchangé).
Preuve par test ajouté, **validé par retrait du correctif** (le test échoue
sans lui). 21/21 verts.

### 9. Défaut de test — `org-reports.cy.ts` visait un `<p>` de bannière

Le nom de l'organisation créée apparaît dans la bannière de succès
(« … créée (opérationnelle) »), rendue AVANT l'arborescence.
`cy.contains(orgAName)` matchait ce `<p>`, dont le `.closest('div')` ne
contient aucun bouton d'action → échec après 480 s. Ancrage corrigé sur le
`<span>` de la carte ; timeout global ramené à 180 s.


## Clôture — constat tardif : la base de référence E2E était invalide

### 10. Le run Cypress de référence portait sur un build obsolète (R81)

Signal d'alarme : un run de 29 min sur 28 specs annonçait 5 specs / 9 échecs.
Deux vérifications ont montré que ce run n'était pas exploitable :

1. `stat dist/index.html` → build de **01:06** ; les correctifs R75–R78 sont
   commités **01:15–01:17**. `grep "noms de soumetteurs indisponibles"
   dist/assets/*.js` → **0 occurrence** : le bundle était antérieur au
   correctif qu'il était censé valider.
2. Les messages d'échec citaient `data-dyad-id` (tag du serveur de dev) et un
   `.click()` SANS `{ force: true }` sur `button[aria-label="Créer un nouveau
   champ"]`, alors que le spec sur disque porte `{ force: true }` depuis le
   commit `8259109`. Le log ne pouvait pas provenir du code courant.

**Conclusion** : ces 5 specs / 9 échecs ne sont pas imputables au code
courant. Ils sont écartés du rapport final comme non concluants.

### 11. `cross-tenant.cy.ts` exige le serveur de dev, pas un build

Le spec d'isolation inter-organisations échoue volontairement sur un build de
production : il lit `window.__psSupabaseClient`, publié seulement en mode dev,
et lève un message explicite (R72). Relancer la suite sur
`http://127.0.0.1:4174` (build) faisait donc échouer **systématiquement** le
spec de sécurité le plus important — risque de fausse conclusion « régression
d'isolation ». Décision : environnement de référence = serveur de dev
`npx vite` sur `:8080`, conformément à `scripts/run-cypress.sh` et au RUNBOOK.

### 12. Défaut produit R80 — `profiles` n'est synchronisé que pour soi-même

`powersync/sync-config.yaml:71-73` filtre `profiles` sur
`WHERE id = auth.user_id()` : un client ne possède QUE son propre profil.
Or `FormSubmissions.tsx` affiche le nom d'AUTRES utilisateurs depuis cette
table. Vérifié en base : la soumission `a7a99491-…` porte
`submitted_by = 87afea21-…`, présent dans `profiles` (« E2E Org ») mais absent
de la réplique locale. Le correctif R75 était donc nécessaire mais **non
suffisant** → consigné R80 (OUVERT, moyenne). Correction propre = élargir le
stream + `powersync deploy sync-config` (jeton `PS_ADMIN_TOKEN` absent) :
décision de ne pas créer de divergence client/serveur. Voir DECISIONS.md.

### 13. Suite de référence relancée dans l'environnement canonique

`rm -rf dist` ; `npx vite build` (7 s, 0 erreur) ; serveur de dev relancé sur
`:8080` (prêt en 877 ms) ; Xvfb installé (`sudo apt-get install xvfb`, requis
par Cypress headless — `Error: spawn Xvfb ENOENT`) ; suite complète 28 specs
lancée en tâche de fond sur `CYPRESS_BASE_URL=http://127.0.0.1:8080`.

### 14. Suite de référence (serveur dev :8080) — résultats et verdicts

Run complet 28 specs sur `http://127.0.0.1:8080`. Constat en cours de route :

- `cloud-sync.cy.ts` **1/1** (offline → reconnexion → Supabase) ✅
- `cross-tenant.cy.ts` **1/1** (isolation inter-organisations) ✅ — sur serveur
  dev, conformément à R72/R81. Confirme qu'il n'y a **pas** de régression
  d'isolation.
- `events-tasks.cy.ts` **1/1** ✅
- `comprehensive-flow.cy.ts` **1/1** ✅
- `calendar.cy.ts` **1/1** ✅
- `forms-fields.cy.ts` **4/4** ✅ — les 2 échecs du run « 29 min » étaient
  donc bien imputables au **build obsolète** (R81), pas au code. Preuve
  directe que R81 était la bonne explication.
- `forms-v2.cy.ts` **5/6** — seul échec : T5 « Soumetteur », attendu
  « E2E Org », reçu l'UUID `87afea21-…`. C'est la **manifestation exacte de
  R80** (le stream `profiles` ne synchronise que le profil de l'utilisateur
  courant, donc le nom d'un autre membre est irrésoluble localement). Le
  correctif R75 était nécessaire mais non suffisant.
- `org-reports.cy.ts` **échec** — défaut de test non déterministe, R82
  (sélection du parent = dernière org créée → auto-empoisonnement).

### 15. Défauts de test corrigés après le run de référence (preuves)

| Spec | Avant | Après | Nature du défaut |
|---|---|---|---|
| `rls-isolation-hardened.cy.ts` | 3/4 | **4/4** | Assertion de sécurité comparant un **nombre** d'organisations à un seuil magique (`<5`) au lieu de tester l'**isolation**. Le seuil était franchi légitimement (4 orgs administrées + l'org courante). Remplacée par un invariant exact : aucun ancêtre exposé par `org_family` hors du périmètre RLS de `organizations`, plus un contrôle négatif sur `org-1`. Assertion **plus forte**, pas plus faible. |
| `reports-budgets.cy.ts` | 3/5 | **5/5** | (1) Le titre `/reports` est rendu par `TopHeader` dans un `<p>`, pas un `<h1/h2/h3>`. (2) Les fonctions d'agrégation sont des `IonSelectOption`, pas des boutons : ciblage du dernier `ion-select`. |
| `forms-fields.cy.ts` | 2/4 (build obsolète) | **4/4** | Confirmé : les 2 échecs venaient du build de 01:06, pas du code (R81). |
| `org-reports.cy.ts` | 0/1 | 0/1 (inchangé) | Défaut de test non déterministe (R82). Correctif tenté, **révoqué** faute de validation possible : l'hypothèse « le nom de la Mère est dans le popover » est **fausse** (mesuré). Spec restauré à son état commité. |
| `performance-batch.cy.ts` | 0/3 | en cours | Assertions serveur en clé **anon** (0 ligne par RLS), navigation non déterministe, formulaire d'événement sans hydratation. |

### 16. Tentative R80 par la table `members` — écartée après vérification

Piste explorée : `members` est synchronisée org-wide (`WHERE org_id = ?`) et
porte `first_name`/`last_name`/`email` ; elle aurait pu fournir les noms
localement, **sans** redéploiement PowerSync. Vérification en base : `members.id`
est un **id texte** distinct des UUID de `profiles` (0 ligne pour
`id = 87afea21-…`), et aucune ligne ne correspond au soumetteur. `members` est
une entité métier distincte (adhérents), pas une projection des profils :
**aucun contournement local n'existe**. R80 exige bien l'élargissement du
stream + redéploiement. Conclusion consignée, décision D-S6-1 confirmée.

### 17. Clôture de session — heure et état final

- **Heure de clôture** : 2026-10-24T03:15Z. Budget T0+12h30 (2026-10-24T06:26Z)
  largement dépassé en temps mural du fait des exécutions Cypress longues
  (`performance-batch` seul : 13 min ; suite complète : ~30 min). Session
  conduite en **mode clôture** : aucun développement de fonctionnalité, seuls
  des correctifs de test ciblés et de la documentation.
- **Corrections de test validées** (preuves d'exécution) :
  `rls-isolation-hardened` 4/4, `reports-budgets` 5/5, `forms-fields` 4/4,
  `performance-batch` calendrier 1/1.
- **Correctif révoqué** : `org-reports` (R82) — hypothèse invalidée par la
  mesure, spec restauré à son état commité.
- **Défauts réels documentés non corrigés** : R80 (moyenne), R82 (moyenne),
  R83 (moyenne). Aucun défaut de gravité haute ou critique laissé ouvert.
- **Isolation inter-organisations** : vérifiée en base avec le rôle réel
  (5 organisations sur 9 exposées, toutes dans le périmètre RLS) + spec
  `cross-tenant` vert. Aucune fuite.
- **Fichiers de suivi** : `docs/agent-session/` (FEATURES, DOMAINE, JOURNAL,
  DECISIONS, RISQUES, PROPOSITIONS, RUNBOOK, RAPPORT_FINAL).
- **Résidu assumé** : `cypress/e2e/zz-debug.cy.ts` (spec de débogage, vert) est
  laissé en place pour ne pas modifier la base de référence de 28 specs
  pendant le gel ; à supprimer par le propriétaire.

### 18. R85 — test du chemin d'écriture hors ligne (livré)

- **Contexte** : la PR #6 était en conflit avec `main` (sessions 3-5 fusionnées).
  Fusion de `origin/main` dans la branche avec `-Xignore-all-space` : les diffs
  massifs des deux côtés étaient du **bruit d'espaces** (GroupDetail.tsx :
  3 ajouts / 15 suppressions réelles, pas 1900 lignes). 6 conflits, tous
  documentaires, tous en `add/add` avec base vide : vérifié que **0 ligne de
  `main` n'était absente** de la version de branche → résolution `--ours`.
  Après fusion : `tsc -b` 0 erreur, **1100/1100** unitaires. PR redevenue
  MERGEABLE.
- **Erreur corrigée dans le rapport** : il était écrit que
  `cloud-sync.cy.ts` « prouvait » la synchronisation offline→online. **Faux** :
  cette spec insère elle-même les entités via `cy.request` (contexte Node)
  puis vérifie leur présence — assertion tautologique, flush stubbe
  (`__psFlushResult = { flushed: true, passes: 0, opsTotal: 0 }`).
- **Nouveau test** `cypress/e2e/offline-write-sync.cy.ts` : **1/1, 3 passes
  consécutives**, 12-13 s. Prouve que l'écriture faite par l'interface
  (1) atterrit dans SQLite (`org_id` correct, 12345 → 1234500 centimes),
  (2) entre dans `ps_crud` en op `PUT` — **le chemin d'écriture hors ligne est
  réellement capturé**, ce qui n'était prouvé nulle part —, (3) contrôle
  négatif : pas encore sur le serveur.
- **Limite mesurée, non supposée** : en Chromium headless le worker WASM
  PowerSync ne se connecte jamais (`connected:false` après 120 s, sans erreur).
  `__psFlushCrudUpload` retourne `passes: 0, opsTotal: 0` alors que `ps_crud`
  contient l'op → le **vidage** de la file n'est pas testable en CI. Procédure
  de vérification manuelle ajoutée dans RUNBOOK.md.
- **Faux positifs de diagnostic écartés en cours de route** : (a) le montant
  `12345` → `1234500` n'est pas un bug, le stockage est en **centimes** ;
  (b) la page de détail vide n'a pas pu être tranchée (capture DOM trop
  précoce) — piste notée, non conclue.


### 19. Non-régression après fusion + R86

- Run de 13 specs sur la branche fusionnée : **10 specs vertes**, dont mes 3
  specs modifiés et les 2 specs de synchronisation. **3 specs rouges** :
  `groups-events` (0/3), `sessions` (0/3), `comprehensive-flow` (0/1).
- **Vérification que la fusion n'est pas en cause** : `origin/main` **intact**
  monté dans un worktree isolé (serveur 8081, même `.env.local`) → les 3 mêmes
  specs échouent **de la même façon**, avec un message explicite de la suite :
  `after login: /auth (attendu /onboarding ou /dashboard — … 503 Render /
  rate limit GoTrue …)`. La cause est **l'authentification Supabase partagée**
  (quota GoTrue), dégradée par la répétition des runs de la session.
- **Preuve directe** : `git diff --stat origin/main HEAD` sur
  `lazy-route.tsx`, `App.tsx`, `PageSkeletons.tsx`, `utils.ts` → **vide**.
  Les correctifs R57/R58/R59/R60 de la session 3 sont donc bien dans la
  branche. Seul `dataLayer.ts` diffère (+30/−17, mes modifications).
- Consigné en **R86** (moyenne, environnement de test).

### 20. R87 — défaut produit critique corrigé : /finance toujours vide

- **Découverte** : en cherchant pourquoi le détail d'une transaction écrite
  localement restait « introuvable », j'ai instrumenté temporairement
  `resource.list()` (instrumentation retirée après usage) et capturé la requête
  réelle de `/finance` :
  `SELECT * FROM transaction WHERE org_id = ?` → `near "transaction": syntax error`.
- **Cause** : `toTableName()` mappait `Group`/`Event`/`Member`/`Account`/
  `Category`/`Role` mais **pas `Transaction`** → repli `toLowerCase()` =
  `transaction` (singulier), alors que la table PowerSync est `transactions`.
  `Finance.tsx` avalait l'erreur (`.catch(() => setLoading(false))`), donc
  « Aucune transaction trouvée », « Revenus 0 », **sans aucun signal**.
- **Défaut préexistant** : `git diff --stat origin/main HEAD` sur
  `resource/index.ts` et `Finance.tsx` → **vide** (identiques à `main`).
  Il n'est donc pas introduit par la fusion, et il touchait la production.
- **Correctif** : 1 ligne (`Transaction: "transactions"`).
- **Test de reproduction** : bloc « R87 » dans `resource.test.ts` — il inspecte
  le SQL émis et refuse toute table hors schéma. **Vérifié dans les deux sens** :
  **2 échecs** avec le correctif retiré, **24/24** avec. Le mock existant
  renvoyait `[]` pour une table inconnue : il masquait le défaut depuis le début.
- **Preuve E2E** : `offline-write-sync.cy.ts` (1/1, 27 s) vérifie que la
  transaction créée par l'interface **apparaît dans `/finance`**. Mesuré : avant
  correctif « contientLabel=false », après « contientLabel=true ».
- **Non-régression** : suite unitaire **1102/1102**.
- **Défauts liés documentés** : **D1** (détail « introuvable » : `useTransactions`
  exige `isPowerSyncReady`, sinon repli sur un store non hydraté — 17 hooks
  concernés) et **R88** (erreurs avalées dans `Finance.tsx`). Non corrigés :
  correctif = 17 hooks à reprendre + vérification complète, incompatible avec la
  règle de gel.

### 21. Suite E2E complète + preuve de non-régression du correctif R87

- **Suite complète sur ma branche** : **29 specs**, 16 échecs répartis sur 10
  specs (`groups-events` 3, `sessions` 3, `members` 2, `performance-batch` 2,
  `comprehensive-flow`, `cross-tenant`, `events-tasks`, `forms-v2`,
  `org-reports`, `persistence` 1 chacun).
- **Nature des échecs** : authentification (« 0 page visible », en-tête absent,
  « after login: /auth ») et synchronisation PowerSync (« 0 à atteindre 50 »,
  « 0 à atteindre 20 »). **Aucun** ne concerne `/finance`, la table
  `transactions` ou le nom de table.
- **Preuve de non-régression (R86)** : sur `origin/main` **intact**
  (`c11aad7`, worktree isolé `/tmp/lm2`, Vite `:8082`, `.env.local` copié), les
  5 specs clés (`groups-events`, `sessions`, `performance-batch`, `persistence`,
  `members`) échouent **toutes** avec le **même** message
  « after login: /auth … 503 Render / rate limit GoTrue ». Les 16 échecs sont
  donc environnementaux, **pas** imputables au correctif R87.
- **Mon test R87** (`offline-write-sync.cy.ts`) : **1/1, 15 s**, y compris dans
  la suite complète — la transaction créée par l'interface apparaît bien dans
  `/finance`.
- **Suite unitaire** : **1102/1102** (1100 + 2 tests R87).
- **Classe de défaut R88** inventoriée : 23 `.catch()` qui avalent l'erreur dans
  `src/pages/` (état vide silencieux, aucune trace).

### 22. R89 — la synchronisation était rompue dans les DEUX SENS (découverte majeure)

Vérification croisée code ↔ base (projet `hhgovvrnalibhgpakswi`) : **0
transaction** côté serveur alors que l'app est utilisée (964 événements,
108 profils). Diagnostic par instrumentation temporaire
(`window.__psFlushCrudUpload` + capture console) :

- **89.a (montée)** : `23503` — `category_id = "cat-dime"` (pack client,
  `src/packs/church/index.ts:53`) viole `transactions_category_id_fkey`
  (le serveur n'a que `cat-1 … cat-9`). Insertion SQL contrôlée : `cat-1`
  **réussit** (puis rollback), `cat-dime` échoue. → **toute** transaction jetée.
- **89.b (descente)** : `PSYNC_S2305` — « Too many parameter query results
  (limit of 1000) » sur `/sync/stream`, à cause du filtre
  `org_id IN (SELECT org_id FROM profiles WHERE id = auth.user_id())` du
  `sync-config.yaml`. `connected=false`, `hasSynced=false` → rien ne descend.
- **89.c (mensonge)** : `uploadData OK` journalisé **après** un `FATAL-SKIP`,
  et `fatalSkipped: 0` → perte de données invisible. **CORRIGÉ** : compteurs
  `pushedOps`/`skippedOps`, plus de faux « OK », `__psFlushResult.ok` expose le
  résultat réel.

Tests 89.c : 2 tests dans `src/lib/__tests__/connector-schema-filter.test.ts`,
vérifiés dans les deux sens (1 échec sans correctif, 7/7 avec). Suite unitaire
**1104/1104**, `tsc --noEmit` propre.

### 23. 89.c vérifié en navigateur réel + piège `tsc`

- **Preuve navigateur (chromium réel)** : `__psFlushResult` renvoie désormais
  `{"flushed":true,"passes":1,"opsTotal":1,"fatalSkipped":0,"skipped":1,"ok":false}`.
  Avant, le même cas renvoyait `{"passes":1,"opsTotal":1,"fatalSkipped":0}` —
  **indistinguable d'un succès**. La perte de données est maintenant visible.
- **Piège corrigé** : `npx tsc --noEmit` ne vérifie rien (`tsconfig.json` racine
  a `"files": []`). Le contrôle réel est `npx tsc -b` (celui de la CI). Il a
  détecté une variable non définie introduite par mon premier jet de correctif ;
  `tsc --noEmit`, lui, la laissait passer. Consigné dans RUNBOOK.md.
- Après correction : `tsc -b` propre, suite unitaire **1104/1104**.

### 24. Preuves de stabilité (passes répétées) et état final

- **Tests unitaires critiques** (`resource.test.ts` = R87,
  `connector-schema-filter.test.ts` = R89.c) : **3 passes consécutives,
  31/31** chaque fois.
- **Test E2E critique** (`offline-write-sync.cy.ts`) : **3 passes consécutives,
  1/1** chaque fois. Pas d'instabilité.
- **Suite unitaire complète** : 67 fichiers, **1104/1104**.
- **`npx tsc -b`** (le vrai contrôle, cf. piège `tsc --noEmit`) : propre.
- **CI GitHub Actions sur la PR #7** : `TypeScript Check`, `Unit Tests (Vitest)`,
  `E2E (Cypress)`, `Lint Check`, `Security Audit`, `Build Application` —
  **tous verts**. Seul `Android Debug APK` échoue : défaut préexistant R90
  (20 échecs sur 20 historiquement, toutes branches).
- **Temps** : la session a largement dépassé le budget initial de 12 h 30
  (dépassement acté dans le contexte de mission). Le travail s'est concentré sur
  la valeur réelle : deux défauts produits majeurs trouvés et prouvés (R87
  corrigé, R89 diagnostiqué + 89.c corrigé), plutôt que sur le remplissage du
  budget.

## Session 9 (2026-10-24) — Phase 1 (suite) + robustesse 4 mois

Heure de reprise : 2026-10-24T08:0x Z. Branches : `agent/session-8-security`
(PR #10) puis `agent/session-9-integrity` (PR #11).

### 25. Ops — anti-pause Supabase + sauvegarde planifiée (PR #10)

- **Découverte** : `supabase/keep-alive.sql` affirmait que le heartbeat
  `pg_cron` « immunise contre la pause auto ». **Faux** — la doc officielle
  (« Project Pausing ») : la pause Free dépend de l'activité **API**
  (« a few user requests to the database each day »), pas de l'activité
  interne. Le projet restait exposé à une pause à 7 jours.
- **Correctif** : `.github/workflows/keep-alive.yml` (ping REST + Auth toutes
  les 48 h). Dépôt **public** → schedules GitHub non désactivés.
  **Preuve** : run `40078250833` **success**, log `HTTP 200`.
- **Sauvegarde P31** : `.github/workflows/backup.yml` + `scripts/backup-supabase.sh`
  (export schéma+données, SHA-256, chiffrement AES256, rotation 30 j ; artefact
  publié **uniquement chiffré** car dépôt public). Activation par secret
  `SUPABASE_DB_URL` (RUNBOOK §Sauvegardes). Ni `pg_dump` ni Docker ne sont
  disponibles dans l'environnement d'agent → non exécutable ici.
- Décisions D-S7-1 / D-S7-2 ; risques R94 (corrigé) ; R18 mis à jour.

### 26. Sécurité — régression R91.b + garde R91.c (PR #11)

- **R91.b (régression de mon propre correctif R91)** : la politique
  `invitation_claims_insert` posée par `20261024000002` contenait
  `EXISTS (SELECT 1 FROM public.invitations ...)`, **soumis à la RLS de
  l'appelant**. Depuis que `invitations_select` est restreint aux
  gestionnaires, un invité non gestionnaire ne « voit » pas la ligne → son
  claim était **refusé (42501)** : le parcours « réclamer un code » était
  cassé. Correctif `20261024000003` : retirer ce `EXISTS` (redondant avec la
  FK `invitation_claims_invitation_id_fkey`, hors RLS).
- **R91.c (défense en profondeur fiable)** : la RLS est aveugle (elle ne
  distingue pas « profil ACTIF » de « non visible »). La vérification est
  déplacée dans le trigger **SECURITY DEFINER** `settle_invitation_claim`
  (`20261024000004`) : refus d'élever un profil **déjà ACTIF** sauf si un
  gestionnaire d'invitations est l'auteur (`ROLE_ESCALATION_BLOCKED`).
- **Preuves** (transactions annulées, 0 résidu) :
  - invité non gestionnaire : `visibles=0`, self/other `REFUSE 42501`,
    claim sur profil PENDING = `ACCEPTE`, `pending_apres=ACTIVE` (flux rétabli) ;
  - appelant gestionnaire : `INSERT ACCEPTE` puis
    `REJECTED_DUPLICATE / ROLE_ESCALATION_BLOCKED`, `role ADMIN inchangé`.
- **Test** `invitation-rls-hardening.test.ts` étendu → **10/10**.
- Migrations réversibles (rollbacks 000003 / 000004 fournis).
- **Vérifs** : suite unitaire complète **1108/1108** (68 fichiers) ;
  `npx tsc -b` propre ; CI `main` `f955781` **success**.

### 27. Découverte de modèle (rôle `ADMIN`)

- `profiles.role` / `org_memberships.role` contiennent `ADMIN` (1 ligne =
  admin central), mais le type TS `Role` (`src/types/index.ts`) **ne l'inclut
  pas**, et `can_manage_invitations` / `canManageFinance` ne l'autorisent pas.
  Non corrigé (défaut de modèle de rôles, décision produit) — voir R16/R20 et
  PROPOSITIONS. Sans impact prouvé aujourd'hui : les invitations INSERT/UPDATE/
  DELETE exigent déjà `can_manage_invitations`, donc un `ADMIN` n'émet pas
  d'invitation aujourd'hui.
