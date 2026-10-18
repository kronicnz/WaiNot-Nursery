import { E as renderSlot, M as addAttribute, j as renderHead, k as renderTemplate } from "./sequence_gDs-wNMi.mjs";
import { n as createComponent, t as createAstro } from "./compiler_D1oCtqSZ.mjs";
import { t as renderScript } from "./script_CLP8TfyG.mjs";
/* empty css                 */
import { createClient } from "@supabase/supabase-js";
//#region src/data/processedData.ts
var nurseryStoryPhotos = [
	{
		id: "people",
		src: "https://dzpdbgwih7u1r.cloudfront.net/9aa59b48-85ec-4aad-8748-d7131ea253b0/a03773be-34c2-4aa4-87fb-1a239aa97ff3/a03773be-34d8-4664-bb99-998da8ecda29/w1200h799-SYDNEY-7343.jpg",
		alt: "Steve and Steph at WaiNot Native Nursery",
		caption: "Locally owned and operated",
		width: 1200,
		height: 799
	},
	{
		id: "machine",
		src: "https://dzpdbgwih7u1r.cloudfront.net/9aa59b48-85ec-4aad-8748-d7131ea253b0/a11ed600-c76d-4726-8ffb-616c08c7db50/a11ed600-c784-455b-a3b6-53a47c9e2d4a/w900h1200-20250823_145509.jpg",
		alt: "Ellepot machine used to make Ellebag sleeves at WaiNot Native Nursery",
		caption: "Ellebags made on site",
		width: 900,
		height: 1200
	},
	{
		id: "nursery",
		src: "/images/WaiNot-Nursery%20-Plants.jpg",
		alt: "Rows of native plants at WaiNot Native Nursery with Waikite Valley in the evening light",
		caption: "Grown in Waikite Valley",
		width: 4e3,
		height: 3e3
	}
];
var testimonials = [
	{
		id: "alistair-hardy",
		author: "Alistair Hardy, Director",
		text: "Working with WaiNot Native Nursery has been a game-changer for contractors like us, great communication, easy and super helpful to deal with. We have been consistently impressed by the quality of their plants, which are always healthy and well-suited to our local environment. Their innovative use of the Ellebags promotes healthy root growth, ensuring transplant success and ultimately leading to thriving plants. The ease of use when working with the Ellebag has meant we save time in our planting process and never need to worry anymore about disposing of plastic trays/pots/bags anymore. We highly recommend contacting WaiNot Native Nursery for any large or small native planting projects you may have."
	},
	{
		id: "yellowview-trust",
		author: "Yellowview Trust",
		text: "Over the past three years, I've planted 40,000 native trees and shrubs using plastic pots and bags, which were heavy, fragile, and produced waste. These methods also added 25% to plant costs due to high transport expenses, and removing the plants took time. Plastic disposal was another issue. In the last 15 months, the ELLEPOT system has improved our process. Used by WaiNot Native Nursery in Rotorua, it reduces freight costs by allowing more plants in a degradable box, ready for planting without handling. Its eco-friendly pots lower labour and environmental impact. We plant with a spade or a battery drill and auger, speeding up the process and cutting costs. Plants grow better and need less maintenance; some shrubs don't need care later. Fertiliser tablets boost growth without extra work. This system allows efficient planting, better plant survival, and cost savings."
	},
	{
		id: "aotearoa-restoration",
		author: "Aotearoa Restoration",
		text: "Partnering with WaiNot Native Nursery has transformed our planting operations. The Ellebag system makes planting faster and easier, with minimal root disturbance and no soil loss — resulting in healthier, more resilient plants. We’ve cut labour time, reduced plastic waste, and improved overall efficiency, all while meeting our sustainability goals. WaiNot’s Ellebag-grown natives deliver real results for restoration projects across Aotearoa."
	},
	{
		id: "dave-and-nicola",
		author: "Dave and Nicola",
		text: "WaiNot Native Nursery have supplied more than 3000 plants for two planting projects we have undertaken over the past three years on our lifestyle block. The first was to revegetate a stream bank, and in Autumn 2025 we planted two steep areas unsuitable for grazing. Another key consideration was the environmental sustainability of the WaiNot Native Nursery Ellebag planting method. The plants supplied were of the best quality and so very easy to plant in their degradable sleeves. No pots to contend with being a huge factor in reducing the planting time by at least half. It has been a pleasure to do business with Steve and Steph who have shared their knowledge freely. We highly recommend WaiNot Native Nursery for any native planting project."
	}
];
var nurseryMeta = {
	address: "715 Waikite Valley Road, RD1, Rotorua",
	phoneSteph: "0272916064",
	phoneSteve: "0274751612",
	email: "info@wainotnativenursery.co.nz",
	orderNotice: "New seedlings are on their way. Get in early to lock in your species and volumes for your project.",
	plantSelectionGuide: "https://www.wainotnativenursery.co.nz/site_files/38808/upload_files/WaiNot_Plant_Selection_Guide_Matrix_with_Logo_A4_Landscape%20(1)(1).pdf?dl=1",
	ellebagGuide: "https://www.wainotnativenursery.co.nz/site_files/38808/upload_files/Wainot%20folder%20A5%204%20pages(1).pdf?dl=1",
	plantingCalculator: "https://toolkit.tanestrees.org.nz/planting-budgeting-calculator/"
};
//#endregion
//#region src/utils/siteUrl.ts
function siteUrl(path) {
	return `${"/".endsWith("/") ? "/" : `//`}${path.replace(/^\/+/, "")}`;
}
//#endregion
//#region src/layouts/Layout.astro
createAstro("https://astro.build");
var $$Layout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Layout;
	const { title } = Astro.props;
	const formatPhone = (phone) => phone.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3");
	return renderTemplate`<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description" content="Rotorua-grown native plants for restoration, riparian planting and landscapes across Aotearoa. Explore WaiNot Native Nursery's plant range and degradable Ellebag growing system."><title>${title}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">${renderHead($$result)}</head><body class="bg-white text-stone-900 antialiased"><a href="#main_body" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[#f5f4ee] focus:px-4 focus:py-3 focus:text-[#1d3229] focus:shadow-lg">Skip to content</a><div class="site-announcement"><p><strong>Planting season orders are open.</strong> ${nurseryMeta.orderNotice}</p><a${addAttribute(siteUrl("#contact"), "href")}>Plan your planting <span aria-hidden="true">↗</span></a></div><header class="sticky top-0 z-50 border-b border-[#e4e5dd] bg-[#fcfbf7]/95 backdrop-blur-md"><nav class="mx-auto max-w-[1500px] px-6 py-2" aria-label="Main navigation"><div class="flex items-center justify-between"><a${addAttribute(siteUrl("/"), "href")} class="flex items-center gap-3" aria-label="WaiNot Native Nursery Home"><img class="header-brand-mark" src="/images/WaiNot-Nursery.png" alt="" width="500" height="442"><span class="header-brand-location">Native nursery · Rotorua</span></a><div class="hidden items-center gap-6 lg:flex"><a${addAttribute(siteUrl("#catalogue"), "href")} class="text-xs font-medium text-[#526157] transition-colors hover:text-[#20392d]">Plant range</a><a${addAttribute(siteUrl("#ellebag"), "href")} class="text-xs font-medium text-[#526157] transition-colors hover:text-[#20392d]">How we grow</a><a${addAttribute(siteUrl("what-makes-us-different/"), "href")} class="text-xs font-medium text-[#526157] transition-colors hover:text-[#20392d]">Our difference</a><a${addAttribute(siteUrl("#testimonials"), "href")} class="text-xs font-medium text-[#526157] transition-colors hover:text-[#20392d]">Stories</a></div><div class="hidden items-center gap-5 lg:flex"><a${addAttribute(`tel:${nurseryMeta.phoneSteph}`, "href")} class="text-xs font-medium text-[#526157] transition-colors hover:text-[#20392d]">${formatPhone(nurseryMeta.phoneSteph)}</a><a${addAttribute(siteUrl("#contact"), "href")} class="inline-flex h-10 items-center justify-center gap-3 bg-[#294536] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#20392d]">Enquire <span aria-hidden="true">↗</span></a></div><button id="mobile-menu-button" class="grid h-10 w-10 place-items-center text-[#294536] lg:hidden" aria-label="Open navigation" aria-controls="mobile-menu" aria-expanded="false"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button></div><div id="mobile-menu" class="hidden border-t border-[#e4e5dd] pt-3 lg:hidden"><div class="flex flex-col gap-1 pb-3"><a${addAttribute(siteUrl("#catalogue"), "href")} class="px-3 py-2 text-sm font-medium text-[#526157] hover:bg-[#eef0e9]">Plant range</a><a${addAttribute(siteUrl("#ellebag"), "href")} class="px-3 py-2 text-sm font-medium text-[#526157] hover:bg-[#eef0e9]">How we grow</a><a${addAttribute(siteUrl("what-makes-us-different/"), "href")} class="px-3 py-2 text-sm font-medium text-[#526157] hover:bg-[#eef0e9]">Our difference</a><a${addAttribute(siteUrl("#testimonials"), "href")} class="px-3 py-2 text-sm font-medium text-[#526157] hover:bg-[#eef0e9]">Stories</a><a${addAttribute(nurseryMeta.plantSelectionGuide, "href")} target="_blank" rel="noopener noreferrer" class="px-3 py-2 text-sm font-medium text-[#526157] hover:bg-[#eef0e9]">Plant selection guide ↗</a></div><a${addAttribute(`mailto:${nurseryMeta.email}`, "href")} class="mb-3 inline-flex h-10 items-center justify-center bg-[#294536] px-4 text-sm font-semibold text-white">Email the nursery ↗</a></div></nav></header><main id="main_body">${renderSlot($$result, $$slots["default"])}</main><footer class="border-t-4 border-[#829477] bg-[#f5f4ee] text-[#1d3229]"><div class="max-w-7xl mx-auto px-6 py-16"><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8 lg:gap-x-12 lg:gap-y-10 mb-12"><div class="sm:col-span-2"><a${addAttribute(siteUrl("/"), "href")} class="flex items-center gap-2 mb-4" aria-label="WaiNot Native Nursery Home"><span class="font-serif text-2xl font-bold text-[#244437]">WaiNot Natives</span><span class="text-xs text-[#829477] font-medium">Nursery</span></a><p class="text-sm text-[#69766d] max-w-xs leading-relaxed">Quality NZ Native Plants for every project. Rotorua based, we grow hardy, locally–proven NZ Native Plants in sustainable Ellebags.</p></div><div class="sm:border-t sm:border-[#d9ded4] sm:pt-6"><h4 class="text-xs font-semibold uppercase tracking-[0.14em] text-[#62765f] mb-4">Opening Hours</h4><p class="text-sm text-[#69766d]">Open by appointment only</p><p class="text-sm text-[#69766d] mt-1">Please phone ahead</p></div><div class="sm:border-t sm:border-[#d9ded4] sm:pt-6"><h4 class="text-xs font-semibold uppercase tracking-[0.14em] text-[#62765f] mb-4">Contact</h4><address class="not-italic text-sm text-[#69766d] space-y-2"><p>${nurseryMeta.address}</p><p><a${addAttribute(`tel:${nurseryMeta.phoneSteph}`, "href")} class="hover:text-[#244437] transition-colors">027 291 6064 (Steph)</a></p><p><a${addAttribute(`tel:${nurseryMeta.phoneSteve}`, "href")} class="hover:text-[#244437] transition-colors">027 475 1612 (Steve)</a></p><p><a${addAttribute(`mailto:${nurseryMeta.email}`, "href")} class="break-all hover:text-[#244437] transition-colors">${nurseryMeta.email}</a></p></address></div></div><div class="flex flex-col lg:flex-row items-center justify-between gap-4 pt-8 border-t border-[#d9ded4]"><p class="text-xs text-[#78847b]">Copyright © ${(/* @__PURE__ */ new Date()).getFullYear()} WaiNot Native Nursery</p><div class="flex items-center gap-6"><a href="https://www.facebook.com/wainotnativenursery" target="_blank" rel="noopener noreferrer" class="text-[#78847b] hover:text-[#244437] transition-colors" aria-label="Facebook"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a><a href="https://www.linkedin.com/company/wainot-natives-nursery" target="_blank" rel="noopener noreferrer" class="text-[#78847b] hover:text-[#244437] transition-colors" aria-label="LinkedIn"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4.47v15.06a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.47a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2zm-8 5h2v7h-2v-7zm-4.5 0a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zm9.5 7h-2v2h2v-2z"></path></svg></a><a href="https://instagram.com/wainotnatives" target="_blank" rel="noopener noreferrer" class="text-[#78847b] hover:text-[#244437] transition-colors" aria-label="Instagram"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke-width="2"></rect><path stroke-width="2" d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke-width="2"></line></svg></a></div></div></div></footer>${renderScript($$result, "C:/Users/Shane/Documents/React Apps/WaiNot-Nursery/src/layouts/Layout.astro?astro&type=script&index=0&lang.ts")}</body></html>`;
}, "C:/Users/Shane/Documents/React Apps/WaiNot-Nursery/src/layouts/Layout.astro", void 0);
//#endregion
//#region src/lib/publicCatalog.ts
async function getPublicPlantCatalog() {
	const supabase = createClient("http://127.0.0.1:54321", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0");
	const [categoriesResult, plantsResult] = await Promise.all([supabase.from("public_catalog_categories").select("*").order("sort_order"), supabase.from("public_catalog_plants").select("*").order("category_sort_order").order("sort_order")]);
	if (categoriesResult.error) throw new Error(`Unable to load plant categories: ${categoriesResult.error.message}`);
	if (plantsResult.error) throw new Error(`Unable to load plant catalog: ${plantsResult.error.message}`);
	return {
		categories: categoriesResult.data,
		plants: plantsResult.data
	};
}
//#endregion
export { nurseryStoryPhotos as a, nurseryMeta as i, $$Layout as n, testimonials as o, siteUrl as r, getPublicPlantCatalog as t };
