/**
 * Run the Cypress E2E suite against the Vite dev server.
 *
 * Usage:
 *   CYPRESS_TEST_EMAIL=user@test.com CYPRESS_TEST_PASSWORD=pass ./scripts/run-cypress.sh
 *
 * 1. Checks whether the app is already listening on CYPRESS_BASE_URL
 *    (default http://localhost:8080); if not, starts `npm run dev` in the
 *    background and waits for it to come up.
 * 2. Runs `npx cypress run` and propagates its exit code.
 * 3. Stops the dev server only if this script started it.
 *
 * Exported environment variables forwarded to Cypress:
 *   CYPRESS_BASE_URL            app base URL   (default http://localhost:8080)
 *   CYPRESS_TEST_EMAIL          Supabase test account email
 *   CYPRESS_TEST_PASSWORD       Supabase test account password
 *   CYPRESS_SUPABASE_URL        Supabase project URL (defaults in cypress.config.ts)
 *   CYPRESS_SUPABASE_ANON_KEY   Supabase anon key    (defaults in cypress.config.ts)
 */
set -u

BASE_URL="${CYPRESS_BASE_URL:-http://localhost:8080}"
PROTOCOL="http"
HOSTPORT="${BASE_URL#*://}"
HOST="${HOSTPORT%%/*}"
PORT="${HOSTPORT##*:}"

DEV_STARTED=0
DEV_PID=""
DEVEOF="/dev/null"

echo "==> App target: ${BASE_URL} (port ${PORT})"

wait_for_app() {
  for _ in $(seq 1 30); do
    if curl -sf -o /dev/null "${BASE_URL}/"; then
      echo "==> App is up."
      return 0
    fi
    sleep 2
  done
  echo "ERROR: ${BASE_URL} did not come up in 60 s." >&2
  return 1
}

if curl -sf -o /dev/null "${BASE_URL}/"; then
  echo "==> App already running on ${BASE_URL} — reusing it."
else
  echo "==> Starting dev server (npm run dev)…"
  # Shell redirections cannot use /dev/null inside subshells on all Windows
  # setups, so log to a file in the repo.
  DEVEOF="${TMPDIR:-/tmp}/lumina-cypress-dev.log"
  npm run dev > "$DEVEOF" 2>&1 &
  DEV_PID="$!"
  DEV_STARTED=1
  echo "==> Dev server PID ${DEV_PID}; log: ${DEVEOF}"
  wait_for_app || exit 1
fi

echo "==> Running Cypress…"
npx cypress run --e2e
CODE=$?

if [ "${DEV_STARTED}" -eq 1 ]; then
  echo "==> Stopping dev server (PID ${DEV_PID})."
  kill "${DEV_PID}" 2>/dev/null || true
fi

exit "${CODE}"
