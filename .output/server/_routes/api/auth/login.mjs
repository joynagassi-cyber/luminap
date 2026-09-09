import { l as createError, m as getQuery, u as defineHandler } from "../../../_libs/h3+rou3+srvx.mjs";
import { t as generateSessionToken } from "../../../index.mjs";
import { i as verifyPassword, n as findUserByEmail } from "../../../_chunks/store.mjs";
//#region server/routes/api/auth/login.post.ts
var login_post_default = defineHandler(async (event) => {
	const query = getQuery(event);
	const email = query.email;
	const password = query.password;
	if (!email || !password) throw createError({
		statusCode: 400,
		statusMessage: "email and password are required"
	});
	const user = findUserByEmail(email.trim().toLowerCase());
	if (!user || !verifyPassword(password, user.hashedPassword)) throw createError({
		statusCode: 401,
		statusMessage: "Identifiants invalides"
	});
	const token = generateSessionToken();
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
