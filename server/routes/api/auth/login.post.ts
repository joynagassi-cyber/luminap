import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event);

  if (!body?.email || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: "email and password are required" });
  }

  const hashedPassword = btoa(body.password);
  const validUser =
    body.email === "admin@mfe-jc.org" &&
    hashedPassword === btoa("lumina-admin-2026");

  if (!validUser) {
    throw createError({ statusCode: 401, statusMessage: "Identifiants invalides" });
  }

  const token = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  return {
    ok: true,
    user: store.user,
    sessionToken: token,
  };
});
