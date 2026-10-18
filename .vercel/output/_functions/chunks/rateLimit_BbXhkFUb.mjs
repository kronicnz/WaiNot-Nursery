//#region src/lib/rateLimit.ts
var buckets = /* @__PURE__ */ new Map();
function rateLimit(key, limit, windowMs) {
	const now = Date.now();
	if (buckets.size > 5e3) {
		for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
	}
	const b = buckets.get(key);
	if (!b || b.reset < now) {
		buckets.set(key, {
			count: 1,
			reset: now + windowMs
		});
		return true;
	}
	b.count += 1;
	return b.count <= limit;
}
//#endregion
export { rateLimit as t };
