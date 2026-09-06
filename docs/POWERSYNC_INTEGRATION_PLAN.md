# PowerSync Integration Plan

## Overview
Migrating from IndexedDB to PowerSync with Supabase backend for real-time sync across multiple users and devices.

## Configuration
- **Supabase URL:** https://vvcdmqpbwfyhkzalwdli.supabase.co
- **PowerSync:** Cloud instance (to be configured)
- **Auth:** Email/password + Google OAuth + OTP

## Implementation Steps

### 1. Environment Setup
- Create `.env.local` with Supabase credentials (using GitHub secrets in CI)
- Update `vite.config.ts` for WASM support
- Install required packages

### 2. PowerSync Core Files
- `src/lib/powersync/schema.ts` - Complete schema from your database
- `src/lib/powersync/SupabaseConnector.ts` - Backend connector
- `src/lib/powersync/index.ts` - Database initialization
- `src/components/PowerSyncProvider.tsx` - React provider

### 3. Authentication Integration
- Email/password login
- Google OAuth
- OTP verification
- Auth state management
- Auto-connect on sign-in
- Clear data on sign-out

### 4. CI/CD Updates
- Add GitHub secrets for Supabase credentials
- Update CI workflow to inject secrets during build

### 5. App Integration
- Replace IndexedDB calls with PowerSync queries
- Use `useQuery` hooks for data fetching
- Handle offline/online states

## Security
- All secrets stored in GitHub secrets
- No hardcoded credentials in codebase
- RLS policies on Supabase for data security
