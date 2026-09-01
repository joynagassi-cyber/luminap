/**
 * Shared in-memory state for the Nitro server.
 * In production, replace with a proper database.
 */

import type { ServerTransaction, ServerCategory, ServerOrgUnit } from "../types";

export const SERVER_CATEGORIES: ServerCategory[] = [
  { id: "cat-1", key: "dime", labelFr: "Dîme", type: "INCOME", orgId: "org-1" },
  { id: "cat-2", key: "offrande", labelFr: "Offrande", type: "INCOME", orgId: "org-1" },
  { id: "cat-3", key: "offrande_mission", labelFr: "Offrande Mission", type: "INCOME", orgId: "org-1" },
  { id: "cat-4", key: "don", labelFr: "Don", type: "INCOME", orgId: "org-1" },
  { id: "cat-5", key: "salaire_pasteur", labelFr: "Salaire Pasteur", type: "EXPENSE", orgId: "org-1" },
  { id: "cat-6", key: "frais_fonctionnement", labelFr: "Frais de Fonctionnement", type: "EXPENSE", orgId: "org-1" },
  { id: "cat-7", key: "mission", labelFr: "Mission", type: "EXPENSE", orgId: "org-1" },
  { id: "cat-8", key: "entretien", labelFr: "Entretien", type: "EXPENSE", orgId: "org-1" },
  { id: "cat-9", key: "aumone", labelFr: "Aumône", type: "EXPENSE", orgId: "org-1" },
];

export const SERVER_ORG_UNITS: ServerOrgUnit[] = [
  { id: "ou-1", name: "Diacres", type: "groupe", orgId: "org-1" },
  { id: "ou-2", name: "Jeunesse", type: "groupe", orgId: "org-1" },
  { id: "ou-3", name: "Dames", type: "groupe", orgId: "org-1" },
  { id: "ou-4", name: "Messieurs", type: "groupe", orgId: "org-1" },
  { id: "ou-5", name: "Chorale", type: "groupe", orgId: "org-1" },
];

const now = new Date();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

export const INITIAL_TRANSACTIONS: ServerTransaction[] = [
  {
    id: "tx-1",
    orgId: "org-1",
    type: "INCOME",
    amount: 5000000,
    description: "Dîme dimanche",
    date: daysAgo(6),
    status: "APPROVED",
    createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    createdById: "user-1",
    approvedById: "user-1",
    approvedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
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
    date: daysAgo(6),
    status: "APPROVED",
    createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    createdById: "user-1",
    approvedById: "user-1",
    approvedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
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
    date: daysAgo(8),
    status: "PENDING",
    createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
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
    date: daysAgo(3),
    status: "DRAFT",
    createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
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
    date: daysAgo(10),
    status: "APPROVED",
    createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 9 * 86400000).toISOString(),
    createdById: "user-1",
    approvedById: "user-1",
    approvedAt: new Date(now.getTime() - 9 * 86400000).toISOString(),
    categoryId: "cat-9",
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
  },
];

// Mutable server state (cloned from initial so edits don't mutate the constant)
export let SERVER_TRANSACTIONS: ServerTransaction[] = JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
