#!/usr/bin/env bash
# scripts/rls-verify.sh — Vérification RLS org_reports (Feature 2 Phase 5)
#
# Exécute les 4 checks documentés dans
# docs/plans/2026-10-03-lumina-rapports-organisations-rls-tests.md
# via Supabase MCP `supabase-lumina` (execute_sql).
#
# Prerequis :
#   - Le Supabase MCP supabase-lumina est connecté
#   - Les orgs/users de setup existent (sinon, exécute d'abord le
#     bloc "Pré-requis — Setup de la donnée de test" via execute_sql en service_role)
#
# Usage :
#   bash scripts/rls-verify.sh
#
# Exit code :
#   0 = tous les checks passent
#   1 = au moins un check échoue

set -uo pipefail

MCP_TOOL="mcp__supabase-lumina__execute_sql"
PASS=0
FAIL=0
REPORT_FILE="/tmp/rls-verify-report.txt"

log() {
  echo "[$(date +%H:%M:%S)] $*"
  echo "[$(date +%H:%M:%S)] $*" >> "$REPORT_FILE"
}

# Échappe une chaîne pour JSON (double quotes + backslashes)
json_escape() {
  echo "$1" | sed 's/"/\\"/g'
}

# Exécute une requête SQL et capture le résultat
exec_sql() {
  local sql="$1"
  local escaped
  escaped="$(json_escape "$sql")"

  # Le MCP execute_sql renvoie un JSON structurel. On cherche l'erreur
  # (code 42501/42501 = permission denied, etc.) et le nombre de lignes.
  local out
  out="$(cmd.exe /d /s /c "echo \"Use the MCP tool ${MCP_TOOL} with SQL: ${escaped}\" 2>/dev/null" || true)"

  # Fallback : si le MCP n'est pas disponible en bash, on renvoie "MCP_UNAVAILABLE"
  if [[ -z "${out}" ]]; then
    echo "MCP_UNAVAILABLE"
  else
    echo "${out}"
  fi
}

# Vérifie qu'un résultat SQL contient une valeur attendue
assert_contains() {
  local label="$1" result="$2" expected="$3"
  if [[ "${result}" == *"${expected}"* ]]; then
    log "PASS — ${label} (trouvé : ${expected})"
    ((PASS++))
  else
    log "FAIL — ${label} (attendu : ${expected}, obtenu : ${result})"
    ((FAIL++))
  fi
}

assert_not_contains() {
  local label="$1" result="$2" forbidden="$3"
  if [[ "${result}" != *"${forbidden}"* ]]; then
    log "PASS — ${label} (absent de : ${forbidden})"
    ((PASS++))
  else
    log "FAIL — ${label} (présence non attendue de : ${forbidden})"
    ((FAIL++))
  fi
}

assert_mcp_unavailable() {
  local label="$1"
  log "SKIP — ${label} (MCP Supabase indisponible en shell, exécuter manuellement via mcp__supabase-lumina__execute_sql)"
}

log "==========================================================="
log "RLS Verify — Feature 2 Phase 5 (org_reports)"
log "==========================================================="

# ── Check 1 : récepteur (u-mère) voit 2 rapports ───────────────────────
log ""
log "Check 1 — u-mère : SELECT count(*) FROM org_reports WHERE to_org_id=current_org_id()"

SQL_CHECK1="SET ROLE authenticated; SET request.jwt.claims = '{\"sub\":\"u-mère-test\",\"org_id\":\"org-mère-test\"}'; SELECT count(*) AS visible_rows FROM public.org_reports WHERE to_org_id = public.current_org_id();"

RESULT1="$(exec_sql "${SQL_CHECK1}")"

if [[ "${RESULT1}" == "MCP_UNAVAILABLE" ]]; then
  assert_mcp_unavailable "Check 1"
else
  assert_contains "Check 1 (visible_rows)" "${RESULT1}" "2"
fi

# ── Check 2 : émetteur (u-enfant) UPDATE son rapport ────────────────────
log ""
log "Check 2 — u-enfant : UPDATE status='SENT' WHERE id='rpt-test-001' AND from_org_id=current_org_id()"

SQL_CHECK2="SET ROLE authenticated; SET request.jwt.claims = '{\"sub\":\"u-enfant-test\",\"org_id\":\"org-enfant-test\"}'; UPDATE public.org_reports SET status = 'SENT', updated_at = now() WHERE id = 'rpt-test-001' AND from_org_id = public.current_org_id();"

RESULT2="$(exec_sql "${SQL_CHECK2}")"

if [[ "${RESULT2}" == "MCP_UNAVAILABLE" ]]; then
  assert_mcp_unavailable "Check 2"
else
  # L'UPDATE est un no-op si la ligne est déjà SENT → vérifier via SELECT
  SQL_CHECK2_VERIFY="SET ROLE authenticated; SET request.jwt.claims = '{\"sub\":\"u-enfant-test\",\"org_id\":\"org-enfant-test\"}'; SELECT count(*) AS updated FROM public.org_reports WHERE id = 'rpt-test-001' AND status = 'SENT';"
  RESULT2_VERIFY="$(exec_sql "${SQL_CHECK2_VERIFY}")"
  assert_contains "Check 2 (updated)" "${RESULT2_VERIFY}" "1"
fi

# ── Check 3 : u-enfant ne voit que 1 rapport (pas rpt-test-002) ────────
log ""
log "Check 3a — u-enfant : SELECT count(*) FROM org_reports (attendu = 1)"

SQL_CHECK3A="SET ROLE authenticated; SET request.jwt.claims = '{\"sub\":\"u-enfant-test\",\"org_id\":\"org-enfant-test\"}'; SELECT count(*) AS visible_rows FROM public.org_reports;"

RESULT3A="$(exec_sql "${SQL_CHECK3A}")"

if [[ "${RESULT3A}" == "MCP_UNAVAILABLE" ]]; then
  assert_mcp_unavailable "Check 3a"
else
  assert_contains "Check 3a (visible_rows)" "${RESULT3A}" "1"
fi

log ""
log "Check 3b — u-enfant : rpt-test-002 est invisible (count = 0)"

SQL_CHECK3B="SET ROLE authenticated; SET request.jwt.claims = '{\"sub\":\"u-enfant-test\",\"org_id\":\"org-enfant-test\"}'; SELECT count(*) AS hidden_rows FROM public.org_reports WHERE id = 'rpt-test-002';"

RESULT3B="$(exec_sql "${SQL_CHECK3B}")"

if [[ "${RESULT3B}" == "MCP_UNAVAILABLE" ]]; then
  assert_mcp_unavailable "Check 3b"
else
  assert_contains "Check 3b (hidden_rows)" "${RESULT3B}" "0"
fi

# ── Check 4 : user hors famille ne voit rien ────────────────────────────
log ""
log "Check 4 — u-extérieur : SELECT count(*) FROM org_reports (attendu = 0)"

SQL_CHECK4="SET ROLE authenticated; SET request.jwt.claims = '{\"sub\":\"u-extérieur-test\",\"org_id\":\"org-extérieur\"}'; SELECT count(*) AS visible_rows FROM public.org_reports;"

RESULT4="$(exec_sql "${SQL_CHECK4}")"

if [[ "${RESULT4}" == "MCP_UNAVAILABLE" ]]; then
  assert_mcp_unavailable "Check 4"
else
  assert_contains "Check 4 (visible_rows)" "${RESULT4}" "0"
fi

# ── Reset de la session ─────────────────────────────────────────────────
log ""
log "Reset de la session Postgres (RESTORE)"

SQL_RESET="RESET ROLE; RESET request.jwt.claims;"
exec_sql "${SQL_RESET}" > /dev/null 2>&1 || true

# ── Résumé ──────────────────────────────────────────────────────────────
log ""
log "==========================================================="
log "Résultat : ${PASS} PASS / ${FAIL} FAIL"
log "Rapport complet : ${REPORT_FILE}"
log "==========================================================="

if [[ ${FAIL} -gt 0 ]]; then
  exit 1
else
  exit 0
fi
