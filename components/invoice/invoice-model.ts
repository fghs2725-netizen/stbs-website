/**
 * The invoice: its shape, its validation and the one place its arithmetic lives.
 *
 * Shares the quotation's primitives (item amount, rupee formatting, Indian rounding) rather than
 * restating them, so a rounding change can never apply to one document and not the other.
 *
 * Pure (no database, no browser). Every figure the editor shows, the preview draws and the PDF prints
 * comes from `calcInvoiceTotals`, so the three cannot disagree.
 */
import { calcAmount, formatINR, type DiscountType } from "../quotation/quotation-model";
import { cleanDetails } from "../quotation/item-text";
import { inferGstMode, type GstMode } from "@/lib/india-gst";
import { columnCount, resolveSettings, type InvoiceSettings } from "./invoice-settings";

export { formatINR, columnCount, resolveSettings };
export type { DiscountType, GstMode, InvoiceSettings };

/**
 * `description` is the item name and `details` prints under it, exactly as on a quotation.
 * `hsn` is independent of GST: the owner may charge GST with no HSN column, or print HSN without GST.
 * `discountPercent` and `gstRate` are read only when their column is switched on.
 */
export type InvoiceItem = {
  id: string;
  description: string;
  details?: string;
  hsn?: string;
  unit: string;
  quantity: number;
  rate: number;
  discountPercent?: number;
  gstRate?: number;
};

export type InvoiceParty = {
  companyName: string;
  contactPerson: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  phone: string;
  email: string;
  gstin: string;
};

/** One receipt against the invoice. The balance is always derived from these, never typed. */
export type InvoicePayment = { id: string; date: string; amount: number; method?: string; note?: string };

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTLY_PAID" | "PAID" | "CANCELLED";

export type InvoiceState = {
  id?: string;
  /**
   * The running number, taken only when the invoice is issued so an abandoned draft leaves no gap.
   * Held as a number, matching both the counter and the column; `formatInvoiceNumber` prints it.
   */
  number?: number;
  date: string;
  dueDate?: string;
  status: InvoiceStatus;
  client: InvoiceParty;
  /** Printed only when it differs from the billing address. */
  shipTo?: Partial<InvoiceParty> & { sameAsBilling?: boolean };
  items: InvoiceItem[];
  discountType?: DiscountType | null;
  discountValue?: number;
  gstEnabled: boolean;
  gstMode: GstMode;
  gstRate: number;
  reverseCharge?: boolean;
  /** The quotation this was converted from, when there was one. */
  quotationId?: string;
  quotationReference?: string;
  purchaseOrder?: string;
  subject?: string;
  payments?: InvoicePayment[];
  notes?: string;
  templateId?: string;
};

export const emptyParty = (): InvoiceParty => ({
  companyName: "", contactPerson: "", addressLine1: "", addressLine2: "",
  city: "", state: "", pinCode: "", phone: "", email: "", gstin: "",
});

/* ────────────────────────── numbers ────────────────────────── */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(Number.isFinite(n) ? n : 0, lo), hi);
const toNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
};
const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function isItemValid(item: InvoiceItem): boolean {
  const q = toNumber(item.quantity), r = toNumber(item.rate);
  return trimmed(item.description) !== "" && trimmed(item.unit) !== "" &&
    Number.isFinite(q) && q > 0 && Number.isFinite(r) && r >= 0;
}

export function getValidItems(items: unknown): InvoiceItem[] {
  return Array.isArray(items) ? (items as InvoiceItem[]).filter(isItemValid) : [];
}

/** What one line is worth after its own discount, when the per-line discount column is on. */
export function lineAmount(item: InvoiceItem, perLineDiscount: boolean): number {
  const gross = calcAmount(toNumber(item.quantity), toNumber(item.rate));
  if (!perLineDiscount) return gross;
  return round2(gross * (1 - clamp(item.discountPercent ?? 0, 0, 100) / 100));
}

export type InvoiceTotals = {
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  /** The total before rounding to the nearest rupee. */
  rawTotal: number;
  roundOff: number;
  grandTotal: number;
  paid: number;
  balance: number;
};

/**
 * The whole arithmetic of an invoice, in order: lines, one discount on the subtotal, tax, rounding,
 * then whatever has already been received.
 *
 * With the per-line GST column on, each line is taxed at its own rate and the invoice-wide rate is
 * ignored; the CGST/SGST split still applies to the summed tax, because the split is a property of
 * where the supply went, not of the rate.
 */
export function calcInvoiceTotals(
  inv: Pick<InvoiceState, "items" | "discountType" | "discountValue" | "gstEnabled" | "gstMode" | "gstRate" | "payments">,
  settings: Pick<InvoiceSettings, "columns" | "blocks">,
): InvoiceTotals {
  const perLineDiscount = settings.columns.lineDiscount;
  const items = getValidItems(inv.items);

  const subtotal = items.reduce((sum, it) => round2(sum + lineAmount(it, perLineDiscount)), 0);

  let discount = 0;
  if (inv.discountType === "PERCENT") discount = round2(subtotal * clamp(inv.discountValue ?? 0, 0, 100) / 100);
  else if (inv.discountType === "FLAT") discount = round2(clamp(inv.discountValue ?? 0, 0, subtotal));
  const taxable = round2(subtotal - discount);

  let cgst = 0, sgst = 0, igst = 0, tax = 0;
  if (inv.gstEnabled) {
    if (settings.columns.lineGst) {
      // Each line carries its own rate. The invoice-wide discount is spread across lines in proportion
      // to their value, so a discounted invoice is taxed on what is actually charged.
      const factor = subtotal > 0 ? taxable / subtotal : 0;
      tax = round2(items.reduce((sum, it) => {
        const base = lineAmount(it, perLineDiscount) * factor;
        return sum + base * clamp(it.gstRate ?? inv.gstRate, 0, 100) / 100;
      }, 0));
    } else {
      tax = round2(taxable * clamp(inv.gstRate, 0, 100) / 100);
    }
    if (inv.gstMode === "IGST") igst = tax;
    else { cgst = round2(tax / 2); sgst = round2(tax - cgst); }
  }

  const rawTotal = round2(taxable + tax);
  // Indian invoices settle to whole rupees; the difference is printed so the figures still add up.
  const grandTotal = settings.blocks.roundOff ? Math.round(rawTotal) : rawTotal;
  const roundOff = round2(grandTotal - rawTotal);

  const paid = round2((inv.payments ?? []).reduce((s, p) => s + clamp(toNumber(p.amount), 0, Number.MAX_SAFE_INTEGER), 0));
  return { subtotal, discount, taxable, cgst, sgst, igst, tax, rawTotal, roundOff, grandTotal, paid, balance: round2(grandTotal - paid) };
}

/* ────────────────────────── validation ────────────────────────── */

export type ItemErrors = { description?: string; unit?: string; quantity?: string; rate?: string; details?: string; hsn?: string };

export function validateItem(item: InvoiceItem): ItemErrors {
  const errors: ItemErrors = {};
  const q = toNumber(item.quantity), r = toNumber(item.rate);
  if (!trimmed(item.description)) errors.description = "Item name is required";
  if (!trimmed(item.unit)) errors.unit = "Unit is required";
  if (!Number.isFinite(q) || q <= 0) errors.quantity = "Quantity must be greater than 0";
  if (!Number.isFinite(r) || r < 0) errors.rate = "Rate must be 0 or greater";
  const hsn = trimmed(item.hsn);
  // An HSN code is 4, 6 or 8 digits; a SAC is 6. Blank is fine — the column is optional.
  if (hsn && !/^[0-9]{4}([0-9]{2}([0-9]{2})?)?$/.test(hsn)) errors.hsn = "HSN or SAC must be 4, 6 or 8 digits";
  return errors;
}

/** What still stops this invoice from being issued, in words the owner can act on. */
export function whatIsMissing(inv: InvoiceState, settings: InvoiceSettings): string[] {
  const missing: string[] = [];
  if (!trimmed(inv.client.companyName)) missing.push("the client's name");
  if (!trimmed(inv.date)) missing.push("the invoice date");
  if (getValidItems(inv.items).length === 0) missing.push("at least one complete item");
  if (inv.gstEnabled && settings.blocks.placeOfSupply && !trimmed(inv.client.state) && !trimmed(inv.client.gstin)) {
    missing.push("the client's state, which sets the place of supply");
  }
  const bad = inv.items.filter((it) => Object.keys(validateItem(it)).length > 0 && isItemValid(it) === false);
  if (bad.length && getValidItems(inv.items).length > 0) missing.push(`${bad.length} incomplete ${bad.length === 1 ? "row" : "rows"}`);
  return missing;
}

export const canIssue = (inv: InvoiceState, settings: InvoiceSettings) => whatIsMissing(inv, settings).length === 0;

/* ────────────────────────── dates and derived fields ────────────────────────── */

/** The due date, `creditDays` after the invoice date. Returns "" for an unparseable date. */
export function dueDateFor(date: string, creditDays: number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + Math.max(0, Math.round(creditDays)));
  return d.toISOString().slice(0, 10);
}

/** Whether the invoice is past its due date on the given day, and by how many days. */
export function overdueBy(inv: Pick<InvoiceState, "dueDate" | "status">, today = new Date()): number {
  if (!inv.dueDate || inv.status === "PAID" || inv.status === "CANCELLED" || inv.status === "DRAFT") return 0;
  const due = new Date(inv.dueDate);
  if (Number.isNaN(due.getTime())) return 0;
  const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return days > 0 ? days : 0;
}

/** The status the payments imply. Cancelled and draft are states a person sets, so they are left alone. */
export function statusFromPayments(inv: InvoiceState, totals: InvoiceTotals): InvoiceStatus {
  if (inv.status === "DRAFT" || inv.status === "CANCELLED") return inv.status;
  if (totals.paid <= 0) return "ISSUED";
  return totals.balance <= 0 ? "PAID" : "PARTLY_PAID";
}

/* ────────────────────────── conversion from a quotation ────────────────────────── */

/** The shape `fromQuotation` needs: whatever the quotation editor and the database both already hold. */
type QuotationLike = {
  id?: string;
  quotationReference?: string;
  subject?: string;
  client: Partial<InvoiceParty>;
  items: Array<{ id: string; description: string; details?: string; unit: string; quantity: number; rate: number }>;
  discountType?: DiscountType | null;
  discountValue?: number;
  gstEnabled?: boolean;
  gstMode?: GstMode;
  gstRate?: number;
};

/**
 * Copies a quotation into a fresh draft invoice: client, items, discount and GST.
 *
 * The copy is complete and independent — nothing here points back at the quotation's rows, so editing
 * the invoice never changes the quotation and later edits to the quotation never reach the invoice.
 * Only the reference is kept, so each document can show the other.
 */
export function fromQuotation(q: QuotationLike, settings: InvoiceSettings, today: string, sellerState: string): InvoiceState {
  const client: InvoiceParty = { ...emptyParty(), ...q.client } as InvoiceParty;
  const gstEnabled = q.gstEnabled ?? settings.gstEnabled;
  const auto = settings.gstModeAuto ? inferGstMode(sellerState, client.state, client.gstin) : null;
  return {
    date: today,
    dueDate: dueDateFor(today, settings.creditDays),
    status: "DRAFT",
    client,
    shipTo: { sameAsBilling: true },
    items: q.items.map((it) => ({
      id: it.id,
      description: it.description,
      details: cleanDetails(it.details) || undefined,
      unit: it.unit,
      quantity: it.quantity,
      rate: it.rate,
    })),
    discountType: q.discountType ?? null,
    discountValue: q.discountValue ?? 0,
    gstEnabled,
    gstMode: auto ?? q.gstMode ?? "CGST_SGST",
    gstRate: q.gstRate ?? settings.gstRate,
    reverseCharge: false,
    quotationId: q.id,
    quotationReference: q.quotationReference,
    subject: q.subject,
    payments: [],
  };
}

/** A fresh invoice with no quotation behind it. */
export function buildDraft(settings: InvoiceSettings, today: string, overrides: Partial<InvoiceState> = {}): InvoiceState {
  return {
    date: today,
    dueDate: dueDateFor(today, settings.creditDays),
    status: "DRAFT",
    client: emptyParty(),
    shipTo: { sameAsBilling: true },
    items: [],
    discountType: null,
    discountValue: 0,
    gstEnabled: settings.gstEnabled,
    gstMode: "CGST_SGST",
    gstRate: settings.gstRate,
    reverseCharge: false,
    payments: [],
    ...overrides,
  };
}
