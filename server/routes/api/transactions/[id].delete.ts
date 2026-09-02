import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler((event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "id required" });

  const tx = store.transactions.find(t => t.id === id);
  if (!tx) throw createError({ statusCode: 404, statusMessage: "Not found" });
  if (tx.status !== "REJECTED") {
    throw createError({ statusCode: 400, statusMessage: "Only rejected transactions can be deleted" });
  }

  store.transactions = store.transactions.filter(t => t.id !== id);
  return { ok: true };
});
