import { defineHandler } from "nitro";
import { getCookie, createError } from "nitro/h3";
import { SESSION_COOKIE_NAME, sessions } from "./login.post";

export default defineHandler((event) => {
  const token = getCookie(event, SESSION_COOKIE_NAME);
  if (!token) return { ok: true, authenticated: false };

  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    return { ok: true, authenticated: false };
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
