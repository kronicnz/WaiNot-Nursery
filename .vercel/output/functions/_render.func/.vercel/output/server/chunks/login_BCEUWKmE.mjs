import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { A as maybeRenderHead, k as renderTemplate, w as renderComponent } from "./sequence_gDs-wNMi.mjs";
import { n as createComponent } from "./compiler_D1oCtqSZ.mjs";
import { t as renderScript } from "./script_CLP8TfyG.mjs";
import { t as $$AdminLayout } from "./AdminLayout_bXCitrSz.mjs";
//#region src/pages/admin/login.astro
var login_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Login,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Login = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": "Sign in – WaiNot Stock" }, { "default": async ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="admin-login mx-auto max-w-sm p-6"><h1 class="mb-4 text-2xl font-semibold">WaiNot Stock</h1><form id="login" class="space-y-3"><input name="email" type="email" required autocomplete="username" placeholder="Email" class="w-full rounded-lg border p-3"><input name="password" type="password" required autocomplete="current-password" placeholder="Password" class="w-full rounded-lg border p-3"><button class="w-full rounded-lg bg-green-700 p-3 font-medium text-white">Sign in</button><p id="err" role="alert" class="text-sm text-red-700"></p></form></main>${renderScript($$result, "C:/Users/Shane/Documents/React Apps/WaiNot-Nursery/src/pages/admin/login.astro?astro&type=script&index=0&lang.ts")}` })}`;
}, "C:/Users/Shane/Documents/React Apps/WaiNot-Nursery/src/pages/admin/login.astro", void 0);
var $$file = "C:/Users/Shane/Documents/React Apps/WaiNot-Nursery/src/pages/admin/login.astro";
var $$url = "/admin/login";
//#endregion
//#region \0virtual:astro:page:src/pages/admin/login@_@astro
var page = () => login_exports;
//#endregion
export { page };
