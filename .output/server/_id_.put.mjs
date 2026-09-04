import { a as defineHandler, d as readBody, i as createError, u as getRouterParam } from "./_libs/h3+rou3+srvx.mjs";
import { r as store } from "./_chunks/store.mjs";
//#region server/routes/api/events/[id].put.ts
var _id__put_default = defineHandler(async (event) => {
	const id = getRouterParam(event, "id");
	if (!id) throw createError({
		statusCode: 400,
		statusMessage: "id required"
	});
	const idx = store.events.findIndex((e) => e.id === id);
	if (idx === -1) throw createError({
		statusCode: 404,
		statusMessage: "Not found"
	});
	const body = await readBody(event);
	for (const key of [
		"name",
		"description",
		"startDate",
		"endDate",
		"budget",
		"status"
	]) if (body[key] !== void 0) store.events[idx][key] = body[key];
	store.events[idx].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
	return {
		ok: true,
		event: store.events[idx]
	};
});
//#endregion
export { _id__put_default as default };
