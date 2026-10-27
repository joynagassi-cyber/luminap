/**
 * Route resolver — single source of truth for "what should this URL show?".
 *
 * Contract §2.2 / Phase 2: a unique `resolveRoute(url, state)` returning one of
 * a FINITE set of outcomes. No URL may ever end on an empty screen: every case
 * maps to a concrete state the UI can render.
 *
 * This module is intentionally pure (no React, no I/O) so it can be unit-tested
 * deterministically (R10) and reused by BOTH the web router guard and the
 * native `appUrlOpen` deep-link handler (contract §2.3 — "the same resolver").
 */

export type RouteKind = "public" | "app";

export interface RouteDef {
  /** Path pattern, e.g. `/transaction/:id`. `*` is the catch-all. */
  pattern: string;
  kind: RouteKind;
  /** Permission required to view the route (checked via state.hasPermission). */
  permission?: string;
}

/**
 * The registry mirrors `src/ionic/routes/*`. Kept as data (not JSX) so the
 * resolver, the deep-link matrix and the tests share one list.
 */
export const ROUTE_REGISTRY: readonly RouteDef[] = [
  // auth / public
  { pattern: "/splash", kind: "public" },
  { pattern: "/auth", kind: "public" },
  { pattern: "/auth/callback", kind: "public" },
  { pattern: "/sessions", kind: "public" },
  // app
  { pattern: "/onboarding", kind: "app" },
  { pattern: "/dashboard", kind: "app" },
  { pattern: "/notifications", kind: "app" },
  { pattern: "/tutoriel", kind: "app" },
  { pattern: "/finance", kind: "app" },
  { pattern: "/transaction/new", kind: "app" },
  { pattern: "/transaction/:id", kind: "app" },
  { pattern: "/transaction/:id/edit", kind: "app" },
  { pattern: "/groups/:id/transaction/new", kind: "app" },
  { pattern: "/balance", kind: "app" },
  { pattern: "/versement", kind: "app" },
  { pattern: "/saisie-rapide/:id", kind: "app" },
  { pattern: "/budgets", kind: "app" },
  { pattern: "/budgets/:id", kind: "app" },
  { pattern: "/giving", kind: "app" },
  { pattern: "/giving/campaigns/:id", kind: "app" },
  { pattern: "/groups", kind: "app" },
  { pattern: "/groups/:id", kind: "app" },
  { pattern: "/groups/:id/cotisation", kind: "app" },
  { pattern: "/events", kind: "app" },
  { pattern: "/event/new", kind: "app" },
  { pattern: "/event/:id", kind: "app" },
  { pattern: "/event/:id/edit", kind: "app" },
  { pattern: "/members", kind: "app" },
  { pattern: "/membres-en-avance", kind: "app" },
  { pattern: "/membre/:id", kind: "app" },
  { pattern: "/culte/:id", kind: "app" },
  { pattern: "/archives", kind: "app" },
  { pattern: "/reports", kind: "app" },
  { pattern: "/report-builder", kind: "app" },
  { pattern: "/cotisations", kind: "app" },
  { pattern: "/forms", kind: "app" },
  { pattern: "/form/fill/:id", kind: "app" },
  { pattern: "/forms/:id/submissions", kind: "app" },
  { pattern: "/custom-fields", kind: "app" },
  { pattern: "/invitation/emit", kind: "app", permission: "invitation:create" },
  { pattern: "/invitation/claim", kind: "public" },
  { pattern: "/invitation/manage", kind: "app", permission: "invitation:manage" },
  { pattern: "/org-setup", kind: "app" },
  { pattern: "/admin", kind: "app", permission: "admin:settings" },
  { pattern: "/admin/federation", kind: "app", permission: "admin:settings" },
  { pattern: "/admin/federation/tree", kind: "app", permission: "admin:settings" },
  { pattern: "/admin/units", kind: "app", permission: "admin:settings" },
  { pattern: "/admin/report-send", kind: "app", permission: "admin:settings" },
  { pattern: "/admin/reports", kind: "app", permission: "admin:settings" },
  { pattern: "/admin/reports/:id", kind: "app", permission: "admin:settings" },
  { pattern: "/admin/organizations/:id", kind: "app", permission: "admin:settings" },
  { pattern: "/admin/roles", kind: "app", permission: "admin:roles" },
  { pattern: "/trace", kind: "app" },
  { pattern: "/history", kind: "app" },
  { pattern: "/help", kind: "app" },
  { pattern: "/settings", kind: "app" },
  { pattern: "/settings/profil", kind: "app" },
  { pattern: "/settings/theme", kind: "app" },
  { pattern: "/settings/personnalisation", kind: "app" },
  { pattern: "/settings/features", kind: "app" },
  { pattern: "/settings/notifications", kind: "app" },
  { pattern: "/settings/gestion", kind: "app" },
  { pattern: "/settings/about", kind: "app" },
  { pattern: "/settings/health", kind: "app" },
  { pattern: "*", kind: "public" }, // catch-all → resolved as not-found
] as const;

export type RouteOutcome =
  | { outcome: "render" }
  | { outcome: "redirect"; to: string }
  | { outcome: "needs-auth"; returnTo: string }
  | { outcome: "needs-membership" }
  | { outcome: "forbidden"; permission: string }
  | { outcome: "not-found" }
  | { outcome: "org-switch-required"; orgId: string }
  | { outcome: "update-required" }
  | { outcome: "loading" };

export interface RouteState {
  isAuthenticated: boolean;
  /** Whether the user belongs to the active organisation. Defaults to true. */
  isOrgMember?: boolean;
  hasPermission?: (permission: string) => boolean;
  /** Client schema version vs. the minimum the server requires. */
  clientSchemaVersion?: number;
  minSchemaVersion?: number;
  /** Org id carried by a deep link, when different from the active one. */
  linkOrgId?: string | null;
  activeOrgId?: string | null;
}

/** Internal routes a `returnTo` may target. Everything else is rejected. */
const RETURN_TO_ALLOWLIST: readonly string[] = ROUTE_REGISTRY.filter(
  (r) => r.pattern !== "*" && r.kind === "app",
).map((r) => r.pattern);

/**
 * Whether a `returnTo` value is a safe internal path. Blocks open redirects
 * (contract §2.3): only same-app absolute paths, never protocol-relative
 * (`//evil.com`) nor absolute URLs.
 */
export function isAllowedReturnTo(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false; // protocol-relative → external
  const clean = path.split("?")[0].split("#")[0];
  return RETURN_TO_ALLOWLIST.some((pattern) => matchesPattern(pattern, clean));
}

/** Compile a `:param` / `*` pattern into a matcher. */
function matchesPattern(pattern: string, pathname: string): boolean {
  if (pattern === "*") return true;
  const p = pattern.replace(/\/+$/, "") || "/";
  const parts = p.split("/");
  const target = (pathname.replace(/\/+$/, "") || "/").split("/");
  if (parts.length !== target.length) return false;
  return parts.every(
    (seg, i) => seg.startsWith(":") || seg === target[i],
  );
}

function findRoute(pathname: string): RouteDef | undefined {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return (
    ROUTE_REGISTRY.find(
      (r) => r.pattern !== "*" && matchesPattern(r.pattern, clean),
    ) ?? ROUTE_REGISTRY.find((r) => r.pattern === "*")
  );
}

/**
 * Resolve a URL to a finite outcome. Pure function of `(pathname, state)`.
 *
 * Order of checks (each short-circuits):
 *   1. schema too old            → update-required
 *   2. unknown route             → not-found
 *   3. public route              → render
 *   4. deep link to another org  → org-switch-required
 *   5. not authenticated         → needs-auth (returnTo allowlisted)
 *   6. missing permission        → forbidden
 *   7. not an org member         → needs-membership
 *   8. otherwise                 → render
 */
export function resolveRoute(
  pathname: string,
  state: RouteState,
): RouteOutcome {
  const clean = pathname.split("?")[0].split("#")[0] || "/";

  if (
    state.minSchemaVersion !== undefined &&
    state.clientSchemaVersion !== undefined &&
    state.clientSchemaVersion < state.minSchemaVersion
  ) {
    return { outcome: "update-required" };
  }

  // `/` is the PWA start_url → deterministic redirect to the splash screen.
  if (clean === "/") return { outcome: "redirect", to: "/splash" };

  const route = findRoute(clean);
  if (!route || route.pattern === "*") return { outcome: "not-found" };

  if (route.kind === "public") return { outcome: "render" };

  if (
    state.linkOrgId &&
    state.activeOrgId &&
    state.linkOrgId !== state.activeOrgId
  ) {
    return { outcome: "org-switch-required", orgId: state.linkOrgId };
  }

  if (!state.isAuthenticated) {
    return {
      outcome: "needs-auth",
      returnTo: isAllowedReturnTo(clean) ? clean : "/dashboard",
    };
  }

  if (route.permission && !(state.hasPermission?.(route.permission) ?? true)) {
    return { outcome: "forbidden", permission: route.permission };
  }

  if (state.isOrgMember === false) return { outcome: "needs-membership" };

  return { outcome: "render" };
}

/** Number of concrete (non catch-all) routes — derived, never drifts. */
export const ROUTE_COUNT = ROUTE_REGISTRY.filter((r) => r.pattern !== "*").length;

export interface ParsedDeepLink {
  /** Internal path the link points to (already validated or `/dashboard`). */
  path: string;
  /** Raw `returnTo` requested by the link, when present. */
  returnTo: string | null;
  /** Organisation carried by the link, when present. */
  orgId: string | null;
  /** OAuth authorization code, when the link is an auth callback. */
  code: string | null;
}

/**
 * Parse a deep-link URL (web or `lumina://`) into an internal navigation
 * intent. Never trusts the URL: `returnTo` is validated against the allowlist
 * (anti open-redirect, contract §2.3) and defaults to `/dashboard`.
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const code = parsed.searchParams.get("code");
  const returnToRaw = parsed.searchParams.get("returnTo");
  const orgId = parsed.searchParams.get("org") ?? parsed.searchParams.get("orgId");

  // `lumina://path` puts the path in `host` + `pathname`; `https://host/path`
  // in `pathname`. Normalise to an internal path.
  let path = parsed.pathname || "/";
  if (parsed.protocol === "lumina:" && parsed.host) {
    path = `/${parsed.host}${parsed.pathname}`;
  }

  const returnTo =
    returnToRaw && isAllowedReturnTo(returnToRaw) ? returnToRaw : null;

  return {
    path: isAllowedReturnTo(path) ? path : "/dashboard",
    returnTo,
    orgId: orgId || null,
    code,
  };
}
