import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { i as parseBody, r as json, s as requireOwner, t as dbError } from "./api_ChO0QCAs.mjs";
import { n as categorySchema } from "./validation_BOiu9Mbh.mjs";
//#region src/pages/api/categories/index.ts
var categories_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST,
	prerender: () => false
});
var GET = async ({ locals }) => {
	const { data, error } = await locals.supabase.from("categories").select("*").order("name");
	return error ? dbError(error) : json(data);
};
var POST = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	const body = await parseBody(ctx.request, categorySchema);
	if ("error" in body) return body.error;
	const { data, error } = await ctx.locals.supabase.from("categories").insert(body.data).select().single();
	return error ? dbError(error) : json(data, 201);
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/categories/index@_@ts
var page = () => categories_exports;
//#endregion
export { page };
