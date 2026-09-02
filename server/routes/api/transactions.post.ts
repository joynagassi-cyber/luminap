import { defineHandler } from "nitro";
import { readBody } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler(async (event) => {
  const body = await readBody(event);
  const { type, amount, description, date, categoryId, orgUnitId, status } = body;

  if (!type || !amount || !description || !date || !categoryId || !status) {
    return { ok: false, error: "Missing required fields" };
  }

  const newTx = {
    id: `tx-${Date.now()}`,
    orgId: "org-1",
    type,
    amount: Math.round(amount),
    description,
    date,
    status,
    categoryId,
    orgUnitId: orgUnitId || null,
    compensatesFor: null,
    comment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    createdById: "user-1",
    approvedById: null,
    approvedAt: null,
    category: store.categories.find(c => c.id === categoryId),
    creator: store.user ? { id: 'user-1', email: 'admin@mfe-jc.org', firstName: 'Pasteur', lastName: 'Jean', role: 'ADMIN', org: store.user.org } : undefined,
  };

  store.transactions = [newTx, ...store.transactions];

  return { ok: true, transaction: newTx };
});
