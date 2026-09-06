import { a as defineHandler, d as readBody } from "../../_libs/h3+rou3+srvx.mjs";
import { r as store } from "../../_chunks/store.mjs";
//#region server/routes/api/events.post.ts
var events_post_default = defineHandler(async (event) => {
	const { name, description, startDate, endDate, budget } = await readBody(event);
	if (!name || !startDate || !budget) return {
		ok: false,
		error: "name, startDate, and budget are required"
	};
	const newEvent = {
		id: `evt-${Date.now()}`,
		orgId: "org-1",
		name,
		description: description || "",
		startDate,
		endDate: endDate || null,
		status: "PLANIFIED",
		budget: Math.round(budget),
		createdAt: (/* @__PURE__ */ new Date()).toISOString(),
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	store.events.push(newEvent);
	return {
		ok: true,
		event: newEvent
	};
});
//#endregion
export { events_post_default as default };
