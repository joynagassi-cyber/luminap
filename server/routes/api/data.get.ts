import { defineHandler } from "nitro";
import { store } from "../../../store";

export default defineHandler(() => {
  return {
    ok: true,
    categories: store.categories,
    orgUnits: store.orgUnits,
    transactions: store.transactions,
    auditEntries: store.auditEntries,
  };
});
