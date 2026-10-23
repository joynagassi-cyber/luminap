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

# 2. Types
npx tsc --noEmit

# 3. E2E (Cypress) — exigent un serveur Vite deja lance ET un ecran X
DISPLAY=:99 CYPRESS_CACHE_FOLDER=/workspace/.cypress-cache \
  npx cypress run --config baseUrl=http://127.0.0.1:8080,video=false \
  --spec cypress/e2e/cross-tenant.cy.ts,cypress/e2e/events-tasks.cy.ts
```
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
4. **Crash d'écran sur données héritées mal encodées** (cf. R43
   `budget_items`) → les parseurs sont tolérants ; un backfill est proposé.

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
2. Vérifier la rétention et tester **une restauration** au moins une fois.

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
