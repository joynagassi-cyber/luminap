import { a as defineHandler, l as getQuery } from "../../_libs/h3+rou3+srvx.mjs";
import { r as store } from "../../_chunks/store.mjs";
//#region server/routes/api/transactions.get.ts
var transactions_get_default = defineHandler((event) => {
	const query = getQuery(event);
	let filtered = [...store.transactions];
	if (query.status) filtered = filtered.filter((t) => t.status === query.status);
	if (query.type) filtered = filtered.filter((t) => t.type === query.type);
	if (query.categoryId) filtered = filtered.filter((t) => t.categoryId === query.categoryId);
	if (query.startDate) filtered = filtered.filter((t) => t.date >= query.startDate);
	if (query.endDate) filtered = filtered.filter((t) => t.date <= query.endDate);
	return {
		ok: true,
		transactions: filtered.map((t) => ({
			...t,
			category: store.categories.find((c) => c.id === t.categoryId),
			orgUnit: t.orgUnitId ? store.orgUnits.find((o) => o.id === t.orgUnitId) : void 0,
			creator: store.user ? {
				id: t.createdById,
				email: "admin@mfe-jc.org",
				firstName: "Pasteur",
				lastName: "Jean",
				role: "ADMIN",
				org: store.user.org
			} : void 0,
			approver: t.approvedById ? {
				id: t.approvedById,
				email: "admin@mfe-jc.org",
				firstName: "Pasteur",
				lastName: "Jean",
				role: "ADMIN",
				org: store.user.org
			} : void 0
		}))
	};
});
//#endregion
export { transactions_get_default as default };
