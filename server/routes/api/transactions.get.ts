import { defineHandler } from "nitro";
import { createError, methodNotAllowed } from "nitro/h3";

// ─── Mock transactions (server-side copy — matches src/config/mockData.ts) ─────
// In production, this would be a database query.
const TRANSACTIONS: any[] = [
  {
    id: "tx-1",
    orgId: "org-1",
    type: "INCOME",
    amount: 5000000,
    description: "Dîme dimanche",
    date: "2026-07-10",
    status: "APPROVED",
    createdAt: "2026-07-09T10:00:00.000Z",
    updatedAt: "2026-07-10T10:00:00.000Z",
    createdById: "user-1",
    approvedById: "user-1",
    approvedAt: "2026-07-10T10:00:00.000Z",
    categoryId: "cat-1",
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
  },
  {
    id: "tx-2",
    orgId: "org-1",
    type: "INCOME",
    amount: 1500000,
    description: "Offrande oeuvre sociale",
    date: "2026-07-10",
    status: "APPROVED",
    createdAt: "2026-07-09T10:00:00.000Z",
    updatedAt: "2026-07-10T10:00:00.000Z",
    createdById: "user-1",
    approvedById: "user-1",
    approvedAt: "2026-07-10T10:00:00.000Z",
    categoryId: "cat-2",
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
  },
  {
    id: "tx-3",
    orgId: "org-1",
    type: "EXPENSE",
    amount: 250000,
    description: "Frais électricité église",
    date: "2026-07-08",
    status: "PENDING",
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
    createdById: "user-1",
    approvedById: null,
    approvedAt: null,
    categoryId: "cat-6",
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
  },
  {
    id: "tx-4",
    orgId: "org-1",
    type: "INCOME",
    amount: 750000,
    description: "Offrande mission",
    date: "2026-07-13",
    status: "DRAFT",
    createdAt: "2026-07-13T10:00:00.000Z",
    updatedAt: "2026-07-13T10:00:00.000Z",
    createdById: "user-1",
    approvedById: null,
    approvedAt: null,
    categoryId: "cat-3",
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
  },
  {
    id: "tx-5",
    orgId: "org-1",
    type: "EXPENSE",
    amount: 100000,
    description: "Aumône aux nécessiteux",
    date: "2026-07-06",
    status: "APPROVED",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-07-07T10:00:00.000Z",
    createdById: "user-1",
    approvedById: "user-1",
    approvedAt: "2026-07-07T10:00:00.000Z",
    categoryId: "cat-9",
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
  },
];

// In-memory mutation store (replace with database in production)
const MUTATIONS: Record<string, any> = {};

function getMutation(id: string) {
  return MUTATIONS[id] ?? TRANSACTIONS.find((t) => t.id === id);
}

export default defineHandler((event) => {
  if (event.method === "GET") {
    return { transactions: TRANSACTIONS };
  }

  if (event.method === "POST") {
    // Create a new transaction
    const body = JSON.parse(event.node.req.body ?? "{}") as Record<string, unknown>;
    const newTx = {
      id: `tx-${Date.now()}`,
      orgId: body.orgId ?? "org-1",
      type: body.type,
      amount: body.amount,
      description: body.description,
      date: body.date,
      status: body.status ?? "DRAFT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: body.createdById ?? "user-1",
      approvedById: null,
      approvedAt: null,
      categoryId: body.categoryId,
      orgUnitId: body.orgUnitId ?? null,
      compensatesFor: null,
      comment: null,
      version: 1,
    };
    TRANSACTIONS.unshift(newTx);
    return { ok: true, transaction: newTx };
  }

  return { transactions: TRANSACTIONS };
});
