import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { r as json } from "./api_ChO0QCAs.mjs";
//#region src/pages/api/auth/me.ts
var me_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = async ({ locals }) => json({
	id: locals.user.id,
	email: locals.user.email,
	role: locals.role
});
//#endregion
//#region \0virtual:astro:page:src/pages/api/auth/me@_@ts
var page = () => me_exports;
//#endregion
export { page };
