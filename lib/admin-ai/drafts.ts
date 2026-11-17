/**
 * Drafts made by the AI: a quotation from pasted requirements, and an invoice from a purchase order.
 *
 * The model only reads and fills a JSON form. Everything it returns is checked here before it is
 * saved: units come from the admin's own list, quantities and rates must be numbers, HSN codes must
 * look like HSN codes, a known client is filled from the saved client record, and GST is set from
 * the client's state. The result is always a DRAFT that the owner opens, checks and issues himself.
 *
 * The `normalise*` functions and prompts are pure, so they are tested without a database or an AI.
 */
import { canonicalState, inferGstMode, stateFromGstin } from "@/lib/india-gst";
import { cleanDetails } from "@/components/quotation/item-text";
import type { ClientDetails, QuotationItem } from "@/components/quotation/quotation-model";
import type { InvoiceItem, InvoiceParty } from "@/components/invoice/invoice-model";

/** A refusal with a message meant for the owner, and the HTTP status to send it with. */
export class DraftError extends Error {
  constructor(message: string, readonly status = 422) {
    super(message);
  }
}

/** The PDF's text, pages joined. Empty for a scanned PDF, which carries pictures rather than text. */
export async function pdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  try {
    const doc = await getDocumentProxy(bytes);
    const { text } = await extractText(doc, { mergePages: true });
    return text;
  } catch {
    throw new DraftError("That file could not be opened as a PDF.", 400);
  }
}

export type SavedClient = ClientDetails & { id: string };
export type RateLine = { item: string; unit: string; rate: number };

const SELLER_STATE = "Haryana";
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const s = (v: unknown, max = 200) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : typeof v === "number" ? String(v) : "");
const num = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v === "string") return Number(v.replace(/[₹,\s]/g, "").replace(/\/-$/, ""));
  return NaN;
};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const key = (name: string) => name.toLowerCase().replace(/\b(m\/s|messrs|pvt|private|ltd|limited|the)\b/g, "").replace(/[^a-z0-9]/g, "");
let seq = 0;
const newId = () => `ai-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** The admin's unit spelled the admin's way, or the fallback when the model's unit is not one of them. */
export function pickUnit(raw: unknown, units: string[], fallback = "No."): string {
  const want = s(raw, 20).toLowerCase().replace(/\.$/, "");
  if (!want) return fallback;
  const aliases: Record<string, string> = { nos: "no", no: "no", number: "no", numbers: "no", pcs: "no", pc: "no", piece: "no", pieces: "no", each: "no", ea: "no", m: "mtr", meter: "mtr", metre: "mtr", meters: "mtr", metres: "mtr", ft: "rft", feet: "rft", foot: "rft", "running feet": "rft", rmt: "mtr", "lump sum": "ls", lumpsum: "ls", lot: "ls", hr: "hour", hrs: "hour", hours: "hour", days: "day", kgs: "kg", l: "litre", ltr: "litre", liter: "litre", sets: "set", job: "job" };
  const target = aliases[want] ?? want;
  return units.find((u) => u.toLowerCase().replace(/\.$/, "") === target) ?? fallback;
}

/** A saved client that is clearly the one named: same GSTIN, else the same company name. */
export function matchClient(clients: SavedClient[], name: string, gstin = ""): SavedClient | undefined {
  const g = gstin.trim().toUpperCase();
  if (g) {
    const byGst = clients.find((c) => c.gstin.trim().toUpperCase() === g);
    if (byGst) return byGst;
  }
  const k = key(name);
  return k.length >= 3 ? clients.find((c) => key(c.companyName) === k) : undefined;
}

/* ───────────────────────────── quotation ───────────────────────────── */

export function quotationPrompt(ctx: { serviceOptions: string[]; units: string[]; rates: RateLine[] }): string {
  return [
    "You turn a customer's requirement, pasted by the owner of STBS (Saini Tubewell Boring Service, Haryana: borewell, tubewell, rainwater harvesting, material supply), into a quotation draft.",
    "Reply with ONE JSON object and nothing else, in this shape:",
    '{"client":{"companyName":"","contactPerson":"","city":"","state":""},"serviceType":"","customServiceType":"","subject":"","items":[{"description":"","details":"","unit":"","quantity":1,"rate":0}],"notes":[""]}',
    `serviceType must be one of: ${ctx.serviceOptions.map((o) => JSON.stringify(o)).join(", ")}. Use "Custom" with customServiceType only if none fits.`,
    `unit must be one of: ${ctx.units.join(", ")}.`,
    "Items: one line per thing asked for, in the customer's order. description is a short standalone item name in professional quotation English (no numbering). details holds the specification (size, depth, diameter, make, HP, material), at most 3 short lines separated by \\n, or empty.",
    "Keep the customer's quantities. If a quantity is missing use 1 with a fitting unit (LS or Job) and add a note.",
    "rate is the price per unit in rupees before GST. Take it from the owner's past rates below only when it is clearly the same item and size; otherwise put 0 and add the note \"Rate needed: <item>\". Never make up a rate.",
    "subject: a short line like \"Price Offer for Borewell Construction\", or empty.",
    "Leave client fields empty when the text does not say them. notes: short things the owner must check, or [].",
    "",
    "Owner's past rates (item | unit | rate):",
    ...(ctx.rates.length ? ctx.rates.map((r) => `${r.item} | ${r.unit} | ${r.rate}`) : ["(none yet)"]),
  ].join("\n");
}

export type QuotationDraft = {
  client: ClientDetails;
  clientId?: string;
  serviceType: string;
  customServiceType: string;
  subject: string;
  items: QuotationItem[];
  notes: string[];
};

export function normaliseQuotation(json: Record<string, unknown>, ctx: { serviceOptions: string[]; units: string[]; clients: SavedClient[] }): QuotationDraft {
  const c = (json.client ?? {}) as Record<string, unknown>;
  const notes = list(json.notes).map((n) => s(n, 160)).filter(Boolean);
  const items: QuotationItem[] = [];
  for (const raw of list(json.items)) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const description = s(r.description, 160);
    if (!description) continue;
    let quantity = num(r.quantity);
    if (!(quantity > 0)) { quantity = 1; notes.push(`Check quantity: ${description}`); }
    let rate = num(r.rate);
    if (!(rate >= 0)) rate = 0;
    const details = cleanDetails(typeof r.details === "string" ? r.details.replace(/\\n/g, "\n") : "");
    items.push({ id: newId(), description, ...(details ? { details } : {}), unit: pickUnit(r.unit, ctx.units), quantity: round2(quantity), rate: round2(rate) });
  }
  const missingRates = items.filter((i) => i.rate === 0).map((i) => i.description);
  for (const d of missingRates) if (!notes.some((n) => n.includes(d))) notes.push(`Rate needed: ${d}`);

  const name = s(c.companyName, 120) || s(c.contactPerson, 80);
  const saved = name ? matchClient(ctx.clients, name) : undefined;
  const client: ClientDetails = saved
    ? { gstin: saved.gstin, companyName: saved.companyName, contactPerson: saved.contactPerson, addressLine1: saved.addressLine1, addressLine2: saved.addressLine2, city: saved.city, state: saved.state, pinCode: saved.pinCode, phone: saved.phone, email: saved.email }
    : { gstin: "", companyName: name, contactPerson: s(c.contactPerson, 80), addressLine1: "", addressLine2: "", city: s(c.city, 60), state: canonicalState(c.state) ?? s(c.state, 40), pinCode: "", phone: "", email: "" };
  if (!client.companyName) notes.push("Add the client's name.");

  const service = s(json.serviceType, 60);
  const serviceType = ctx.serviceOptions.includes(service) ? service : "Custom";
  return {
    client, clientId: saved?.id, serviceType,
    customServiceType: serviceType === "Custom" ? s(json.customServiceType, 60) || (service !== "Custom" ? service : "") : "",
    subject: s(json.subject, 140),
    items,
    notes: [...new Set(notes)].slice(0, 12),
  };
}

/* ───────────────────────────── invoice from a PO ───────────────────────────── */

export function poPrompt(ctx: { units: string[] }): string {
  return [
    "You read the text of a purchase order (PO) sent to STBS / Saini Tubewell (or Tyubvel) Boring Service, the SUPPLIER, and fill an invoice form.",
    "The buyer is the company that issued the PO, never STBS / Saini Tubewell Boring Service.",
    "Reply with ONE JSON object and nothing else, in this shape:",
    '{"poNumber":"","poDate":"YYYY-MM-DD","buyer":{"companyName":"","gstin":"","contactPerson":"","addressLine1":"","addressLine2":"","city":"","state":"","pinCode":""},"shipTo":null,"items":[{"description":"","details":"","hsn":"","unit":"","quantity":1,"rate":0,"gstRate":18}],"notes":[""]}',
    "buyer is the billing address. shipTo uses the same fields as buyer when the PO gives a different delivery or site address, else null.",
    `unit must be one of: ${ctx.units.join(", ")}.`,
    "items: every line of the PO in order. description is the item name; details holds make, size or specification in at most 3 short lines (\\n between), or empty.",
    "rate is the basic price per unit before GST, as printed on the PO. quantity as printed. gstRate is the line's GST percent if the PO shows it (18 when it shows 9% CGST + 9% SGST), else null.",
    "hsn: the HSN or SAC code printed for the line, digits only, else empty. Never make one up.",
    "Copy names, numbers and addresses exactly. Use empty strings for anything not in the PO. notes: short things the owner must check (unreadable values, terms like advance or retention), or [].",
  ].join("\n");
}

export type InvoiceDraft = {
  client: InvoiceParty;
  shipTo?: Partial<InvoiceParty> & { sameAsBilling?: boolean };
  purchaseOrder: string;
  items: InvoiceItem[];
  gstEnabled: boolean;
  gstRate: number;
  gstMode: "CGST_SGST" | "IGST";
  perLineGst: boolean;
  notes: string[];
};

function party(raw: unknown): InvoiceParty {
  const p = (raw ?? {}) as Record<string, unknown>;
  const gstin = s(p.gstin, 15).toUpperCase().replace(/\s/g, "");
  return {
    companyName: s(p.companyName, 120), contactPerson: s(p.contactPerson, 80),
    addressLine1: s(p.addressLine1, 160), addressLine2: s(p.addressLine2, 160),
    city: s(p.city, 60), state: canonicalState(p.state) ?? stateFromGstin(gstin)?.name ?? s(p.state, 40),
    pinCode: (s(p.pinCode, 10).match(/\d{6}/) ?? [""])[0], phone: "", email: "",
    gstin: /^[0-9]{2}[A-Z0-9]{13}$/.test(gstin) ? gstin : "",
  };
}

const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split("-").reverse().join("/") : "");

export function normaliseInvoice(json: Record<string, unknown>, ctx: { units: string[]; clients: SavedClient[]; defaultGstRate: number; gstOnByDefault: boolean }): InvoiceDraft {
  const notes = list(json.notes).map((n) => s(n, 160)).filter(Boolean);
  const fromPo = party(json.buyer);
  const saved = fromPo.companyName || fromPo.gstin ? matchClient(ctx.clients, fromPo.companyName, fromPo.gstin) : undefined;
  // A saved client keeps the phone and email the PO text never carries; the PO's GSTIN wins if the record lacks one.
  const client: InvoiceParty = saved
    ? { companyName: saved.companyName, contactPerson: saved.contactPerson || fromPo.contactPerson, addressLine1: saved.addressLine1, addressLine2: saved.addressLine2, city: saved.city, state: saved.state, pinCode: saved.pinCode, phone: saved.phone, email: saved.email, gstin: saved.gstin || fromPo.gstin }
    : fromPo;
  if (!client.companyName) notes.push("Add the buyer's name.");
  if (!client.state) notes.push("Add the buyer's state, so GST is split correctly.");

  const ship = json.shipTo && typeof json.shipTo === "object" ? party(json.shipTo) : null;
  const shipDiffers = ship && (ship.addressLine1 || ship.city) && key(`${ship.addressLine1}${ship.city}`) !== key(`${client.addressLine1}${client.city}`);

  const items: InvoiceItem[] = [];
  for (const raw of list(json.items)) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const description = s(r.description, 160);
    if (!description) continue;
    const quantity = num(r.quantity);
    const rate = num(r.rate);
    const hsn = s(r.hsn, 12).replace(/\D/g, "");
    const gst = num(r.gstRate);
    const details = cleanDetails(typeof r.details === "string" ? r.details.replace(/\\n/g, "\n") : "");
    if (!(quantity > 0)) notes.push(`Check quantity: ${description}`);
    if (!(rate > 0)) notes.push(`Check rate: ${description}`);
    items.push({
      id: newId(), description, ...(details ? { details } : {}),
      ...(/^[0-9]{4}([0-9]{2}([0-9]{2})?)?$/.test(hsn) ? { hsn } : {}),
      unit: pickUnit(r.unit, ctx.units), quantity: quantity > 0 ? round2(quantity) : 1, rate: rate >= 0 ? round2(rate) : 0,
      ...([0, 0.25, 3, 5, 12, 18, 28, 40].includes(gst) ? { gstRate: gst } : {}),
    });
  }
  if (!items.length) notes.push("No item lines were found in the PO.");

  // GST: on when the PO shows rates (or when the owner bills with GST by default); one rate for the bill
  // when every line agrees, the per-line GST column when they differ.
  const rates = items.map((i) => i.gstRate).filter((r): r is number => r !== undefined);
  const distinct = [...new Set(rates)];
  const counts = new Map(rates.map((r) => [r, rates.filter((x) => x === r).length]));
  const common = distinct.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0];
  const perLineGst = distinct.length > 1;
  if (perLineGst) for (const i of items) if (i.gstRate === undefined) i.gstRate = common;
  const gstMode = inferGstMode(SELLER_STATE, client.state, client.gstin);
  if (!gstMode && rates.length) notes.push("Check CGST/SGST or IGST: the buyer's state was not clear.");

  const poNumber = s(json.poNumber, 60);
  const poDate = dmy(s(json.poDate, 10));
  if (!poNumber) notes.push("PO number not found.");

  return {
    client,
    shipTo: shipDiffers && ship ? { ...ship, sameAsBilling: false } : { sameAsBilling: true },
    purchaseOrder: poNumber ? `${poNumber}${poDate ? ` dated ${poDate}` : ""}` : "",
    items,
    gstEnabled: rates.length ? common! > 0 || perLineGst : ctx.gstOnByDefault,
    gstRate: common ?? ctx.defaultGstRate,
    gstMode: gstMode ?? "CGST_SGST",
    perLineGst,
    notes: [...new Set(notes)].slice(0, 12),
  };
}
