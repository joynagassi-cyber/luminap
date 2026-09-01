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
  const body = await readBody(event);
  const action = body?.action;

  if (action === "approve") {
    if (tx.status !== "PENDING") {
      return { error: "Seules les transactions en attente peuvent être approuvées" };
    }
    const approverId = body.approverId ?? tx.createdById;
    const now = new Date().toISOString();
    SERVER_TRANSACTIONS[idx] = {
      ...tx,
      status: "APPROVED" as const,
      approvedById: approverId,
      approvedAt: now,
      updatedAt: now,
      version: (tx.version ?? 1) + 1,
    };
    return { ok: true, transaction: SERVER_TRANSACTIONS[idx] };
  }

  if (action === "reject") {
    if (tx.status !== "PENDING") {
      return { error: "Seules les transactions en attente peuvent être rejetées" };
    }
    const comment = body.comment ?? null;
    const now = new Date().toISOString();
    SERVER_TRANSACTIONS[idx] = {
      ...tx,
      status: "REJECTED" as const,
      comment,
      updatedAt: now,
      version: (tx.version ?? 1) + 1,
    };
    return { ok: true, transaction: SERVER_TRANSACTIONS[idx] };
  }

  if (action === "submit") {
    if (tx.status !== "DRAFT") {
      return { error: "Seuls les brouillons peuvent être soumis" };
    }
    const now = new Date().toISOString();
    SERVER_TRANSACTIONS[idx] = {
      ...tx,
      status: "PENDING" as const,
      updatedAt: now,
      version: (tx.version ?? 1) + 1,
    };
    return { ok: true, transaction: SERVER_TRANSACTIONS[idx] };
  }

  return { error: "action inconnue. Utilisez: approve, reject, ou submit" };
});
