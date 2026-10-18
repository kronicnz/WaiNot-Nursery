import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { n as fail, r as json, s as requireOwner, t as dbError } from "./api_ChO0QCAs.mjs";
import { z } from "zod";
//#region src/pages/api/batches/[id]/index.ts
var _id__exports = /* @__PURE__ */ __exportAll({
	PATCH: () => PATCH,
	prerender: () => false
});
var PATCH = async (ctx) => {
	const denied = requireOwner(ctx);
	if (denied) return denied;
	if (!z.string().uuid().safeParse(ctx.params.id).success) return fail("Invalid id");
	const { data, error } = await ctx.locals.supabase.rpc("archive_batch", { p_id: ctx.params.id });
	return error ? dbError(error) : json({ archived_at: data });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/batches/[id]/index@_@ts
var page = () => _id__exports;
//#endregion
export { page };
