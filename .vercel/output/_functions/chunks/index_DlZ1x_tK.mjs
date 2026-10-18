import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { i as parseBody, n as fail, r as json, s as requireOwner, t as dbError } from "./api_ChO0QCAs.mjs";
import { n as categorySchema } from "./validation_BOiu9Mbh.mjs";
import { z } from "zod";
//#region src/pages/api/categories/[id]/index.ts
var _id__exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	PATCH: () => PATCH,
	prerender: () => false
});
var PATCH = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	if (!z.string().uuid().safeParse(ctx.params.id).success) return fail("Invalid id");
	const body = await parseBody(ctx.request, categorySchema);
	if ("error" in body) return body.error;
	const { data, error } = await ctx.locals.supabase.from("categories").update(body.data).eq("id", ctx.params.id).select().maybeSingle();
	if (error) return dbError(error);
	return data ? json(data) : fail("Not found", 404);
};
var DELETE = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	if (!z.string().uuid().safeParse(ctx.params.id).success) return fail("Invalid id");
	const sb = ctx.locals.supabase;
	const { count, error: countError } = await sb.from("products").select("id", {
		count: "exact",
		head: true
	}).eq("category_id", ctx.params.id);
	if (countError) return dbError(countError);
	if (count) return fail("Reassign products before deleting this category", 409);
	const { error } = await sb.from("categories").delete().eq("id", ctx.params.id);
	return error ? dbError(error) : json({ ok: true });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/categories/[id]/index@_@ts
var page = () => _id__exports;
//#endregion
export { page };
