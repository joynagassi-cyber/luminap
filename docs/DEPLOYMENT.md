# Deployment Guide — Lumina Platform

> Last updated: 2026-09-09
> Status: Platform Complete

## Prerequisites

- Node.js 22+
- pnpm 10+ (preferred)
- Supabase project with PostgreSQL
- Capacitor 6 (for mobile builds)
- Git

---

## Environment Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd lumina
pnpm install
```

### 2. Environment Variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_JWKS_URL=https://your-project.supabase.co/auth/v1/.well-known/jwks.json
VITE_POWERSYNC_URL=https://your-powersync-instance
VITE_ONESIGNAL_APP_ID=your-onesignal-app-id
# Sentry — DSN public (embarqué dans le bundle, ce n'est PAS un secret).
VITE_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
# Optionnel : force l'environnement Sentry (sinon dérivé du mode Vite).
# VITE_SENTRY_ENV=production
```

### GitHub Actions secrets

Le CI lit ces secrets (Settings → Secrets and variables → Actions).
Le DSN Sentry est public, mais on le stocke quand même en secret pour ne pas
le dupliquer dans les workflows.

| Nom exact du secret | Rôle |
|---|---|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé anon Supabase |
| `SUPABASE_JWKS_URL` | URL JWKS Supabase |
| `POWERSYNC_URL` | URL de l'instance PowerSync |
| `OS_V2_API_KEY` | OneSignal App ID (injecté en `VITE_ONESIGNAL_APP_ID`) — repli sur `VITE_ONESIGNAL_APP_ID` |
| `SENTRY_DSN` | DSN Sentry public (injecté en `VITE_SENTRY_DSN`) — repli sur `VITE_SENTRY_DSN` |
| `SENTRY_AUTH_TOKEN` | Token d'upload des source maps |
| `SENTRY_ORG` | Slug de l'organisation Sentry |
| `SENTRY_PROJECT` | Slug du projet Sentry |
| `ANDROID_KEYSTORE_BASE64` | Keystore Android (base64) |
| `ANDROID_KEYSTORE_PASSWORD` | Mot de passe du keystore |
| `ANDROID_KEYSTORE_ALIAS` | Alias de la clé |
| `ANDROID_KEYSTORE_KEY_PASSWORD` | Mot de passe de la clé |
| `CYPRESS_RECORD_KEY` | Clé Cypress Cloud (parallélisation) |

Sans `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT`, le plugin Sentry
est désactivé : le build passe, sans upload de source maps.

### 3. Database Migration

Apply RLS policies:

```bash
psql -d your_database -f docs/00-canonical/rls-policies.sql
```

---

## Development

```bash
# Start dev server
pnpm dev

# Run unit tests
pnpm test

# Run E2E tests (requires Playwright browser)
pnpm test:e2e

# Type check
npx tsc --noEmit
```

---

## Production Build

```bash
# Build for production
pnpm run build

# Preview production build locally
pnpm run preview
```

The build output is in `.output/`.

---

## Deploy to Vercel

```bash
# Install vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect the repo to Vercel for automatic deployments on push to main.

---

## Deploy to Supabase

### Migration Files

SQL migrations live in `supabase/migrations/`. Apply them:

```bash
supabase db push
```

### RLS Policies

RLS policies are in `docs/00-canonical/rls-policies.sql`. Apply after all migrations:

```bash
psql -d your_database -f docs/00-canonical/rls-policies.sql
```

---

## Mobile Build (Capacitor)

```bash
# Build web assets
pnpm run build

# Sync to native projects
npx cap sync

# Open Android Studio
npx cap open android

# Open Xcode
npx cap open ios
```

---

## Monitoring

- **Build health**: CI runs `tsc --noEmit` and `vitest run` on every PR
- **Test coverage**: 574 tests across 18 test files
- **TypeScript**: 0 errors target enforced
- **E2E**: 5 test files covering critical user flows

---

## Rollback

```bash
# Revert to previous commit
git revert <commit-hash>
git push
```

Vercel deployments can be rolled back from the dashboard.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails — Ionic warnings | Check `vite.config.ts` for plugin conflicts |
| PowerSync not syncing | Verify Supabase URL and anon key in `.env.local` |
| RLS policy errors | Ensure all tables have policies applied (`rls-policies.sql`) |
| Capacitor sync fails | Run `pnpm run build` first, then `npx cap sync` |
| TypeScript errors | Run `npx tsc --noEmit` to find exact locations |
| Tests failing | Run `pnpm test --reporter=verbose` for detailed output |

---

## Post-Deployment Checklist

- [ ] Environment variables configured on deployment platform
- [ ] Supabase migrations applied
- [ ] RLS policies applied
- [ ] Onesignal app ID configured
- [ ] Build passes without warnings
- [ ] All 574 tests pass
- [ ] E2E tests pass on staging
- [ ] Manual smoke test: login → create transaction → approve → versement → group → event
