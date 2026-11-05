#!/usr/bin/env bash
# =============================================================================
# Lumina — purge des artefacts E2E (chantier R-A)
# =============================================================================
# Exécute scripts/e2e-purge.sql contre la base Supabase via l'API Management
# (SQL arbitraire, réservé au service token). À lancer :
#   - manuellement après un run E2E contre la prod ;
#   - automatiquement par .github/workflows/e2e-purge.yml (cron quotidien).
#
# Prérequis : SUPABASE_ACCESS_TOKEN (service token, jamais exposé au client).
# Optionnel : SUPABASE_PROJECT_REF (défaut hhgovvrnalibhgpakswi).
#
# Code retour : 0 = succès, non nul = échec visible (le job planifié échoue).
# =============================================================================
set -uo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN est requis (service token Supabase)}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-hhgovvrnalibhgpakswi}"
SQL_FILE="$(cd "$(dirname "$0")" && pwd)/e2e-purge.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "ERREUR : $SQL_FILE introuvable." >&2
  exit 1
fi

# L'API Management attend un JSON { "query": "..." } : on l'assemble avec jq
# pour échapper proprement le SQL (guillemets, retours ligne).
if ! command -v jq >/dev/null 2>&1; then
  echo "ERREUR : jq est requis." >&2
  exit 1
fi
BODY="$(jq -Rs '{query: .}' < "$SQL_FILE")"

echo "Purge E2E → projet $PROJECT_REF ($(date -u +%FT%TZ))"
RESP="$(curl -sS -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$BODY")"

echo "Réponse : $RESP"

# L'API renvoie un tableau JSON en cas de succès, un objet { "message": ... }
# en cas d'erreur. On échoue visiblement si la réponse n'est pas un tableau.
if ! printf '%s' "$RESP" | jq -e 'type == "array"' >/dev/null 2>&1; then
  echo "ERREUR : la purge a échoué (réponse non-tableau)." >&2
  exit 1
fi

# Résumé (dernière ligne du SELECT de contrôle).
printf '%s' "$RESP" | jq -c '.[-1]'
echo "OK — purge terminée."
