import { defineHandler } from "nitro";
import { getQuery } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler((event) => {
  const query = getQuery(event);
  let filtered = [...store.transactions];

  if (query.status) {
    filtered = filtered.filter((t) => t.status === query.status);
  }
  if (query.type) {
    filtered = filtered.filter((t) => t.type === query.type);
  }

  return { ok: true, transactions: filtered };
});
