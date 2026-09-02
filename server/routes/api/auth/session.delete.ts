import { defineHandler } from "nitro";
import { deleteCookie } from "nitro/h3";

export default defineHandler((event) => {
  deleteCookie(event, "lumina_session_token");
  return { ok: true };
});
