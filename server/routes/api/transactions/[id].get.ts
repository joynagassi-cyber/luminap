import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "id required" });

  const tx = store.transactions.find(t => t.id === id);
  if (!tx) throw createError({ statusCode: 404, statusMessage: "Not found" });

  // Attach relations
  const enriched = {
    ...tx,
    category: store.categories.find(c => c.id === tx.categoryId),
    orgUnit: store.orgUnits.find(o => o.id === tx.orgUnitId || tx.orgUnitId === null ? false : o.id === tx.orgUnitId),
    creator: store.user ? { id: tx.createdById, email: 'admin@mfe-jc.org', firstName: 'Pasteur', lastName: 'Jean', role: 'ADMIN', org: store.user.org } : undefined,
    approver: tx.approvedById ? { id: tx.approvedById, email: 'admin@mfe-jc.org', firstName: 'Pasteur', lastName: 'Jean', role: 'ADMIN', org: store.user.org } : undefined,
  };

  return { ok: true, transaction: enriched };
});
