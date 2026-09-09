import { defineHandler } from "nitro";
import { readBody, createError, setCookie } from "nitro/h3";
import { store, createUserRecord } from "../../store";
import { generateSessionToken } from "../../../middleware/security";

export default defineHandler(async (event) => {
  const body = await readBody<{ firstName?: string; lastName?: string; email?: string; password?: string }>(event);

  if (!body?.firstName?.trim() || !body?.lastName?.trim() || !body?.email?.trim() || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: "Tous les champs sont requis" });
  }

  // Enforce minimum password length
  if (body.password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: "Le mot de passe doit contenir au moins 8 caracteres" });
  }

  if (store.user && store.user.email === body.email.trim().toLowerCase()) {
    throw createError({ statusCode: 409, statusMessage: "Cet email est déjà utilisé" });
  }

  const user = createUserRecord(
    body.firstName.trim(),
    body.lastName.trim(),
    body.email.trim().toLowerCase(),
    body.password,
  );

  const token = generateSessionToken();
  setCookie(event, "lumina_session_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
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
