import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { A as maybeRenderHead, M as addAttribute, k as renderTemplate, w as renderComponent } from "./sequence_gDs-wNMi.mjs";
import { n as createComponent } from "./compiler_D1oCtqSZ.mjs";
import { a as nurseryStoryPhotos, i as nurseryMeta, n as $$Layout, r as siteUrl, t as getPublicPlantCatalog } from "./publicCatalog_DcPiWI--.mjs";
//#region src/pages/what-makes-us-different.astro
var what_makes_us_different_exports = /* @__PURE__ */ __exportAll({
	default: () => $$WhatMakesUsDifferent,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
var $$WhatMakesUsDifferent = createComponent(async ($$result, $$props, $$slots) => {
	const { plants: plantCatalog } = await getPublicPlantCatalog();
	const featuredPlant = plantCatalog.find((plant) => plant.id === "swamp-flax") ?? plantCatalog[0];
	const sustainabilityPillars = [
		{
			number: "01",
			title: "Reduce and reuse materials",
			measure: "88–92% less plastic used",
			description: "Degradable Ellebags, reusable nursery trays and returnable corflute packaging help reduce single-use plastics."
		},
		{
			number: "02",
			title: "Measure and manage water",
			measure: "Water used with care",
			description: "Roof-water capture, zoned irrigation and monitoring help target water to plant needs and minimise wastage."
		},
		{
			number: "03",
			title: "Measure our carbon",
			measure: "9.16 t CO₂-e baseline",
			description: "We measure our operational footprint and look for practical improvements in transport, delivery and energy efficiency."
		},
		{
			number: "04",
			title: "Protect plant health",
			measure: "Plant Pass audited",
			description: "Monitored plant-health systems support healthy plants and help protect the environments they are planted into."
		},
		{
			number: "05",
			title: "Support restoration",
			measure: "Grown for the long term",
			description: "Our natives support riparian and wetland restoration, healthier waterways, erosion control and biodiversity."
		},
		{
			number: "06",
			title: "Grow for local conditions",
			measure: "Locally proven natives",
			description: "Hardy plants suited to local conditions give restoration and planting projects a better-fit starting point."
		}
	];
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "What makes us different | WaiNot Native Nursery",
		"data-astro-cid-tw54x5ki": true
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="difference-page" data-astro-cid-tw54x5ki><section class="difference-hero" aria-labelledby="difference-title" data-astro-cid-tw54x5ki><div class="difference-hero-copy" data-astro-cid-tw54x5ki><p class="difference-eyebrow" data-astro-cid-tw54x5ki><span aria-hidden="true" data-astro-cid-tw54x5ki></span> The WaiNot difference · Waikite Valley</p><h1 id="difference-title" data-astro-cid-tw54x5ki>Good growing.<br data-astro-cid-tw54x5ki><em data-astro-cid-tw54x5ki>Wider purpose.</em></h1><p class="difference-lead" data-astro-cid-tw54x5ki>We grow hardy native plants with care for the land, the people planting them and the places they’ll grow for generations.</p><a class="difference-button" href="#sustainability" data-astro-cid-tw54x5ki>How we make a difference <span aria-hidden="true" data-astro-cid-tw54x5ki>↓</span></a><p class="difference-location" data-astro-cid-tw54x5ki>Locally grown in Rotorua, Aotearoa</p></div><figure class="difference-hero-image" data-astro-cid-tw54x5ki><img src="https://dzpdbgwih7u1r.cloudfront.net/9aa59b48-85ec-4aad-8748-d7131ea253b0/a11b26df-c430-4dbb-8acc-e0c6a32309b5/a11b26df-c448-46dc-a6d9-6d11d2bfd881/w3024h3024-20230727_164422.jpg" alt="A native plant grown in its degradable Ellebag sleeve" width="3024" height="3024" fetchpriority="high" data-astro-cid-tw54x5ki><figcaption data-astro-cid-tw54x5ki>Thoughtful growing, from nursery to planting site.</figcaption></figure></section><section class="difference-purpose" aria-label="Our purpose" data-astro-cid-tw54x5ki><p data-astro-cid-tw54x5ki>Every plant has a job to do: restoring waterways, establishing wetlands and strengthening native habitats across landscapes and communities.</p><a${addAttribute(siteUrl("#catalogue"), "href")} data-astro-cid-tw54x5ki>Explore our plants <span aria-hidden="true" data-astro-cid-tw54x5ki>↗</span></a></section><section id="sustainability" class="sustainability-section" aria-labelledby="sustainability-title" data-astro-cid-tw54x5ki><header class="difference-section-heading" data-astro-cid-tw54x5ki><div data-astro-cid-tw54x5ki><p class="difference-eyebrow" data-astro-cid-tw54x5ki>Sustainability, climate action &amp; kaitiakitanga</p><h2 id="sustainability-title" data-astro-cid-tw54x5ki>Better choices,<br data-astro-cid-tw54x5ki><em data-astro-cid-tw54x5ki>at every stage.</em></h2></div><p data-astro-cid-tw54x5ki>Our environmental impact goes beyond the nursery gate. We keep reviewing how we grow, use resources and deliver plants—and make practical improvements where we can.</p></header><div class="pillar-grid" data-astro-cid-tw54x5ki>${sustainabilityPillars.map((pillar) => renderTemplate`<article class="pillar-card" data-astro-cid-tw54x5ki><span class="pillar-number" data-astro-cid-tw54x5ki>${pillar.number}</span><h3 data-astro-cid-tw54x5ki>${pillar.title}</h3><p class="pillar-measure" data-astro-cid-tw54x5ki>${pillar.measure}</p><p class="pillar-description" data-astro-cid-tw54x5ki>${pillar.description}</p></article>`)}</div><p class="sustainability-note" data-astro-cid-tw54x5ki>Sustainability is an ongoing process: we keep measuring, learning and improving to supply quality plants that can do their job in the environment for years to come.</p></section><section class="growing-story" aria-labelledby="growing-title" data-astro-cid-tw54x5ki><div class="growing-story-image" data-astro-cid-tw54x5ki>${featuredPlant && renderTemplate`<img${addAttribute(featuredPlant.image, "src")}${addAttribute(featuredPlant.image_alt, "alt")} width="960" height="960" loading="lazy" decoding="async" data-astro-cid-tw54x5ki>`}<span data-astro-cid-tw54x5ki>Grown for landscapes and communities</span></div><div class="growing-story-copy" data-astro-cid-tw54x5ki><p class="difference-eyebrow" data-astro-cid-tw54x5ki>Growing natives with a wider purpose</p><h2 id="growing-title" data-astro-cid-tw54x5ki>From our nursery<br data-astro-cid-tw54x5ki>to <em data-astro-cid-tw54x5ki>your whenua.</em></h2><p data-astro-cid-tw54x5ki>We have looked closely at every stage of our growing and supply system. Single-use plastic plant pots and trays are no longer part of it: nursery trays are retained and reused, while corflute delivery boxes can be returned and recycled.</p><p data-astro-cid-tw54x5ki>We monitor water use and our operational carbon footprint, and continually improve how plants are grown, packed and delivered. Technology helps us make informed decisions about plant health, watering and nutrients.</p><p class="growing-emphasis" data-astro-cid-tw54x5ki>For us, kaitiakitanga means caring for our environment here at the nursery while producing plants that help establish successful native landscapes beyond our gate.</p><a class="difference-text-link"${addAttribute(siteUrl("#ellebag"), "href")} data-astro-cid-tw54x5ki>Discover how we grow <span aria-hidden="true" data-astro-cid-tw54x5ki>↗</span></a></div></section><section class="difference-photo-section" aria-labelledby="difference-photo-title" data-astro-cid-tw54x5ki><header data-astro-cid-tw54x5ki><p class="difference-eyebrow" data-astro-cid-tw54x5ki>The people and place behind the plants</p><h2 id="difference-photo-title" data-astro-cid-tw54x5ki>Grown with care,<br data-astro-cid-tw54x5ki><em data-astro-cid-tw54x5ki>from the ground up.</em></h2></header><div class="nursery-photo-grid" data-astro-cid-tw54x5ki>${nurseryStoryPhotos.map((photo) => renderTemplate`<figure${addAttribute(`nursery-photo-card nursery-photo-card--${photo.id}`, "class")} data-astro-cid-tw54x5ki><img${addAttribute(photo.src, "src")}${addAttribute(photo.alt, "alt")}${addAttribute(photo.width, "width")}${addAttribute(photo.height, "height")} loading="lazy" decoding="async" data-astro-cid-tw54x5ki><figcaption data-astro-cid-tw54x5ki><span data-astro-cid-tw54x5ki>${photo.caption}</span><span aria-hidden="true" data-astro-cid-tw54x5ki>↗</span></figcaption></figure>`)}</div></section><section class="about-nursery" aria-labelledby="about-title" data-astro-cid-tw54x5ki><div class="about-nursery-heading" data-astro-cid-tw54x5ki><p class="difference-eyebrow" data-astro-cid-tw54x5ki>Rooted in Waikite Valley</p><h2 id="about-title" data-astro-cid-tw54x5ki>A bit about<br data-astro-cid-tw54x5ki><em data-astro-cid-tw54x5ki>WaiNot.</em></h2></div><div class="about-nursery-copy" data-astro-cid-tw54x5ki><p data-astro-cid-tw54x5ki>WaiNot Native Nursery is owned and operated by Steve and Steph Carroll in Waikite Valley, near Rotorua. After dairy farming in the district until 2018, they built a new business around native plants, practical growing systems and their connection to the land.</p><p data-astro-cid-tw54x5ki>We use the Ellebag growing system developed by Danish propagation specialists Ellepot A/S. Our on-site Ellebag machine lets us produce and fill degradable bags at the nursery. Most of our plants are grown in 60 mm Ellebags, with 80 mm and 100 mm sizes also available.</p><a class="difference-text-link"${addAttribute(`mailto:${nurseryMeta.email}?subject=Native%20plant%20enquiry`, "href")} data-astro-cid-tw54x5ki>Talk with the nursery <span aria-hidden="true" data-astro-cid-tw54x5ki>↗</span></a></div></section><aside class="difference-cta" aria-labelledby="difference-cta-title" data-astro-cid-tw54x5ki><div data-astro-cid-tw54x5ki><p class="difference-eyebrow" data-astro-cid-tw54x5ki>Your next planting starts here</p><h2 id="difference-cta-title" data-astro-cid-tw54x5ki>Let’s grow something good.</h2></div><a class="difference-button difference-button-light"${addAttribute(siteUrl("#contact"), "href")} data-astro-cid-tw54x5ki>Plan your project <span aria-hidden="true" data-astro-cid-tw54x5ki>↗</span></a></aside></div>` })}`;
}, "C:/Users/Shane/Documents/React Apps/WaiNot-Nursery/src/pages/what-makes-us-different.astro", void 0);
var $$file = "C:/Users/Shane/Documents/React Apps/WaiNot-Nursery/src/pages/what-makes-us-different.astro";
var $$url = "/what-makes-us-different";
//#endregion
//#region \0virtual:astro:page:src/pages/what-makes-us-different@_@astro
var page = () => what_makes_us_different_exports;
//#endregion
export { page };
