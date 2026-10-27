# Receipt — Sauvegarde Supabase : chiffrée, vérifiée, passée en hebdomadaire (P31/E3)

- **Date** : 2026-10-27
- **Branche** : `agent/phase-09-r89b-denormalize-org-id` (même PR de clôture)
- **Demande propriétaire** : (1) workflow de sauvegarde **hebdomadaire** (au lieu
  de quotidien) ; (2) **filet de sécurité avant toute migration**.

## Livré

1. **`.github/workflows/backup.yml`** : `cron: '0 3 * * 0'` (dimanche 03:00 UTC)
   au lieu de `'0 3 * * *'`. Commentaires mis à jour.
2. **`scripts/backup-supabase.sh`** : correction d'un **bug latent** qui aurait
   fait échouer **chaque** sauvegarde planifiée — `gzip` conserve le point
   initial du fichier temporaire (`.schema-*.sql` → `.schema-*.sql.gz`) alors que
   le script attendait `schema-*.sql.gz` ; le calcul d'empreintes échouait donc
   (`No such file or directory`). Ajout d'un `mv` de normalisation.

## Preuve (chaîne complète, exécutée le 2026-10-27)

| Étape | Résultat |
|---|---|
| Schéma | 17 838 octets, 43 `CREATE TABLE`, 146 politiques RLS |
| Données | 2 166 111 octets, 76 tables en `COPY` |
| Empreintes | `checksums-*.sha256` produits, `sha256sum -c` OK |
| Chiffrement AES256 | `*.gpg` produits ; `gpg --decrypt | zcat` → **76 tables** |
| Workflow déclenché | run `40114231378` : 0 artefact publié (garde-fou « chiffré seulement » OK) |

## Notes d'environnement (coûteuses, consignées)

- La CLI `supabase db dump` exige un **daemon Docker** ; le socket disparaît
  quand il s'arrête (`sudo dockerd &` puis `sudo chmod 666 /var/run/docker.sock`).
- L'hôte direct `db.<ref>.supabase.co` **ne résout pas** dans ce conteneur ;
  utiliser le pooler `aws-0-eu-west-2.pooler.supabase.com:5432`.
- La restauration exige l'**image Supabase** (`public.ecr.aws/supabase/postgres:17.6.1.166`,
  contient `pg_cron`) et le rôle `supabase_admin` sur la base `postgres`
  (sinon 786 erreurs, 0 table). Créer `powersync_role` avant les données.
- Les sauvegardes sont écrites **hors dépôt** (`/workspace/backups/`) : données
  réelles, jamais commitées (dépôt public).

## Reste (propriétaire)

Créer les secrets `SUPABASE_DB_URL` + `BACKUP_GPG_PASSPHRASE` pour activer la
sauvegarde planifiée (le jeton de session ne permet pas de créer des secrets
GitHub : 403 vérifié). Procédure : `RUNBOOK.md` §« Sauvegarde VÉRIFIÉE ».
