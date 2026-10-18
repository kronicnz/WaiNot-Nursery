import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { i as parseBody, n as fail, r as json } from "./api_ChO0QCAs.mjs";
import { t as rateLimit } from "./rateLimit_BbXhkFUb.mjs";
import { r as loginSchema } from "./validation_BOiu9Mbh.mjs";
//#region src/pages/api/auth/login.ts
var login_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var POST = async ({ request, locals, clientAddress }) => {
	const ip = clientAddress || request.headers.get("x-forwarded-for") || "unknown";
	if (!rateLimit(`login:${ip}`, 10, 9e5)) return fail("Too many attempts. Try again later.", 429);
	const body = await parseBody(request, loginSchema);
	if ("error" in body) return body.error;
	const { error } = await locals.supabase.auth.signInWithPassword(body.data);
	if (error) return fail("Invalid email or password", 401);
	return json({ ok: true });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/auth/login@_@ts
var page = () => login_exports;
//#endregion
export { page };
