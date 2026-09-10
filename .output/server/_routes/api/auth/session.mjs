import { c as deleteCookie, o as defineHandler } from "../../../_libs/h3+rou3+srvx.mjs";
//#region server/routes/api/auth/session.delete.ts
var session_delete_default = defineHandler((event) => {
	deleteCookie(event, "lumina_session_token");
	return { ok: true };
});
//#endregion
export { session_delete_default as default };
