import { defineHandler } from "nitro";
import { getRouterParam } from "nitro/h3";
import { SERVER_TRANSACTIONS } from "../../../../store";

export default defineHandler((event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    return { error: "transaction id requis" };
  }

  const idx = SERVER_TRANSACTIONS.findIndex((t) => t.id === id);
  if (idx === -1) {
    return { error: "Transaction introuvable" };
  }

  const tx = SERVER_TRANSACTIONS[idx];

  // Only rejected transactions can be deleted
  if (tx.status !== "REJECTED") {
    return { error: "Seules les transactions rejetées peuvent être supprimées" };
  }

  SERVER_TRANSACTIONS.splice(idx, 1);
  return { ok: true, deleted: id };
});
