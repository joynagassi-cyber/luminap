#!/usr/bin/env bash
# =============================================================================
# Lumina — export logique Supabase (plan Free : aucune sauvegarde intégrée)
# =============================================================================
# Le plan Free ne permet PAS de télécharger les sauvegardes automatiques
# (doc Supabase : « Database backups are not available for download for Free
# Plan projects »). La seule protection est un export logique planifié hors
# Supabase — c'est l'objet de ce script (proposition P31, priorité CRITIQUE).
#
# Méthode : `supabase db dump` (décision D2 — le `pg_dump` direct sur le
# pooler se bloque ; la CLI passe par un conteneur Postgres jetable).
#
# Prérequis : Docker (la CLI l'utilise pour le conteneur pg_dump).
#
# Variables :
#   SUPABASE_DB_URL          (obligatoire) chaîne de connexion complète,
#                            percent-encodée, ex.
#                            postgresql://postgres.<ref>:<motdepasse>@aws-0-<region>.pooler.supabase.com:5432/postgres
#   BACKUP_DIR               (défaut ./backups) dossier de sortie
#   BACKUP_RETENTION_DAYS    (défaut 30) rotation des exports
#   BACKUP_GPG_PASSPHRASE    (optionnel) si défini, chiffre chaque export
#                            (AES256). FORTEMENT recommandé si la sauvegarde
#                            contient des données réelles.
#
# Sortie : schema-<TS>.sql.gz et data-<TS>.sql.gz (+ .sha256, + .gpg si chiffré)
# Code retour : 0 = succès, non nul = échec (le job planifié échoue visiblement).
# =============================================================================
set -uo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL est requis (chaîne de connexion Postgres complète, percent-encodée)}"
OUT_DIR="${BACKUP_DIR:-./backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"
TS="$(date -u +%Y%m%d-%H%M%S)"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "ERREUR : Docker est requis (supabase db dump l'utilise pour pg_dump)." >&2
  echo "        Démarrez Docker puis relancez : $0" >&2
  exit 1
fi

SUPABASE_BIN="${SUPABASE_BIN:-npx --yes supabase}"
mkdir -p "$OUT_DIR"
echo "[backup] début $TS → $OUT_DIR"

fail() { echo "ERREUR : $1" >&2; exit 1; }

# --- 0. Diagnostic SANS secret (hôte ciblé, version CLI, joignabilité) ------
# Rien ici ne doit révéler le mot de passe : le dépôt est PUBLIC et les logs
# d'Actions le sont aussi. On n'affiche que l'hôte, le port et la version.
DB_HOSTPORT="$(printf '%s' "$SUPABASE_DB_URL" \
  | sed -E 's#^[a-zA-Z][a-zA-Z0-9+.-]*://##' \
  | sed -E 's#.*@##; s#[/?].*$##')"
DB_HOST="${DB_HOSTPORT%%:*}"
DB_PORT="${DB_HOSTPORT##*:}"
[ "$DB_PORT" = "$DB_HOST" ] && DB_PORT=5432
echo "[backup] cible : $DB_HOST:$DB_PORT (identifiants masqués)"
# PIÈGE VÉRIFIÉ LE 2026-10-27 (run 40531962063) : l'hôte direct
# `db.<ref>.supabase.co` ne possède AUCUN enregistrement A — il n'existe qu'en
# IPv6 (AAAA). Les runners GitHub Actions n'ont pas d'IPv6 → pg_dump échoue
# après avoir tiré l'image Docker (~48 s) sur « Network is unreachable ».
# Le pooler `aws-0-<region>.pooler.supabase.com` a un A (IPv4) → il fonctionne.
case "$DB_HOST" in
  db.*) echo "[backup] ATTENTION : hôte direct « $DB_HOST » = IPv6 SEULEMENT (aucun
                 enregistrement A). GitHub Actions n'a pas d'IPv6 → échec
                 « Network is unreachable ». Utiliser le pooler IPv4 :
                 aws-0-<region>.pooler.supabase.com:5432 avec l'utilisateur
                 postgres.<ref> (dashboard Supabase → Connect → Session pooler)." >&2 ;;
  *.pooler.supabase.com) echo "[backup] hôte pooler détecté (IPv4) : conforme" ;;
esac
# La version de la CLI distingue un échec réseau/auth d'un échec de compatibilité
# pg_dump ↔ serveur. `npx` met le paquet en cache : le dump suivant est plus rapide.
echo "[backup] CLI Supabase : $($SUPABASE_BIN --version 2>&1 | tail -1 || echo 'inconnue')"
# Test TCP avant le dump : sépare « hôte/port injoignables » (erreur immédiate et
# explicite) de « authentification refusée » (sinon noyée dans la sortie pg_dump).
if command -v timeout >/dev/null 2>&1; then
  timeout 10 bash -c "exec 3<>/dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null \
    || fail "hôte injoignable : $DB_HOST:$DB_PORT — vérifier SUPABASE_DB_URL (pooler aws-0-<region>.pooler.supabase.com:5432)"
  echo "[backup] port $DB_PORT joignable"
fi

# --- 1. Schéma (DDL : tables, index, politiques RLS, fonctions, triggers) ----
echo "[backup] schéma…"
$SUPABASE_BIN db dump --db-url "$SUPABASE_DB_URL" -f "$OUT_DIR/.schema-$TS.sql" \
  || fail "dump du schéma (si l'erreur est « password authentication failed » : mot de passe non percent-encodé dans SUPABASE_DB_URL — @ : / # ? % & doivent devenir %40 %3A %2F %23 %3F %25 %26)"
gzip -f "$OUT_DIR/.schema-$TS.sql" || fail "compression du schéma"
SCHEMA_GZ="$OUT_DIR/schema-$TS.sql.gz"
# gzip conserve le point initial du fichier temporaire : on le retire pour que
# les noms finaux (et les empreintes) soient stables.
mv -f "$OUT_DIR/.schema-$TS.sql.gz" "$SCHEMA_GZ" || fail "renommage du schéma"

# --- 2. Données (COPY des lignes de public) ---------------------------------
echo "[backup] données…"
$SUPABASE_BIN db dump --db-url "$SUPABASE_DB_URL" --data-only --use-copy \
  -f "$OUT_DIR/.data-$TS.sql" || fail "dump des données"
gzip -f "$OUT_DIR/.data-$TS.sql" || fail "compression des données"
DATA_GZ="$OUT_DIR/data-$TS.sql.gz"
mv -f "$OUT_DIR/.data-$TS.sql.gz" "$DATA_GZ" || fail "renommage des données"

# --- 3. Empreintes (intégrité : un fichier tronqué se détecte) --------------
( cd "$OUT_DIR" && sha256sum "$(basename "$SCHEMA_GZ")" "$(basename "$DATA_GZ")" \
    > "checksums-$TS.sha256" ) || fail "calcul des empreintes"

# --- 4. Chiffrement optionnel (recommandé pour des données réelles) --------
if [ -n "${BACKUP_GPG_PASSPHRASE:-}" ]; then
  echo "[backup] chiffrement AES256…"
  for f in "$SCHEMA_GZ" "$DATA_GZ" "$OUT_DIR/checksums-$TS.sha256"; do
    gpg --symmetric --cipher-algo AES256 --batch --yes \
        --passphrase "$BACKUP_GPG_PASSPHRASE" "$f" \
      && rm -f "$f" || fail "chiffrement de $(basename "$f")"
  done
fi

# --- 5. Rotation -----------------------------------------------------------
find "$OUT_DIR" -maxdepth 1 -name 'schema-*.sql.gz*' -mtime "+$RETENTION" -delete 2>/dev/null || true
find "$OUT_DIR" -maxdepth 1 -name 'data-*.sql.gz*'   -mtime "+$RETENTION" -delete 2>/dev/null || true
find "$OUT_DIR" -maxdepth 1 -name 'checksums-*.sha256*' -mtime "+$RETENTION" -delete 2>/dev/null || true

echo "[backup] terminé : $(ls -1 "$OUT_DIR" | grep "$TS" | tr '\n' ' ')"
