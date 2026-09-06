import { a as defineHandler, d as readBody } from "../../_libs/h3+rou3+srvx.mjs";
import { r as store } from "../../_chunks/store.mjs";
//#region server/routes/api/transactions.post.ts
var transactions_post_default = defineHandler(async (event) => {
	const { type, amount, description, date, categoryId, orgUnitId, eventId, source, status } = await readBody(event);
	if (!type || !amount || !description || !date || !categoryId || !status) return {
		ok: false,
		error: "Missing required fields"
	};
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
		eventId: eventId || null,
		source: source || null,
		compensatesFor: null,
		comment: null,
		createdAt: (/* @__PURE__ */ new Date()).toISOString(),
		updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		version: 1,
		createdById: "user-1",
		approvedById: null,
		approvedAt: null,
		category: store.categories.find((c) => c.id === categoryId),
		creator: store.user ? {
			id: "user-1",
			email: "admin@mfe-jc.org",
			firstName: "Pasteur",
			lastName: "Jean",
			role: "ADMIN",
			org: store.user.org
		} : void 0
	};
	store.transactions = [newTx, ...store.transactions];
	return {
		ok: true,
		transaction: newTx
	};
});
//#endregion
export { transactions_post_default as default };
