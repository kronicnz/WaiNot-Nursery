import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { r as json } from "./api_ChO0QCAs.mjs";
//#region src/pages/api/auth/logout.ts
var logout_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var POST = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	return json({ ok: true });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/auth/logout@_@ts
var page = () => logout_exports;
//#endregion
export { page };
