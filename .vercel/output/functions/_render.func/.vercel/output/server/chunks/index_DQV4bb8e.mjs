import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { i as parseBody, n as fail, r as json, s as requireOwner, t as dbError } from "./api_ChO0QCAs.mjs";
import { o as productPatchSchema } from "./validation_BOiu9Mbh.mjs";
import { z } from "zod";
//#region src/pages/api/products/[id]/index.ts
var _id__exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	GET: () => GET,
	PATCH: () => PATCH,
	prerender: () => false
});
var idSchema = z.string().uuid();
var GET = async ({ locals, params }) => {
	if (!idSchema.safeParse(params.id).success) return fail("Invalid id");
	const { data, error } = await locals.supabase.from("products").select("*, product_barcodes(barcode,type), batches(*), stock_levels(id,batch_id,qty)").eq("id", params.id).maybeSingle();
	if (error) return dbError(error);
	return data ? json(data) : fail("Not found", 404);
};
var PATCH = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	const id = ctx.params.id;
	if (!idSchema.safeParse(id).success) return fail("Invalid id");
	const body = await parseBody(ctx.request, productPatchSchema);
	if ("error" in body) return body.error;
	const { barcodes, ...fields } = body.data;
	const sb = ctx.locals.supabase;
	if (Object.keys(fields).length) {
		const { error } = await sb.from("products").update(fields).eq("id", id);
		if (error) return dbError(error);
	}
	if (barcodes) {
		const { error: dErr } = await sb.from("product_barcodes").delete().eq("product_id", id);
		if (dErr) return dbError(dErr);
		if (barcodes.length) {
			const { error } = await sb.from("product_barcodes").insert(barcodes.map((b) => ({
				...b,
				product_id: id
			})));
			if (error) return error.code === "23505" ? fail("A barcode is already assigned to another product", 409) : dbError(error);
		}
	}
	const { data, error } = await sb.from("products").select("*, product_barcodes(barcode,type)").eq("id", id).maybeSingle();
	if (error) return dbError(error);
	return data ? json(data) : fail("Not found", 404);
};
var DELETE = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	const id = ctx.params.id;
	if (!idSchema.safeParse(id).success) return fail("Invalid id");
	const { error } = await ctx.locals.supabase.from("products").update({ active: false }).eq("id", id);
	if (error) return dbError(error);
	return json({ ok: true });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/products/[id]/index@_@ts
var page = () => _id__exports;
//#endregion
export { page };
