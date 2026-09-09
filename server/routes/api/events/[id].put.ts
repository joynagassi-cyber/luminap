import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { store, findUserByEmail, verifyPassword } from "../../../store";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "id required" });

  const body = await readBody(event);
  const allowedFields = ["name", "description", "startDate", "endDate", "budget", "status"];
  const idx = store.events.findIndex(e => e.id === id);
  if (idx === -1) throw createError({ statusCode: 404, statusMessage: "Not found" });

  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      // Sanitize string fields
      if (typeof body[key] === 'string') {
        store.events[idx][key] = body[key].replace(/</g, '&lt;').replace(/>/g, '&gt;');
      } else {
        store.events[idx][key] = body[key];
      }
    }
  }
  store.events[idx].updatedAt = new Date().toISOString();

  return { ok: true, event: store.events[idx] };
});
