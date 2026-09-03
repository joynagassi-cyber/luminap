import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "id required" });

  const idx = store.events.findIndex(e => e.id === id);
  if (idx === -1) throw createError({ statusCode: 404, statusMessage: "Not found" });

  const body = await readBody(event);
  const allowedFields = ["name", "description", "startDate", "endDate", "budget", "status"];
  for (const key of allowedFields) {
    if (body[key] !== undefined) store.events[idx][key] = body[key];
  }
  store.events[idx].updatedAt = new Date().toISOString();

  return { ok: true, event: store.events[idx] };
});
