import { f as getRouterParam, i as createError, o as defineHandler, p as readBody } from "./_libs/h3+rou3+srvx.mjs";
import { r as store } from "./_chunks/store.mjs";
//#region server/routes/api/events/[id].put.ts
var _id__put_default = defineHandler(async (event) => {
	const id = getRouterParam(event, "id");
	if (!id) throw createError({
		statusCode: 400,
		statusMessage: "id required"
	});
	const body = await readBody(event);
	const allowedFields = [
		"name",
		"description",
		"startDate",
		"endDate",
		"budget",
		"status"
	];
	const idx = store.events.findIndex((e) => e.id === id);
	if (idx === -1) throw createError({
		statusCode: 404,
		statusMessage: "Not found"
	});
	for (const key of allowedFields) if (body[key] !== void 0) {
		if (typeof body[key] === "string") store.events[idx][key] = body[key].replace(/</g, "&lt;").replace(/>/g, "&gt;");
		else store.events[idx][key] = body[key];
	}
	store.events[idx].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
	return {
		ok: true,
		event: store.events[idx]
	};
});
//#endregion
export { _id__put_default as default };
