import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { a as parsePaging, o as parseQuery, r as json, t as dbError } from "./api_ChO0QCAs.mjs";
import { z } from "zod";
//#region src/pages/api/movements/index.ts
var movements_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = async ({ locals, url }) => {
	const q = parseQuery(url.searchParams, z.object({
		product_id: z.string().uuid().optional(),
		reason: z.enum([
			"receive",
			"sale",
			"adjust",
			"transfer",
			"loss",
			"stocktake"
		]).optional()
	}));
	if ("error" in q) return q.error;
	const { limit, offset } = parsePaging(url.searchParams);
	let query = locals.supabase.from("stock_movements").select("*, products(sku,name), batches(batch_code)", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
	if (q.data.product_id) query = query.eq("product_id", q.data.product_id);
	if (q.data.reason) query = query.eq("reason", q.data.reason);
	const { data, error, count } = await query;
	return error ? dbError(error) : json({
		items: data,
		total: count
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/movements/index@_@ts
var page = () => movements_exports;
//#endregion
export { page };
