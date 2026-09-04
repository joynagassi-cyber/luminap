import { a as defineHandler, d as readBody, i as createError, u as getRouterParam } from "./_libs/h3+rou3+srvx.mjs";
import { r as store } from "./_chunks/store.mjs";
//#region server/routes/api/transactions/[id].put.ts
var _id__put_default = defineHandler(async (event) => {
	const id = getRouterParam(event, "id");
	if (!id) throw createError({
		statusCode: 400,
		statusMessage: "id required"
	});
	const body = await readBody(event);
	const tx = store.transactions.find((t) => t.id === id);
	if (!tx) throw createError({
		statusCode: 404,
		statusMessage: "Not found"
	});
	const allowedFields = [
		"type",
		"amount",
		"description",
		"date",
		"categoryId",
		"orgUnitId",
		"eventId",
		"source",
		"status"
	];
	const updates = {};
	for (const key of allowedFields) if (body[key] !== void 0) updates[key] = body[key];
	updates.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
	updates.version = (tx.version || 0) + 1;
	Object.assign(tx, updates);
	return {
		ok: true,
		transaction: tx
	};
});
//#endregion
export { _id__put_default as default };
