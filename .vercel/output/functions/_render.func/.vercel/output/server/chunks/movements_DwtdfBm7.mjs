import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { n as fail, r as json, t as dbError } from "./api_ChO0QCAs.mjs";
import { t as rateLimit } from "./rateLimit_BbXhkFUb.mjs";
import { a as movementSchema, i as movementBatchSchema } from "./validation_BOiu9Mbh.mjs";
//#region src/pages/api/stock/movements.ts
var movements_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var POST = async ({ request, locals }) => {
	if (!rateLimit(`mov:${locals.user.id}`, 300, 6e4)) return fail("Rate limit exceeded", 429);
	let raw;
	try {
		raw = await request.json();
	} catch {
		return fail("Invalid JSON body");
	}
	const isBatch = typeof raw === "object" && raw !== null && "movements" in raw;
	const parsed = isBatch ? movementBatchSchema.safeParse(raw) : movementSchema.safeParse(raw);
	if (!parsed.success) return fail("Validation failed", 400, parsed.error.flatten());
	const list = isBatch ? parsed.data.movements : [parsed.data];
	const results = [];
	for (const m of list) {
		const { data, error } = await locals.supabase.rpc("apply_stock_movement", {
			p_product: m.product_id,
			p_batch: m.batch_id ?? null,
			p_delta: m.delta,
			p_reason: m.reason,
			p_note: m.note ?? null,
			p_client_op_id: m.client_op_id
		});
		if (!isBatch) return error ? dbError(error) : json(data, 201);
		const status = error ? dbError(error).status : 200;
		results.push({
			client_op_id: m.client_op_id,
			ok: !error,
			status,
			error: error ? status === 500 ? "Server error" : error.message : void 0
		});
	}
	return json({ results });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/stock/movements@_@ts
var page = () => movements_exports;
//#endregion
export { page };
