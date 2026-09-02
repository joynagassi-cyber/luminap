import { defineHandler } from "nitro";
import { getRouterParam } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler((event) => {
  const id = getRouterParam(event, "id");
  store.transactions = store.transactions.filter((t) => t.id !== id);
  return { ok: true, deleted: id };
});
