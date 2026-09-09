import { a as defineHandler, d as readBody, f as setCookie, i as createError } from "../../../_libs/h3+rou3+srvx.mjs";
import { n as findUserByEmail, t as createUserRecord } from "../../../_chunks/store.mjs";
//#region server/routes/api/auth/signup.post.ts
var signup_post_default = defineHandler(async (event) => {
	const body = await readBody(event);
	if (!body?.firstName?.trim() || !body?.lastName?.trim() || !body?.email?.trim() || !body?.password) throw createError({
		statusCode: 400,
		statusMessage: "Tous les champs sont requis"
	});
	if (findUserByEmail(body.email.trim().toLowerCase())) throw createError({
		statusCode: 409,
		statusMessage: "Cet email est déjà utilisé"
	});
	const user = createUserRecord(body.firstName.trim(), body.lastName.trim(), body.email.trim().toLowerCase(), body.password);
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
export { signup_post_default as default };
