import { defineHandler } from "nitro";
import { readBody, createError, setCookie } from "nitro/h3";
import { createUserRecord, findUserByEmail } from "../../store";

export default defineHandler(async (event) => {
  const body = await readBody<{ firstName?: string; lastName?: string; email?: string; password?: string }>(event);

  if (!body?.firstName?.trim() || !body?.lastName?.trim() || !body?.email?.trim() || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: "Tous les champs sont requis" });
  }

  if (findUserByEmail(body.email.trim().toLowerCase())) {
    throw createError({ statusCode: 409, statusMessage: "Cet email est déjà utilisé" });
  }

  const user = createUserRecord(body.firstName.trim(), body.lastName.trim(), body.email.trim().toLowerCase(), body.password);

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
