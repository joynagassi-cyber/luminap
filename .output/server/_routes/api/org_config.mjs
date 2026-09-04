import { a as defineHandler } from "../../_libs/h3+rou3+srvx.mjs";
import { r as store } from "../../_chunks/store.mjs";
//#region server/routes/api/org-config.get.ts
var org_config_get_default = defineHandler(() => {
	return {
		ok: true,
		config: store.orgConfig
	};
});
//#endregion
export { org_config_get_default as default };
