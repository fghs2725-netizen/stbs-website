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
  /** Print the name on the GST registration (`businessInfo.gstName`) instead of the usual one. */
  gstName: boolean;
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
    invoiceRef: "", quotationRef: "", showRates: false, gstName: false, remarks: "", items: [emptyItem()],
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
 * Page breaks are settled before anything is drawn, so the screen, the PDF and the PDF route's page
 * count agree. Every block is estimated in millimetres from what it actually holds, using the sizes
 * in invoice.css and challan.css as measured from a render: a short header and no remarks leave
 * room for more rows than a challan with a site address, a driver and a long note.
 *
 * Wrapping is worked out word by word from the font's real character widths, rounded towards more
 * lines, and each page keeps a few millimetres spare. `npm run test:challan-snapshot` renders the
 * fixtures and fails if anything sits below the page box, which is what would catch an estimate set
 * too low. A change to the sizes in either stylesheet needs the matching number changed here.
 */
export const PAGE_MM = {
  /** Lowest point rows and signatures may reach: the footer rule (297 − 7 − 5.3), less a margin. */
  bottom: 284.7 - 4,
  /** Masthead with the "Delivery Challan" title. */
  firstTop: 41.5,
  /** Masthead, "continued from" line and table head on later pages. */
  nextTop: 53.6,
  /** Table margin and head row. */
  tableHead: 8.7,
  row: 6.05, wrap: 4.2, details: 3.6, detailsWrap: 3.05,
  /** The last row on every page has deeper padding and a rule under it. */
  lastRow: 1.4,
  /** Total-quantity line. */
  sum: 7.2,
  /** Receiver's and signatory's blocks with the space above them. */
  signatures: 31,
} as const;

const PX_PER_MM = 96 / 25.4;

/*
 * Inter's advance widths for ASCII 32–126 in hundredths of an em, the wider of regular and bold, so
 * a line is never counted shorter than it prints. Anything else (Hindi, ₹) counts as 0.6 em, which
 * is more than Devanagari takes per character.
 */
const INTER = [28,31,40,64,65,84,66,22,39,39,54,67,30,47,29,38,67,48,62,65,67,63,65,59,65,65,29,29,67,67,67,54,100,72,66,74,72,61,59,75,74,27,56,68,57,91,75,77,64,78,65,65,66,74,72,101,69,70,65,39,38,39,48,47,50,57,63,58,63,59,38,63,61,26,26,57,26,90,61,61,62,62,40,55,38,61,58,84,56,58,56,39,36,39,67];
const emWidth = (s: string) => {
  let w = 0;
  for (let k = 0; k < s.length; k++) {
    const c = s.charCodeAt(k);
    w += (c >= 32 && c < 127 ? INTER[c - 32] : 60) / 100;
  }
  return w;
};

/** Printed lines for `text` in a column `mm` wide at `fontPx`: wraps at spaces, breaks a word too long for a line. */
export function wrappedLines(text: string, mm: number, fontPx: number): number {
  const width = (mm * PX_PER_MM) / fontPx; // the column, in em
  const space = INTER[0] / 100;
  return text.split("\n").reduce((n, line) => {
    let lines = 1;
    let used = 0;
    for (const word of line.trim().split(/\s+/)) {
      const w = emWidth(word);
      if (used > 0 && used + space + w <= width) { used += space + w; continue; }
      if (used > 0) lines += 1;
      used = w;
      while (used > width) { lines += 1; used -= width; }
    }
    return n + lines;
  }, 0);
}

/** Width of the description cell; the column percentages are the ones ChallanDocument sets. */
function descriptionMm(c: Pick<ChallanState, "items" | "showRates">): number {
  const hsn = c.items.some((i) => i.hsn.trim());
  const fixed = 6 + 10 + 9 + (hsn ? 12 : 0) + (c.showRates ? 26 : 0);
  return (180 * (100 - fixed)) / 100 - 3.2;
}

function itemMm(i: ChallanItem, descMm: number): number {
  const desc = wrappedLines(i.description.trim(), descMm, 10.5);
  const details = i.details.trim() ? wrappedLines(i.details.trim(), descMm, 8.5) : 0;
  return PAGE_MM.row + (desc - 1) * PAGE_MM.wrap + (details ? PAGE_MM.details + (details - 1) * PAGE_MM.detailsWrap : 0);
}

function partyMm(name: string, lines: string[], gstin: boolean, widthMm: number): number {
  const nameLines = wrappedLines(name, widthMm, 13);
  const textLines = lines.reduce((n, l) => n + wrappedLines(l, widthMm, 10), 0);
  return 4.2 + 5.3 + (nameLines - 1) * 4.2 + textLines * 3.6 + (gstin ? 5 : 0);
}

/** Where the first row starts: masthead, consignee and site, the facts beside them, transport. */
function firstRowMm(c: ChallanState): number {
  const site = !c.deliverToSame;
  const width = site ? 47.5 : 104;
  const client = partyMm(c.client.name || "—", [c.client.contactPerson && `Attn: ${c.client.contactPerson}`, ...addressLines(c.client), c.client.phone].filter(Boolean), !!c.client.gstin, width);
  const delivery = site ? partyMm(c.deliverTo.name || c.client.name, [...addressLines(c.deliverTo), c.deliverTo.phone && `Site contact: ${c.deliverTo.phone}`].filter(Boolean), false, width) : 0;
  const facts = [c.reference || c.status === "DRAFT", true, c.invoiceRef, c.quotationRef].filter(Boolean).length * 5;

  // Transport entries sit in a row 180 mm wide, 9 mm apart, and wrap onto a second row when full.
  const transport = [
    ["Mode", c.transportMode], ["Vehicle no.", c.vehicleNumber.toUpperCase()], ["Driver", c.driverName], ["Driver phone", c.driverPhone && `+91 ${c.driverPhone} `], ["E-way bill", c.ewayBill],
  ].filter(([, v]) => v.trim()).map(([k, v]) => ((emWidth(`${k}${v}`) + 1) * 10) / PX_PER_MM + 2.5);
  let rows = transport.length ? 1 : 0;
  let used = 0;
  for (const w of transport) {
    if (used > 0 && used + 9 + w > 180) { rows += 1; used = 0; }
    used += (used > 0 ? 9 : 0) + w;
  }

  return PAGE_MM.firstTop + 2.5 + Math.max(client, delivery, facts) + (rows ? 13.5 + (rows - 1) * 6 : 0) + PAGE_MM.tableHead;
}

/** Totals, remarks, a cancellation note and the two signatures, below the last row. */
function closingMm(c: ChallanState): number {
  const remarks = c.remarks.trim() ? 8.6 + wrappedLines(c.remarks.trim(), 120, 9.5) * 3.55 : 0;
  const cancelled = c.status === "CANCELLED" && c.cancelledReason ? 3 + wrappedLines(`Cancelled: ${c.cancelledReason}`, 180, 9.5) * 3.8 : 0;
  return PAGE_MM.sum + remarks + cancelled + PAGE_MM.signatures;
}

/** Items split into A4 pages; the last page also holds the totals, remarks and signatures. */
export function challanPages(c: ChallanState): ChallanItem[][] {
  const items = validItems(c.items);
  const descMm = descriptionMm(c);
  const pages: ChallanItem[][] = [[]];
  let y = firstRowMm(c);
  for (const item of items) {
    const need = itemMm(item, descMm);
    if (y + need + PAGE_MM.lastRow > PAGE_MM.bottom && pages[pages.length - 1].length > 0) {
      pages.push([]);
      y = PAGE_MM.nextTop;
    }
    pages[pages.length - 1].push(item);
    y += need;
  }
  // The signatures need their own room; if the last page cannot hold them, they get a page of their own.
  if (y + PAGE_MM.lastRow + closingMm(c) > PAGE_MM.bottom) pages.push([]);
  return pages;
}

export const challanPageCount = (c: ChallanState) => challanPages(c).length;

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
