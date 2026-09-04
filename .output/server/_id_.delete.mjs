import { a as defineHandler, i as createError, u as getRouterParam } from "./_libs/h3+rou3+srvx.mjs";
import { r as store } from "./_chunks/store.mjs";
//#region server/routes/api/events/[id].delete.ts
var _id__delete_default = defineHandler((event) => {
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
	store.events.splice(idx, 1);
	return { ok: true };
});
//#endregion
export { _id__delete_default as default };
