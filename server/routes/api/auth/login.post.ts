import { defineHandler } from "nitro";
import { readBody, createError, setCookie } from "nitro/h3";
import { findUserByEmail } from "../../store";
import { createHash } from "node:crypto";

export default defineHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event);

  if (!body?.email || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: "email and password are required" });
  }

  const user = findUserByEmail(body.email);
  if (!user || user.hashedPassword !== createHash("sha256").update(body.password).digest("hex")) {
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
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      org: user.org,
    },
    sessionToken: token,
  };
});
