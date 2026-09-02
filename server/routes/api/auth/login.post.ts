import { defineHandler } from "nitro";
import { readBody, createError, setCookie } from "nitro/h3";

export default defineHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event);

  if (!body?.email || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: "email and password are required" });
  }

  const ADMIN_EMAIL = "admin@mfe-jc.org";
  const ADMIN_PASSWORD = "lumina-admin-2026";

  const valid =
    body.email === ADMIN_EMAIL &&
    body.password === ADMIN_PASSWORD;

  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: "Identifiants invalides" });
  }

  const token = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  setCookie(event, "lumina_session_token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });

  return {
    ok: true,
    user: {
      id: "user-1",
      email: ADMIN_EMAIL,
      firstName: "Pasteur",
      lastName: "Jean",
      role: "ADMIN",
      org: {
        id: "org-1",
        name: "Église MFE-JC Centrale",
        type: "Eglise",
        accentColor: "#FF6B00",
      },
    },
    sessionToken: token,
  };
});
