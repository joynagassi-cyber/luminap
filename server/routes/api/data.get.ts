import { defineHandler } from "nitro";
import { store } from "../../store";

export default defineHandler(() => {
  return {
    ok: true,
    categories: store.categories,
    orgUnits: store.orgUnits,
    events: store.events,
    transactions: store.transactions,
    auditEntries: store.auditEntries,
    orgConfig: store.orgConfig,
  };
});
