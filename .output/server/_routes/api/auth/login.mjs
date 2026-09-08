import { a as defineHandler, d as readBody, f as setCookie, i as createError } from "../../../_libs/h3+rou3+srvx.mjs";
import { n as findUserByEmail } from "../../../_chunks/store.mjs";
import { createHash } from "node:crypto";
//#region server/routes/api/auth/login.post.ts
var login_post_default = defineHandler(async (event) => {
	const body = await readBody(event);
	if (!body?.email || !body?.password) throw createError({
		statusCode: 400,
		statusMessage: "email and password are required"
	});
	const user = findUserByEmail(body.email);
	if (!user || user.hashedPassword !== createHash("sha256").update(body.password).digest("hex")) throw createError({
		statusCode: 401,
		statusMessage: "Identifiants invalides"
	});
	const token = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
	setCookie(event, "lumina_session_token", token, {
		httpOnly: true,
		secure: false,
		sameSite: "lax",
		maxAge: 86400
	});
	return {
		ok: true,
		user: {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			org: user.org
		},
		sessionToken: token
	};
});
//#endregion
export { login_post_default as default };
