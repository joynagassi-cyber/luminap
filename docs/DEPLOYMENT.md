# Deployment Guide — Lumina Platform

## Prerequisites

- Node.js 20+
- pnpm (preferred) or npm
- Supabase project with PostgreSQL
- Capacitor (for mobile builds)

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
VITE_ONESIGNAL_APP_ID=your-onesignal-app-id
```

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

# Run tests
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
- **Test coverage**: 294 tests across 11 test files
- **TypeScript**: 0 errors target enforced

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
