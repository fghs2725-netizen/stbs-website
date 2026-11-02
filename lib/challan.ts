/**
 * Delivery challans: goods sent to a site, with quantities and the date they left.
 *
 * A challan lives in the shared `Document` table (type DELIVERY_CHALLAN), its lines in `DocumentItem`,
 * and everything the table has no column for — transport, delivery address, the invoice it belongs
 * to — in one `DocumentSection` of type "challan". No migration was needed for any of it.
 *
 * Pure (no database, no browser), so `npm run test:challan` can check it on its own.
 */

export type ChallanStatus = "DRAFT" | "ISSUED" | "CANCELLED";

export const CHALLAN_PURPOSES = [
  "Material sent to site",
  "Supply of goods",
  "Return of material",
  "Job work",
  "Other",
] as const;

export type ChallanParty = {
  name: string;
  contactPerson: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  phone: string;
  gstin: string;
};

export type ChallanItem = {
  id: string;
  description: string;
  details: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
};

export type ChallanState = {
  id?: string;
  /** The issued number, e.g. STBS/DC/2026-27/0001. Empty until the challan is issued. */
  reference: string;
  status: ChallanStatus;
  date: string; // YYYY-MM-DD
  purpose: string;
  client: ChallanParty;
  /** Where the goods go when it is not the client's own address (a borewell site, usually). */
  deliverToSame: boolean;
  deliverTo: ChallanParty;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  transportMode: string;
  ewayBill: string;
  invoiceId?: string;
  invoiceRef: string;
  /** Set when the challan was started from a quotation rather than an invoice. */
  quotationId?: string;
  quotationRef: string;
  /** Off by default: most challans are a delivery note, and the value travels on the invoice. */
  showRates: boolean;
  remarks: string;
  items: ChallanItem[];
  cancelledReason?: string;
};

export const emptyParty = (): ChallanParty => ({
  name: "", contactPerson: "", addressLine1: "", addressLine2: "", city: "", state: "Haryana", pinCode: "", phone: "", gstin: "",
});

let seq = 0;
export const newItemId = () => `ci_${Date.now().toString(36)}_${(seq++).toString(36)}`;
export const emptyItem = (): ChallanItem => ({ id: newItemId(), description: "", details: "", hsn: "", quantity: 1, unit: "Nos", rate: 0 });

export function emptyChallan(today = new Date().toISOString().slice(0, 10)): ChallanState {
  return {
    reference: "", status: "DRAFT", date: today, purpose: CHALLAN_PURPOSES[0],
    client: emptyParty(), deliverToSame: true, deliverTo: emptyParty(),
    vehicleNumber: "", driverName: "", driverPhone: "", transportMode: "By road", ewayBill: "",
    invoiceRef: "", quotationRef: "", showRates: false, remarks: "", items: [emptyItem()],
  };
}

// ── numbering ────────────────────────────────────────────────────────────────

/** The year an Indian financial year starts in: April 2026 to March 2027 is 2026. */
export function financialYearStart(date: string): number {
  const d = new Date(`${date}T00:00:00`);
  const y = Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  const m = Number.isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  return m >= 3 ? y : y - 1;
}

export const challanSeriesPrefix = (fyStart: number) => `STBS/DC/${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}/`;

/** STBS/DC/2026-27/0001 — consecutive within a financial year, as GST asks of a challan series. */
export function formatChallanNumber(fyStart: number, n: number): string {
  return `${challanSeriesPrefix(fyStart)}${String(n).padStart(4, "0")}`;
}

/** The next number in a year, from the references already taken in it. Gaps are never refilled. */
export function nextChallanNumber(existing: string[], fyStart: number): number {
  const prefix = challanSeriesPrefix(fyStart);
  let max = 0;
  for (const ref of existing) {
    if (!ref.startsWith(prefix)) continue;
    const n = Number(ref.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max + 1;
}

/** A draft still needs a unique `reference` in the Document table; this one is never printed. */
export const draftReference = (token: string) => `DRAFT-DC-${token}`;
export const isDraftReference = (ref: string) => ref.startsWith("DRAFT-DC-");

// ── checks and figures ───────────────────────────────────────────────────────

export const validItems = (items: ChallanItem[]) => items.filter((i) => i.description.trim() && i.quantity > 0);
/** What a save keeps: any line with words on it, counted or not, so a preset line is never lost before it is counted. */
export const savedItems = (items: ChallanItem[]) => items.filter((i) => i.description.trim());

/** What still has to be filled in before a number can be taken, in plain words. */
export function whatIsMissing(c: ChallanState): string[] {
  const missing: string[] = [];
  if (!c.client.name.trim()) missing.push("the client's name");
  if (!c.date) missing.push("the date");
  if (!c.deliverToSame && !c.deliverTo.addressLine1.trim() && !c.deliverTo.city.trim()) missing.push("the delivery address");
  if (validItems(c.items).length === 0) missing.push("at least one item with a quantity");
  else if (savedItems(c.items).some((i) => !(i.quantity > 0))) missing.push("a quantity on every line (or remove the empty ones)");
  return missing;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export const lineValue = (i: ChallanItem) => round2(i.quantity * i.rate);

export function challanTotals(c: Pick<ChallanState, "items">) {
  const items = validItems(c.items);
  return { lines: items.length, value: round2(items.reduce((s, i) => s + lineValue(i), 0)) };
}

/** Quantities summed per unit, because 40 m of casing and 2 Nos of caps do not add up to 42 of anything. */
export function quantityByUnit(c: Pick<ChallanState, "items">): string {
  const sums = new Map<string, number>();
  for (const i of validItems(c.items)) {
    const unit = i.unit.trim() || "Nos";
    sums.set(unit, round2((sums.get(unit) ?? 0) + i.quantity));
  }
  return [...sums].map(([u, q]) => `${q} ${u}`).join(" · ");
}

// ── page breaks ──────────────────────────────────────────────────────────────

/*
 * Rows are counted in printed lines, not items: a long description wraps. The budgets are
 * deliberately cautious; `npm run test:challan-snapshot` renders the fixtures and fails if anything
 * sits below the page box, which is what would catch a budget set too high.
 */
export const PAGE_LINES = { first: 22, next: 36, footer: 11 } as const;

export function itemLines(i: ChallanItem, showRates: boolean): number {
  const width = showRates ? 52 : 70; // characters a description cell holds per line
  const desc = Math.max(1, Math.ceil(i.description.trim().length / width));
  const details = i.details.trim() ? i.details.trim().split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / (width * 1.25))), 0) * 0.8 : 0;
  return desc + details;
}

/** Items split into A4 pages; the last page also holds the totals, remarks and signatures. */
export function challanPages(c: Pick<ChallanState, "items" | "showRates">): ChallanItem[][] {
  const items = validItems(c.items);
  const pages: ChallanItem[][] = [[]];
  let budget: number = PAGE_LINES.first;
  for (const item of items) {
    const need = itemLines(item, c.showRates);
    if (need > budget && pages[pages.length - 1].length > 0) {
      pages.push([]);
      budget = PAGE_LINES.next;
    }
    pages[pages.length - 1].push(item);
    budget -= need;
  }
  // The footer needs its own room; if the last page cannot hold it, it gets a page of its own.
  if (budget < PAGE_LINES.footer) pages.push([]);
  return pages;
}

export const challanPageCount = (c: Pick<ChallanState, "items" | "showRates">) => challanPages(c).length;

// ── from an invoice ──────────────────────────────────────────────────────────

type InvoiceLike = {
  id?: string;
  number?: number | null;
  client: { companyName?: string; contactPerson?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; pinCode?: string; phone?: string; gstin?: string };
  shipTo?: { sameAsBilling?: boolean; companyName?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; pinCode?: string; phone?: string } | null;
  items: Array<{ description: string; details?: string; hsn?: string; hsnCode?: string; quantity: number; unit?: string; rate: number }>;
};

/** A draft challan carrying the invoice's client, site and lines. Quantities can be cut before issuing. */
export function challanFromInvoice(inv: InvoiceLike, invoiceRef: string, today?: string): ChallanState {
  const c = emptyChallan(today);
  const s = (v?: string | null) => (v ?? "").trim();
  c.client = {
    name: s(inv.client.companyName), contactPerson: s(inv.client.contactPerson), addressLine1: s(inv.client.addressLine1),
    addressLine2: s(inv.client.addressLine2), city: s(inv.client.city), state: s(inv.client.state) || "Haryana",
    pinCode: s(inv.client.pinCode), phone: s(inv.client.phone), gstin: s(inv.client.gstin),
  };
  const ship = inv.shipTo;
  if (ship && !ship.sameAsBilling && (s(ship.companyName) || s(ship.addressLine1))) {
    c.deliverToSame = false;
    c.deliverTo = {
      ...emptyParty(), name: s(ship.companyName), addressLine1: s(ship.addressLine1), addressLine2: s(ship.addressLine2),
      city: s(ship.city), state: s(ship.state) || "Haryana", pinCode: s(ship.pinCode), phone: s(ship.phone),
    };
  }
  c.invoiceId = inv.id;
  c.invoiceRef = invoiceRef;
  c.items = inv.items
    .filter((i) => i.description.trim() && i.quantity > 0)
    .map((i) => ({ id: newItemId(), description: i.description.trim(), details: s(i.details), hsn: s(i.hsn ?? i.hsnCode), quantity: i.quantity, unit: s(i.unit) || "Nos", rate: i.rate }));
  if (c.items.length === 0) c.items = [emptyItem()];
  return c;
}

export function addressLines(p: Pick<ChallanParty, "addressLine1" | "addressLine2" | "city" | "state" | "pinCode">): string[] {
  const place = [p.city, [p.state, p.pinCode].filter((x) => x.trim()).join(" ")].filter((x) => x.trim()).join(", ");
  return [p.addressLine1, p.addressLine2, place].map((x) => x.trim()).filter(Boolean);
}
