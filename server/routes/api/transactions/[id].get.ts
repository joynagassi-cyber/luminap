import { defineHandler } from "nitro";
import { getRouterParam } from "nitro/h3";
import { SERVER_TRANSACTIONS, SERVER_CATEGORIES, SERVER_ORG_UNITS } from "../../../../store";

export default defineHandler((event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    return { transaction: null, error: "transaction id requis" };
  }

  const tx = SERVER_TRANSACTIONS.find((t) => t.id === id);
  if (!tx) {
    return { transaction: null, error: "Transaction introuvable" };
  }

  const category = SERVER_CATEGORIES.find((c) => c.id === tx.categoryId);
  const orgUnit = SERVER_ORG_UNITS.find((o) => o.id === tx.orgUnitId);

  return { transaction: { ...tx, category, orgUnit } };
});
