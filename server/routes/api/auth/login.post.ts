import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError, getQuery } from "nitro/h3";
import { store, findUserByEmail, verifyPassword } from "../../store";
import { generateSessionToken } from "../../../middleware/security";

export default defineHandler(async (event) => {
  // Parse query params for filtering
  const query = getQuery(event);
  const email = query.email as string;
  const password = query.password as string;

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: "email and password are required" });
  }

  const user = findUserByEmail(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.hashedPassword)) {
    throw createError({ statusCode: 401, statusMessage: "Identifiants invalides" });
  }

  const token = generateSessionToken();
  // Session cookie is set by the security plugin for authenticated requests

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
