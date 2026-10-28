# SECURITY — Lumina

> Document **dérivé du code et des migrations réelles**. Chaque affirmation
> renvoie à un fichier du dépôt. Fiabilité marquée : `[Prouvé]` (lu/vérifié ou
> mesuré par un gate), `[Probable]`, `[Non vérifié]`.
>
> Dernière mise à jour : 2026-10-28 (phase 16).

## 1. Modèle de menace et principes

Lumina est multi-tenant par **organisation**. Le modèle d'isolation repose sur
trois piliers `[Prouvé]` :

1. **RLS Postgres** activée sur **chaque** table du schéma `public` — toute
   lecture/écriture passe par les policies Supabase, jamais par un accès direct.
2. **`SECURITY DEFINER` maîtrisé** — les helpers d'autorisation sont des
   fonctions `SECURITY DEFINER` à `search_path` figé ; les fonctions de trigger
   et de règlement ne sont **pas** exposées en RPC.
3. **Aucune donnée sensible côté client** — pas de service key, pas de secret
   commité ; les seules clés embarquées sont **publiques** (anon/publishable).

Principe de moindre privilège : le rôle `anon` n'a aucun accès aux données ;
`authenticated` est filtré par la RLS ; `service_role` (jamais côté client) est
utilisé uniquement par la CI/les migrations.

## 2. Row Level Security (RLS)

- **Couverture** : la garde d'inventaire `src/lib/__tests__/rls-inventory.test.ts`
  fige l'inventaire mesuré (`docs/agent/rls-inventory.json`) : **43 tables**, RLS
  activée partout, ≥1 politique partout `[Prouvé]`. Deux tables sont en
  *deny-all* volontaire et listées explicitement : `keep_alive` et
  `_jsonb_backfill_20261024`.
- **Régénération** : la requête d'audit est en tête de `rls-inventory.test.ts`
  (`pg_class.relrowsecurity` + `pg_policies`) — elle doit être rejouée après tout
  changement de schéma/RLS, et l'inventaire re-figé.
- **Isolation par organisation** : les policies filtrent sur `org_id` via les
  helpers `is_org_member(uid, org_id)` et `is_org_admin(uid, org_id)`, avec
  `initplan_uid()` pour éviter la récursion de policy (migrations
  `20260928000002_fix_is_org_member_rls_recursion.sql`,
  `20261012000001_fix_initplan_uid_rls.sql`).

Politiques structurantes `[Prouvé]` :

| Table | Policy | Effet |
|---|---|---|
| `grants` | `grants_read_org` | Un membre ne lit que les grants de **ses** orgs ACTIVE. |
| `grants` | `grants_insert_admin` / `grants_update_admin` | Écriture réservée à `is_org_admin(initplan_uid(), org_id)`. |
| `role_permissions` | `role_permissions_read` | Lecture seule (`USING (true)`), table de référence. |

Le cloisonnement des `grants` par `org_id` (migration
`20261027000010_grants_org_scope.sql`) corrige une **fuite inter-org** : avant,
un grant `subject_type='user'` valait dans **toutes** les organisations.

## 3. `SECURITY DEFINER` et la règle « aucune fonction de trigger en RPC »

Règle fondatrice (**R103**, ADR **D-P8-1**) : *aucune fonction de trigger
(`RETURNS trigger`) ni la fonction de règlement `settle_invitation_claim` ne doit
être exécutable par `anon`/`authenticated` via l'API RPC.*

### 3.1 Le défaut R103

`public.settle_invitation_claim(uuid)` est `SECURITY DEFINER` et ne vérifiait pas
que l'appelant est propriétaire de la claim. Appelable via
`POST /rest/v1/rpc/settle_invitation_claim`, elle permettait à **n'importe quel**
utilisateur authentifié d'élever un tiers (profil ACTIVE + rôle/org réécrits +
`org_memberships` + `grants`). Preuve consignée dans l'en-tête de la migration
`20261026000005_revoke_rpc_on_trigger_functions.sql` `[Prouvé]`.

### 3.2 Le correctif (3 volets)

Migration `20261026000005_revoke_rpc_on_trigger_functions.sql` `[Prouvé]` :

1. **Garde `pg_trigger_depth() = 0`** dans `settle_invitation_claim` → tout appel
   RPC direct lève `42501`.
2. **`REVOKE EXECUTE`** sur `settle_invitation_claim` et sur **toute** fonction
   `RETURNS trigger` (balayage générique `pg_proc.prorettype = 'trigger'`) pour
   `PUBLIC`, `anon`, `authenticated`.
3. Les wrappers de trigger redeviennent `SECURITY DEFINER` (l'invocation système
   d'une fonction de trigger ne requiert pas `EXECUTE`).

### 3.3 La rechute R115 et le durcissement d'**ordre**

Deux migrations ultérieures ont **contourné** R103 `[Prouvé]` (migration
`20261028000001_harden_trigger_function_rpc_surface.sql`) :

- **(A)** `denorm_child_org_id` / `denorm_cascade_org_id` (créées par
  `20261027000001`) sont `SECURITY DEFINER` et `EXECUTE`-ables par
  `anon`/`authenticated` — elles ont été créées **après** le balayage de R103.
- **(B)** `20261027000011` a recréé `settle_invitation_claim` depuis le corps
  pré-R103 → la garde `pg_trigger_depth()` a été **silencieusement perdue** (le
  `REVOKE` tenait encore, donc la faille d'escalade n'était pas rouverte, mais la
  défense en profondeur l'était).

**Exploitabilité mesurée (honnêteté)** : un appel direct d'une fonction
`RETURNS trigger` est refusé par PostgreSQL lui-même
(`0A000: trigger functions can only be called as triggers`). La surface (A)
n'était donc **pas** exploitable ; elle est refermée par cohérence et pour
l'avenir. Migration `20261028000001` : garde restaurée + `REVOKE` ré-appliqué +
balayage générique rejoué.

**Garde de non-régression** : `src/lib/__tests__/revoke-trigger-functions.test.ts`
rejoue les migrations **dans l'ordre** (création → balayage → revoke) et évalue
l'**état final** — invariant : aucune fonction de trigger `SECURITY DEFINER` n'est
exécutable par `anon`/`authenticated`, et `settle_invitation_claim` conserve la
garde `pg_trigger_depth()`. Le test est **non-vacue** (3/4 échecs sans le
correctif) `[Prouvé]`.

### 3.4 Compromis assumé

Les helpers RLS (`is_org_member`, `is_org_admin`, `has_permission`, …) restent
`SECURITY DEFINER` et exécutables par `authenticated` (ADR **D-P8-1**) : ils sont
conçus pour être appelés dans les policies et prennent l'uid en paramètre. Les
retirer casserait les policies. Seules les fonctions **à effet de bord** sont
fermées.

## 4. Rédaction des PII et erreurs client

`src/lib/clientErrors.ts` `[Prouvé]` :

- `redact(text)` masque les **emails** (`<email>`), les **JWT** (`<jwt>`) et les
  en-têtes `Bearer <token>` avant tout envoi.
- Politique PII (en-tête du module) : ne jamais journaliser emails, noms ou
  contenu libre — seulement route, version d'app, rôle, org id, plateforme et le
  message/stack.
- Les handlers `window.onerror` et `unhandledrejection` sont installés une seule
  fois (`installClientErrorCapture`, idempotent) et transmettent un contexte
  **rédigé** à Sentry (`src/lib/sentry.ts`).
- `captureClientError()` capture les erreurs **gérées** (R88) — sans elle, un
  `.catch()` vide laisserait un échec invisible. Un tampon mémoire borné
  (20 entrées, jamais persisté) alimente la page `/settings/health`.
- `installChunkErrorRecovery()` recharge **une fois** par session
  (`sessionStorage["lumina-chunk-reloaded"]`) sur `vite:preloadError` (anti-boucle).

## 5. Échappement CSV (injection de formule)

`src/lib/csv.ts` `[Prouvé]` — tout export passe par `escapeCsvCell` /
`escapeCsvRow` (ADR **D-P8-2`) :

1. **Injection de formule** : une cellule commençant par `=`, `+`, `-`, `@`, TAB,
   CR ou LF (y compris après des caractères de contrôle C0/C1 de tête) est
   préfixée d'une apostrophe. Un champ `=HYPERLINK(...)` ou `=cmd|'/c calc'!A0`
   ne s'exécute donc pas à l'ouverture dans Excel/LibreOffice/Sheets.
2. **Citation RFC 4180** : si la valeur contient le délimiteur, un guillemet, un
   saut de ligne ou un retour chariot, elle est entourée de guillemets et les
   guillemets internes sont doublés.

Consommateurs : `src/lib/export.ts` (`escapeCsvRow`) et `src/lib/formSystem.ts`
(`escapeCsvCell`). Test : `src/lib/__tests__/csv-escape.test.ts`.

## 6. Entrées hostiles (XSS, caractères de contrôle)

`src/lib/sanitize.ts` `[Prouvé]` fournit :

- `escapeHtml` : neutralise `& < > " '` pour les chemins qui **construisent** une
  chaîne (export, log, `innerHTML`, valeur CSS).
- `normalizeText` : supprime les caractères de contrôle C0/C1 dangereux
  (`\u0000-\u0008`, `\u000E-\u001F` dont ESC, `\u007F-\u009F`), normalise les
  espaces, plafonne la longueur (`MAX_TEXT_LENGTH = 2000`).

Note : le rendu React échappe déjà les enfants (pas de HTML parsé) ; ces helpers
couvrent les chemins de construction de chaîne.

## 7. Secrets

- **Jamais commités** `[Prouvé]` — `.gitignore` exclut `.env`, `.env.local`,
  les keystores (`*.keystore`, `*.jks`, `/keystore.b64`), le vault de secrets
  (`.secrets-vault/`) et les sauvegardes (`backups/`).
- `src/lib/auth.ts` **lève** si `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  sont absents — plus de fallback silencieux vers le projet de dev.
- Les clés embarquées dans le bundle sont **publiques** par construction
  (publishable/anon + DSN Sentry). Le `service_role` n'apparaît nulle part côté
  client.
- Source maps : générées **uniquement** si Sentry est configuré, en mode
  `hidden`, et **supprimées** du bundle après upload (`vite.config.ts`,
  `filesToDeleteAfterUpload`) — pas de fuite de source en `dist/`.
- CI : les secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `POWERSYNC_URL`, …) sont
  injectés via GitHub Actions Secrets, jamais en clair (`ci.yml`).

## 8. Gardes d'inventaire (preuves sans identifiants)

Ces gardes rendent des invariants de sécurité **vérifiables en CI sans secret** :

| Garde | Invariant |
|---|---|
| `src/lib/__tests__/rls-inventory.test.ts` | Toute table `public` a RLS + ≥1 politique (sauf deny-all listé). |
| `src/lib/__tests__/revoke-trigger-functions.test.ts` | Aucune fonction de trigger `SECURITY DEFINER` exécutable par anon/authenticated. |
| `src/lib/__tests__/role-model-drift.test.ts` | Égalité rôles TS ↔ SQL ↔ instantané mesuré (`role-model.json`). |
| `src/lib/__tests__/jsonb-inventory.test.ts` | Toute colonne `jsonb` couverte par `JSONB_COLUMNS` (anti double-encodage). |
| `docs/agent/rls-inventory.json`, `docs/agent/role-model.json`, `docs/agent/permissions.matrix.json` | Instantanés mesurés figés. |

## 9. Risques de sécurité connus et ouverts

Source : `docs/agent/RISQUES.md`.

| Risque | Sujet | Statut |
|---|---|---|
| **R104** | Protection des mots de passe compromis (HaveIBeenPwned) désactivée — `auth_leaked_password_protection` (advisor WARN). Non activable sur le plan Free (« available on Pro Plans and up »). | **OUVERT** (escalade propriétaire) |
| **R109** | Rôle `ADMIN` présent en données/RLS mais absent du modèle TS → le compte admin central n'a **aucun** droit `has_permission`. Choix de modèle de rôles non tranché. | **OUVERT** (décision propriétaire) |
| **R107** | `needs-membership` (et `forbidden`) déclarés mais **inertes** : `App.tsx` n'alimente pas `isOrgMember`/`hasPermission` → défense en profondeur côté client absente. | **OUVERT** (dépend R109/R16) |
| **R16** | `profiles.role` et `org_memberships.role` divergent (deux sources de vérité du rôle). | **OUVERT** |
| **R18** | Aucune sauvegarde ni PITR sur le projet Supabase. | **OUVERT** (critique) |
| **R80** | Le stream `profiles` ne synchronise que le profil de l'utilisateur connecté (choix assumé, D-S6-1). | **OUVERT** (moyenne) |
| **R97** | Advisors `rls_enabled_no_policy` : 2 tables *deny-all* volontaires (`keep_alive`, `_jsonb_backfill_20261024`) — non modifiées (D-S9-4). | **ASSUMÉ** |

Risques **corrigés** (pour mémoire) : R100 (code d'invitation CSPRNG), R101/R102
(triggers finance), R103 (escalade RPC), R111 (claim ↔ `auth.users`), R113
(Rules of Hooks), R114 (CI Node 22), R115 (surface RPC des triggers), R105
(permissions `invitation:*` orphelines — partiel).

## 10. Renvois

- Architecture et flux de données → [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Tests et gates → [`TESTING.md`](./TESTING.md)
- Décisions de sécurité → `docs/agent/DECISIONS.md` (D-P8-1, D-P8-2, D-S11-1, D-S11-2)
- Risques détaillés → `docs/agent/RISQUES.md`
