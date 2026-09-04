import { a as defineHandler, i as createError, u as getRouterParam } from "./_libs/h3+rou3+srvx.mjs";
import { r as store } from "./_chunks/store.mjs";
//#region server/routes/api/transactions/[id].get.ts
var _id__get_default = defineHandler(async (event) => {
	const id = getRouterParam(event, "id");
	if (!id) throw createError({
		statusCode: 400,
		statusMessage: "id required"
	});
	const tx = store.transactions.find((t) => t.id === id);
	if (!tx) throw createError({
		statusCode: 404,
		statusMessage: "Not found"
	});
	return {
		ok: true,
		transaction: {
			...tx,
			category: store.categories.find((c) => c.id === tx.categoryId),
			orgUnit: store.orgUnits.find((o) => o.id === tx.orgUnitId || tx.orgUnitId === null ? false : o.id === tx.orgUnitId),
			creator: store.user ? {
				id: tx.createdById,
				email: "admin@mfe-jc.org",
				firstName: "Pasteur",
				lastName: "Jean",
				role: "ADMIN",
				org: store.user.org
			} : void 0,
			approver: tx.approvedById ? {
				id: tx.approvedById,
				email: "admin@mfe-jc.org",
				firstName: "Pasteur",
				lastName: "Jean",
				role: "ADMIN",
				org: store.user.org
			} : void 0
		}
	};
});
//#endregion
export { _id__get_default as default };
