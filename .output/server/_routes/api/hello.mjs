import { h as setHeader, o as defineHandler, u as getHeader } from "../../_libs/h3+rou3+srvx.mjs";
//#region server/routes/api/hello.get.ts
var hello_get_default = defineHandler((event) => {
	const origin = getHeader(event, "origin");
	if (origin) {
		setHeader(event, "Access-Control-Allow-Origin", origin);
		setHeader(event, "Access-Control-Allow-Credentials", "true");
	}
	setHeader(event, "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Authorization");
	return {
		ok: true,
		message: "Lumina API"
	};
});
//#endregion
export { hello_get_default as default };
