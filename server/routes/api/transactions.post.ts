import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { store } from "../../store";

export default defineHandler(async (event) => {
  const body = await readBody(event);
  const { type, amount, description, date, categoryId, orgUnitId, eventId, source, status } = body;

  // Validate required fields
  if (!type || !amount || !description || !date || !categoryId || !status) {
    throw createError({ statusCode: 400, statusMessage: "Missing required fields" });
  }

  // Sanitize string fields
  const sanitizedDescription = typeof description === 'string'
    ? description.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : String(description);

  const newTx = {
    id: `tx-${Date.now()}`,
    orgId: "org-1",
    type,
    amount: Math.round(Number(amount)),
    description: sanitizedDescription,
    date,
    status,
    categoryId,
    orgUnitId: orgUnitId || null,
    eventId: eventId || null,
    source: source || null,
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
