import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { i as parseBody, n as fail, r as json, t as dbError } from "./api_ChO0QCAs.mjs";
import { l as stocktakeLineSchema } from "./validation_BOiu9Mbh.mjs";
import { z } from "zod";
//#region src/pages/api/stocktakes/[id]/lines.ts
var lines_exports = /* @__PURE__ */ __exportAll({
	PUT: () => PUT,
	prerender: () => false
});
var PUT = async ({ request, locals, params }) => {
	if (!z.string().uuid().safeParse(params.id).success) return fail("Invalid id");
	const body = await parseBody(request, stocktakeLineSchema);
	if ("error" in body) return body.error;
	if (body.data.batch_id) {
		const { data: batch, error: batchError } = await locals.supabase.from("batches").select("id").eq("id", body.data.batch_id).eq("product_id", body.data.product_id).is("archived_at", null).maybeSingle();
		if (batchError) return dbError(batchError);
		if (!batch) return fail("Batch is archived or does not belong to this product", 409);
	}
	const { data, error } = await locals.supabase.from("stocktake_lines").upsert({
		stocktake_id: params.id,
		...body.data,
		batch_id: body.data.batch_id ?? null
	}, { onConflict: "stocktake_id,product_id,batch_id" }).select().single();
	return error ? dbError(error) : json(data);
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/stocktakes/[id]/lines@_@ts
var page = () => lines_exports;
//#endregion
export { page };
