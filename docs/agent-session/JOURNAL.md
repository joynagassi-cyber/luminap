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
