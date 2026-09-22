/**
 * Invoice logic tests: totals, rounding, the GST split, numbering and conversion from a quotation.
 *
 *   npm run test:invoice
 *
 * Everything here is pure, so no database or browser is involved.
 */
import assert from "node:assert/strict";
import {
  buildDraft, calcInvoiceTotals, canIssue, dueDateFor, emptyParty, fromQuotation, getValidItems,
  lineAmount, overdueBy, statusFromPayments, validateItem, whatIsMissing,
  type InvoiceItem, type InvoiceState,
} from "../components/invoice/invoice-model";
import { DEFAULT_INVOICE_SETTINGS, columnCount, effectiveInvoiceSettings, resolveSettings } from "../components/invoice/invoice-settings";
import { BUILT_IN_UNITS, mergeUnits } from "../lib/units";
import { CONTINUES_FROM, formatInvoiceNumber, nextNumber, parseInvoiceNumber } from "../lib/invoice-numbering";
import { canonicalState, inferGstMode, placeOfSupply, stateCode, stateFromGstin } from "../lib/india-gst";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`  ok  ${label}`); }

const S = DEFAULT_INVOICE_SETTINGS;
const item = (over: Partial<InvoiceItem> = {}): InvoiceItem =>
  ({ id: "a", description: "Drilling of 8 inch borewell", unit: "Meter", quantity: 10, rate: 1250, ...over });
const inv = (over: Partial<InvoiceState> = {}): InvoiceState =>
  ({ ...buildDraft(S, "2026-09-21"), items: [item()], ...over });

/* ---------- state codes and the GST split ---------- */

check("a GSTIN names its own state, whatever the address says", () => {
  assert.deepEqual(stateFromGstin("06AWTPS2732A1ZI"), { code: "06", name: "Haryana" });
  assert.deepEqual(stateFromGstin("27AAAAA0000A1Z5"), { code: "27", name: "Maharashtra" });
  assert.equal(stateFromGstin("not a gstin"), null);
  assert.equal(stateFromGstin(""), null);
});
check("state names are recognised however they are typed", () => {
  assert.equal(canonicalState("haryana"), "Haryana");
  assert.equal(canonicalState("  TAMILNADU "), "Tamil Nadu");
  assert.equal(canonicalState("New Delhi"), "Delhi");
  assert.equal(canonicalState("Orissa"), "Odisha");
  assert.equal(canonicalState("Atlantis"), null);
  assert.equal(stateCode("Haryana"), "06");
});
check("a supply inside Haryana is CGST+SGST; anywhere else is IGST", () => {
  assert.equal(inferGstMode("Haryana", "Haryana"), "CGST_SGST");
  assert.equal(inferGstMode("Haryana", "Sonipat, Haryana"), null, "a city plus state is not a state name");
  assert.equal(inferGstMode("Haryana", "Delhi"), "IGST");
  assert.equal(inferGstMode("Haryana", "Punjab"), "IGST");
});
check("the client's GSTIN beats a typed state, because it is the authoritative one", () => {
  assert.equal(inferGstMode("Haryana", "Haryana", "07AAAAA0000A1Z5"), "IGST");
  assert.equal(inferGstMode("Haryana", "Delhi", "06AWTPS2732A1ZI"), "CGST_SGST");
});
check("an unknown client state yields no guess at all", () => {
  assert.equal(inferGstMode("Haryana", ""), null);
  assert.equal(inferGstMode("Haryana", "somewhere"), null);
});
check("place of supply prints the state and its code, or nothing", () => {
  assert.equal(placeOfSupply("Haryana"), "Haryana (06)");
  assert.equal(placeOfSupply("", "07AAAAA0000A1Z5"), "Delhi (07)");
  assert.equal(placeOfSupply("nowhere"), "");
});

/* ---------- totals ---------- */

check("a plain invoice: subtotal, 18% split in half, rounded to the rupee", () => {
  const t = calcInvoiceTotals(inv({ items: [item({ quantity: 10, rate: 1250 })], gstEnabled: true, gstRate: 18, gstMode: "CGST_SGST" }), S);
  assert.equal(t.subtotal, 12500);
  assert.equal(t.taxable, 12500);
  assert.equal(t.cgst, 1125);
  assert.equal(t.sgst, 1125);
  assert.equal(t.tax, 2250);
  assert.equal(t.grandTotal, 14750);
});
check("IGST puts the whole tax on one line and leaves CGST and SGST at zero", () => {
  const t = calcInvoiceTotals(inv({ gstEnabled: true, gstMode: "IGST", gstRate: 18 }), S);
  assert.equal(t.igst, 2250);
  assert.equal(t.cgst, 0);
  assert.equal(t.sgst, 0);
});
check("CGST and SGST always add back to the tax, even when half a paisa is at stake", () => {
  const t = calcInvoiceTotals(inv({ items: [item({ quantity: 1, rate: 1000.05 })], gstEnabled: true, gstRate: 5, gstMode: "CGST_SGST" }), S);
  assert.equal(t.cgst + t.sgst, t.tax, "the split must not lose or invent a paisa");
});
check("a percentage discount comes off before tax", () => {
  const t = calcInvoiceTotals(inv({ discountType: "PERCENT", discountValue: 10, gstEnabled: true, gstRate: 18 }), S);
  assert.equal(t.discount, 1250);
  assert.equal(t.taxable, 11250);
  assert.equal(t.tax, 2025);
  assert.equal(t.grandTotal, 13275);
});
check("a flat discount can never exceed the subtotal or push the invoice negative", () => {
  const t = calcInvoiceTotals(inv({ discountType: "FLAT", discountValue: 99999 }), S);
  assert.equal(t.discount, 12500);
  assert.equal(t.taxable, 0);
  assert.equal(t.grandTotal, 0);
});
check("GST off means no tax at all, whatever the rate says", () => {
  const t = calcInvoiceTotals(inv({ gstEnabled: false, gstRate: 18 }), S);
  assert.equal(t.tax, 0);
  assert.equal(t.grandTotal, 12500);
});
check("round off is printed and the total really is the rounded figure", () => {
  const t = calcInvoiceTotals(inv({ items: [item({ quantity: 1, rate: 1000.40 })], gstEnabled: true, gstRate: 18 }), S);
  assert.equal(t.rawTotal, 1180.47);
  assert.equal(t.grandTotal, 1180);
  assert.equal(t.roundOff, -0.47);
  assert.equal(Math.round((t.taxable + t.tax + t.roundOff) * 100) / 100, t.grandTotal, "the printed lines must add up to the total");
});
check("with round off switched off the paise stay on the invoice", () => {
  const off = { ...S, blocks: { ...S.blocks, roundOff: false } };
  const t = calcInvoiceTotals(inv({ items: [item({ quantity: 1, rate: 1000.40 })], gstEnabled: true, gstRate: 18 }), off);
  assert.equal(t.grandTotal, 1180.47);
  assert.equal(t.roundOff, 0);
});
check("incomplete rows are excluded from every figure", () => {
  const t = calcInvoiceTotals(inv({ items: [item(), item({ id: "b", description: "", quantity: 5, rate: 100 })] }), S);
  assert.equal(t.subtotal, 12500);
  assert.equal(getValidItems([item(), item({ id: "b", unit: "" })]).length, 1);
});

/* ---------- optional columns ---------- */

check("a per-line discount only applies when its column is switched on", () => {
  const on = { ...S, columns: { ...S.columns, lineDiscount: true } };
  const it = item({ quantity: 10, rate: 1000, discountPercent: 10 });
  assert.equal(lineAmount(it, false), 10000);
  assert.equal(lineAmount(it, true), 9000);
  assert.equal(calcInvoiceTotals(inv({ items: [it], gstEnabled: false }), on).subtotal, 9000);
  assert.equal(calcInvoiceTotals(inv({ items: [it], gstEnabled: false }), S).subtotal, 10000);
});
check("per-line GST rates are summed, and the invoice-wide rate is ignored", () => {
  const on = { ...S, columns: { ...S.columns, lineGst: true } };
  const items = [item({ id: "a", quantity: 1, rate: 10000, gstRate: 18 }), item({ id: "b", quantity: 1, rate: 10000, gstRate: 12 })];
  const t = calcInvoiceTotals(inv({ items, gstEnabled: true, gstRate: 5, gstMode: "CGST_SGST" }), on);
  assert.equal(t.tax, 3000, "1800 + 1200");
  assert.equal(t.cgst, 1500);
});
check("an invoice-wide discount is shared across lines before per-line tax", () => {
  const on = { ...S, columns: { ...S.columns, lineGst: true } };
  const items = [item({ id: "a", quantity: 1, rate: 10000, gstRate: 18 }), item({ id: "b", quantity: 1, rate: 10000, gstRate: 18 })];
  const t = calcInvoiceTotals(inv({ items, gstEnabled: true, discountType: "PERCENT", discountValue: 50 }), on);
  assert.equal(t.taxable, 10000);
  assert.equal(t.tax, 1800, "tax follows what is actually charged, not the pre-discount value");
});
check("turning GST on does not require HSN, and HSN does not require GST", () => {
  // The owner asked for these to be independent: neither switch reads the other.
  const withHsn = { ...S, columns: { ...S.columns, hsn: true }, gstEnabled: false };
  const noHsn = { ...S, columns: { ...S.columns, hsn: false } };
  assert.equal(calcInvoiceTotals(inv({ gstEnabled: true }), noHsn).tax, 2250);
  assert.equal(calcInvoiceTotals(inv({ gstEnabled: false }), withHsn).tax, 0);
  assert.deepEqual(validateItem(item({ hsn: undefined })), {}, "a blank HSN is never an error");
});
check("the column count matches the switches, so a colspan cannot drift", () => {
  assert.equal(columnCount({ srNo: true, hsn: true, unit: true, details: true, lineDiscount: false, lineGst: false }), 7);
  assert.equal(columnCount({ srNo: false, hsn: false, unit: false, details: true, lineDiscount: false, lineGst: false }), 4);
  assert.equal(columnCount({ srNo: true, hsn: true, unit: true, details: true, lineDiscount: true, lineGst: true }), 9);
});

/* ---------- payments, dates and status ---------- */

check("the balance follows the payments, never a typed figure", () => {
  const t = calcInvoiceTotals(inv({ gstEnabled: false, payments: [{ id: "p1", date: "2026-09-21", amount: 5000 }] }), S);
  assert.equal(t.paid, 5000);
  assert.equal(t.balance, 7500);
});
check("several payments add up and a fully paid invoice has no balance left", () => {
  const t = calcInvoiceTotals(inv({ gstEnabled: false, payments: [
    { id: "p1", date: "2026-09-01", amount: 7500 }, { id: "p2", date: "2026-09-10", amount: 5000 },
  ] }), S);
  assert.equal(t.paid, 12500);
  assert.equal(t.balance, 0);
});
check("status follows the money, but draft and cancelled are left to the person", () => {
  const paidInFull = inv({ status: "ISSUED", gstEnabled: false, payments: [{ id: "p", date: "d", amount: 12500 }] });
  assert.equal(statusFromPayments(paidInFull, calcInvoiceTotals(paidInFull, S)), "PAID");
  const part = inv({ status: "ISSUED", gstEnabled: false, payments: [{ id: "p", date: "d", amount: 1 }] });
  assert.equal(statusFromPayments(part, calcInvoiceTotals(part, S)), "PARTLY_PAID");
  const draft = inv({ status: "DRAFT", gstEnabled: false, payments: [{ id: "p", date: "d", amount: 12500 }] });
  assert.equal(statusFromPayments(draft, calcInvoiceTotals(draft, S)), "DRAFT");
  const cancelled = inv({ status: "CANCELLED" });
  assert.equal(statusFromPayments(cancelled, calcInvoiceTotals(cancelled, S)), "CANCELLED");
});
check("the due date is the credit period after the invoice date", () => {
  assert.equal(dueDateFor("2026-09-21", 14), "2026-10-05");
  assert.equal(dueDateFor("2026-02-20", 14), "2026-03-06", "it must cross a month end");
  assert.equal(dueDateFor("not a date", 14), "");
});
check("only an issued, unpaid invoice is ever counted overdue", () => {
  const on = new Date("2026-10-20T00:00:00Z");
  assert.equal(overdueBy({ dueDate: "2026-10-05", status: "ISSUED" }, on), 15);
  assert.equal(overdueBy({ dueDate: "2026-10-25", status: "ISSUED" }, on), 0);
  assert.equal(overdueBy({ dueDate: "2026-10-05", status: "PAID" }, on), 0);
  assert.equal(overdueBy({ dueDate: "2026-10-05", status: "DRAFT" }, on), 0);
});

/* ---------- validation ---------- */

check("an HSN code must be 4, 6 or 8 digits when one is given", () => {
  assert.equal(validateItem(item({ hsn: "8413" })).hsn, undefined);
  assert.equal(validateItem(item({ hsn: "995434" })).hsn, undefined);
  assert.equal(validateItem(item({ hsn: "84139100" })).hsn, undefined);
  assert.ok(validateItem(item({ hsn: "841" })).hsn);
  assert.ok(validateItem(item({ hsn: "84a3" })).hsn);
});
check("an invoice cannot be issued without a client, a date and a complete item", () => {
  assert.deepEqual(whatIsMissing(inv({ items: [] }), S).includes("at least one complete item"), true);
  const ready = inv({ client: { ...emptyParty(), companyName: "Sample Works", state: "Haryana" } });
  assert.deepEqual(whatIsMissing(ready, S), []);
  assert.equal(canIssue(ready, S), true);
});
check("with GST on, the place of supply needs a state or a GSTIN", () => {
  const noState = inv({ client: { ...emptyParty(), companyName: "Sample Works" }, gstEnabled: true });
  assert.ok(whatIsMissing(noState, S).some((m) => m.includes("place of supply")));
  const byGstin = inv({ client: { ...emptyParty(), companyName: "Sample Works", gstin: "06AWTPS2732A1ZI" }, gstEnabled: true });
  assert.deepEqual(whatIsMissing(byGstin, S), []);
});

/* ---------- numbering ---------- */

check("the series continues from the owner's book at 765 and never restarts", () => {
  assert.equal(nextNumber(CONTINUES_FROM), 765);
  assert.equal(nextNumber(0), 765, "an empty counter still starts after the existing book");
  assert.equal(nextNumber(undefined), 765);
  assert.equal(nextNumber(900), 901);
  assert.equal(formatInvoiceNumber(765), "765", "printed bare, with no prefix or padding");
});
check("a printed number reads back, and nothing else does", () => {
  assert.equal(parseInvoiceNumber("765"), 765);
  assert.equal(parseInvoiceNumber(" 900 "), 900);
  assert.equal(parseInvoiceNumber("STBS/INV/765"), null);
  assert.equal(parseInvoiceNumber("0"), null);
  assert.equal(parseInvoiceNumber(""), null);
});

/* ---------- settings ---------- */

check("a stored settings row merges over the defaults and survives nonsense", () => {
  assert.deepEqual(resolveSettings(null), DEFAULT_INVOICE_SETTINGS);
  assert.equal(resolveSettings({ gstRate: 999 }).gstRate, 100, "an out-of-range rate is clamped, not trusted");
  assert.equal(resolveSettings({ gstRate: "12" }).gstRate, 12);
  assert.equal(resolveSettings({ columns: { hsn: false } }).columns.hsn, false);
  assert.equal(resolveSettings({ columns: { hsn: false } }).columns.unit, true, "the other switches keep their defaults");
  assert.equal(resolveSettings({ blocks: { terms: "yes" } }).blocks.terms, true, "a bad type falls back");
});
check("a segment removed for one invoice does not touch the rest", () => {
  const base = DEFAULT_INVOICE_SETTINGS;

  assert.deepEqual(effectiveInvoiceSettings(base, {}), base, "an empty override changes nothing");
  assert.deepEqual(effectiveInvoiceSettings(base, undefined), base, "so does no override at all");

  const noHsn = effectiveInvoiceSettings(base, { columns: { hsn: false } });
  assert.equal(noHsn.columns.hsn, false, "the override wins over the default");
  assert.equal(noHsn.columns.unit, base.columns.unit, "its siblings are left alone");
  assert.equal(noHsn.blocks.terms, base.blocks.terms, "and so is every block");

  // Turning something ON for one invoice matters as much as turning it off: the declaration is off
  // by default, and an invoice that needs it must be able to ask for it.
  const withDeclaration = effectiveInvoiceSettings(base, { blocks: { declaration: true } });
  assert.equal(withDeclaration.blocks.declaration, true, "an override can add a segment back");

  assert.equal(
    effectiveInvoiceSettings(base, { blocks: { nonsense: true } } as never).blocks.terms,
    base.blocks.terms,
    "a key that is not a block cannot disturb one that is",
  );
});

check("the unit list offers the owner's own without repeating the built-ins", () => {
  assert.ok(BUILT_IN_UNITS.includes("Rft"), "the units already in use are still on offer");
  assert.deepEqual(mergeUnits([]), [...BUILT_IN_UNITS], "nothing custom leaves the list as it was");
  assert.deepEqual(
    mergeUnits(["Rmt"]).slice(-1), ["Rmt"],
    "a custom unit joins the end of the list",
  );
  assert.deepEqual(mergeUnits(["rft", "RFT"]), [...BUILT_IN_UNITS], "a built-in is not listed twice, whatever the case");
  assert.deepEqual(mergeUnits(["Rmt", "rmt", " Rmt "]).filter((u) => u.toLowerCase() === "rmt").length, 1, "nor is a custom one");
});

check("the owner's answers are the defaults", () => {
  assert.equal(S.columns.srNo, true);
  assert.equal(S.blocks.declaration, false);
  assert.equal(S.columns.lineGst, false);
  assert.equal(S.gstEnabled, true);
  assert.equal(S.gstRate, 18);
  assert.equal(S.creditDays, 14);
  assert.equal(S.lockIssued, false);
  assert.equal(S.auditIssuedEdits, true, "editing stays open, but every edit is logged");
});

/* ---------- conversion from a quotation ---------- */

const quotation = {
  id: "q1",
  quotationReference: "STBS/2026-27/0142",
  subject: "Price Offer for Borewell Material Supply",
  client: { companyName: "Sample Industrial Works Pvt. Ltd.", state: "Haryana", gstin: "06ABCDE1234F1Z5", city: "Kundli" },
  items: [
    { id: "i1", description: "Submersible pump set 5 HP", details: "Kirloskar\nModel KDS-5", unit: "Nos", quantity: 2, rate: 48500 },
    { id: "i2", description: "PVC casing pipe 200 mm", unit: "Meter", quantity: 120, rate: 640 },
  ],
  discountType: "PERCENT" as const,
  discountValue: 2,
  gstEnabled: true,
  gstMode: "CGST_SGST" as const,
  gstRate: 18,
};

check("converting copies the client, the items, the discount and the GST", () => {
  const i = fromQuotation(quotation, S, "2026-09-21", "Haryana");
  assert.equal(i.client.companyName, "Sample Industrial Works Pvt. Ltd.");
  assert.equal(i.items.length, 2);
  assert.equal(i.items[0].details, "Kirloskar\nModel KDS-5");
  assert.equal(i.discountType, "PERCENT");
  assert.equal(i.discountValue, 2);
  assert.equal(i.gstRate, 18);
  assert.equal(i.status, "DRAFT", "a converted invoice starts as a draft");
  assert.equal(i.number, undefined, "no number is taken until it is issued");
  assert.equal(i.quotationReference, "STBS/2026-27/0142");
  assert.equal(i.dueDate, "2026-10-05");
});
check("conversion re-decides the GST split from the client's state", () => {
  const delhi = { ...quotation, client: { ...quotation.client, gstin: "07AAAAA0000A1Z5" } };
  assert.equal(fromQuotation(delhi, S, "2026-09-21", "Haryana").gstMode, "IGST");
  assert.equal(fromQuotation(quotation, S, "2026-09-21", "Haryana").gstMode, "CGST_SGST");
});
check("the copy is independent: editing the invoice cannot reach back into the quotation", () => {
  const i = fromQuotation(quotation, S, "2026-09-21", "Haryana");
  i.items[0].rate = 1;
  i.items[0].description = "changed";
  i.client.companyName = "changed";
  assert.equal(quotation.items[0].rate, 48500);
  assert.equal(quotation.items[0].description, "Submersible pump set 5 HP");
  assert.equal(quotation.client.companyName, "Sample Industrial Works Pvt. Ltd.");
});
check("a converted invoice totals the same as the quotation it came from", () => {
  const i = fromQuotation(quotation, S, "2026-09-21", "Haryana");
  const t = calcInvoiceTotals(i, S);
  assert.equal(t.subtotal, 173800);
  assert.equal(t.discount, 3476);
  assert.equal(t.taxable, 170324);
  assert.equal(t.cgst + t.sgst, 30658.32);
  assert.equal(t.grandTotal, 200982, "rounded to the rupee");
});
check("a fresh invoice starts empty but carries the settings", () => {
  const d = buildDraft(S, "2026-09-21");
  assert.equal(d.items.length, 0);
  assert.equal(d.gstEnabled, true);
  assert.equal(d.gstRate, 18);
  assert.equal(d.status, "DRAFT");
  assert.equal(d.dueDate, "2026-10-05");
});

console.log(`\n${passed} checks passed`);
