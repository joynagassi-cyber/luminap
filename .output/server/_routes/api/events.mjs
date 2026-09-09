import { a as defineHandler } from "../../_libs/h3+rou3+srvx.mjs";
import { r as store } from "../../_chunks/store.mjs";
//#region server/routes/api/events.get.ts
var events_get_default = defineHandler(() => {
	return {
		ok: true,
		events: store.events
	};
});
//#endregion
export { events_get_default as default };
