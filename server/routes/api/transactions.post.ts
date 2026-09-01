import { defineHandler } from "nitro";
import { readBody } from "nitro/h3";
import { SERVER_TRANSACTIONS } from "../../../store";

export default defineHandler(async (event) => {
  const body = await readBody<{
    orgId: string;
    type: string;
    amount: number;
    description: string;
    date: string;
    status: "DRAFT" | "PENDING";
    categoryId: string;
    orgUnitId: string | null;
  }>(event);

  if (!body || !body.type || !body.amount || !body.description || !body.date || !body.categoryId) {
    return { error: "Champs requis: type, amount, description, date, categoryId" };
  }

  const tx = {
    id: `tx-${Date.now()}`,
    orgId: body.orgId ?? "org-1",
    type: body.type,
    amount: Math.round(body.amount),
    description: body.description.trim(),
    date: body.date,
    status: body.status ?? "DRAFT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: "user-1",
    approvedById: null,
    approvedAt: null,
    categoryId: body.categoryId,
    orgUnitId: body.orgUnitId ?? null,
    compensatesFor: null,
    comment: null,
    version: 1,
  };

  SERVER_TRANSACTIONS.unshift(tx);
  return { ok: true, transaction: tx };
});
