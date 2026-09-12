# E2E Tests (Cypress)

Lumina's E2E suite lives in `cypress/` (migrated from Playwright in Sprint 25).
Cypress 16 runs the specs against the **Vite dev server** (port 8080); there is
no `webServer` config block on purpose — the dev server is started separately
so the Nitro SSR app is never started twice.

## Directory layout

```
cypress/
  e2e/
    simple-check.cy.ts        login → onboarding → bottom nav smoke test
    groups-events.cy.ts       groups & events full flow
    persistence.cy.ts         F5 reload persistence (tx / event / form)
    comprehensive-flow.cy.ts  settings, balance, history, events, tx edit
    cloud-sync.cy.ts          offline → online sync to Supabase (cy.intercept)
  support/
    e2e.ts                    custom commands (login, skipOnboarding, prepareSession)
  tsconfig.json
cypress.config.ts             e2e config: baseUrl, expose, timeouts, viewport
scripts/run-cypress.sh        helper: starts the dev server if needed, runs Cypress
```

## Running locally

```bash
# 1. Start the dev server (or use scripts/run-cypress.sh which does it for you)
npm run dev

# 2. Run the suite (in a second terminal)
CYPRESS_TEST_EMAIL=... CYPRESS_TEST_PASSWORD=... npx cypress run

# Or in one shot (starts the dev server if port 8080 is free):
CYPRESS_TEST_EMAIL=... CYPRESS_TEST_PASSWORD=... bash scripts/run-cypress.sh

# Interactive runner
npx cypress open
```

Without credentials the suite still runs: specs that need a Supabase account
call `cy.requireCredentials()` and fail fast with a clear message; the
render-only smoke test (`simple-check`) passes with or without credentials.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `CYPRESS_BASE_URL` | `http://localhost:8080` | dev server base URL |
| `CYPRESS_TEST_EMAIL` | — | Supabase test account email |
| `CYPRESS_TEST_PASSWORD` | — | Supabase test account password |
| `CYPRESS_SUPABASE_URL` | `https://hhgovvrnalibhgpakswi.supabase.co` | project URL for REST asserts |
| `CYPRESS_SUPABASE_ANON_KEY` | publishable key | REST assertions (cloud-sync spec) |
| `CYPRESS_BROWSER` | Electron (bundled) | e.g. `chrome` for the system Chrome |

Values are passed into the browser test context via the `expose` option in
`cypress.config.ts` and read with `Cypress.expose('KEY')` (Cypress 16 API).

## What the suite verifies

- **Auth** — email/password sign-in against real Supabase (network calls kept
  real on purpose; no auth mocks).
- **Onboarding** — creator branch → org setup (name, type, theme, role) →
  dashboard. Handled by `cy.prepareSession()`.
- **Offline-first persistence** — a transaction, event + budget line, and a
  form submission all survive `cy.reload()` (PowerSync local store).
- **Cloud sync** — `cy.intercept` aborts Supabase REST to simulate offline;
  entities created offline reach Supabase after reconnect (`cy.unrouteAll()`
  + 35 s sync wait, then direct REST assertions).
- **Navigation** — bottom nav, More menu, settings, balance report (incl.
  PDF export), history, events, transaction edit.

## Conventions

- No `cy.wait(ms)` for UI settling — use assertions with a timeout or
  `cy.intercept` aliases. The only exception is the cloud-sync spec, where a
  35 s wall-clock wait matches the app's PowerSync poll interval.
- Specs that create entities use `Date.now()`-suffixed names so re-runs stay
  green (groups-events, cloud-sync, persistence).
- Viewport is 390×844 (mobile) to match the Ionic layout.
- Failure screenshots land in `cypress/screenshots/`; videos are disabled
  (set `video: true` in `cypress.config.ts` to record).
