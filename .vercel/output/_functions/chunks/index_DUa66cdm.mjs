import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as createAdminClient } from "./server_BOqfQGPZ.mjs";
import { i as parseBody, n as fail, r as json, s as requireOwner, t as dbError } from "./api_ChO0QCAs.mjs";
import { d as userInviteSchema } from "./validation_BOiu9Mbh.mjs";
//#region src/pages/api/users/index.ts
var users_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST,
	prerender: () => false
});
var GET = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	const { data: profiles, error } = await ctx.locals.supabase.from("profiles").select("*").order("created_at");
	if (error) return dbError(error);
	const { data: users } = await createAdminClient().auth.admin.listUsers({ perPage: 200 });
	const emails = new Map((users?.users ?? []).map((u) => [u.id, u.email]));
	return json(profiles.map((p) => ({
		...p,
		email: emails.get(p.id) ?? null
	})));
};
var POST = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	const body = await parseBody(ctx.request, userInviteSchema);
	if ("error" in body) return body.error;
	const { data, error } = await createAdminClient().auth.admin.inviteUserByEmail(body.data.email, { data: { name: body.data.name } });
	if (error || !data.user) return fail("Could not invite user", 400);
	const { error: pErr } = await ctx.locals.supabase.from("profiles").update({
		role: body.data.role,
		name: body.data.name
	}).eq("id", data.user.id);
	if (pErr) return dbError(pErr);
	return json({ id: data.user.id }, 201);
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/users/index@_@ts
var page = () => users_exports;
//#endregion
export { page };
