#!/usr/bin/env bash
#
# Vérification d'isolation inter-organisations (RLS Supabase + écriture).
#
# Contexte : le 2026-10-22, une fuite RLS critique a été corrigée — la fonction
# `is_org_member` comparait `p.org_id = org_id` où `org_id` était résolu comme
# la COLONNE (masquage de paramètre PostgreSQL) au lieu du paramètre, rendant
# l'expression toujours vraie. Tout utilisateur authentifié lisait alors
# l'intégralité des profils, organisations et données de toutes les orgs.
#
# Ce script est le test de non-régression associé. À relancer après toute
# modification de policy RLS ou de fonction d'appartenance.
#
# Usage :
#   scripts/rls-isolation-check.sh
# Variables (défauts = comptes de test du dépôt) :
#   RLS_EMAIL_A / RLS_PASSWORD_A   (org A, défaut lumina-org-e2e)
#   RLS_EMAIL_B / RLS_PASSWORD_B   (org B, défaut lumina-org-unconfigured)
#
# Sortie : nombre de lignes visibles par org_id pour chaque compte, plus un
# test d'écriture cross-org qui DOIT répondre 403.
#
# ATTENTION : lecture seule sur les données métier ; le test d'écriture cible
# un id `rls-probe-*` que la policy doit refuser. Si un jour il répond 201,
# l'isolation d'écriture est cassée — alerte immédiate.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"
[ -f "$ENV_FILE" ] || { echo "FATAL: $ENV_FILE introuvable"; exit 1; }

URL=$(grep '^VITE_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
ANON=$(grep '^VITE_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d= -f2-)
[ -n "$URL" ] && [ -n "$ANON" ] || { echo "FATAL: URL ou ANON_KEY absente"; exit 1; }

EMAIL_A="${RLS_EMAIL_A:-lumina-org-e2e@lumina.dev}"
PASS_A="${RLS_PASSWORD_A:-E2e-Lumina!1}"
EMAIL_B="${RLS_EMAIL_B:-lumina-org-unconfigured@lumina.dev}"
PASS_B="${RLS_PASSWORD_B:-E2e-Unconfigured!1}"

login() {
  curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))'
}

TOK_A=$(login "$EMAIL_A" "$PASS_A")
TOK_B=$(login "$EMAIL_B" "$PASS_B")
[ -n "$TOK_A" ] || { echo "FATAL: login A échoué ($EMAIL_A)"; exit 1; }
[ -n "$TOK_B" ] || { echo "FATAL: login B échoué ($EMAIL_B)"; exit 1; }

# org_id distincts visibles pour une table, avec un JWT donné.
# `col` = colonne d'appartenance réelle (organizations → id, org_reports →
# from_org_id). Un corps non-tableau (erreur PostgREST) est signalé au lieu
# de faire planter le script.
orgs_seen() {
  curl -s "$URL/rest/v1/$1?select=$2" \
    -H "apikey: $ANON" -H "Authorization: Bearer $3" \
    | python3 -c '
import sys, json, collections
d = json.load(sys.stdin)
if isinstance(d, dict):
    print("ERREUR " + str(d.get("code")) + " " + str(d.get("message")))
else:
    print(dict(collections.Counter(r.get(sys.argv[1]) for r in d)))
' "$2"
}

FAIL=0
echo "== Isolation RLS — A=$EMAIL_A  B=$EMAIL_B =="
# table:colonne d'appartenance
for pair in profiles:org_id organizations:id caisses:org_id org_units:org_id \
            transactions:org_id events:org_id members:org_id org_reports:from_org_id; do
  t="${pair%%:*}"; c="${pair##*:}"
  echo "  $t (colonne $c)"
  echo "    A voit : $(orgs_seen "$t" "$c" "$TOK_A")"
  echo "    B voit : $(orgs_seen "$t" "$c" "$TOK_B")"
done

echo
echo "== Écriture cross-org (A → org de B) : doit répondre 403 =="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/caisses" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK_A" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"id":"rls-probe-'$RANDOM'","org_id":"org-e2e-unconf","name":"RLS-PROBE"}')
echo "  HTTP $CODE"
if [ "$CODE" = "403" ] || [ "$CODE" = "401" ]; then
  echo "  OK — écriture cross-org refusée"
else
  echo "  ÉCHEC — écriture cross-org ACCEPTÉE (HTTP $CODE) : fuite d'isolation !"
  FAIL=1
fi

echo
if [ "$FAIL" = "0" ]; then
  echo "RÉSULTAT : isolation conforme. Vérifier visuellement que chaque compte"
  echo "ne voit QUE les org_id qui lui appartiennent (pas de mélange)."
else
  echo "RÉSULTAT : ANOMALIE D'ISOLATION — investiguer immédiatement."
fi
exit "$FAIL"
