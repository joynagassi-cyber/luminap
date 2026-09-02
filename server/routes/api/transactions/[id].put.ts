import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "id required" });

  const body = await readBody(event);
  const tx = store.transactions.find(t => t.id === id);
  if (!tx) throw createError({ statusCode: 404, statusMessage: "Not found" });

  const allowedFields = ["type", "amount", "description", "date", "categoryId", "orgUnitId", "status"];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  updates.updatedAt = new Date().toISOString();
  updates.version = (tx.version || 0) + 1;

  Object.assign(tx, updates);

  return { ok: true, transaction: tx };
});
