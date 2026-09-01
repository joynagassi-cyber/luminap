import { defineHandler } from "nitro";
import { getCookie, createError } from "nitro/h3";
import { SESSION_COOKIE_NAME, sessions } from "./login.post";

export default defineHandler((event) => {
  const token = getCookie(event, SESSION_COOKIE_NAME);
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié" });
  }

  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    // Expired or invalid session
    throw createError({ statusCode: 401, statusMessage: "Session expirée" });
  }

  return {
    ok: true,
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      role: session.role,
      organization: session.organization,
    },
  };
});
