import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { n as fail, r as json, s as requireOwner, t as dbError } from "./api_ChO0QCAs.mjs";
import { z } from "zod";
//#region src/pages/api/stocktakes/[id]/finalize.ts
var finalize_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var POST = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	if (!z.string().uuid().safeParse(ctx.params.id).success) return fail("Invalid id");
	const { data, error } = await ctx.locals.supabase.rpc("finalize_stocktake", { p_id: ctx.params.id });
	return error ? dbError(error) : json({ adjustments: data });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/stocktakes/[id]/finalize@_@ts
var page = () => finalize_exports;
//#endregion
export { page };
