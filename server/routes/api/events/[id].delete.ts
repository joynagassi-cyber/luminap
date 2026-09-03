import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler((event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "id required" });

  const idx = store.events.findIndex(e => e.id === id);
  if (idx === -1) throw createError({ statusCode: 404, statusMessage: "Not found" });

  store.events.splice(idx, 1);
  return { ok: true };
});
