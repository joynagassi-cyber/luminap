import { i as createError, o as defineHandler, p as readBody } from "../../_libs/h3+rou3+srvx.mjs";
import { r as store } from "../../_chunks/store.mjs";
//#region server/routes/api/events.post.ts
var events_post_default = defineHandler(async (event) => {
	const { name, description, startDate, endDate, budget } = await readBody(event);
	if (!name || !startDate || !budget) throw createError({
		statusCode: 400,
		statusMessage: "name, startDate, and budget are required"
	});
	const sanitizedName = typeof name === "string" ? name.replace(/</g, "&lt;").replace(/>/g, "&gt;") : String(name);
	const sanitizedDescription = typeof description === "string" ? description.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
	const newEvent = {
		id: `evt-${Date.now()}`,
		orgId: "org-1",
		name: sanitizedName,
		description: sanitizedDescription,
		startDate,
		endDate: endDate || null,
		status: "PLANIFIED",
		budget: Math.round(Number(budget)),
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
