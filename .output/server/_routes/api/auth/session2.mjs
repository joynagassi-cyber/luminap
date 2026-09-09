import { p as getCookie, u as defineHandler } from "../../../_libs/h3+rou3+srvx.mjs";
//#region server/routes/api/auth/session.get.ts
var session_get_default = defineHandler((event) => {
	const token = getCookie(event, "lumina_session_token");
	if (!token || !token.startsWith("lumina_sess_") || token.length < 30) return {
		ok: true,
		authenticated: false,
		user: null
	};
	return {
		ok: true,
		authenticated: true,
		user: {
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
		}
	};
});
//#endregion
export { session_get_default as default };
