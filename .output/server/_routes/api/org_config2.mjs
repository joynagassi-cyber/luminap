import { o as defineHandler, p as readBody } from "../../_libs/h3+rou3+srvx.mjs";
import { r as store } from "../../_chunks/store.mjs";
//#region server/routes/api/org-config.put.ts
var org_config_put_default = defineHandler(async (event) => {
	const body = await readBody(event);
	if (body.name !== void 0) store.orgConfig.name = typeof body.name === "string" ? body.name.replace(/</g, "&lt;").replace(/>/g, "&gt;") : String(body.name);
	if (body.logoUrl !== void 0) {
		const url = String(body.logoUrl);
		if (url.match(/^https?:\/\/.+/)) store.orgConfig.logoUrl = url;
	}
	return {
		ok: true,
		config: store.orgConfig
	};
});
//#endregion
export { org_config_put_default as default };
