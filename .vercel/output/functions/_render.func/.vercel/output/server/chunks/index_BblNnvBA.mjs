import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { k as renderTemplate, w as renderComponent } from "./sequence_gDs-wNMi.mjs";
import { n as createComponent } from "./compiler_D1oCtqSZ.mjs";
import { t as $$AdminLayout } from "./AdminLayout_bXCitrSz.mjs";
//#region src/pages/admin/index.astro
var admin_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$Index = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, {}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "AdminApp", null, {
		"client:only": "react",
		"client:component-hydration": "only",
		"client:component-path": "C:/Users/Shane/Documents/React Apps/WaiNot-Nursery/src/components/admin/AdminApp.tsx",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/Shane/Documents/React Apps/WaiNot-Nursery/src/pages/admin/index.astro", void 0);
var $$file = "C:/Users/Shane/Documents/React Apps/WaiNot-Nursery/src/pages/admin/index.astro";
var $$url = "/admin";
//#endregion
//#region \0virtual:astro:page:src/pages/admin/index@_@astro
var page = () => admin_exports;
//#endregion
export { page };
