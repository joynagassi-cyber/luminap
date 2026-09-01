import { defineHandler } from "nitro";
import { getRouterParam, readBody } from "nitro/h3";
import { SERVER_TRANSACTIONS } from "../../../../store";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    return { error: "transaction id requis" };
  }

  const idx = SERVER_TRANSACTIONS.findIndex((t) => t.id === id);
  if (idx === -1) {
    return { error: "Transaction introuvable" };
  }

  const tx = SERVER_TRANSACTIONS[idx];

  // Approved transactions are immutable
  if (tx.status === "APPROVED") {
    return { error: "Une transaction approuvée ne peut pas être modifiée" };
  }

  const body = await readBody(event);
  if (!body) {
    return { error: "Aucune modification fournie" };
  }

  const updates: Record<string, unknown> = {};

  if (body.type !== undefined) updates.type = body.type;
  if (body.amount !== undefined) updates.amount = body.amount;
  if (body.description !== undefined) updates.description = body.description;
  if (body.date !== undefined) updates.date = body.date;
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
  if (body.orgUnitId !== undefined) updates.orgUnitId = body.orgUnitId;
  if (body.status !== undefined) updates.status = body.status;

  if (Object.keys(updates).length === 0) {
    return { error: "Aucune modification fournie" };
  }

  SERVER_TRANSACTIONS[idx] = {
    ...SERVER_TRANSACTIONS[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
    version: (tx.version ?? 1) + 1,
  };

  return { ok: true, transaction: SERVER_TRANSACTIONS[idx] };
});
