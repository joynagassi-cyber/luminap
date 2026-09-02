import { defineHandler } from "nitro";
import { getRouterParam } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler((event) => {
  const id = getRouterParam(event, "id");
  const transaction = store.transactions.find((t) => t.id === id);

  if (!transaction) {
    return { ok: false, error: "Transaction not found" };
  }

  return { ok: true, transaction };
});
