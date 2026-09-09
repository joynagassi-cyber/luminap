import { a as defineHandler } from "../../_libs/h3+rou3+srvx.mjs";
//#region server/routes/api/hello.get.ts
var hello_get_default = defineHandler(() => {
	return {
		ok: true,
		message: "Lumina API"
	};
});
//#endregion
export { hello_get_default as default };
