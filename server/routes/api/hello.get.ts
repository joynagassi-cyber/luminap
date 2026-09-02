import { defineHandler } from "nitro";
import { createError } from "nitro/h3";

export default defineHandler(() => {
  return { ok: true, message: "Lumina API" };
});
