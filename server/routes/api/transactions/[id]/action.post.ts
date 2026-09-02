import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "id required" });

  const body = await readBody<{ action?: string; comment?: string }>(event);
  const tx = store.transactions.find(t => t.id === id);
  if (!tx) throw createError({ statusCode: 404, statusMessage: "Not found" });

  if (body.action === "APPROVE") {
    if (tx.status !== "PENDING") throw createError({ statusCode: 400, statusMessage: "Transaction is not pending" });
    tx.status = "APPROVED";
    tx.approvedById = "user-1";
    tx.approvedAt = new Date().toISOString();
    tx.version = (tx.version || 0) + 1;
  } else if (body.action === "REJECT") {
    if (tx.status !== "PENDING") throw createError({ statusCode: 400, statusMessage: "Transaction is not pending" });
    tx.status = "REJECTED";
    tx.comment = body.comment || null;
    tx.version = (tx.version || 0) + 1;
  } else {
    throw createError({ statusCode: 400, statusMessage: "Invalid action" });
  }

  return { ok: true, transaction: tx };
});
