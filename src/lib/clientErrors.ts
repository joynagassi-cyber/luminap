/**
 * Client error capture — contract §1.3/Phase 1: "zéro erreur non gérée".
 *
 * Registers `window.onerror` and `unhandledrejection` handlers that forward a
 * redacted, PII-free context to Sentry (already initialised in `sentry.ts`)
 * and to an optional `client_errors` sink. This makes silent failures visible
 * instead of leaving the user on a black screen with no trace.
 *
 * PII policy (contract §2.5 disallowed_actions): never log emails, names or
 * free-form user content — only route, app version, role, org id, platform and
 * the error message/stack.
 */
import * as Sentry from "@sentry/react";
import { Capacitor } from "@capacitor/core";

export interface ClientErrorContext {
  message: string;
  stack?: string;
  route?: string;
  appVersion?: string;
  role?: string;
  orgId?: string;
  platform?: string;
  source: "onerror" | "unhandledrejection" | "handled";
}

/** Redact anything that looks like an email or a bearer/JWT token. */
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "<email>")
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g, "<jwt>")
    .replace(/Bearer\s+[\w.-]+/gi, "Bearer <token>");
}

function currentRoute(): string | undefined {
  try {
    return window.location?.pathname;
  } catch {
    return undefined;
  }
}

export function buildContext(
  source: ClientErrorContext["source"],
  err: unknown,
): ClientErrorContext {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Erreur inconnue";
  const stack = err instanceof Error ? err.stack : undefined;
  return {
    source,
    message: redact(message),
    stack: stack ? redact(stack) : undefined,
    route: currentRoute(),
    appVersion: import.meta.env.VITE_APP_VERSION as string | undefined,
    platform: Capacitor.getPlatform?.() ?? "web",
  };
}

let installed = false;

/**
 * In-memory ring buffer of the most recent client errors, for the health page
 * (Phase 11). Never persisted and never leaves the device — it exists so the
 * user (and support) can see "the last errors" without a Sentry account.
 */
const RECENT_ERRORS_LIMIT = 20;
const recentErrors: ClientErrorContext[] = [];

export function getRecentErrors(): readonly ClientErrorContext[] {
  return recentErrors;
}

function pushRecentError(ctx: ClientErrorContext): void {
  recentErrors.unshift(ctx);
  if (recentErrors.length > RECENT_ERRORS_LIMIT) {
    recentErrors.length = RECENT_ERRORS_LIMIT;
  }
}

/** Test helper — clears the in-memory ring buffer. */
export function clearRecentErrors(): void {
  recentErrors.length = 0;
}

/**
 * Capture a **handled** error — one a `.catch()` intercepted before it could
 * become an unhandled rejection (R88). Without this, a failed load that the
 * UI swallows leaves no trace at all: the user sees an empty list and support
 * has nothing to inspect. Same redaction and same health-page buffer as the
 * global handlers, so a caught failure is as visible as an uncaught one.
 */
export function captureClientError(
  err: unknown,
  context?: { message?: string; route?: string },
): void {
  const base = buildContext("handled", err);
  const ctx: ClientErrorContext = context?.message
    ? { ...base, message: redact(context.message) }
    : base;
  pushRecentError(context?.route ? { ...ctx, route: context.route } : ctx);
  console.error("[client-error]", ctx);
  Sentry.captureException(
    err instanceof Error ? err : new Error(context?.message ?? ctx.message),
    { tags: { source: "handled", route: ctx.route, platform: ctx.platform } },
  );
}

/**
 * Install the global handlers exactly once. Idempotent (safe to call from
 * multiple entry points). Returns an uninstall function for tests.
 */
export function installClientErrorCapture(): () => void {
  if (typeof window === "undefined") return () => {};
  if (installed) return () => {};
  installed = true;

  const onError = (event: ErrorEvent) => {
    const ctx = buildContext("onerror", event.error ?? event.message);
    pushRecentError(ctx);
    console.error("[client-error]", ctx);
    Sentry.captureException(event.error ?? new Error(ctx.message), {
      tags: { source: "onerror", route: ctx.route, platform: ctx.platform },
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const ctx = buildContext("unhandledrejection", event.reason);
    pushRecentError(ctx);
    console.error("[client-error]", ctx);
    Sentry.captureException(event.reason ?? new Error(ctx.message), {
      tags: {
        source: "unhandledrejection",
        route: ctx.route,
        platform: ctx.platform,
      },
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    installed = false;
  };
}

const CHUNK_RELOAD_FLAG = "lumina-chunk-reloaded";

/**
 * Controlled recovery from a stale chunk after a deployment (contract §2.1).
 * Vite fires `vite:preloadError` when a dynamically imported chunk 404s
 * (old hashed filename after a new deploy). Without this the app stays on a
 * blank screen. We reload ONCE per session (guarded via sessionStorage) to
 * avoid a reload loop if the failure is not deployment-related.
 */
export function installChunkErrorRecovery(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    const already = sessionStorage.getItem(CHUNK_RELOAD_FLAG);
    if (already) {
      // Second failure in the same session → don't loop; surface it instead.
      console.error(
        "[chunk-error] Échec de chargement persistant après rechargement — nouvelle version probablement requise.",
        event,
      );
      return;
    }
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
    console.warn(
      "[chunk-error] Chunk obsolète détecté après déploiement — rechargement contrôlé.",
    );
    window.location.reload();
  });
}
