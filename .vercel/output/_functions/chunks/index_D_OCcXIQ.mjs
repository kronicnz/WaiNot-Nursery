import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { i as parseBody, n as fail, r as json, s as requireOwner, t as dbError } from "./api_ChO0QCAs.mjs";
import { f as userPatchSchema } from "./validation_BOiu9Mbh.mjs";
import { z } from "zod";
//#region src/pages/api/users/[id]/index.ts
var _id__exports = /* @__PURE__ */ __exportAll({
	PATCH: () => PATCH,
	prerender: () => false
});
var PATCH = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	const id = ctx.params.id;
	if (!z.string().uuid().safeParse(id).success) return fail("Invalid id");
	const body = await parseBody(ctx.request, userPatchSchema);
	if ("error" in body) return body.error;
	if (id === ctx.locals.user.id && (body.data.role === "staff" || body.data.active === false)) return fail("You cannot demote or deactivate yourself", 400);
	const { data, error } = await ctx.locals.supabase.from("profiles").update(body.data).eq("id", id).select().maybeSingle();
	if (error) return dbError(error);
	return data ? json(data) : fail("Not found", 404);
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/users/[id]/index@_@ts
var page = () => _id__exports;
//#endregion
export { page };
