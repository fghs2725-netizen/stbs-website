/**
 * Invoice pagination: how many pages the items need, and which rows land on each.
 *
 * Deterministic and pure so the server render, the editor preview and the PDF all agree. Heights are
 * estimated in CSS px at 96dpi against the real stylesheet (A4 = 1122.5px tall, 14mm/7mm padding):
 *   - a row costs 7.2px of padding plus 15.75px per wrapped line of the name, and 11.5px per detail line,
 *   - page 1 carries the masthead, title and party blocks; later pages carry a shorter header,
 *   - the totals, amount in words, payment, terms and signature blocks must all fit on the LAST page,
 *     and move there together when they do not fit beneath its rows.
 *
 * The snapshot test renders real fixtures and fails if any page overflows, so a constant that drifts
 * is caught rather than silently clipping a row off the bottom of an invoice.
 */
import { calcInvoiceTotals, getValidItems, type InvoiceItem, type InvoiceState } from "./invoice-model";
import { columnWidthPercents, type InvoiceSettings } from "./invoice-settings";
import { cleanDetails } from "../quotation/item-text";

export const INVOICE_LAYOUT = {
  /** A4 height minus the page's top and bottom padding. */
  contentPx: 1043,
  /**
   * Masthead + title + parties + table heading, on the first page — everything above the first row.
   * Measured at 270px against the fixture with the tallest party block (a ship-to address beside the
   * bill-to); a one-line client costs about 257. The margin above the measured figure is deliberate,
   * because a client with a longer address makes this block taller: over-reserving moves a row to a
   * second page, under-reserving prints it off the bottom of this one.
   */
  headerFirstPx: 278,
  /** Masthead + "continued" line + table heading, on later pages. Measured at 150. */
  headerContPx: 155,
  rowChromePx: 7.2,
  linePx: 15.75,
  detailLinePx: 11.5,
  detailGapPx: 2,
  /** One totals line; the grand-total line is taller. */
  sumRowPx: 18.2,
  sumTotalPx: 22,
  wordsPx: 20,
  /** Payment block, terms and the signature, which sit side by side. Measured at 93. */
  closingPx: 96,
  /** The footer rule is 20 tall; the rest is the gap it keeps from whatever ends above it. */
  footerPx: 26,
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

/**
 * The width the description column gets, which depends on which optional columns are switched on.
 * Reads the same proportional split the table itself renders with — `columnWidthPercents` — so an
 * estimate here can never disagree with what the browser actually draws, which is what a row wraps
 * against.
 */
export function descriptionWidthPx(c: InvoiceSettings["columns"]): number {
  const tableWidth = 680; // 210mm page minus 15mm padding each side
  const descPercent = columnWidthPercents(c).desc;
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
  starts.push(0);

  /** What a page leaves for rows once its own header and the footer are taken out. */
  const rowCapacity = (isFirst: boolean) =>
    // The "Page N of M" footer sits on every page, not just the last, so the rows never get the
    // whole content box. Leaving it out here let a continuation page run past the bottom of the
    // paper, which only showed up once the page stopped being a fixed A4 box that hid the spill.
    L.contentPx - (isFirst ? L.headerFirstPx : L.headerContPx) - L.footerPx;

  for (let i = 0; i < valid.length; i++) {
    if (page.length && used + heights[i] > rowCapacity(pages.length === 0)) {
      pages.push(page);
      starts.push(i);
      page = [];
      used = 0;
    }
    page.push(valid[i]);
    used += heights[i];
  }
  pages.push(page);

  /*
   * The closing blocks live on the last page. They are moved as one: if they do not fit beneath the
   * rows that landed there, the whole block takes a page of its own. Walking rows forward instead —
   * which is what this did before — filled the next page with a single orphaned line and left the
   * page before it half empty, because a row is not what was too tall.
   */
  const last = pages.length - 1;
  const usedOnLast = pages[last].reduce((sum, _it, n) => sum + heights[starts[last] + n], 0);
  // `closingHeight` counts the footer itself, so the room it needs is measured against the whole
  // content box less that page's header — subtracting the footer again would charge for it twice.
  const roomBesideRows = L.contentPx - (last === 0 ? L.headerFirstPx : L.headerContPx);
  if (usedOnLast + closingHeight > roomBesideRows && pages[last].length) {
    pages.push([]);
    starts.push(valid.length);
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
