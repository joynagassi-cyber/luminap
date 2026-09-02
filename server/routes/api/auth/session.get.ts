import { defineHandler } from "nitro";
import { getCookie } from "nitro/h3";

export default defineHandler((event) => {
  const token = getCookie(event, "lumina_session_token");
  const isAuthenticated = !!token;

  return {
    ok: true,
    authenticated: isAuthenticated,
    user: isAuthenticated ? null : null,
  };
});
