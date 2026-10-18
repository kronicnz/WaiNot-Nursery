import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { i as parseBody, n as fail, r as json, s as requireOwner, t as dbError } from "./api_ChO0QCAs.mjs";
import { t as rateLimit } from "./rateLimit_BbXhkFUb.mjs";
import { c as stockCountSchema } from "./validation_BOiu9Mbh.mjs";
//#region src/pages/api/stock/count.ts
var count_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var POST = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	const { request, locals } = ctx;
	if (!rateLimit(`stock-count:${locals.user.id}`, 100, 6e4)) return fail("Rate limit exceeded", 429);
	const body = await parseBody(request, stockCountSchema);
	if ("error" in body) return body.error;
	const { data, error } = await locals.supabase.rpc("set_batch_stock_count", {
		p_product: body.data.product_id,
		p_batch: body.data.batch_id ?? null,
		p_count: body.data.counted_qty,
		p_note: body.data.note ?? null,
		p_client_op_id: body.data.client_op_id
	});
	return error ? dbError(error) : json({ adjustments: data });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/stock/count@_@ts
var page = () => count_exports;
//#endregion
export { page };
