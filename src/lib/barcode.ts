// UPC-A (12 digits) and EAN-13 with a leading zero are the same code; try both forms.
export function barcodeCandidates(code: string): string[] {
  const set = new Set([code]);
  if (/^\d{12}$/.test(code)) set.add(`0${code}`);
  if (/^0\d{12}$/.test(code)) set.add(code.slice(1));
  return [...set];
}
