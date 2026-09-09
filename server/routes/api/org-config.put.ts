import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { store } from "../../store";

export default defineHandler(async (event) => {
  const body = await readBody(event);
  if (body.name !== undefined) {
    // Sanitize name
    store.orgConfig.name = typeof body.name === 'string'
      ? body.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : String(body.name);
  }
  if (body.logoUrl !== undefined) {
    // Validate URL format to prevent injection
    const url = String(body.logoUrl);
    if (url.match(/^https?:\/\/.+/)) {
      store.orgConfig.logoUrl = url;
    }
  }
  return { ok: true, config: store.orgConfig };
});
