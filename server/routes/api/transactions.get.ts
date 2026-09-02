import { defineHandler } from "nitro";
import { getQuery } from "nitro/h3";
import { store } from "../../../store";

export default defineHandler((event) => {
  const query = getQuery(event);
  let filtered = [...store.transactions];

  if (query.status) {
    filtered = filtered.filter((t) => t.status === query.status);
  }
  if (query.type) {
    filtered = filtered.filter((t) => t.type === query.type);
  }
  if (query.categoryId) {
    filtered = filtered.filter((t) => t.categoryId === query.categoryId);
  }
  if (query.startDate) {
    filtered = filtered.filter((t) => t.date >= query.startDate);
  }
  if (query.endDate) {
    filtered = filtered.filter((t) => t.date <= query.endDate);
  }

  // Enrich with relations
  const enriched = filtered.map(t => ({
    ...t,
    category: store.categories.find(c => c.id === t.categoryId),
    orgUnit: t.orgUnitId ? store.orgUnits.find(o => o.id === t.orgUnitId) : undefined,
    creator: store.user ? { id: t.createdById, email: 'admin@mfe-jc.org', firstName: 'Pasteur', lastName: 'Jean', role: 'ADMIN', org: store.user.org } : undefined,
    approver: t.approvedById ? { id: t.approvedById, email: 'admin@mfe-jc.org', firstName: 'Pasteur', lastName: 'Jean', role: 'ADMIN', org: store.user.org } : undefined,
  }));

  return { ok: true, transactions: enriched };
});
