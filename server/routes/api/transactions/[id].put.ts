import { defineHandler } from "nitro";
import { readBody } from "nitro/h3";
import { getRouterParam } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  const txIndex = store.transactions.findIndex((t) => t.id === id);

  if (txIndex === -1) {
    return { ok: false, error: "Transaction not found" };
  }

  store.transactions[txIndex] = {
    ...store.transactions[txIndex],
    ...body,
    updatedAt: new Date().toISOString(),
    version: store.transactions[txIndex].version + 1,
  };

  return { ok: true, transaction: store.transactions[txIndex] };
});
