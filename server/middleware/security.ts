/**
 * Security headers middleware for all API responses.
 */
import { defineEventHandler, setResponseHeader, createError } from "nitro/h3";

export default defineEventHandler((event) => {
  // Only apply to API routes, not the SPA
  if (!event.path.startsWith("/api")) return;

  // Content Security Policy
  setResponseHeader(event, "Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; "));

  // Prevent clickjacking
  setResponseHeader(event, "X-Frame-Options", "DENY");

  // Prevent MIME sniffing
  setResponseHeader(event, "X-Content-Type-Options", "nosniff");

  // XSS Protection
  setResponseHeader(event, "X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  setResponseHeader(event, "Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  setResponseHeader(event, "Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});
