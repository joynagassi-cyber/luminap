import { a as defineHandler } from "../../_libs/h3+rou3+srvx.mjs";
import { r as store } from "../../_chunks/store.mjs";
//#region server/routes/api/data.get.ts
var data_get_default = defineHandler(() => {
	return {
		ok: true,
		categories: store.categories,
		orgUnits: store.orgUnits,
		events: store.events,
		transactions: store.transactions,
		auditEntries: store.auditEntries,
		orgConfig: store.orgConfig
	};
});
//#endregion
export { data_get_default as default };
