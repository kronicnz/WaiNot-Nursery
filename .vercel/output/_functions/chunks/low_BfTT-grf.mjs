import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { r as json, t as dbError } from "./api_ChO0QCAs.mjs";
//#region src/pages/api/stock/low.ts
var low_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = async ({ locals }) => {
	const { data, error } = await locals.supabase.from("low_stock").select("*").order("total_qty").limit(500);
	return error ? dbError(error) : json(data);
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/stock/low@_@ts
var page = () => low_exports;
//#endregion
export { page };
