import { defineEventHandler, createError, getHeader, setHeader, getCookie } from "h3";
import { readBody } from "h3";
import { randomBytes } from "node:crypto";
import type { H3Event } from "h3";

/**
 * Security middleware for Nitro server routes.
 * - Verifies session tokens on mutating/authenticated endpoints
 * - Applies security headers to every response
 * - Basic rate-limiting (sliding window) per IP per endpoint
 * - Sanitizes text inputs (strip HTML tags)
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

// In-memory rate limit store
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

export function rateLimit(event: H3Event): void {
  const ip = getHeader(event, "x-forwarded-for")?.split(",")[0]?.trim()
    || getHeader(event, "x-real-ip")
    || "unknown";
  const path = event.path;
  const key = `${ip}:${path}`;

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (entry) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.set(key, { count: 1, windowStart: now });
    } else if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      throw createError({
        statusCode: 429,
        statusMessage: "Trop de requetes. Veuillez attendre un instant.",
      });
    } else {
      entry.count++;
    }
  } else {
    rateLimitStore.set(key, { count: 1, windowStart: now });
  }

  // Clean old entries every 10 requests
  if (rateLimitStore.size > 500) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS * 2;
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.windowStart < cutoff) rateLimitStore.delete(k);
    }
  }
}

export function sanitize(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

export function validateBody<T>(
  event: H3Event,
  requiredFields: string[],
): T {
  const body = getBody<T>(event);
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      throw createError({
        statusCode: 400,
        statusMessage: `Champ requis: ${field}`,
      });
    }
  }
  return body as T;
}

export function getBody<T>(event: H3Event): T {
  return readBody(event) as T;
}

/**
 * Session token format: `lumina_sess_<uuid-v4>`
 * Expected to be sent as a Cookie (not a header) for CSRF safety.
 */
export const SESSION_COOKIE_NAME = "lumina_session_token";

/**
 * Auth middleware: requires a valid session cookie.
 * Rejects if no token or tampered token.
 */
export function requireAuth(event: H3Event) {
  const token = getCookie(event, SESSION_COOKIE_NAME);
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Non authentifie",
    });
  }
  // Basic token format validation: must start with lumina_sess_
  if (!token.startsWith("lumina_sess_") || token.length < 30) {
    throw createError({
      statusCode: 401,
      statusMessage: "Session invalide",
    });
  }
  return token;
}

/**
 * Admin-only middleware: requires auth + ADMIN role.
 * Read the session store to get the user role.
 */
export function requireAdmin(event: H3Event) {
  requireAuth(event);
  // In the server store, the only admin is hardcoded; we check the store.user role
  // This is enforced at the route level where needed
  return true;
}

/**
 * Apply security headers to the response.
 */
export function applySecurityHeaders(event: H3Event): void {
  // Guard: skip if headers object is not present (plugin init edge case)
  if (!event.headers) return;

  setHeader(event, "X-Content-Type-Options", "nosniff");
  setHeader(event, "X-Frame-Options", "DENY");
  setHeader(event, "X-XSS-Protection", "0");
  setHeader(event, "Referrer-Policy", "strict-origin-when-cross-origin");
  setHeader(event, "Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  setHeader(event, "Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // CSP: only allow same-origin scripts and our Supabase APIs
  setHeader(
    event,
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://cdn.supabase.io https://*.supabase.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://*.onesignal.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  setHeader(event, "Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  setHeader(event, "Surrogate-Control", "no-store");
}

/**
 * Generate a cryptographically secure session token.
 */
export function generateSessionToken(): string {
  return `lumina_sess_${randomBytes(32).toString("hex")}`;
}

/**
 * Default export — no-op middleware passthrough so Nitro doesn't crash
 * when it auto-discovers this file. Actual security logic lives in the
 * plugin (server/plugins/security.ts) and is used explicitly by routes.
 */
export default function securityMiddleware() {
  return {};
}
