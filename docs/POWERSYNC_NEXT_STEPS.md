# PowerSync Integration - Next Steps

## ✅ What's Done

### 1. Dependencies Installed
- `@powersync/web@2.3.0`
- `@powersync/react@2.0.1`
- `vite-plugin-wasm`
- `vite-plugin-top-level-await`

### 2. Core Files Created
- `src/lib/powersync/schema.ts` - Complete schema (100+ tables)
- `src/lib/powersync/SupabaseConnector.ts` - Backend connector
- `src/lib/powersync/index.ts` - Database initialization
- `src/components/PowerSyncProvider.tsx` - React provider

### 3. Configuration
- `.env.local` with Supabase credentials
- `vite.config.ts` updated for WASM support
- GitHub secrets configured:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_JWKS_URL`
  - `POWERSYNC_URL` (placeholder)

### 4. CI/CD Updated
- Workflow injects secrets during build
- No hardcoded credentials in codebase

---

## 🔧 What You Need to Do

### Step 1: Configure PowerSync Cloud

1. **Go to** https://dashboard.powersync.com
2. **Create a project** named "lumina"
3. **Copy the Project ID** (e.g., `1234567890abcdef`)
4. **Generate a PAT** (Personal Access Token):
   - Account Settings → Access Tokens
   - Create new token
   - Copy the token

### Step 2: Set Up Supabase Database

Run this SQL in Supabase SQL Editor:

```sql
-- Create replication role
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'your-secure-password';

-- Grant permissions
GRANT CONNECT ON DATABASE postgres TO powersync_role;
GRANT USAGE ON SCHEMA public TO powersync_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Create publication
CREATE PUBLICATION powersync FOR ALL TABLES;
```

### Step 3: Configure PowerSync Service

Run these commands:

```bash
# Install CLI
npm install -g powersync

# Login
powersync login

# Initialize
powersync init cloud

# Link to your project
powersync link cloud --create --project-id=<YOUR_PROJECT_ID>
```

This will create `powersync/` directory with `service.yaml` and `sync-config.yaml`.

### Step 4: Update service.yaml

Edit `powersync/service.yaml`:

```yaml
replication:
  connections:
    - type: postgresql
      uri: postgresql://powersync_role:YOUR_PASSWORD@db.vvcdmqpbwfyhkzalwdli.supabase.co:5432/postgres
      sslmode: require

client_auth:
  jwks_uri: https://vvcdmqpbwfyhkzalwdli.supabase.co/auth/v1/.well-known/jwks.json
  audience:
    - authenticated

api:
  tokens:
    - your-admin-token-here
```

### Step 5: Create sync-config.yaml

Create `powersync/sync-config.yaml`:

```yaml
config:
  edition: 3

streams:
  # Global data
  categories:
    auto_subscribe: true
    query: SELECT * FROM transaction_categories

  # User-specific data
  users:
    auto_subscribe: true
    query: SELECT * FROM users WHERE id = auth.user_id()

  profiles:
    auto_subscribe: true
    query: SELECT * FROM profiles WHERE id = auth.user_id()

  # Church data (for your specific use case)
  churches:
    auto_subscribe: true
    query: SELECT * FROM churches

  members:
    auto_subscribe: true
    query: SELECT * FROM members WHERE church_id IN (SELECT id FROM churches)

  transactions:
    auto_subscribe: true
    query: SELECT * FROM transactions

  events:
    auto_subscribe: true
    query: SELECT * FROM events

  # Add all other tables you need...
```

### Step 6: Deploy PowerSync

```bash
# Deploy service config
powersync deploy service-config

# Deploy sync config
powersync deploy sync-config

# Check status
powersync status
```

### Step 7: Update POWERSYNC_URL

Copy the instance URL from the output:
```
Created Cloud instance 69c3d0350000000000000001
POWERSYNC_URL=https://69c3d0350000000000000001.powersync.journeyapps.com
```

Update the GitHub secret:
```bash
gh secret set POWERSYNC_URL --body "https://YOUR_INSTANCE_ID.powersync.journeyapps.com"
```

---

## 🚀 Testing the Integration

### 1. Start Dev Server
```bash
pnpm dev
```

### 2. Test Authentication
- Go to http://localhost:8080
- Try logging in with email/password
- Check console for PowerSync status logs

### 3. Verify Sync
- Create a record
- Check PowerSync dashboard for sync status
- Verify data appears in Supabase

---

## 📊 Monitoring

### PowerSync Dashboard
- Go to https://dashboard.powersync.com
- Select your project
- Check "Sync Status" and "Instances"

### Console Logs
```
[PowerSync] Status changed: { connected: true, hasSynced: true }
[PowerSync] First sync completed
```

---

## 🔐 Authentication Flow

### Email/Password Login
```typescript
await connector.login(email, password);
await db.connect(connector);
```

### Google OAuth
```typescript
await connector.loginWithGoogle();
// Redirects to Google, then back to your app
```

### OTP (One-Time Password)
```typescript
// Send OTP
await connector.loginWithOTP(email);
// User enters code
await connector.verifyOTP(email, code);
```

### Auto-Connect on App Start
```typescript
// In App.tsx or main component
const session = await connector.getSession();
if (session) {
  db.connect(connector);
}
```

### Disconnect on Logout
```typescript
await db.disconnectAndClear();
await connector.logout();
```

---

## ⚠️ Important Notes

1. **Never commit `.env.local`** - it contains secrets
2. **Always use GitHub secrets** for CI/CD
3. **Test with dev token first** before enabling auth
4. **Monitor PowerSync status** in console logs
5. **Check Supabase RLS policies** for data security

---

## 🆘 Troubleshooting

### "Syncing..." forever
- Check PowerSync instance is running
- Verify `powersync status` shows connected
- Check console for errors

### Upload errors
- Verify Supabase connection string
- Check RLS policies allow the operation
- Look for `FATAL_RESPONSE_CODES` in logs

### Auth issues
- Ensure JWKS URL is correct
- Check JWT secret matches Supabase config
- Verify audience is set to `authenticated`

---

## 📚 Resources

- [PowerSync Docs](https://docs.powersync.com)
- [Supabase + PowerSync Guide](https://docs.powersync.com/usage/integrations/supabase)
- [React Integration](https://docs.powersync.com/client-sdks/frameworks/react)
- [CLI Reference](https://docs.powersync.com/tools/cli)

---

**Need help?** Check the PowerSync Discord or create an issue on GitHub.
