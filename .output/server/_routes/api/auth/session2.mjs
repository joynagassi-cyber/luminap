import { a as defineHandler, c as getCookie } from "../../../_libs/h3+rou3+srvx.mjs";
//#region server/routes/api/auth/session.get.ts
var session_get_default = defineHandler((event) => {
	const token = getCookie(event, "lumina_session_token");
	return {
		ok: true,
		authenticated: !!token,
		user: token ? {
			id: "user-1",
			email: "admin@mfe-jc.org",
			firstName: "Pasteur",
			lastName: "Jean",
			role: "ADMIN",
			org: {
				id: "org-1",
				name: "Église MFE-JC Centrale",
				type: "Eglise",
				accentColor: "#FF6B00"
			}
		} : null
	};
});
//#endregion
export { session_get_default as default };
