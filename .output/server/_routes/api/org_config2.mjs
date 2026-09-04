import { a as defineHandler, d as readBody } from "../../_libs/h3+rou3+srvx.mjs";
import { r as store } from "../../_chunks/store.mjs";
//#region server/routes/api/org-config.put.ts
var org_config_put_default = defineHandler(async (event) => {
	const body = await readBody(event);
	if (body.name !== void 0) store.orgConfig.name = body.name;
	if (body.logoUrl !== void 0) store.orgConfig.logoUrl = body.logoUrl;
	return {
		ok: true,
		config: store.orgConfig
	};
});
//#endregion
export { org_config_put_default as default };
