import { defineHandler } from "nitro";
import { getCookie, createError, methodNotAllowed } from "nitro/h3";
import { SESSION_COOKIE_NAME, sessions } from "./login.post";

export default defineHandler((event) => {
  if (event.method !== "DELETE") {
    methodNotAllowed(event, ["DELETE"]);
  }

  const token = getCookie(event, SESSION_COOKIE_NAME);
  if (!token) return { ok: true }; // Already logged out

  sessions.delete(token);
  return { ok: true };
});
