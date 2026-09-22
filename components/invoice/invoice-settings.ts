/**
 * Every optional part of the invoice, as one switch list.
 *
 * The owner asked for all of it to be optional in settings, and specifically that turning GST on must
 * NOT force the HSN column: the two are independent here, and nothing in the totals reads `columns.hsn`.
 *
 * Defaults are the owner's answers to the invoice questionnaire (2026-09-21). A stored settings row is
 * merged over these, so adding a switch later never breaks an existing row.
 *
 * Pure (no database, no browser) so the editor, the preview and the PDF cannot disagree about what shows.
 */

export type InvoiceColumns = {
  /** Serial number column. The owner turned this on; the sample design led with QTY instead. */
  srNo: boolean;
  hsn: boolean;
  unit: boolean;
  /** Brand, model and size under the item name — the same wording the quotation prints. */
  details: boolean;
  /** Off: one discount on the subtotal, as the quotation does. */
  lineDiscount: boolean;
  /** Off: one GST rate for the whole invoice, switchable when rates vary by item. */
  lineGst: boolean;
};

export type InvoiceBlocks = {
  shipTo: boolean;
  placeOfSupply: boolean;
  reverseCharge: boolean;
  dueDate: boolean;
  /** "Original for recipient". */
  originalMarker: boolean;
  quotationRef: boolean;
  amountWords: boolean;
  advanceBalance: boolean;
  roundOff: boolean;
  bankDetails: boolean;
  upiQr: boolean;
  signature: boolean;
  terms: boolean;
  declaration: boolean;
  /** A PAID or OVERDUE stamp across the page. */
  statusStamp: boolean;
};

export type InvoiceSettings = {
  columns: InvoiceColumns;
  blocks: InvoiceBlocks;
  /** GST on by default; the split is chosen from the client's state unless `gstModeAuto` is off. */
  gstEnabled: boolean;
  gstRate: number;
  gstModeAuto: boolean;
  /** Days from the invoice date to the due date. */
  creditDays: number;
  /** The printed signature, when the owner has uploaded one. */
  signatureName: string;
  /** Editing an issued invoice stays allowed, but every change is recorded. */
  lockIssued: boolean;
  auditIssuedEdits: boolean;
};

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  columns: { srNo: true, hsn: true, unit: true, details: true, lineDiscount: false, lineGst: false },
  blocks: {
    shipTo: true, placeOfSupply: true, reverseCharge: true, dueDate: true, originalMarker: true,
    quotationRef: true, amountWords: true, advanceBalance: true, roundOff: true, bankDetails: true,
    upiQr: true, signature: true, terms: true, statusStamp: false,
    // Off, as the owner asked for: the terms already cover it, and it cost the closing block a
    // sixth of the page. The switch stays for a CA who wants it back.
    declaration: false,
  },
  gstEnabled: true,
  gstRate: 18,
  gstModeAuto: true,
  creditDays: 14,
  signatureName: "Rajesh Saini — Managing Director",
  lockIssued: false,
  auditIssuedEdits: true,
};

const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const num = (v: unknown, fallback: number, lo: number, hi: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(Math.max(n, lo), hi) : fallback;
};

/**
 * Merges a stored settings row over the defaults. Anything missing, of the wrong type or out of range
 * falls back, so a hand-edited row can never make the invoice fail to render.
 */
export function resolveSettings(stored: unknown): InvoiceSettings {
  const s = (stored ?? {}) as Partial<InvoiceSettings>;
  const c = (s.columns ?? {}) as Partial<InvoiceColumns>;
  const b = (s.blocks ?? {}) as Partial<InvoiceBlocks>;
  const D = DEFAULT_INVOICE_SETTINGS;
  return {
    columns: {
      srNo: bool(c.srNo, D.columns.srNo), hsn: bool(c.hsn, D.columns.hsn), unit: bool(c.unit, D.columns.unit),
      details: bool(c.details, D.columns.details), lineDiscount: bool(c.lineDiscount, D.columns.lineDiscount),
      lineGst: bool(c.lineGst, D.columns.lineGst),
    },
    blocks: (Object.keys(D.blocks) as Array<keyof InvoiceBlocks>).reduce((acc, k) => {
      acc[k] = bool(b[k], D.blocks[k]);
      return acc;
    }, {} as InvoiceBlocks),
    gstEnabled: bool(s.gstEnabled, D.gstEnabled),
    gstRate: num(s.gstRate, D.gstRate, 0, 100),
    gstModeAuto: bool(s.gstModeAuto, D.gstModeAuto),
    creditDays: Math.round(num(s.creditDays, D.creditDays, 0, 365)),
    signatureName: typeof s.signatureName === "string" ? s.signatureName : D.signatureName,
    lockIssued: bool(s.lockIssued, D.lockIssued),
    auditIssuedEdits: bool(s.auditIssuedEdits, D.auditIssuedEdits),
  };
}

/** How many columns the item table prints, so a colspan is never hand-counted in two places. */
export function columnCount(c: InvoiceColumns): number {
  // Description, rate and amount always print; the rest are switchable. QTY always prints.
  return 3 + 1 + [c.srNo, c.hsn, c.unit, c.lineDiscount, c.lineGst].filter(Boolean).length;
}
