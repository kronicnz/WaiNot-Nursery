import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as dbError } from "./api_ChO0QCAs.mjs";
import { n as toCsv } from "./csv_DGRlZvci.mjs";
//#region src/pages/api/export/products.csv.ts
var products_csv_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = async ({ locals }) => {
	const { data, error } = await locals.supabase.from("products").select("sku,name,botanical_name,pot_size,price,reorder_level,public_description,public_image_url,public_image_alt,active,categories(name),product_barcodes(barcode),stock_levels(qty)").order("sku").limit(1e4);
	if (error) return dbError(error);
	const rows = [[
		"sku",
		"name",
		"botanical_name",
		"category",
		"pot_size",
		"price",
		"reorder_level",
		"public_description",
		"public_image_url",
		"public_image_alt",
		"barcode",
		"total_qty",
		"active"
	]];
	for (const p of data) rows.push([
		p.sku,
		p.name,
		p.botanical_name,
		p.categories?.name ?? "",
		p.pot_size,
		p.price,
		p.reorder_level,
		p.public_description,
		p.public_image_url,
		p.public_image_alt,
		(p.product_barcodes ?? []).map((b) => b.barcode).join(";"),
		(p.stock_levels ?? []).reduce((n, s) => n + s.qty, 0),
		p.active
	]);
	return new Response(toCsv(rows), { headers: {
		"Content-Type": "text/csv; charset=utf-8",
		"Content-Disposition": "attachment; filename=\"products.csv\"",
		"Cache-Control": "no-store"
	} });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/export/products.csv@_@ts
var page = () => products_csv_exports;
//#endregion
export { page };
