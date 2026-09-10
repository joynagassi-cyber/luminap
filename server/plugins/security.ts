import { defineEventHandler, eventHandler } from "h3";
import {
  requireAuth,
  applySecurityHeaders,
  rateLimit,
} from "../middleware/security";
import { store } from "../store";

/**
 * Global security handler applied to all API routes.
 * This file is loaded as a Nitro plugin via nitro.config.ts.
 * See server/plugins/security.ts instead for the plugin approach.
 */
export default defineEventHandler((event) => {
  // Guard: skip header application if the event is not a real HTTP request
  // (Nitro plugin init may run with a minimal event lacking headers)
  if (event.headers) {
    applySecurityHeaders(event);
  }

  const method = event.method;
  if (!method) return;

  if (method !== "GET" && !event.path.startsWith("/api/hello")) {
    rateLimit(event);
  }

  // Require auth for all write operations (POST, PUT, PATCH, DELETE)
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    try {
      requireAuth(event);
    } catch (e: any) {
      throw e;
    }
  }

  // Return 200 for OPTIONS (CORS preflight)
  if (method === "OPTIONS") {
    return { ok: true };
  }
});
