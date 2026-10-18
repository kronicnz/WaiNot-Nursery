import { E as renderSlot, j as renderHead, k as renderTemplate } from "./sequence_gDs-wNMi.mjs";
import { n as createComponent, t as createAstro } from "./compiler_D1oCtqSZ.mjs";
/* empty css                 */
//#region src/layouts/AdminLayout.astro
createAstro("https://astro.build");
var $$AdminLayout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$AdminLayout;
	const { title = "WaiNot Stock" } = Astro.props;
	return renderTemplate`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#166534"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon.svg"><title>${title}</title>${renderHead($$result)}</head><body class="bg-stone-50">${renderSlot($$result, $$slots["default"])}</body></html>`;
}, "C:/Users/Shane/Documents/React Apps/WaiNot-Nursery/src/layouts/AdminLayout.astro", void 0);
//#endregion
export { $$AdminLayout as t };
