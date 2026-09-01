import { defineEventHandler, createError, getHeader, getRouterParam, readValidatedBody } from "nitro";
import { SESSION_COOKIE_NAME, sessions } from "./login.post";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthorizedRequest {
  session: {
    userId: string;
    email: string;
    role: string;
    organization: string;
  };
}

// ─── Authorization constants ──────────────────────────────────────────────────
const ALLOWED_ACTIONS_FOR_ROLE: Record<string, Set<string>> = {
  ADMIN: new Set(["read", "create", "approve", "reject", "edit", "delete"]),
  TREASURER: new Set(["read", "create"]),
  APPROVER: new Set(["read", "approve"]),
};

// ─── Helper: extract session from cookie ──────────────────────────────────────
export function getSession(event: { method: string; header: (name: string) => string | undefined; node: { req: { socket: { remoteAddress?: string } } } }): AuthorizedRequest["session"] | null {
  const token = (event as any).__sessionToken ?? getHeader(event as any, "x-session-token");
  // Check cookie first (for page loads), then header (for API calls from SPA)
  const cookie = (event as any).__cookie ?? null;
  const resolvedToken = cookie?.find((c: string) => c.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split("=")[1]
    ?? token;

  if (!resolvedToken) return null;
  const session = sessions.get(resolvedToken);
  if (!session || session.expiresAt < Date.now()) return null;
  return session;
}

// ─── Helper: check if user can perform an action ──────────────────────────────
export function checkAuthorization(
  session: AuthorizedRequest["session"],
  action: string,
): void {
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié" });
  }

  const allowed = ALLOWED_ACTIONS_FOR_ROLE[session.role];
  if (!allowed?.has(action)) {
    throw createError({
      statusCode: 403,
      statusMessage: `Action "${action}" non autorisée pour votre rôle (${session.role})`,
    });
  }
}

// ─── Helper: wrap handler with auth check ─────────────────────────────────────
export function withAuth(handler: (event: any, session: AuthorizedRequest["session"]) => Promise<any> | any) {
  return defineEventHandler(async (event: any) => {
    const session = getSession(event);

    // Also accept x-session-token header (useful for SPA client-side calls)
    if (!session) {
      const headerToken = getHeader(event, "x-session-token");
      if (headerToken) {
        const s = sessions.get(headerToken);
        if (s && s.expiresAt >= Date.now()) session = s;
      }
    }

    return handler(event, session);
  });
}
