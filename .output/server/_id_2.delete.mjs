import { a as defineHandler, i as createError, u as getRouterParam } from "./_libs/h3+rou3+srvx.mjs";
import { r as store } from "./_chunks/store.mjs";
//#region server/routes/api/transactions/[id].delete.ts
var _id__delete_default = defineHandler((event) => {
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
	if (tx.status !== "REJECTED") throw createError({
		statusCode: 400,
		statusMessage: "Only rejected transactions can be deleted"
	});
	store.transactions = store.transactions.filter((t) => t.id !== id);
	return { ok: true };
});
//#endregion
export { _id__delete_default as default };
