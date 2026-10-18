import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { i as parseBody, n as fail, r as json, s as requireOwner, t as dbError } from "./api_ChO0QCAs.mjs";
import { t as batchSchema } from "./validation_BOiu9Mbh.mjs";
import { z } from "zod";
//#region src/pages/api/batches/index.ts
var batches_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST,
	prerender: () => false
});
var GET = async ({ locals, url }) => {
	const productId = url.searchParams.get("product_id");
	if (!z.string().uuid().safeParse(productId).success) return fail("product_id is required");
	const { data, error } = await locals.supabase.from("batches").select("*").eq("product_id", productId).order("potted_on", { ascending: false });
	return error ? dbError(error) : json(data);
};
var POST = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	const body = await parseBody(ctx.request, batchSchema);
	if ("error" in body) return body.error;
	const { data, error } = await ctx.locals.supabase.from("batches").insert(body.data).select().single();
	return error ? dbError(error) : json(data, 201);
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/batches/index@_@ts
var page = () => batches_exports;
//#endregion
export { page };
