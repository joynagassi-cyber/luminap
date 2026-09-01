import { defineHandler } from "nitro";
import { getQuery } from "nitro/h3";
import { SERVER_TRANSACTIONS, SERVER_CATEGORIES, SERVER_ORG_UNITS } from "../../store";

export default defineHandler((event) => {
  const query = getQuery(event);
  const status = query.status as string | undefined;
  const type = query.type as string | undefined;

  let result = [...SERVER_TRANSACTIONS];

  if (status) {
    result = result.filter((t) => t.status === status);
  }
  if (type) {
    result = result.filter((t) => t.type === type);
  }

  // Attach relations
  const enriched = result.map((tx) => {
    const category = SERVER_CATEGORIES.find((c) => c.id === tx.categoryId);
    const orgUnit = SERVER_ORG_UNITS.find((o) => o.id === tx.orgUnitId);
    return { ...tx, category, orgUnit };
  });

  return { transactions: enriched };
});
