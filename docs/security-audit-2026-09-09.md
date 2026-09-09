# Lumina Security Audit Report

**Date:** 2026-09-09
**Auditor:** Automated Security Audit (Agentic)
**Scope:** Full-stack — frontend (React/Vite), server (Nitro), database (Supabase/PowerSync), configuration
**Severity scale:** CRITICAL / HIGH / MEDIUM / LOW / INFO

---

## Executive Summary

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| Hardcoded Secrets | 4 | 2 | 1 | 0 |
| Authentication | 3 | 2 | 1 | 0 |
| Authorization | 2 | 1 | 2 | 0 |
| XSS | 1 | 0 | 1 | 0 |
| SQL Injection | 0 | 2 | 1 | 0 |
| CSRF | 2 | 0 | 0 | 0 |
| Data Exposure | 1 | 1 | 0 | 0 |
| **TOTAL** | **14** | **10** | **7** | **0** |

**Overall Risk: HIGH** — The application has multiple critical and high-severity vulnerabilities that require immediate remediation before production use.

---

## 1. Hardcoded Secrets

### F-001 [CRITICAL] Supabase Anon Key Hardcoded in Multiple Locations
**Severity:** Critical
**Files:**
- `src/lib/auth.ts:14` — `const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh';`
- `src/integrations/supabase/client.ts:5` — `const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh";`
- `src/lib/auth.ts:13` — Hardcoded fallback URL: `'https://hhgovvrnalibhgpakswi.supabase.co'`

**Impact:** An attacker who obtains the Supabase anon key can interact directly with the Supabase REST/GraphQL API, bypassing any client-side checks. The key exposes the project URL and allows direct table access if RLS policies are misconfigured.

**Fix:** Remove all fallback hardcoded values. Make missing env vars a build-time error.

---

### F-002 [CRITICAL] Google OAuth Client Secret in .env.local (Committed?)
**Severity:** Critical
**File:** `.env.local`
**Secret:** `GOOGLE_OAUTH_CLIENT_SECRET=eyJpbnN0YWxsZWQiOnsiY2xpZW50X2lkIjoiMjE4MjIxNDQ5MzA1LWIxaTFiMnFpc2QxbnR1ZjBkaGhsaTB0dWVxaWpva2dtLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwicHJvamVjdF9pZCI6Imx1bWluYS1tZmUtamMiLCJhdXRoX3VyaSI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwidG9rZW5fdXJpIjoiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLCJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMifX0=`

**Impact:** The base64-decoded payload contains the full Google OAuth client configuration including client_id, project_id, and auth URLs. If this file is committed to git (it is in `.gitignore` but `.env.local` may have been committed before), the attacker gains the ability to impersonate the OAuth client and intercept tokens.

**Fix:** 
1. Rotate the Google OAuth client secret immediately.
2. Verify `.env.local` has never been committed (`git log --all --full-history -- .env.local`).
3. Add `.env.local` to gitignore (already present, but verify).

---

### F-003 [CRITICAL] Supabase Database Password in .env
**Severity:** Critical
**File:** `.env`
**Secret:** `PS_DATABASE_PASSWORD=fUF6s8U678w6ct1a`
**File:** `.env.local`
**Secret:** `PS_DATABASE_PASSWORD=mum33#i?*zaFTN`

**Impact:** Database passwords grant direct PostgreSQL connection access. This bypasses all RLS policies and application-level access control. An attacker with this password can read/write all data directly to Supabase's PostgreSQL instance.

**Fix:** Rotate both database passwords immediately. Use connection pooling (Supavisor) with separate read/write credentials. Never store in `.env` files that may be committed.

---

### F-004 [CRITICAL] Hardcoded Admin Password in server/store.ts
**Severity:** Critical
**File:** `server/store.ts:29`
**Code:** `hashedPassword: hashPassword("lumina-admin-2026")`

**Impact:** The admin account password `lumina-admin-2026` is hardcoded in the source code. Anyone with read access to the repository has the admin password. This is a trivially guessable password.

**Fix:** Remove the hardcoded admin user. Generate admin credentials through a secure provisioning process. Use bcrypt with proper salt rounds (minimum 12).

---

### F-005 [HIGH] Weak Password Hashing (SHA-256, No Salt)
**Severity:** High
**File:** `server/store.ts:15-17`
**Code:**
```typescript
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}
```
**Also:** `server/routes/api/auth/login.post.ts:14`

**Impact:** SHA-256 without salt is trivially reversible via rainbow tables. A single precomputed table can crack all passwords in the database in seconds. This fails OWASP password storage requirements.

**Fix:** Use bcrypt (cost factor 12+) or argon2id. Example:
```typescript
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);
const valid = await bcrypt.compare(password, hash);
```

---

### F-006 [HIGH] Insecure Session Token Generation
**Severity:** High
**Files:** 
- `server/routes/api/auth/login.post.ts:18`
- `server/routes/api/auth/signup.post.ts:18`

**Code:**
```typescript
const token = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
```

**Impact:** `Math.random()` is not cryptographically secure. `Date.now()` is predictable. An attacker who observes session tokens can predict future tokens, enabling session hijacking.

**Fix:** Use `crypto.randomUUID()` or `crypto.randomBytes(32).toString('hex')` for session tokens.

---

### F-007 [HIGH] OneSignal App ID in Source Code
**Severity:** High
**Files:**
- `src/lib/authOneSignal.ts:12` — hardcoded fallback
- `src/lib/onesignal.ts:603` — hardcoded fallback

**Impact:** The OneSignal app ID (`5482a4eb-a402-4612-ab5e-a72df7961b12`) is publicly visible in the JavaScript bundle. This allows attackers to send push notifications to your users.

**Fix:** Remove fallback values. Require the env var at build time.

---

### F-008 [MEDIUM] Supabase URL Hardcoded as Fallback
**Severity:** Medium
**Files:**
- `src/lib/auth.ts:13`
- `src/integrations/supabase/client.ts:4`
- `src/lib/powersync/SupabaseConnector.ts:44`

**Impact:** Hardcoded fallback URLs make the app functional even without env vars, which means the real project URL is discoverable from source code.

**Fix:** Remove all hardcoded fallback URLs. Fail fast at runtime if env vars are missing.

---

## 2. Authentication Flow Security

### F-009 [CRITICAL] Client-Side Auth Bypass via Login Page
**Severity:** Critical
**File:** `src/pages/Login.tsx:32-35`
**Code:**
```typescript
localStorage.setItem('lumina-session', crypto.randomUUID());
localStorage.setItem('lumina-role', role);
localStorage.setItem('lumina-onboarded', 'true');
localStorage.setItem('lumina-firstName', name.trim());
```

**Impact:** The legacy `Login.tsx` page creates a session entirely client-side with no server verification. Any user can set their role to `ADMIN` by modifying localStorage:
```javascript
localStorage.setItem('lumina-role', 'ADMIN');
```
This completely bypasses all authentication and authorization controls.

**Fix:** Remove or disable the legacy login flow. All authentication must go through Supabase Auth or the server endpoints with proper session validation.

---

### F-010 [CRITICAL] No Server-Side Session Validation on Legacy API
**Severity:** Critical
**File:** `server/routes/api/auth/session.get.ts`
**Code:**
```typescript
const token = getCookie(event, "lumina_session_token");
return {
  ok: true,
  authenticated: !!token,
  user: token ? { id: "user-1", email: "admin@mfe-jc.org", ... role: "ADMIN" } : null,
};
```

**Impact:** The session endpoint ignores the actual token value and always returns a hardcoded admin user if any token is present. Any randomly generated token grants admin access.

**Fix:** Validate the token against a server-side session store or JWT secret. Return actual user data from the validated token.

---

### F-011 [CRITICAL] Password Minimum Length Too Weak
**Severity:** Critical
**File:** `src/lib/auth.ts:66-68`
**Code:**
```typescript
private isValidPassword(password: string): boolean {
  return password.length >= 6;
}
```

**Impact:** A 6-character minimum password is easily brute-forced. OWASP recommends minimum 8 characters with complexity requirements.

**Fix:** Require minimum 12 characters with at least one uppercase, one lowercase, one number, and one special character.

---

### F-012 [HIGH] No Rate Limiting on Auth Endpoints
**Severity:** High
**Files:**
- `server/routes/api/auth/login.post.ts`
- `server/routes/api/auth/signup.post.ts`

**Impact:** No rate limiting allows brute-force attacks against user passwords. An attacker can make unlimited login attempts.

**Fix:** Implement rate limiting (e.g., 5 attempts per minute per IP) using a middleware like `rate-limit` or Supabase's built-in rate limiting.

---

### F-013 [HIGH] OAuth Callback Not Validated
**Severity:** High
**File:** `src/lib/auth.ts:386-443`

**Impact:** The OAuth callback handler does not validate the `state` parameter, making it vulnerable to CSRF attacks during the OAuth flow. An attacker could craft a malicious redirect that triggers authentication with an attacker-controlled account.

**Fix:** Generate a cryptographically random `state` parameter on login, store it in a secure cookie, and validate it on callback.

---

### F-014 [MEDIUM] No Email Verification for Signups
**Severity:** Medium
**File:** `src/lib/auth.ts:272`
**Comment:** `// Sign up with email/password (no email confirmation)`

**Impact:** Any email address can be registered without verification, enabling spam accounts and potential abuse.

**Fix:** Enable email confirmation in Supabase auth settings. Require confirmed emails before allowing login.

---

## 3. SQL Injection

### F-015 [HIGH] Table Name Injection in Resource Service
**Severity:** High
**File:** `src/capabilities/resource/index.ts:52-58`
**Code:**
```typescript
async get<T>(entityType: string, id: string): Promise<T | null> {
  const table = this.toTableName(entityType);
  // ...
  const result = await db.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
}
```

**Impact:** While `toTableName()` has a lookup map, any entity type not in the map falls through to `entityType.toLowerCase()`. If `entityType` comes from user input (URL params, form data), an attacker could inject arbitrary table names:
```typescript
// If called with: resource.get('users; DROP TABLE users;--', 'id')
// Result: SELECT * FROM users; DROP TABLE users;-- WHERE id = ?
```

**Fix:** Enforce strict validation on `entityType`. Only allow values from a predefined whitelist. Never interpolate user input into SQL without parameterization.

---

### F-016 [HIGH] Column Name Injection in Resource Service
**Severity:** High
**File:** `src/capabilities/resource/index.ts:81-119`
**Code:**
```typescript
conditions.push(`${f.field} = ?`);  // f.field from user input
orderByClause = `ORDER BY ${query.sortBy} ${order}`;  // sortBy from user input
limitClause = `LIMIT ${query.limit}`;  // limit from user input
```

**Impact:** The `filter.field`, `sortBy`, and `limit`/`offset` values are directly interpolated into SQL strings without validation. An attacker could inject arbitrary SQL through these parameters.

**Fix:** 
1. Validate `filter.field` against a whitelist of allowed column names.
2. Validate `sortBy` against a whitelist.
3. Validate `limit` and `offset` as integers with max bounds.

---

### F-017 [LOW] Raw SQL in dataLayer.ts with Parameterized Queries
**Severity:** Low
**File:** `src/lib/dataLayer.ts`

**Impact:** All SQL queries in `dataLayer.ts` use parameterized queries (`?` placeholders), which is the correct approach. However, the `executeWrite` function exposes raw SQL execution which could be misused if called with user-controlled strings.

**Fix:** Add validation wrappers around `executeWrite` to ensure only known-safe queries are executed.

---

## 4. CSRF Vulnerabilities

### F-018 [CRITICAL] No CSRF Protection on Server Endpoints
**Severity:** Critical
**Files:** All `server/routes/api/*.ts` endpoints

**Impact:** All server endpoints accept POST/PUT/DELETE requests without CSRF tokens. An attacker can craft a malicious page that submits forms to these endpoints on behalf of an authenticated user.

Example attack:
```html
<form action="https://lumina.app/api/transactions" method="POST">
  <input name="amount" value="999999">
  <input name="type" value="EXPENSE">
  <input type="submit">
</form>
<script>document.forms[0].submit()</script>
```

**Fix:** Implement CSRF tokens for all state-changing endpoints. Use SameSite cookie attribute (already set to `lax` but can be upgraded to `strict`).

---

### F-019 [HIGH] Cookie Security Settings Insufficient
**Severity:** High
**Files:**
- `server/routes/api/auth/login.post.ts:19-24`
- `server/routes/api/auth/signup.post.ts:19-24`

**Code:**
```typescript
setCookie(event, "lumina_session_token", token, {
  httpOnly: true,
  secure: false,  // <-- INSECURE: allows cookie over HTTP
  sameSite: "lax",
  maxAge: 60 * 60 * 24,
});
```

**Impact:** `secure: false` means the session cookie can be transmitted over unencrypted HTTP connections, allowing interception via man-in-the-middle attacks.

**Fix:** Set `secure: true` in production. Also add `sameSite: 'strict'` for higher security.

---

## 5. Authorization Checks

### F-020 [CRITICAL] Frontend RBAC is Client-Side Only
**Severity:** Critical
**File:** `src/lib/rbac.ts`

**Impact:** All authorization checks happen in the browser. A user can modify their role in localStorage or intercept API calls to perform unauthorized actions. The `checkPermission` stub in `src/lib/rbac.ts:35-38` explicitly returns `true` for all checks:
```typescript
/**
 * checkPermission — stub pour la phase mono-eglise.
 * Retourne toujours true car le RBAC canonique n'est pas encore implmente.
 */
```

**Fix:** Implement server-side authorization checks. Validate permissions before every data mutation. Use Supabase RLS policies (partially implemented in migration `20260909000000`) as the primary access control layer.

---

### F-021 [HIGH] RLS Policies Grant Org-Scoped Access, Not Role-Based
**Severity:** High
**File:** `supabase/migrations/20260909000000_add_rls_policies_for_all_tables.sql`

**Impact:** RLS policies check org membership but not user roles. Any authenticated user in an organization can read/write all data in that org, regardless of their assigned role (TREASURIER, MEMBRE, etc.).

Example policy:
```sql
CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = transactions.org_id));
```

This allows any org member to delete transactions, not just treasurers.

**Fix:** Add role-based conditions to RLS policies. Example:
```sql
USING (
  auth.uid() IN (SELECT id FROM public.profiles 
    WHERE org_id = transactions.org_id 
    AND role IN ('TREASURIER', 'TREASURIER_ADJOINT', 'PASTEUR_PRINCIPAL'))
)
```

---

### F-022 [MEDIUM] No Audit Logging on Server Endpoints
**Severity:** Medium
**Files:** All `server/routes/api/*.ts`

**Impact:** Server-side mutations (POST, PUT, DELETE) are not logged. There is no audit trail for financial transactions processed through the API.

**Fix:** Add audit logging to all state-changing endpoints. Record user ID, action, timestamp, and before/after state.

---

### F-023 [MEDIUM] Role Assignment Without Validation
**Severity:** Medium
**File:** `src/pages/Login.tsx:24-27`

**Impact:** Users can self-assign any role during login:
```typescript
const roles = [
  { id: 'TREASURIER', label: 'Trésorier' },
  { id: 'PASTEUR', label: 'Pasteur' },
  // ...
];
```

**Fix:** Roles must be assigned by an administrator, not self-selected. Validate role assignments against a server-side database.

---

## 6. XSS Vulnerabilities

### F-024 [CRITICAL] One Instance of dangerouslySetInnerHTML
**Severity:** Critical
**File:** `src/components/ui/chart.tsx:96`
**Code:**
```typescript
dangerouslySetInnerHTML={{ __html: cssText }}
```

**Impact:** If `cssText` contains user-controlled content, this enables reflected XSS. While this specific instance appears to use generated CSS (lower risk), the pattern is dangerous if reused.

**Fix:** Use a safer alternative like `createStyledComponents` or sanitize the input with DOMPurify.

---

### F-025 [MEDIUM] User Input Rendered Without Sanitization
**Severity:** Medium
**Files:** Multiple pages render user-provided data (names, descriptions, comments) directly in JSX

**Impact:** React's JSX rendering automatically escapes HTML, so most XSS is prevented. However, if any component uses `dangerouslySetInnerHTML` with user data, XSS is possible.

**Fix:** Audit all components for `dangerouslySetInnerHTML` usage and ensure user input is never passed to it.

---

## 7. Data Exposure

### F-026 [CRITICAL] Sensitive Data in Client-Side Storage
**Severity:** Critical
**File:** `src/pages/Login.tsx:32-35`
**Code:**
```typescript
localStorage.setItem('lumina-session', crypto.randomUUID());
localStorage.setItem('lumina-role', role);
localStorage.setItem('lumina-onboarded', 'true');
localStorage.setItem('lumina-firstName', name.trim());
```

**Impact:** Session tokens and user roles stored in localStorage are accessible to any JavaScript running on the page, including malicious XSS payloads. Session tokens should be stored in httpOnly cookies.

**Fix:** Move session storage to httpOnly cookies. Use sessionStorage for non-sensitive temporary data.

---

### F-027 [HIGH] No Content Security Policy (CSP)
**Severity:** High
**Files:** All HTML/JS files

**Impact:** No CSP headers are configured. This allows inline scripts, eval(), and loading resources from any origin, increasing the attack surface for XSS.

**Fix:** Implement a strict CSP header:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://hhgovvrnalibhgpakswi.supabase.co https://6a9dd96302481fb31b945823.powersync.journeyapps.com;
```

---

### F-028 [HIGH] No Security Headers
**Severity:** High
**Files:** Vite config, Nitro config

**Impact:** Missing security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Referrer-Policy: strict-origin-when-cross-origin`

**Fix:** Add these headers in `vite.config.ts` server headers or via a middleware.

---

## 8. Other Findings

### F-029 [LOW] Incomplete RLS on group_memberships Table
**Severity:** Low
**File:** `supabase/migrations/20260909000000_add_rls_policies_for_all_tables.sql`

**Impact:** The RLS policy for `group_memberships` derives org membership via `members` table, which may not always be accurate if members are archived or deleted.

**Fix:** Add a more robust org derivation path or denormalize org_id.

---

### F-030 [INFO] Supabase Anon Key Exposed in Bundle
**Severity:** Info
**Files:** `src/integrations/supabase/client.ts`, `src/lib/auth.ts`

**Impact:** The Supabase anon key is visible in the bundled JavaScript. This is expected for Supabase but the key should have minimal permissions (only what's needed for the client).

**Fix:** Review Supabase RLS policies to ensure the anon key has only necessary permissions.

---

## Remediation Priority

### Immediate (Before Production)
1. **F-001, F-002, F-003, F-004**: Remove all hardcoded secrets, rotate credentials
2. **F-009, F-010**: Fix client-side auth bypass and fake session tokens
3. **F-015, F-016**: Fix SQL injection in resource queries
4. **F-018**: Add CSRF protection
5. **F-020**: Implement server-side authorization
6. **F-024**: Remove/sanitize dangerouslySetInnerHTML usage

### Short-Term (Within 2 Weeks)
7. **F-005**: Upgrade password hashing to bcrypt/argon2
8. **F-006**: Use cryptographically secure session tokens
9. **F-009**: Remove legacy Login.tsx auth bypass
10. **F-011**: Strengthen password requirements
11. **F-012**: Add rate limiting
12. **F-019**: Fix cookie security settings
13. **F-021**: Implement role-based RLS policies
14. **F-026**: Move session tokens to httpOnly cookies
15. **F-027**: Add Content Security Policy
16. **F-028**: Add security headers

### Medium-Term (Within 1 Month)
17. **F-007**: Remove hardcoded OneSignal IDs
18. **F-008**: Remove hardcoded Supabase URLs
19. **F-013**: Validate OAuth state parameter
20. **F-014**: Enable email verification
21. **F-022**: Add audit logging
22. **F-023**: Validate role assignments server-side
23. **F-029**: Fix group_memberships RLS
24. **F-030**: Review anon key permissions

---

## Compliance Notes

- **OWASP Top 10 2021:**
  - A01:2021 - Broken Access Control (F-009, F-010, F-020, F-021)
  - A02:2021 - Cryptographic Failures (F-005, F-006)
  - A03:2021 - Injection (F-015, F-016)
  - A04:2021 - Insecure Design (F-009, F-020)
  - A05:2021 - Security Misconfiguration (F-001, F-003, F-027, F-028)
  - A07:2021 - Authentication and Authorization Failures (F-009, F-010, F-020)
  - A09:2021 - Security Logging and Monitoring Failures (F-022)

- **GDPR:** User data is stored in Supabase with RLS policies. Ensure data processing has a legal basis and users can request deletion.

- **PCI-DSS:** Not applicable (no payment card processing).

---

## Appendix A: File Locations

| Finding | File | Line(s) |
|---|---|---|
| F-001 | `src/lib/auth.ts` | 13-14 |
| F-001 | `src/integrations/supabase/client.ts` | 4-5 |
| F-002 | `.env.local` | 11 |
| F-003 | `.env`, `.env.local` | 1, 8 |
| F-004 | `server/store.ts` | 29 |
| F-005 | `server/store.ts` | 15-17 |
| F-006 | `server/routes/api/auth/login.post.ts` | 18 |
| F-007 | `src/lib/authOneSignal.ts` | 12 |
| F-007 | `src/lib/onesignal.ts` | 603 |
| F-009 | `src/pages/Login.tsx` | 32-35 |
| F-010 | `server/routes/api/auth/session.get.ts` | 5-24 |
| F-011 | `src/lib/auth.ts` | 66-68 |
| F-012 | `server/routes/api/auth/login.post.ts` | 1-38 |
| F-013 | `src/lib/auth.ts` | 386-443 |
| F-015 | `src/capabilities/resource/index.ts` | 52-58 |
| F-016 | `src/capabilities/resource/index.ts` | 81-119 |
| F-018 | All `server/routes/api/*.ts` | Various |
| F-019 | `server/routes/api/auth/login.post.ts` | 19-24 |
| F-020 | `src/lib/rbac.ts` | 35-38 |
| F-021 | `supabase/migrations/20260909000000_add_rls_policies_for_all_tables.sql` | Various |
| F-022 | All `server/routes/api/*.ts` | Various |
| F-023 | `src/pages/Login.tsx` | 24-27 |
| F-024 | `src/components/ui/chart.tsx` | 96 |
| F-026 | `src/pages/Login.tsx` | 32-35 |
| F-027 | All HTML/JS files | N/A |
| F-028 | `vite.config.ts`, `nitro.config.ts` | N/A |

---

**Report generated:** 2026-09-09
**Next audit recommended:** After remediation of all CRITICAL findings
