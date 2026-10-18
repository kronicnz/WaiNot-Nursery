//#region src/lib/api.ts
function json(data, status = 200, headers = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
			...headers
		}
	});
}
var fail = (message, status = 400, details) => json({
	error: message,
	details
}, status);
function requireOwner(ctx) {
	return ctx.locals.role === "owner" ? null : fail("Owner access required", 403);
}
async function parseBody(request, schema) {
	let raw;
	try {
		raw = await request.json();
	} catch {
		return { error: fail("Invalid JSON body") };
	}
	const r = schema.safeParse(raw);
	if (!r.success) return { error: fail("Validation failed", 400, r.error.flatten()) };
	return { data: r.data };
}
function parseQuery(params, schema) {
	const r = schema.safeParse(Object.fromEntries(params));
	if (!r.success) return { error: fail("Validation failed", 400, r.error.flatten()) };
	return { data: r.data };
}
function dbError(err) {
	const msg = err.message ?? "";
	if (err.code === "42501" || /row-level security|not authorised|owner only/i.test(msg)) return fail("Forbidden", 403);
	if (/insufficient stock/i.test(msg)) return fail("Insufficient stock", 409);
	if (/batch is archived|batch must have zero stock/i.test(msg)) return fail(msg, 409);
	if (err.code === "23505") return fail("Already exists", 409);
	if (err.code === "23503") return fail("Referenced record is missing or still in use", 409);
	if (err.code === "23514" || /must be|invalid|unknown|does not belong|differ|not open/i.test(msg)) return fail(msg, 400);
	console.error("db error", err);
	return fail("Server error", 500);
}
function parsePaging(params, maxLimit = 100) {
	return {
		limit: Math.min(Math.max(parseInt(params.get("limit") ?? "50", 10) || 50, 1), maxLimit),
		offset: Math.max(parseInt(params.get("offset") ?? "0", 10) || 0, 0)
	};
}
var sanitizeSearch = (s) => s.replace(/[%_,()*\\]/g, " ").trim().slice(0, 80);
//#endregion
export { parsePaging as a, sanitizeSearch as c, parseBody as i, fail as n, parseQuery as o, json as r, requireOwner as s, dbError as t };
