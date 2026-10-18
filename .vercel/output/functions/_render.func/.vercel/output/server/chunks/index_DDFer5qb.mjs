import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { n as fail, r as json, t as dbError } from "./api_ChO0QCAs.mjs";
import { z } from "zod";
//#region src/pages/api/stocktakes/[id]/index.ts
var _id__exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = async ({ locals, params }) => {
	if (!z.string().uuid().safeParse(params.id).success) return fail("Invalid id");
	const sb = locals.supabase;
	const { data: st, error } = await sb.from("stocktakes").select("*").eq("id", params.id).maybeSingle();
	if (error) return dbError(error);
	if (!st) return fail("Not found", 404);
	const [lines, levels] = await Promise.all([sb.from("stocktake_lines").select("*, products(sku,name), batches(batch_code,potted_on)").eq("stocktake_id", st.id), sb.from("stock_levels").select("product_id, batch_id, qty")]);
	if (lines.error) return dbError(lines.error);
	if (levels.error) return dbError(levels.error);
	return json({
		...st,
		lines: lines.data,
		expected: levels.data
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/stocktakes/[id]/index@_@ts
var page = () => _id__exports;
//#endregion
export { page };
