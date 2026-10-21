/** How a town page describes a client from its invoices. Pure, so it is testable without a database. */

/** Invoice client names are typed by hand, so compare them upper-cased with spacing collapsed. */
export const invoiceKey = (name: string) => name.replace(/\s+/g, " ").trim().toUpperCase();

const R = /rain|recharge|rwh|percolat|harvest|chamber|\bpit\b/;
const B = /bor(e|ing)|drill|tubewell|tube well|capti/;
const P = /pump|motor|submersible|repair|rewind|maint/;
const M = /pipe|cable|panel|starter|column|casing|fitting/;

/** One plain label for the kind of work, read from invoice item descriptions. */
export function workLabel(descriptions: string[]): string {
  const t = descriptions.join(" ").toLowerCase();
  const [r, b, p, m] = [R, B, P, M].map((re) => re.test(t));
  if (b && r) return "Borewell and rainwater harvesting";
  if (r) return "Rainwater harvesting";
  if (b && p) return "Borewell and pump installation";
  if (b) return "Borewell";
  if (p && m) return "Pump installation and material supply";
  if (p) return "Pump installation and repair";
  if (m) return "Material supply";
  return "";
}

/** "2024" or "2021–2025" from invoice dates ("YYYY-MM-DD"). */
export function yearSpan(dates: string[]): string {
  const years = dates.map((d) => Number(d.slice(0, 4))).filter((y) => y > 1990);
  if (!years.length) return "";
  const [lo, hi] = [Math.min(...years), Math.max(...years)];
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}
