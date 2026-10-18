import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { n as fail, o as parseQuery, r as json, t as dbError } from "./api_ChO0QCAs.mjs";
import { z } from "zod";
//#region src/lib/barcode.ts
function barcodeCandidates(code) {
	const set = /* @__PURE__ */ new Set([code]);
	if (/^\d{12}$/.test(code)) set.add(`0${code}`);
	if (/^0\d{12}$/.test(code)) set.add(code.slice(1));
	return [...set];
}
//#endregion
//#region src/pages/api/products/lookup.ts
var lookup_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
function activeBatches(product) {
	return {
		...product,
		batches: product.batches?.filter((batch) => batch.archived_at === null)
	};
}
function firstProduct(value) {
	if (Array.isArray(value)) return value[0] ? activeBatches(value[0]) : null;
	return value ? activeBatches(value) : null;
}
var GET = async ({ locals, url }) => {
	const q = parseQuery(url.searchParams, z.object({ barcode: z.string().trim().min(1).max(128) }));
	if ("error" in q) return q.error;
	const select = "*, stock_levels(batch_id, qty), batches(id,batch_code,potted_on,barcode,archived_at), product_barcodes(barcode,type)";
	const { data, error } = await locals.supabase.from("product_barcodes").select(`barcode, products!inner(${select})`).in("barcode", barcodeCandidates(q.data.barcode)).limit(1);
	if (error) return dbError(error);
	if (data?.length) {
		const product = firstProduct(data[0].products);
		return product ? json(product) : fail("Product for barcode not found", 404);
	}
	const { data: batch, error: batchError } = await locals.supabase.from("batches").select(`id, products!inner(${select})`).in("barcode", barcodeCandidates(q.data.barcode)).is("archived_at", null).limit(1).maybeSingle();
	if (batchError) return dbError(batchError);
	if (batch) {
		const product = firstProduct(batch.products);
		if (!product) return fail("Product for batch not found", 404);
		return json({
			...product,
			scanned_batch_id: batch.id
		});
	}
	if (q.data.barcode.startsWith("WN:")) {
		const { data: bySku, error: sErr } = await locals.supabase.from("products").select(select).eq("sku", q.data.barcode.slice(3)).maybeSingle();
		if (sErr) return dbError(sErr);
		if (bySku) return json(activeBatches(bySku));
	}
	return fail("Unknown barcode", 404);
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/products/lookup@_@ts
var page = () => lookup_exports;
//#endregion
export { page };
