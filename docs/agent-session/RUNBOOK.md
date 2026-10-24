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

