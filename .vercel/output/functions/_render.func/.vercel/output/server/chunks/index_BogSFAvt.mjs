import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { i as parseBody, r as json, t as dbError } from "./api_ChO0QCAs.mjs";
import { u as stocktakeSchema } from "./validation_BOiu9Mbh.mjs";
//#region src/pages/api/stocktakes/index.ts
var stocktakes_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST,
	prerender: () => false
});
var GET = async ({ locals }) => {
	const { data, error } = await locals.supabase.from("stocktakes").select("*").order("created_at", { ascending: false }).limit(100);
	return error ? dbError(error) : json(data);
};
var POST = async ({ request, locals }) => {
	const body = await parseBody(request, stocktakeSchema);
	if ("error" in body) return body.error;
	const { data, error } = await locals.supabase.from("stocktakes").insert({ created_by: locals.user.id }).select().single();
	return error ? dbError(error) : json(data, 201);
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/stocktakes/index@_@ts
var page = () => stocktakes_exports;
//#endregion
export { page };
