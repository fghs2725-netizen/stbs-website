/**
 * Invoice pagination: how many pages the items need, and which rows land on each.
 *
 * Deterministic and pure so the server render, the editor preview and the PDF all agree. Heights are
 * estimated in CSS px at 96dpi against the real stylesheet (A4 = 1122.5px tall, 14mm/7mm padding):
 *   - a row costs 9.2px of padding plus 15.75px per wrapped line of the name, and 13.1px per detail line,
 *   - page 1 carries the masthead, title and party blocks; later pages carry a shorter header,
 *   - the totals, amount in words, payment, terms and signature blocks must all fit on the LAST page,
 *     so rows are pushed forward until they do.
 *
 * The snapshot test renders real fixtures and fails if any page overflows, so a constant that drifts
 * is caught rather than silently clipping a row off the bottom of an invoice.
 */
import { calcInvoiceTotals, getValidItems, type InvoiceItem, type InvoiceState } from "./invoice-model";
import type { InvoiceSettings } from "./invoice-settings";
import { cleanDetails } from "../quotation/item-text";

export const INVOICE_LAYOUT = {
  /** A4 height minus the page's top and bottom padding. */
  contentPx: 1043,
  /** Masthead + title + parties + table heading, on the first page. */
  headerFirstPx: 354,
  /** Masthead + "continued" line + table heading, on later pages. */
  headerContPx: 162,
  rowChromePx: 9.2,
  linePx: 15.75,
  detailLinePx: 13.1,
  detailGapPx: 2,
  /** One totals line; the grand-total line is taller. */
  sumRowPx: 20.5,
  sumTotalPx: 30,
  wordsPx: 26,
  /** Payment block, terms and the signature, which sit side by side. */
  closingPx: 202,
  footerPx: 31,
} as const;

/* Inter advance widths in em, calibrated against the rendered table so the estimate never falls short
   of what the browser actually wraps: a row estimated too short would print off the bottom of a page. */
const NARROW = "ijl'|!.,:;()[]-";
const WIDE = "mwMW@";
function textWidthEm(text: string): number {
  let w = 0;
  for (const ch of text) {
    if (NARROW.includes(ch)) w += 0.28;
    else if (WIDE.includes(ch)) w += 0.81;
    else if (ch === " ") w += 0.26;
    else if (ch >= "A" && ch <= "Z") w += 0.61;
    else if (ch >= "0" && ch <= "9") w += 0.53;
    else w += 0.50;
  }
  return w;
}

/** How many lines `text` takes in a column `widthPx` wide at `fontPx`, wrapping on spaces. */
export function wrappedLines(text: string, widthPx: number, fontPx: number): number {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const max = widthPx / fontPx;
  let lines = 1, used = 0;
  for (const word of words) {
    const w = textWidthEm(word);
    const gap = used === 0 ? 0 : textWidthEm(" ");
    if (used + gap + w <= max) { used += gap + w; continue; }
    // A word longer than the column wraps inside itself rather than overflowing.
    lines += Math.max(1, Math.ceil(w / max));
    used = w > max ? w % max : w;
  }
  return lines;
}

/** The width the description column gets, which depends on which optional columns are switched on. */
export function descriptionWidthPx(c: InvoiceSettings["columns"]): number {
  const tableWidth = 680; // 210mm page minus 15mm padding each side
  let others = 10 + 14 + 16; // qty, rate, amount are always shown
  if (c.srNo) others += 7;
  if (c.hsn) others += 12;
  if (c.unit) others += 10;
  if (c.lineDiscount) others += 9;
  if (c.lineGst) others += 9;
  const descPercent = Math.max(18, 100 - others);
  return (tableWidth * descPercent) / 100 - 12; // less the cell's padding on both sides
}

export function estimateRowHeight(item: InvoiceItem, settings: InvoiceSettings): number {
  const L = INVOICE_LAYOUT;
  const width = descriptionWidthPx(settings.columns);
  // A name that wraps gets one line of allowance. Character-width estimates are accurate enough to
  // place a single-line row exactly, but across several ragged line breaks the small errors compound
  // and the browser reliably needs one more line than the arithmetic suggests. Being a line generous
  // on a long row costs a little white space; being a line short prints it off the bottom of the page.
  const measured = Math.max(1, wrappedLines(item.description, width, 10.5));
  const nameLines = measured > 1 ? measured + 1 : 1;
  let height = L.rowChromePx + nameLines * L.linePx;
  if (settings.columns.details) {
    const details = cleanDetails(item.details);
    if (details) {
      const lines = details.split("\n").reduce((n, line) => n + Math.max(1, wrappedLines(line, width, 9)), 0);
      height += L.detailGapPx + lines * L.detailLinePx;
    }
  }
  return height;
}

/** How tall the totals block is, which depends on which lines it prints. */
export function summaryHeight(opts: {
  hasDiscount: boolean; gstEnabled: boolean; igst: boolean; roundOff: boolean; advance: boolean;
}): number {
  const L = INVOICE_LAYOUT;
  let rows = 1; // subtotal
  if (opts.hasDiscount) rows += 2; // discount and taxable value
  if (opts.gstEnabled) rows += opts.igst ? 1 : 2;
  if (opts.roundOff) rows += 1;
  if (opts.advance) rows += 2; // advance received and balance due
  return rows * L.sumRowPx + L.sumTotalPx;
}

export type InvoicePages = { pages: InvoiceItem[][]; starts: number[]; total: number };

/**
 * Splits the items across pages, keeping room on the last page for everything that follows the table.
 *
 * `closingHeight` is the totals, words, payment/terms/signature and footer taken together: pass it in
 * so the caller's switches decide it, rather than this module guessing twice.
 */
export function paginateInvoiceItems(items: unknown, settings: InvoiceSettings, closingHeight: number): InvoicePages {
  const L = INVOICE_LAYOUT;
  const valid = getValidItems(items);
  if (!valid.length) return { pages: [[]], starts: [0], total: 1 };

  const heights = valid.map((it) => estimateRowHeight(it, settings));
  const pages: InvoiceItem[][] = [];
  const starts: number[] = [];

  let page: InvoiceItem[] = [];
  let used = 0;
  let index = 0;
  starts.push(0);

  for (let i = 0; i < valid.length; i++) {
    const capacity = L.contentPx - (pages.length === 0 ? L.headerFirstPx : L.headerContPx);
    if (page.length && used + heights[i] > capacity) {
      pages.push(page);
      starts.push(i);
      page = [];
      used = 0;
      index = i;
    }
    page.push(valid[i]);
    used += heights[i];
  }
  pages.push(page);

  // The closing blocks live on the last page. If they do not fit beside the rows that landed there,
  // move rows forward one at a time until they do; an invoice whose closing blocks need a page of
  // their own gets one rather than printing a total that runs off the paper.
  for (let guard = 0; guard < valid.length + 2; guard++) {
    const last = pages.length - 1;
    const capacity = L.contentPx - (last === 0 ? L.headerFirstPx : L.headerContPx) - closingHeight;
    const usedOnLast = pages[last].reduce((sum, it, n) => sum + heights[starts[last] + n], 0);
    if (usedOnLast <= capacity) break;
    if (pages[last].length === 0) break;
    const moved = pages[last].pop() as InvoiceItem;
    pages.push([moved]);
    starts.push(starts[last] + pages[last].length);
    if (pages[last].length === 0) { pages.splice(last, 1); starts.splice(last, 1); }
  }

  return { pages, starts, total: pages.length };
}

/**
 * The page break for a whole invoice: the one place that decides how tall everything after the table
 * is. The document and the PDF's page-count check both call this, so they cannot disagree about how
 * many pages an invoice has.
 */
export function invoicePages(inv: InvoiceState, settings: InvoiceSettings): InvoicePages {
  const L = INVOICE_LAYOUT;
  const totals = calcInvoiceTotals(inv, settings);
  const closing =
    summaryHeight({
      hasDiscount: Boolean(inv.discountType) && totals.discount > 0,
      gstEnabled: inv.gstEnabled,
      igst: inv.gstMode === "IGST",
      roundOff: settings.blocks.roundOff && totals.roundOff !== 0,
      advance: settings.blocks.advanceBalance && totals.paid > 0,
    }) +
    (settings.blocks.amountWords ? L.wordsPx : 0) +
    L.closingPx + L.footerPx;
  return paginateInvoiceItems(inv.items, settings, closing);
}

export const invoicePageCount = (inv: InvoiceState, settings: InvoiceSettings): number => invoicePages(inv, settings).total;
