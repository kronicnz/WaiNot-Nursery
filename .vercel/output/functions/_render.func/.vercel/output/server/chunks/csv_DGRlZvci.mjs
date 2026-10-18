//#region src/lib/csv.ts
function toCsv(rows) {
	return rows.map((r) => r.map((v) => {
		let s = v === null || v === void 0 ? "" : String(v);
		if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
		return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
	}).join(",")).join("\r\n");
}
function parseCsv(text) {
	const rows = [];
	let row = [];
	let cur = "";
	let quoted = false;
	const src = text.replace(/^\uFEFF/, "");
	for (let i = 0; i < src.length; i++) {
		const c = src[i];
		if (quoted) {
			if (c === "\"" && src[i + 1] === "\"") {
				cur += "\"";
				i++;
			} else if (c === "\"") quoted = false;
			else cur += c;
		} else if (c === "\"") quoted = true;
		else if (c === ",") {
			row.push(cur);
			cur = "";
		} else if (c === "\n" || c === "\r") {
			if (c === "\r" && src[i + 1] === "\n") i++;
			row.push(cur);
			cur = "";
			if (row.some((x) => x !== "")) rows.push(row);
			row = [];
		} else cur += c;
	}
	row.push(cur);
	if (row.some((x) => x !== "")) rows.push(row);
	return rows;
}
//#endregion
export { toCsv as n, parseCsv as t };
