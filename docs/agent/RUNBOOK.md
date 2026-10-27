# RUNBOOK — Lumina

Guide d'exploitation. À lire en premier si quelque chose ne va pas.

## Lancer l'application

```bash
npm ci                 # installe les dependances (version du lockfile)
npx vite --port 8080 --host 127.0.0.1
```
- App : <http://127.0.0.1:8080/>
- Prérequis : `.env` / `.env.local` renseignés (URL Supabase, clé publique,
  URL PowerSync). Aucune clé de service n'est nécessaire : l'app est
  **front-first** (Supabase + PowerSync depuis le navigateur).

## Lancer les tests

```bash
# 1. Tests unitaires (Vitest) — rapides, aucun navigateur requis
npx vitest run
npx vitest run --reporter=json --outputFile=/tmp/vitest.json   # compte exact

# 2. Types — `tsc -b` vérifie réellement app + node.
#    ATTENTION : `npx tsc --noEmit` à la racine ne vérifie AUCUN fichier
#    (le tsconfig.json racine a `"files": []`) et sort toujours en succès.
npx tsc -b --noEmit

# 3. E2E (Cypress) — exigent un serveur Vite deja lance ET un ecran X
DISPLAY=:99 CYPRESS_CACHE_FOLDER=/workspace/.cypress-cache \
  npx cypress run --config baseUrl=http://127.0.0.1:8080,video=false \
  --spec cypress/e2e/cross-tenant.cy.ts,cypress/e2e/events-tasks.cy.ts
```
> **Piège (R72) : lancez la suite contre le serveur de DEV (`npx vite`),
> pas contre un build de production (`vite preview` ou le déploiement).**
> Les specs lisent `window.__psSupabaseClient`, publié par
> `publishDevDiagnostics()` qui retourne immédiatement si
> `!import.meta.env.DEV`. Sur un build de production, le global n'existe
> pas : les specs échouent après 4 minutes d'attente, sans que l'app soit
> en cause. Le script officiel `scripts/run-cypress.sh` lance bien `vite`
> (dev) — utilisez-le.

**Dans cet environnement**, Cypress doit tourner **détaché**
(`setsid nohup … &`) : lancé au premier plan, Electron meurt en SIGSEGV
(`exit 139`, log vide). Il exige aussi `Xvfb :99` (voir ci-dessous).

## En cas de panne : ou regarder

| Symptôme | Où regarder |
|---|---|
| Page blanche / « Impossible d'afficher cette page » | console du navigateur ; error boundary de `App` ; Sentry (`$SENTRY_PERSONAL_TOKEN`) |
| Données absentes ou figées | état de synchronisation PowerSync (`SyncIndicator`), onglet « Réseau » ; tables `ps_*` en base |
| Erreur d'écriture en base | logs Supabase (Logs Explorer) ; politiques RLS de la table visée |
| Cypress échoue instantanément (`exit 139`) | `Xvfb` est-il lancé ? serveur Vite est-il actif ? |
| `Xvfb: command not found` | réinstaller : `sudo apt-get update && sudo apt-get install -y xvfb` |

Relancer l'environnement graphique si nécessaire :
```bash
rm -f /tmp/.X99-lock
setsid nohup Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
```

## CI

- Workflows : `.github/workflows/` (`gh run list` pour l'état).
- Jetons : `GITHUB_TOKEN` (Actions), `SUPABASE_ACCESS_TOKEN` (base),
  `PS_ADMIN_TOKEN` (PowerSync Cloud).
- Si la CI est indisponible, rejouer la suite en local (voir ci-dessus) et
  le signaler : un résultat local n'a pas la valeur d'une preuve CI.

### ⚠️ La suite Cypress est structurellement rouge (R98) — à traiter en priorité

Au 2026-10-24, les **20 derniers runs Cypress sur `main` sont tous en échec**
(aucun vert depuis le 2026-10-19). Les échecs sont **déterministes** : les
mêmes **10 specs** échouent à chaque run (13 tests sur ~40).

**Ce n'est PAS un bug produit démontré, et ce n'est PAS la parallélisation.**
Une expérience a été menée (branche `agent/session-13-ci-cypress-test`, run
`40080015253`, **1 seul conteneur**) : les mêmes 10 specs échouent, aux mêmes
assertions. La parallélisation (2 conteneurs) a donc été **réfutée** comme
cause. La cause réelle est l'**environnement E2E** : ces specs dépendent de la
**synchronisation PowerSync** et du **contexte d'organisation**, indisponibles
en CI. C'est déjà diagnostiqué dans RISQUES.md :
- **R53** — `sessions.cy.ts` : réplique PowerSync vide → aucun compte listé ;
- **R83** — `performance-batch` : intercept qui ne laisse pas passer la
  requête (`req.destroy()` sans `req.continue()`), contexte d'org non posé →
  **0 ligne atteint le serveur** ;
- **R72** — specs dépendant d'un global exposé seulement en mode dev ;
- **R54** — le job E2E de `ci.yml` ne teste rien de réel (`simple-check` +
  `continue-on-error: true`).

**Conséquence pour vous :** tant que ce point n'est pas réglé, la CI Cypress
**ne détecte aucune régression** — son rouge est permanent et connu. Ne vous
fiez pas à elle pour valider un changement.

**Marche à suivre** (cf. PROPOSITIONS.md P41, priorité critique) :
1. Fournir à la CI un **compte de test** dont la réplique PowerSync se peuple
   (secret `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`) et un **contexte
   d'organisation** stable.
2. Réparer les specs selon R53/R83/R72 (le motif éprouvé est `cloud-sync.cy.ts`
   pour l'interaction réseau, **mais** cf. R83 : `cloud-sync` n'exerce pas le
   vrai worker PowerSync).
3. Écrire **le** test manquant : le chemin d'écriture hors-ligne
   (SQLite → queue d'upload → Supabase), qui n'a **aucune** couverture
   aujourd'hui. C'est le point le plus important pour un usage quotidien hors
   ligne.

**Ne pas fusionner** la branche `agent/session-13-ci-cypress-test` : elle ne
corrige rien (preuve négative conservée comme trace dans JOURNAL.md).


## Surveiller la taille de la base (quota du plan gratuit)

Projet Supabase gratuit : **500 Mo**. `audit_entries` et `notifications`
croissent sans purge. Base pleine → **toutes** les écritures refusées, y
compris les transactions. Mesure au 2026-10-24 : **20 Mo (4 %)** avec
48 `audit_entries` et 314 `notifications` → risque structurel, non
imminent, mais **non surveillé** : rien n'avertit avant la limite.

```sql
-- Taille totale, en Mo, à comparer au quota de 500 Mo
select pg_size_pretty(pg_database_size(current_database())) as taille;

-- Les 10 tables les plus volumineuses (dont leurs index)
select relname,
       pg_size_pretty(pg_total_relation_size(c.oid)) as total
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by pg_total_relation_size(c.oid) desc
 limit 10;

-- Volume des tables à croissance non bornée
select 'audit_entries' as t, count(*) from public.audit_entries
union all select 'notifications', count(*) from public.notifications
union all select 'events', count(*) from public.events;
```

**Seuil d'alerte recommandé : 400 Mo (80 %).** Au-delà, purger
`audit_entries`/`notifications` après archivage (cf. PROPOSITIONS.md,
P-NEW-3), ou passer au plan payant.

## Vérifier l'intégrité du format jsonb (défaut R65)

Le double encodage jsonb était **silencieux**. Cette requête doit toujours
renvoyer **0** sur la colonne `corrompues` ; toute valeur non nulle est une
régression à corriger immédiatement.

```sql
select 'events.budget_items' as col, count(*) filter (where jsonb_typeof(budget_items) = 'string') as corrompues from public.events
union all select 'form_definitions.fields', count(*) filter (where jsonb_typeof(fields) = 'string') from public.form_definitions
union all select 'form_submissions.data', count(*) filter (where jsonb_typeof(data) = 'string') from public.form_submissions
union all select 'invitations.grants_payload', count(*) filter (where jsonb_typeof(grants_payload) = 'string') from public.invitations
union all select 'invitations.tags_payload', count(*) filter (where jsonb_typeof(tags_payload) = 'string') from public.invitations
union all select 'org_reports.content', count(*) filter (where jsonb_typeof(content) = 'string') from public.org_reports
union all select 'report_definitions.filters', count(*) filter (where jsonb_typeof(filters) = 'string') from public.report_definitions
union all select 'audit_entries.before_state', count(*) filter (where jsonb_typeof(before_state) = 'string') from public.audit_entries
union all select 'audit_entries.after_state', count(*) filter (where jsonb_typeof(after_state) = 'string') from public.audit_entries
order by 1;
```

`custom_field_values.value` est volontairement exclu : cette colonne accepte
légitimement des valeurs scalaires (texte libre).

## Tâches planifiées, quotas et échéances à surveiller

- **Sauvegardes Supabase** : `walg_enabled=true` mais `pitr_enabled=false`
  et `backups=[]` → **aucune sauvegarde exploitable**. À activer d'urgence.
- **Pause de projet inactif** : un projet Supabase gratuit/inactif peut être
  mis en pause — vérifier l'activité, sinon les écritures échouent.
- **PowerSync Cloud** : `powersync deploy sync-config` / `service-config`
  exigent `PS_ADMIN_TOKEN`.
- **Expiration** : clés et certificats (jetons ci-dessus) ; à renouveler.
- **Croissance** : `audit_entries` et `notifications` croissent sans purge ;
  surveiller la taille (voir PROPOSITIONS.md).

## Incidents les plus probables (pré-mortem)

1. **Fuite inter-organisations** → vérifier les politiques RLS des tables
   concernées et rejouer `cypress/e2e/cross-tenant.cy.ts`.
2. **Restauration impossible faute de sauvegarde** → priorité 1 ci-dessus.
3. **Bug de synchronisation après conflit** → consulter `ps_crud` et les
   journaux PowerSync ; rejouer `cypress/e2e/cloud-sync.cy.ts`.
4. **Écran qui tombe sur des données mal encodées (jsonb)** → le défaut
   R65 est **corrigé** (données rattrapées, écriture coercée, lecture
   tolérante). Si malgré tout un écran tombe : exécuter la requête
   « Vérifier l'intégrité du format jsonb » (section dédiée ci-dessus).
   Toute colonne `corrompues > 0` indique une régression du chemin
   d'écriture — corriger **la source de l'écriture**
   (`coerceJsonbColumns` / `JSONB_COLUMNS` dans `src/lib/jsonb.ts`), pas
   les données seules.
5. **Indicateur de synchronisation bloqué sur « hors ligne »** → vérifier
   `db.currentStatus` (PowerSync v2 ; `db.status` n'existe plus — R66) et
   les journaux `[PowerSync]` de la console.
6. **Envoi de rapport qui échoue systématiquement** → vérifier qu'aucun
   import d'icône nommée `File` ne masque le constructeur global `File`
   (R67) ; `new File(...)` doit fonctionner.
7. **Déconnexions aléatoires** → vérifier qu'un second client Supabase ne
   partage pas la même `storageKey` (double rotation du refresh token) ;
   cf. correctif T3.
8. **La CI passe alors que le code ne compile pas** → vérifier que le job
   exécute bien `tsc -b --noEmit` et **non** `tsc --noEmit` à la racine
   (ce dernier ne vérifie aucun fichier — R71).
9. **Toute la suite Cypress échoue d'un coup** → vérifier que le serveur
   ciblé est bien le serveur de **dev** (`npx vite`), pas un build de
   production (R72), et que `Xvfb :99` tourne.

---


## Sauvegardes et restauration

État constaté (2026-10-22) : `walg_enabled=true`, `pitr_enabled=false`,
`backups=[]`. **Aucune sauvegarde exploitable n'existe côté Supabase.**

### Créer une sauvegarde maintenant
```bash
cd <dépôt>
npx supabase@latest db dump --linked -f backup-schema.sql          # schéma
npx supabase@latest db dump --linked --data-only -f backup-data.sql # données
```
Prérequis : projet lié (`supabase/.temp/project-ref`) et
`SUPABASE_ACCESS_TOKEN` (ou `supabase login`).
Un export a été produit pendant la session (hors dépôt — données réelles) :
- `/workspace/backups/remote_schema.sql` (125 Ko, 42 `CREATE TABLE`)
- `/workspace/backups/remote_data.sql` (1,1 Mo, 21 `INSERT`)
- copies horodatées : `schema-20261022-1801.sql`, `data-20261022-1802.sql`
**Ces fichiers vivent hors du dépôt Git** (ils contiennent des données réelles :
ne pas les commiter). À récupérer par le propriétaire avant que l'environnement
de test soit détruit.

### Restaurer
```bash
psql "$DATABASE_URL" -f backup-schema.sql   # structure
psql "$DATABASE_URL" -f backup-data.sql     # données
```
Les contraintes de clés étrangères circulaires (`organizations`,
`event_tasks`) peuvent exiger `--disable-triggers` ou une restauration
table par table.

### À faire par le propriétaire (priorité critique)
1. Activer les **sauvegardes planifiées** (voire le PITR) dans le dashboard
   Supabase : sans cela, une perte de données est irréversible.
   Vérifié le 2026-10-24 : `walg_enabled=true` mais `pitr_enabled=false` et
   `backups=[]` → **aucune sauvegarde exploitable** à cette date.
2. Vérifier la rétention et tester **une restauration** au moins une fois.
3. Activer la **protection des mots de passe compromis**
   (Dashboard → Authentication → Password Security). L'Advisor Supabase la
   signale désactivée (WARN `auth_leaked_password_protection`).
4. Vérifier les **alertes GitHub** `secret-scanning` et `code-scanning`
   (Dashboard → Settings → Code security). Le jeton utilisé en session ne
   permet pas de les lire (`403 Resource not accessible by integration`) :
   leur état est **non vérifié**.
5. **Ne pas** « corriger » les 7 avertissements
   `authenticated_security_definer_function_executable` de l'Advisor
   Supabase : ce sont les helpers d'isolation, indispensables aux policies
   RLS (cf. RISQUES R64-bis). Les passer en `SECURITY INVOKER` rouvrirait
   la fuite inter-organisations.

## Revenir en arrière sur une migration
Chaque migration de cette session a son script inverse :
```bash
psql "$DATABASE_URL" -f supabase/migrations/rollback/<version>_rollback.sql
```
| Version | Objet | Inverse |
|---|---|---|
| 20261022000008 | vues `org_family`/`org_federation` (RLS) | `rollback/20261022000008_rollback.sql` |
| 20261022000009 | durcissement SECURITY DEFINER | `rollback/20261022000009_rollback.sql` |
| 20261022000010 | escalade `org_memberships` | `rollback/20261022000010_rollback.sql` |
| 20261022000011 | `profiles.role` immuable | `rollback/20261022000011_rollback.sql` |
| 20261022000012 | `upsert_profile` (rôle) | `rollback/20261022000012_rollback.sql` |
| 20261022000013 | isolation Storage | `rollback/20261022000013_rollback.sql` |
| 20261022000014 | `profiles.role` à l'INSERT | `rollback/20261022000014_rollback.sql` |
| 20261024000001 | rattrapage du double encodage jsonb (données) | `rollback/20261024000001_rollback.sql` |

### Cas particulier : 20261024000001 (rattrapage jsonb)

C'est une migration de **données**, pas de schéma. Elle a créé une table de
sauvegarde `public._jsonb_backfill_20261024` qui contient, pour chaque
valeur remplacée, sa valeur d'origine. C'est elle qui rend le retour
arrière **exact** (aucune valeur n'est devinée) :

```bash
psql "$DATABASE_URL" -f supabase/migrations/rollback/20261024000001_rollback.sql
```

- Restaure 158 `events.budget_items`, 34 `form_definitions.fields`,
  8 + 8 `invitations.*`, 5 `audit_entries.after_state`.
- **Ne touche pas** les 147 `budget_items` déjà valides (c'est l'intérêt de
  la table de sauvegarde par rapport à un ré-encodage global).
- Supprime la table de sauvegarde à la fin.

**Quand supprimer la table de sauvegarde ?** Une fois la migration
considérée comme acquise, exécuter :
```sql
DROP TABLE public._jsonb_backfill_20261024;
```
C'est sans risque une fois le rattrapage validé, et cela libère l'alerte
`rls_enabled_no_policy` que l'Advisor Supabase signale pour cette table.


---

## Vérifier la synchronisation hors ligne dans un vrai navigateur

Le vidage de la file d'upload PowerSync **ne peut pas être testé en CI**
(worker WASM gelé en headless). À vérifier à la main après toute modification
touchant `src/lib/powersync/` ou `src/lib/dataLayer.ts` :

1. Ouvrir l'application dans un navigateur **normal** (pas headless) et se
   connecter.
2. Attendre l'indicateur de synchronisation (il doit passer à « en ligne »).
   Si besoin, inspecter en console : `__psDb.currentStatus` doit montrer
   `connected: true` et `hasSynced: true`.
3. Créer une transaction : `/transaction/new`, montant `12345`, description
   `verif-sync-<horodatage>`.
4. Attendre ~40 s (cycle d'upload du worker).
5. Contrôler la file locale — elle doit être **vide** :
   ```js
   await __psDb.getAll('SELECT * FROM ps_crud')   // → []
   ```
6. Contrôler le serveur (SQL) : la ligne doit exister.
   ```sql
   select id, amount, org_id, description
   from transactions
   where description like 'verif-sync-%'
   order by created_at desc limit 5;
   ```
   Le montant attendu est **en centimes** (12345 saisi → `1234500`).
7. En cas d'échec : lire `__psDb.currentStatus.uploadError` et
   `downloadError`. Une op qui reste dans `ps_crud` signale un rejet côté
   serveur (RLS, contrainte, ou `org_id` invalide — vérifier que
   `lumina-active-org` correspond bien à l'organisation de l'utilisateur).

Le test automatisé `cypress/e2e/offline-write-sync.cy.ts` couvre les étapes 3
et 5 **partiellement** (écriture locale + présence dans `ps_crud`), mais pas
le vidage.

```bash
npx cypress run --e2e --browser chromium \
  --spec cypress/e2e/offline-write-sync.cy.ts
```

## Vérifier le type (piège de l'environnement)

- **`npx tsc --noEmit` ne vérifie RIEN** dans ce dépôt : `tsconfig.json` a
  `"files": []` (config racine « solution »), donc aucune source n'est incluse.
  Il sort toujours en succès.
- Le contrôle réel (celui de la CI, `typecheck`) est **`npx tsc -b`**. Il détecte
  bien les erreurs de type dans `src/`.
- Vérifié le 2026-10-24 : une variable non définie dans
  `src/lib/powersync/index.ts` échappe à `tsc --noEmit` mais est bien signalée
  par `tsc -b` (`error TS2552: Cannot find name …`).
- Conséquence : toujours lancer `npx tsc -b` avant de conclure qu'un changement
  est typé correctement.


## Sauvegarder la base (P31) — AUTOMATISÉ (à activer par un secret)

Le plan Supabase **gratuit** ne fournit **aucune** sauvegarde téléchargeable
(« Database backups are not available for download for Free Plan projects »).
La protection est donc un **export logique planifié hors Supabase**. C'est
désormais outillé dans le dépôt :

- `.github/workflows/backup.yml` — **hebdomadaire, lundi 03:00 UTC** (= 04:00 à
  Cotonou). Historique du cron : `0 3 * * *` (quotidien) jusqu'au 27/10/2026,
  puis `0 3 * * 0` (dimanche) après #52, et **`0 3 * * 1` (lundi)** à appliquer
  via `docs/agent/patches/backup-yml-faux-vert.patch`.
- `scripts/backup-supabase.sh` — export schéma + données, empreintes SHA-256,
  chiffrement AES256 optionnel, rotation 30 jours.

### Planification : ce qui est possible et ce qui ne l'est pas

| Sujet | À retenir |
|---|---|
| Fuseau horaire | **UTC uniquement**. GitHub n'offre ni fuseau ni heure d'été. Cotonou = UTC+1 toute l'année → soustraire 1 h. |
| Jour | `0`=dim, **`1`=lundi**, `2`=mardi, `3`=mercredi, `4`=jeudi, `5`=vendredi, `6`=samedi (`0` et `7` = dimanche). |
| Branche | Le cron n'est lu que sur la **branche par défaut** (`main`). Modifier le fichier sur une branche de travail ne change **rien** aux exécutions planifiées. |
| Ponctualité | **Non garanti.** Mesuré : cron `03:00 UTC` → runs réels à `07:56`, `08:17`, `08:30` UTC les 25, 26 et 27/10/2026 (**~5 h de retard**). Ne pas bâtir de dépendance sur l'heure exacte ; lancer `workflow_dispatch` pour tester. |
| Désactivation | Un dépôt **public** sans activité pendant **60 jours** voit ses schedules coupés par GitHub. `keep-alive.yml` (toutes les 48 h) évite le problème. |
| Minimum | Pas plus d'une exécution par **5 minutes**, et GitHub recommande d'éviter les heures rondes (`0` minute) où la charge est maximale. |
| Test immédiat | *Actions* → « Sauvegarde Supabase » → **Run workflow** (`workflow_dispatch`). |

Formules utiles (cron à 5 champs `min heure jour-du-mois mois jour-de-semaine`) :

```yaml
- cron: '0 3 * * 1'    # lundi 04:00 Cotonou   ← retenu
- cron: '0 2 * * 1'    # lundi 03:00 Cotonou (2 h UTC)
- cron: '0 23 * * 0'   # dimanche 23:00 UTC = lundi 00:00 Cotonou
- cron: '0 3 * * 1,4'  # lundi ET jeudi
- cron: '0 3 1 * *'    # le 1er de chaque mois
```

### Mise en service (une seule fois)

1. Récupérer la chaîne de connexion : tableau de bord Supabase →
   *Project Settings* → *Database* → *Connection string* → onglet **URI**
   (rôle `postgres`, mot de passe de la base). La **percent-encoder** si le
   mot de passe contient des caractères spéciaux.

   > #### ⚠️ Prendre le **Session pooler**, JAMAIS la « Direct connection »
   >
   > Vérifié le 2026-10-27 (run `40531962063`, échec après 48 s) :
   >
   > ```
   > pg_dump: error: connection to server at "db.hhgovvrnalibhgpakswi.supabase.co"
   >   (2a05:d01c:874:6b01:e75b:1568:eaf6:c53), port 5432 failed: Network is unreachable
   > Your network does not support IPv6, which is required for direct connections
   > to the database.
   > ```
   >
   > | Hôte | A (IPv4) | AAAA (IPv6) |
   > |---|---|---|
   > | `db.<ref>.supabase.co` — connexion **directe** | **aucun** | `2a05:d01c:…` |
   > | `aws-0-<region>.pooler.supabase.com` — **pooler** | oui | aucun |
   >
   > L'hôte direct n'existe **qu'en IPv6** ; les runners GitHub Actions n'ont
   > pas d'IPv6. La forme retenue est donc :
   >
   > ```
   > postgresql://postgres.<ref>:<MDP_PERCENT_ENCODÉ>@aws-0-<region>.pooler.supabase.com:5432/postgres
   > ```
   >
   > (utilisateur `postgres.<ref>`, port **5432** = session pooler ; le port
   > 6543 = transaction pooler, inadapté à `pg_dump`). Le mot de passe ne
   > change pas : seul l'hôte et le nom d'utilisateur diffèrent de la
   > connexion directe.
2. GitHub → *Settings* → *Secrets and variables* → *Actions* → créer :
   - `SUPABASE_DB_URL` = la chaîne de connexion complète ;
   - `BACKUP_GPG_PASSPHRASE` = une phrase de passe (active le chiffrement ;
     **recommandé** — sans elle, le workflow ne publie aucun artefact car le
     dépôt est **public**).
3. Onglet *Actions* → « Sauvegarde Supabase » → *Run workflow* pour valider.

### Pourquoi un secret est indispensable

Le service MCP Supabase permet des requêtes SQL mais **pas** un `pg_dump`, et
`pg_dump`/Docker ne sont pas disponibles dans l'environnement d'agent. La
sauvegarde doit donc tourner là où le mot de passe de la base est disponible :
GitHub Actions, via le secret `SUPABASE_DB_URL`.

### Rétention hors-site (recommandé)

L'artefact GitHub ne vit que **14 jours**. Pour survivre à 4 mois, copier
chaque export chiffré vers un stockage privé (S3/R2, disque chiffré). Passer
le dépôt en **privé** renforce la confidentialité, mais les schedules GitHub
sont alors désactivés après 60 jours sans activité : le workflow
`keep-alive.yml` (qui s'exécute toutes les 48 h) réveille le dépôt et
maintient les schedules actifs.

### Test de restauration (mensuel)

Une sauvegarde non testée n'est pas une sauvegarde.

```bash
gpg -d backups/data-YYYYMMDD-HHMMSS.sql.gz.gpg | gunzip | psql "$RESTORE_URL"
gpg -d backups/schema-YYYYMMDD-HHMMSS.sql.gz.gpg | gunzip | psql "$RESTORE_URL"
```

Créer au préalable une base jetable (`$RESTORE_URL`), restaurer le **schéma
d'abord**, puis les **données**, et vérifier `select count(*) from profiles;`.

### Anti-pause (indispensable sur le plan gratuit)

Supabase met un projet Free en pause après **7 jours** de faible **activité
API**. L'activité **interne** (job `pg_cron keep_alive_daily`) **ne compte
pas** : seul un appel API **externe** remet le compteur à zéro.

- `.github/workflows/keep-alive.yml` envoie un ping **toutes les 48 h**
  (`REST /rest/v1/keep_alive` + `Auth /auth/v1/health`). Dépôt **public** :
  les schedules ne sont pas désactivés. Un échec de ping fait échouer le job →
  GitHub notifie le propriétaire.
- Vérification manuelle : *Actions* → « Keep-alive Supabase » → dernier run
  vert, et `select last_ping from keep_alive;` doit dater de < 48 h.
- En cas de pause : la restaurer depuis le tableau de bord Supabase (fenêtre
  de 90 jours), puis vérifier `select last_ping from keep_alive;`.

> Le heartbeat `pg_cron` reste utile (il horodate le dernier passage), mais il
> **ne suffit pas** à empêcher la pause : c'est le ping externe qui agit.

## Vérifier la synchronisation PowerSync (indispensable — cf. R89)

L'app peut paraître fonctionnelle alors que **rien ne quitte l'appareil**
(R89). Contrôle à faire régulièrement :

1. Dans la console du navigateur, après connexion et création d'une donnée :
   ```js
   await window.__psFlushCrudUpload(5);
   window.__psFlushResult;   // attendu : { ok: true, skipped: 0, opsTotal: >0 }
   ```
   `ok: false` ou `skipped > 0` = **des données ont été jetées**.
2. Côté serveur, compter les lignes :
   ```sql
   select count(*) from transactions;   -- doit croître avec l'usage
   ```
3. Surveiller les erreurs de stream : `PSYNC_S2305` (R89.b) et
   `23503` sur `transactions_category_id_fkey` (R89.a).

## Sauvegarde VÉRIFIÉE (2026-10-24) — procédure validée de bout en bout

**État** : une sauvegarde fraîche a été produite **et sa restauration a été
testée** dans un conteneur Postgres jetable. C'est la première fois que la
chaîne sauvegarde → restauration est prouvée sur ce projet.

### 1. Produire la sauvegarde
```bash
export SUPABASE_ACCESS_TOKEN=...        # jeton d'accès Supabase
docker info >/dev/null || sudo dockerd & # la CLI exige un daemon Docker
npx supabase@latest db dump --linked -f schema-$(date -u +%Y%m%d-%H%M%S).sql
npx supabase@latest db dump --linked --data-only -f data-$(date -u +%Y%m%d-%H%M%S).sql
sha256sum schema-*.sql data-*.sql > backup.sha256   # sommes de contrôle
gzip -k schema-*.sql data-*.sql                     # compression
```
Résultat mesuré : **schéma 136 Ko (43 `CREATE TABLE`, 146 politiques RLS)**,
**données 6,3 Mo (29 tables, dont `auth.users`)**, sommes de contrôle OK.
Les fichiers vivent **hors du dépôt** (`/workspace/backups/`) : ils contiennent
des données réelles, ne pas les commiter (dépôt public).

### 2. Restaurer (procédure TESTÉE)
La restauration exige l'image **Supabase** (contient `pg_cron`) et le rôle
**`supabase_admin`** (superutilisateur) sur la base **`postgres`** :
```bash
docker run -d --name restore -e POSTGRES_PASSWORD=test \
  public.ecr.aws/supabase/postgres:17.6.1.166
# `public` appartient à supabase_admin ; `pg_cron` n'existe que dans `postgres`
docker exec -i restore psql -U supabase_admin -d postgres -v ON_ERROR_STOP=0 < schema-*.sql
# Prérequis : le rôle applicatif doit exister AVANT le dump des données
docker exec restore psql -U supabase_admin -d postgres -c \
  "create role powersync_role if not exists" # (si absent)
docker exec -i restore psql -U supabase_admin -d postgres -v ON_ERROR_STOP=0 < data-*.sql
```
**Résultat mesuré** : 44 tables + 146 politiques RLS restaurées. Les seules
erreurs (7) concernent les schémas `auth`/`storage` (gérés par Supabase, non
inclus dans un dump du schéma `public`) — **aucune perte de données métier**.

### 3. Vérifier la fidélité (procédure de contrôle)
Comparer les comptages source et restauré :
```sql
select 'profiles', count(*) from public.profiles
union all select 'organizations', count(*) from public.organizations
union all select 'events', count(*) from public.events
union all select 'audit_entries', count(*) from public.audit_entries;
```
**Fidélité constatée : 10/10 tables identiques** (profiles 108, organizations 9,
org_memberships 5, org_admins 6, invitations 66, members 94, groups 222,
events 3220, audit_entries 97, notifications 3320).

### 4. État au 2026-10-27 — ce qui reste à faire par le propriétaire

**Historique des runs : la sauvegarde n'a jamais tourné en CI avant le 27/10.**

| Run | Date | Conclusion affichée | Réalité |
|---|---|---|---|
| `40114231378` | 24/10 17:01 | `success` | `Export`/`Publier`/`Avertir` **skipped**, 0 artefact |
| `40174653132` | 25/10 07:56 | `success` | idem |
| `40291272903` | 26/10 08:17 | `success` | idem |
| `40473991148` | 27/10 08:30 | `success` | idem |
| `40531962063` | 27/10 15:32 | **`failure`** | secrets présents, export lancé, **échec IPv6** |

Annotation constante sur les quatre premiers : « `SUPABASE_DB_URL` absent —
sauvegarde NON configurée ». Ces verts étaient donc **faux**. À noter pour la
mémoire du projet : `.openhands/memory/2026-10-27.md` cite le run du 24/10
comme preuve du garde-fou « chiffré uniquement » ; ce step était `skipped`,
lui aussi. La chaîne n'a été validée que **manuellement**, hors CI.

**Reste à faire :**

1. Remplacer le secret `SUPABASE_DB_URL` par la chaîne **Session pooler**
   (voir l'encadré « ⚠️ Prendre le Session pooler » ci-dessus) — c'est la
   seule action nécessaire pour que l'export aboutisse. L'ancienne valeur
   pointe sur `db.hhgovvrnalibhgpakswi.supabase.co`, IPv6-only.
2. Relancer *Actions* → « Sauvegarde Supabase » → *Run workflow*, puis
   vérifier : conclusion `success`, **1 artefact** `supabase-backup-<run_id>`,
   et que les annotations listent bien le schéma, les données et les sommes de
   contrôle, tous en `.gpg`.
3. Faire **durcir l'échec** dans `.github/workflows/backup.yml` : un secret
   absent doit faire échouer le job (`exit 1`), pas seulement émettre un
   avertissement. Correctif prêt mais **non poussable par l'agent** (le jeton
   GitHub App n'a pas la permission `workflows`) :
   `docs/agent/patches/backup-yml-faux-vert.patch`.
4. Idéalement, passer le dépôt en **privé** ou copier les exports chiffrés
   hors-site (S3, disque local) : un artefact GitHub n'est pas une sauvegarde
   durable.

