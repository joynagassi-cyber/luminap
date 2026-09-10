import { i as createError, m as setCookie, o as defineHandler, p as readBody } from "../../../_libs/h3+rou3+srvx.mjs";
import { t as generateSessionToken } from "../../../index.mjs";
import { r as store, t as createUserRecord } from "../../../_chunks/store.mjs";
//#region server/routes/api/auth/signup.post.ts
var signup_post_default = defineHandler(async (event) => {
	const body = await readBody(event);
	if (!body?.firstName?.trim() || !body?.lastName?.trim() || !body?.email?.trim() || !body?.password) throw createError({
		statusCode: 400,
		statusMessage: "Tous les champs sont requis"
	});
	if (body.password.length < 8) throw createError({
		statusCode: 400,
		statusMessage: "Le mot de passe doit contenir au moins 8 caracteres"
	});
	if (store.user && store.user.email === body.email.trim().toLowerCase()) throw createError({
		statusCode: 409,
		statusMessage: "Cet email est déjà utilisé"
	});
	const user = createUserRecord(body.firstName.trim(), body.lastName.trim(), body.email.trim().toLowerCase(), body.password);
	const token = generateSessionToken();
	setCookie(event, "lumina_session_token", token, {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		maxAge: 86400,
		path: "/"
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
