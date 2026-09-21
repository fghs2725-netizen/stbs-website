import { cleanDetails } from "./item-text";
import { calcTotals, formatINR, getValidItems, hasDiscount, serviceLabel, type QuotationItem, type QuotationState, type QuotationTotals } from "./quotation-model";

/**
 * Price-offer pagination. Pages 1-3 are fixed; the price table flows onto as many pages as it needs.
 *
 * Deterministic and pure so the server render, the editor preview and the PDF all agree. Heights are
 * estimated from measurements of the real template (CSS px at 96dpi, page = 1122.5px):
 *   - a row is 25px of padding/border plus 12.75px per wrapped line,
 *   - the description column is ~218px of text width (Inter 8.5px); wrapping is simulated per word using
 *     approximate Inter glyph widths, calibrated against real rows (see test-quotation-pagination.ts),
 *   - rows may run from the table top (~318px) down to ~1053px, leaving clear space above the footer.
 * `npm run test:quotation-snapshot` renders real fixtures and fails if any price page overflows, so a
 * wrong constant is caught instead of silently clipping a row.
 */
export const PRICE_LAYOUT = {
  rowChrome: 25,
  lineHeight: 12.75,
  descWidthPx: 218,
  unitWidthPx: 50,
  numericMaxChars: 13,
  bodyPx: 700,
  finalRow: 41,
  subRow: 26,
  wordsBlock: 58,
  totalsGap: 10,
  supportLine: 12.6,
  supportCharsPerLine: 60,
  // Details print under the item name in a smaller face (7.5px, line-height 1.35). The width factor turns the
  // column into "name-size" pixels, which is what the glyph widths below are measured in.
  detailLineHeight: 10.2,
  detailGap: 2,
  detailWidthFactor: 8.1 / 7.5,
} as const;

export const FIXED_PAGES = 3;

// Approximate Inter advance widths in em. Only needs to be close: the snapshot test catches real overflow.
const NARROW = "ijl'|!.,:;";
const WIDTHS: Record<string, number> = { a: .56, b: .6, c: .55, d: .6, e: .57, f: .34, g: .6, h: .59, k: .55, m: .89, n: .59, o: .6, p: .6, q: .6, r: .36, s: .52, t: .34, u: .59, v: .53, w: .8, x: .53, y: .53, z: .52,
  A: .68, B: .66, C: .72, D: .72, E: .6, F: .58, G: .74, H: .72, I: .28, J: .52, K: .66, L: .55, M: .86, N: .74, O: .76, P: .64, Q: .76, R: .66, S: .62, T: .62, U: .72, V: .68, W: .96, X: .66, Y: .64, Z: .62,
  " ": .28, "-": .35, "—": 1, "–": .6, "(": .34, ")": .34, "/": .4, '"': .4, "&": .7, "%": .9, "×": .6, "₹": .62 };
const EM = 8.1;
const charWidth = (ch: string) => (NARROW.includes(ch) ? .27 : /[0-9]/.test(ch) ? .62 : WIDTHS[ch] ?? .6) * EM;
export const textWidth = (text: string) => Array.from(text).reduce((sum, ch) => sum + charWidth(ch), 0);

/** Lines needed for `text` in a column `maxPx` wide: greedy per-word wrap, over-long words break mid-word. */
export function wrapLines(text: string, maxPx: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  const space = charWidth(" ");
  let lines = 1;
  let used = 0;
  for (const word of words) {
    const w = textWidth(word);
    if (w > maxPx) {
      if (used > 0) { lines++; used = 0; }
      const extra = Math.ceil(w / maxPx) - 1;
      lines += extra;
      used = w - extra * maxPx;
      continue;
    }
    if (used === 0) used = w;
    else if (used + space + w <= maxPx) used += space + w;
    else { lines++; used = w; }
  }
  return lines;
}

export function estimateRowHeight(item: QuotationItem): number {
  const L = PRICE_LAYOUT;
  const nameLines = wrapLines(item.description, L.descWidthPx);
  const details = cleanDetails(item.details);
  const detailLines = details ? details.split("\n").reduce((n, line) => n + wrapLines(line, L.descWidthPx * L.detailWidthFactor), 0) : 0;
  const unit = wrapLines(item.unit, L.unitWidthPx);
  const amount = formatINR(Math.round(item.quantity * item.rate * 100) / 100);
  const numeric = [formatINR(item.rate), amount, String(item.quantity)].some((t) => t.length > L.numericMaxChars) ? 2 : 1;
  // With no details this is exactly the old formula, so existing quotations paginate identically.
  const descHeight = L.lineHeight * nameLines + (detailLines ? L.detailGap + L.detailLineHeight * detailLines : 0);
  return L.rowChrome + Math.max(descHeight, L.lineHeight * Math.max(unit, numeric));
}

/** Rows above FINAL TOTAL in the totals block (subtotal, discount, taxable, CGST/SGST/IGST). */
export function subTotalRowCount(q: Pick<QuotationState, "discountType" | "discountValue" | "gstEnabled" | "gstMode">, t: QuotationTotals): number {
  const discounted = hasDiscount(q, t);
  const taxed = Boolean(q.gstEnabled);
  if (!discounted && !taxed) return 0;
  // Subtotal always; discount row if discounted; taxable value only when both apply; tax rows when taxed.
  return 1 + (discounted ? 1 : 0) + (discounted && taxed ? 1 : 0) + (taxed ? (q.gstMode === "IGST" ? 1 : 2) : 0);
}

export function totalsBlockHeight(subRows: number): number {
  const L = PRICE_LAYOUT;
  return subRows * L.subRow + L.finalRow + L.wordsBlock + L.totalsGap;
}

export type PricePages = { pages: QuotationItem[][]; starts: number[] };

/** Split priced rows across pages. The last page always has room for the totals block. */
export function paginatePriceItems(items: QuotationItem[], opts: { subRows: number; service: string }): PricePages {
  const L = PRICE_LAYOUT;
  const supportExtra = Math.max(0, Math.ceil(Math.max(1, opts.service.length) / L.supportCharsPerLine) - 1) * L.supportLine;
  const capacity = L.bodyPx - supportExtra;
  const reserve = totalsBlockHeight(opts.subRows);

  if (!items.length) return { pages: [[]], starts: [0] };

  const pages: QuotationItem[][] = [[]];
  let used = 0;
  for (const item of items) {
    const h = estimateRowHeight(item);
    if (used + h > capacity && pages[pages.length - 1].length > 0) { pages.push([]); used = 0; }
    pages[pages.length - 1].push(item);
    used += h;
  }

  // The totals block sits under the last rows; if it does not fit, carry rows onto a fresh final page.
  const heightOf = (rows: QuotationItem[]) => rows.reduce((sum, r) => sum + estimateRowHeight(r), 0);
  let last = pages[pages.length - 1];
  if (heightOf(last) + reserve > capacity) {
    const carried: QuotationItem[] = [];
    while (last.length > 1 && heightOf(last) + reserve > capacity) carried.unshift(last.pop() as QuotationItem);
    if (carried.length) pages.push(carried);
    else if (heightOf(last) + reserve > capacity) pages.push([]);
  }

  const starts: number[] = [];
  let n = 0;
  for (const p of pages) { starts.push(n); n += p.length; }
  return { pages, starts };
}

export function pricePagesFor(q: QuotationState): PricePages {
  const valid = getValidItems(q.items);
  return paginatePriceItems(valid, { subRows: subTotalRowCount(q, calcTotals(q)), service: serviceLabel(q) });
}

/** Total pages in the rendered document: 3 fixed pages plus the price pages. */
export const quotationPageCount = (q: QuotationState) => FIXED_PAGES + pricePagesFor(q).pages.length;
