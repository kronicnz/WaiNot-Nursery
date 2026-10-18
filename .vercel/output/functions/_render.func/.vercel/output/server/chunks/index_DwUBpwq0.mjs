import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { o as parseQuery, r as json, t as dbError } from "./api_ChO0QCAs.mjs";
import { z } from "zod";
//#region src/pages/api/stock/index.ts
var stock_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = async ({ locals, url }) => {
	const q = parseQuery(url.searchParams, z.object({ product_id: z.string().uuid().optional() }));
	if ("error" in q) return q.error;
	let query = locals.supabase.from("stock_levels").select("*, products(sku,name), batches(batch_code,potted_on)").gt("qty", 0).limit(1e3);
	if (q.data.product_id) query = query.eq("product_id", q.data.product_id);
	const { data, error } = await query;
	return error ? dbError(error) : json(data);
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/stock/index@_@ts
var page = () => stock_exports;
//#endregion
export { page };
