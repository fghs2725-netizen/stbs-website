/**
 * Invoices the snapshot test renders through the real template. No database, no real client data:
 * every company here is invented, exactly as the quotation fixtures are.
 *
 * Each fixture pins one thing worth protecting: the default switches, a long invoice that must
 * paginate, an inter-state supply on IGST, and an invoice with every optional column turned on.
 */
import { buildDraft, type InvoiceState } from "@/components/invoice/invoice-model";
import { DEFAULT_INVOICE_SETTINGS, type InvoiceSettings } from "@/components/invoice/invoice-settings";
import type { InvoiceBusiness } from "@/components/invoice/InvoiceDocument";

const S = DEFAULT_INVOICE_SETTINGS;

/** Clearly placeholder payment details: the owner supplies the real ones under Settings. */
export const FIXTURE_BUSINESS: InvoiceBusiness = {
  bank: {
    accountName: "Saini Tubewell Boring Service",
    accountNumber: "0000 0000 0000",
    ifsc: "XXXX0000000",
    bank: "Bank name, Branch",
    upi: "name@bank",
  },
};

const client = {
  companyName: "Sample Industrial Works Pvt. Ltd.",
  contactPerson: "Mr. Sample Contact",
  addressLine1: "Unit 4, Block C, Sample Logistics Park",
  addressLine2: "",
  city: "Kundli",
  state: "Haryana",
  pinCode: "131028",
  phone: "+91 98120 00000",
  email: "accounts@example.com",
  gstin: "06ABCDE1234F1Z5",
};

const base = (over: Partial<InvoiceState> = {}): InvoiceState => ({
  ...buildDraft(S, "2026-09-21"),
  number: 765,
  status: "ISSUED",
  client,
  quotationReference: "STBS/2026-27/0142",
  ...over,
});

const item = (id: string, description: string, unit: string, quantity: number, rate: number, hsn?: string, details?: string) =>
  ({ id, description, unit, quantity, rate, hsn, details });

const SIX = [
  item("i1", "Submersible pump set 5 HP", "Nos", 2, 48500, "8413", "Kirloskar Brothers Limited\nModel KDS-5, 3 phase, 415 V"),
  item("i2", "PVC casing pipe 200 mm", "Meter", 120, 640, "3917", "Supreme Industries, ISI marked, 6 m lengths"),
  item("i3", "Drilling of 8 inch borewell up to 300 ft", "Meter", 90, 1250, "995434"),
  item("i4", "Gravel packing", "Cu.m", 6, 3200, "2517", "Washed river gravel, graded 6 to 12 mm"),
  item("i5", "Development and flushing of borewell", "Job", 1, 15000, "995434"),
  item("i6", "Starter and control panel", "Set", 1, 21000, "8537", "L&T DOL starter with overload protection"),
];

export const INVOICE_FIXTURES: Record<string, { invoice: InvoiceState; settings: InvoiceSettings; business: InvoiceBusiness }> = {
  /** The everyday invoice, on the owner's default switches, with an advance already received. */
  standard: {
    invoice: base({
      items: SIX,
      discountType: "PERCENT",
      discountValue: 2,
      gstEnabled: true,
      gstMode: "CGST_SGST",
      gstRate: 18,
      shipTo: {
        sameAsBilling: false,
        companyName: "Plant 2, Bahalgarh",
        addressLine1: "Survey 118, Sample Village Road",
        city: "Sonipat",
        state: "Haryana",
        pinCode: "131021",
        phone: "+91 79880 00000",
      },
      payments: [{ id: "p1", date: "2026-09-10", amount: 100000, method: "NEFT" }],
    }),
    settings: S,
    business: FIXTURE_BUSINESS,
  },

  /** A supply outside Haryana: one IGST line instead of the CGST and SGST pair. */
  interstate: {
    invoice: base({
      number: 766,
      client: { ...client, city: "New Delhi", state: "Delhi", pinCode: "110001", gstin: "07AAAAA0000A1Z5" },
      items: SIX.slice(0, 3),
      gstEnabled: true,
      gstMode: "IGST",
      gstRate: 18,
    }),
    settings: S,
    business: FIXTURE_BUSINESS,
  },

  /** No GST and no HSN column: the two switches are independent, and this proves it prints. */
  "no-gst": {
    invoice: base({ number: 767, items: SIX.slice(0, 4), gstEnabled: false }),
    settings: { ...S, columns: { ...S.columns, hsn: false } },
    business: FIXTURE_BUSINESS,
  },

  /** Every optional column on, including per-line discount and per-line GST rates. */
  "all-columns": {
    invoice: base({
      number: 768,
      items: [
        { ...item("a1", "Submersible pump set 5 HP", "Nos", 2, 48500, "8413"), discountPercent: 5, gstRate: 18 },
        { ...item("a2", "Drilling of 8 inch borewell", "Meter", 90, 1250, "995434"), discountPercent: 0, gstRate: 18 },
        { ...item("a3", "Gravel packing", "Cu.m", 6, 3200, "2517"), discountPercent: 10, gstRate: 12 },
      ],
      gstEnabled: true,
      gstMode: "CGST_SGST",
      gstRate: 18,
    }),
    settings: { ...S, columns: { ...S.columns, lineDiscount: true, lineGst: true } },
    business: FIXTURE_BUSINESS,
  },

  /**
   * Segments changed for this invoice alone: two taken off, one put back. It guards the thing that
   * would otherwise fail silently — dropping a column widens the description and changes row heights,
   * and dropping a block changes the closing height, both of which the paginator reserves against.
   */
  segments: {
    invoice: base({
      number: 770,
      items: SIX.slice(0, 5),
      gstEnabled: true,
      gstMode: "CGST_SGST",
      gstRate: 18,
      settingsOverride: {
        columns: { hsn: false, unit: false },
        blocks: { bankDetails: false, declaration: true },
      },
    }),
    settings: S,
    business: FIXTURE_BUSINESS,
  },

  /** Long enough to paginate: the totals and the signature must land together on the last page. */
  "many-items": {
    invoice: base({
      number: 769,
      items: Array.from({ length: 26 }, (_, i) =>
        item(
          `m${i + 1}`,
          i % 3 === 0
            ? `Supply and installation of borewell accessory set ${i + 1}, including all fittings, clamps and consumables required at site`
            : `Borewell material item ${i + 1}`,
          i % 2 ? "Nos" : "Meter",
          (i % 7) + 1,
          1200 + i * 137,
          i % 2 ? "8413" : "995434",
          i % 4 === 0 ? "Brand name here\nModel and size on the second line" : undefined,
        ),
      ),
      gstEnabled: true,
      gstMode: "CGST_SGST",
      gstRate: 18,
    }),
    settings: S,
    business: FIXTURE_BUSINESS,
  },
};
