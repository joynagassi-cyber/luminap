# Cypress E2E — Lumina
#
# Usage: `pnpm cypress` or `npx cypress run`
#
# Specs:
#   - cloud-sync:       Supabase + PowerSync sync
#   - comprehensive-flow: end-to-end feature tour
#   - groups-events:    Groups & Events
#   - persistence:      F5 persistence across reloads
#   - members:          Members CRUD
#   - reports-budgets:  Reports & Budgets
#   - forms-fields:     Forms & Custom Fields
#   - finance-deep:     Finance deep-dive
#
# Each spec runs against the live Render instance (https://lumina-76un.onrender.com)
# unless overridden with CYPRESS_BASE_URL. Fresh Supabase signup per spec
# (cy.freshSignup()) — no pre-existing accounts needed.
#
# For OFFLINE runs (no cloud), use `pnpm cypress:local`:
#   - Seeds a local PowerSync session
#   - Aborts all Supabase/PowerSync REST calls
#   - Runs specs in offline mode

CYPRESS_BASE_URL=${CYPRESS_BASE_URL:-https://lumina-76un.onrender.com}
CYPRESS_TEST_EMAIL=${CYPRESS_TEST_EMAIL:-}
CYPRESS_TEST_PASSWORD=${CYPRESS_TEST_PASSWORD:-}
CYPRESS_SUPABASE_URL=${CYPRESS_SUPABASE_URL:-https://hhgovvrnalibhgpakswi.supabase.co}
CYPRESS_SUPABASE_ANON_KEY=${CYPRESS_SUPABASE_ANON_KEY:-sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh}
CYPRESS_POWERSYNC_URL=${CYPRESS_POWERSYNC_URL:-https://6a9dd96302481fb31b945823.powersync.journeyapps.com}
# Identifiant UNIQUE du compte d'organisation de test (jamais éphémère).
# 1er run absolu : sign-up COMPLET par l'UI (wizard onboarding + org).
# Runs suivants : login direct (l'org existe déjà en base).
CYPRESS_ORG_EMAIL=${CYPRESS_ORG_EMAIL:-lumina-org-e2e@lumina.dev}
CYPRESS_ORG_PASSWORD=${CYPRESS_ORG_PASSWORD:-E2e-Lumina!1}

# Run all specs (default)
npx cypress run --browser chrome \
  --env \
    CYPRESS_BASE_URL="${CYPRESS_BASE_URL}", \
    CYPRESS_TEST_EMAIL="${CYPRESS_TEST_EMAIL}", \
    CYPRESS_TEST_PASSWORD="${CYPRESS_TEST_PASSWORD}", \
    CYPRESS_SUPABASE_URL="${CYPRESS_SUPABASE_URL}", \
    CYPRESS_SUPABASE_ANON_KEY="${CYPRESS_SUPABASE_ANON_KEY}", \
    CYPRESS_POWERSYNC_URL="${CYPRESS_POWERSYNC_URL}", \
    CYPRESS_ORG_EMAIL="${CYPRESS_ORG_EMAIL}", \
    CYPRESS_ORG_PASSWORD="${CYPRESS_ORG_PASSWORD}"
