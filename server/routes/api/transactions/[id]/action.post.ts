import { defineHandler } from "nitro";
import { readBody } from "nitro/h3";
import { getRouterParam } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody<{ action?: string; comment?: string }>(event);

  const txIndex = store.transactions.findIndex((t) => t.id === id);
  if (txIndex === -1) {
    return { ok: false, error: "Transaction not found" };
  }

  const tx = store.transactions[txIndex];
  const now = new Date().toISOString();

  if (body.action === "approve" && tx.status === "PENDING") {
    store.transactions[txIndex] = {
      ...tx,
      status: "APPROVED",
      approvedById: "user-1",
      approvedAt: now,
      updatedAt: now,
      version: tx.version + 1,
    };
  } else if (body.action === "reject" && tx.status === "PENDING") {
    store.transactions[txIndex] = {
      ...tx,
      status: "REJECTED",
      comment: body.comment || null,
      updatedAt: now,
      version: tx.version + 1,
    };
  } else if (body.action === "submit" && tx.status === "DRAFT") {
    store.transactions[txIndex] = {
      ...tx,
      status: "PENDING",
      updatedAt: now,
      version: tx.version + 1,
    };
  } else {
    return { ok: false, error: "Invalid action for this status" };
  }

  return { ok: true, transaction: store.transactions[txIndex] };
});
