/**
 * Everything that reads or writes an invoice.
 *
 * Two rules shape this file:
 *
 *  - A number is allocated ONLY when an invoice is issued, inside the same transaction that marks it
 *    issued, by incrementing a counter row. A draft never holds a number, so abandoning one cannot
 *    leave a gap in a GST series that has to run unbroken.
 *  - The owner chose to keep editing an issued invoice open, so every change to one is recorded in
 *    InvoiceEdit. An edit that cannot be explained later is the thing that causes trouble, not the edit.
 *
 * Item wording reuses the quotation's encoding: the name is the first line of `description` and the
 * details follow after a line break, so one column holds both and the two features cannot drift apart.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/quotation-management";
import { decodeItemText, encodeItemText } from "@/components/quotation/item-text";
import { CONTINUES_FROM, nextNumber } from "@/lib/invoice-numbering";
import { inferGstMode } from "@/lib/india-gst";
import {
  calcInvoiceTotals, canIssue, dueDateFor, emptyParty, fromQuotation, getValidItems, whatIsMissing,
  type InvoiceItem, type InvoiceState, type InvoiceStatus,
} from "@/components/invoice/invoice-model";
import {
  DEFAULT_INVOICE_SETTINGS, effectiveInvoiceSettings, resolveSettings,
  type InvoiceBlocks, type InvoiceColumns, type InvoiceSettings, type InvoiceSettingsOverride,
} from "@/components/invoice/invoice-settings";
import type { InvoiceBusiness } from "@/components/invoice/InvoiceDocument";
import { resolveInvoiceTemplate, storableTemplateId } from "@/lib/invoice-templates";
import { BUILT_IN_UNITS } from "@/lib/units";
import { usableAssetUrl } from "@/lib/asset-reachable";

/**
 * Each round trip to the hosted database takes about a second, and these transactions make several,
 * so the driver's default 5s interactive budget expires mid-way and rolls the whole thing back. A
 * rehearsal of issue-and-pay took 9.3s, so the budget is set well clear of it.
 */
const TX = { timeout: 25000, maxWait: 10000 } as const;

const SELLER_STATE = "Haryana";
const SETTINGS_ID = "singleton";
const COUNTER_ID = "invoice";
// A credit note carries its own consecutive series, separate from the invoice one.
const CREDIT_COUNTER_ID = "creditnote";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/* ────────────────────────── settings ────────────────────────── */

export type InvoiceConfig = { settings: InvoiceSettings; business: InvoiceBusiness };

/** The switch settings and the owner's business values. Falls back to the defaults before anything is saved. */
export async function getInvoiceConfig(): Promise<InvoiceConfig> {
  const row = await prisma.invoiceSetting.findUnique({ where: { id: SETTINGS_ID } });
  // A URL that no longer resolves is dropped here rather than drawn as an empty frame. It has to be
  // settled on the server: the PDF renderer captures the page as it loads, so nothing the browser
  // would do about a broken image afterwards ever reaches the file a client receives.
  const [signatureUrl, stampUrl, upiQrUrl] = await Promise.all([
    usableAssetUrl(row?.signatureUrl),
    usableAssetUrl(row?.stampUrl),
    usableAssetUrl(row?.upiQrUrl),
  ]);
  return {
    settings: resolveSettings(row?.settings),
    business: {
      bank: (row?.bankDetails as InvoiceBusiness["bank"]) ?? undefined,
      signatureUrl,
      stampUrl,
      upiQrUrl,
    },
  };
}

export async function saveInvoiceConfig(config: Partial<InvoiceConfig>) {
  await requireAdmin();
  const settings = config.settings ? resolveSettings(config.settings) : undefined;
  const b = config.business;
  const data = {
    ...(settings ? { settings: settings as object } : {}),
    ...(b?.bank !== undefined ? { bankDetails: (b.bank ?? {}) as object } : {}),
    ...(b?.signatureUrl !== undefined ? { signatureUrl: b.signatureUrl || null } : {}),
    ...(b?.stampUrl !== undefined ? { stampUrl: b.stampUrl || null } : {}),
    ...(b?.upiQrUrl !== undefined ? { upiQrUrl: b.upiQrUrl || null } : {}),
  };
  await prisma.invoiceSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, settings: (settings ?? DEFAULT_INVOICE_SETTINGS) as object, ...data },
    update: data,
  });
  return getInvoiceConfig();
}

/* ────────────────────────── row ⇄ state ────────────────────────── */

type Row = Record<string, unknown> & { items?: unknown[]; payments?: unknown[] };

function toState(x: Row): InvoiceState {
  const r = x as never as {
    id: string; number: number | null; date: string; dueDate: string | null; status: InvoiceStatus;
    subject: string | null; purchaseOrder: string | null; reverseCharge: boolean; isCash?: boolean; clientId: string | null;
    clientCompanyName: string; clientContactPerson: string | null; clientAddressLine1: string | null;
    clientAddressLine2: string | null; clientCity: string | null; clientState: string | null;
    clientPinCode: string | null; clientPhone: string | null; clientEmail: string | null; clientGstin: string | null;
    shipToSameAsBilling: boolean; shipToName: string | null; shipToAddressLine1: string | null;
    shipToAddressLine2: string | null; shipToCity: string | null; shipToState: string | null;
    shipToPinCode: string | null; shipToPhone: string | null;
    discountType: string | null; discountValue: unknown; gstEnabled: boolean; gstMode: string; gstRate: unknown;
    quotationId: string | null; quotationReference: string | null; templateId: string | null;
    settingsOverride?: unknown;
    deletedAt?: Date | null;
    sentToCaAt?: Date | null;
    items?: Array<{ id: string; description: string; unit: string; quantity: unknown; rate: unknown; hsn: string | null; discountPercent: unknown; gstRate: unknown }>;
    payments?: Array<{ id: string; date: string; amount: unknown; method: string | null; note: string | null }>;
  };
  return {
    id: r.id,
    number: r.number ?? undefined,
    date: r.date,
    dueDate: r.dueDate ?? undefined,
    status: r.status,
    subject: r.subject ?? undefined,
    purchaseOrder: r.purchaseOrder ?? undefined,
    reverseCharge: Boolean(r.reverseCharge),
    isCash: Boolean(r.isCash),
    client: {
      ...emptyParty(),
      companyName: r.clientCompanyName,
      contactPerson: r.clientContactPerson ?? "",
      addressLine1: r.clientAddressLine1 ?? "",
      addressLine2: r.clientAddressLine2 ?? "",
      city: r.clientCity ?? "",
      state: r.clientState ?? "",
      pinCode: r.clientPinCode ?? "",
      phone: r.clientPhone ?? "",
      email: r.clientEmail ?? "",
      gstin: r.clientGstin ?? "",
    },
    shipTo: {
      sameAsBilling: Boolean(r.shipToSameAsBilling),
      companyName: r.shipToName ?? "",
      addressLine1: r.shipToAddressLine1 ?? "",
      addressLine2: r.shipToAddressLine2 ?? "",
      city: r.shipToCity ?? "",
      state: r.shipToState ?? "",
      pinCode: r.shipToPinCode ?? "",
      phone: r.shipToPhone ?? "",
    },
    items: (r.items ?? []).map((i) => ({
      id: i.id,
      ...decodeItemText(i.description),
      unit: i.unit,
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      hsn: i.hsn ?? undefined,
      discountPercent: i.discountPercent === null || i.discountPercent === undefined ? undefined : Number(i.discountPercent),
      gstRate: i.gstRate === null || i.gstRate === undefined ? undefined : Number(i.gstRate),
    })) as InvoiceItem[],
    discountType: (r.discountType as InvoiceState["discountType"]) ?? null,
    discountValue: Number(r.discountValue ?? 0),
    gstEnabled: Boolean(r.gstEnabled),
    gstMode: (r.gstMode as InvoiceState["gstMode"]) ?? "CGST_SGST",
    gstRate: Number(r.gstRate ?? 18),
    quotationId: r.quotationId ?? undefined,
    quotationReference: r.quotationReference ?? undefined,
    templateId: r.templateId ?? undefined,
    settingsOverride: sanitizeOverride(r.settingsOverride),
    ...(r.deletedAt ? { deletedAt: r.deletedAt.toISOString() } : {}),
    ...(r.sentToCaAt ? { sentToCaAt: r.sentToCaAt.toISOString() } : {}),
    payments: (r.payments ?? []).map((p) => ({
      id: p.id, date: p.date, amount: Number(p.amount),
      method: p.method ?? undefined, note: p.note ?? undefined,
    })),
  };
}

/**
 * Keeps only the switches this invoice actually overrides, as booleans. A hand-edited row, or a key
 * that no longer exists, must never be able to stop an invoice rendering — and an override that has
 * been emptied is stored as nothing at all, so the invoice goes back to following the settings.
 */
function sanitizeOverride(raw: unknown): InvoiceSettingsOverride | undefined {
  const o = (raw ?? {}) as InvoiceSettingsOverride;
  const pick = <T extends object>(src: unknown, keys: Array<keyof T>) => {
    const from = (src ?? {}) as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const k of keys) if (typeof from[k as string] === "boolean") out[k as string] = from[k as string] as boolean;
    return out;
  };
  const D = DEFAULT_INVOICE_SETTINGS;
  const columns = pick<InvoiceColumns>(o.columns, Object.keys(D.columns) as Array<keyof InvoiceColumns>);
  const blocks = pick<InvoiceBlocks>(o.blocks, Object.keys(D.blocks) as Array<keyof InvoiceBlocks>);
  const result: InvoiceSettingsOverride = {};
  if (Object.keys(columns).length) result.columns = columns as Partial<InvoiceColumns>;
  if (Object.keys(blocks).length) result.blocks = blocks as Partial<InvoiceBlocks>;
  return result.columns || result.blocks ? result : undefined;
}

function toInput(inv: InvoiceState) {
  const ship = inv.shipTo ?? {};
  return {
    date: inv.date,
    dueDate: inv.dueDate || null,
    subject: inv.subject || null,
    purchaseOrder: inv.purchaseOrder || null,
    reverseCharge: Boolean(inv.reverseCharge),
    isCash: Boolean(inv.isCash),
    clientCompanyName: inv.client.companyName,
    clientContactPerson: inv.client.contactPerson || null,
    clientAddressLine1: inv.client.addressLine1 || null,
    clientAddressLine2: inv.client.addressLine2 || null,
    clientCity: inv.client.city || null,
    clientState: inv.client.state || null,
    clientPinCode: inv.client.pinCode || null,
    clientPhone: inv.client.phone || null,
    clientEmail: inv.client.email || null,
    clientGstin: inv.client.gstin?.trim() || null,
    shipToSameAsBilling: ship.sameAsBilling !== false,
    shipToName: ship.companyName || null,
    shipToAddressLine1: ship.addressLine1 || null,
    shipToAddressLine2: ship.addressLine2 || null,
    shipToCity: ship.city || null,
    shipToState: ship.state || null,
    shipToPinCode: ship.pinCode || null,
    shipToPhone: ship.phone || null,
    discountType: inv.discountType || null,
    discountValue: inv.discountType ? (inv.discountValue ?? 0) : 0,
    gstEnabled: Boolean(inv.gstEnabled),
    gstMode: inv.gstMode || "CGST_SGST",
    gstRate: inv.gstRate ?? 18,
    quotationId: inv.quotationId || null,
    quotationReference: inv.quotationReference || null,
    templateId: storableTemplateId(inv.templateId),
    // `DbNull`, not `null`: on a nullable Json column Prisma reserves plain null for "leave it".
    settingsOverride: (sanitizeOverride(inv.settingsOverride) ?? Prisma.DbNull) as Prisma.InputJsonValue,
  };
}

const itemRows = (items: InvoiceItem[]) => ({
  create: getValidItems(items).map((i, n) => ({
    position: n,
    description: encodeItemText(i.description, i.details),
    unit: i.unit,
    quantity: i.quantity,
    rate: i.rate,
    hsn: i.hsn?.trim() || null,
    discountPercent: i.discountPercent ?? null,
    gstRate: i.gstRate ?? null,
  })),
});

const withItems = { items: { orderBy: { position: "asc" } }, payments: { orderBy: { date: "asc" } } } as const;

/* ────────────────────────── reads ────────────────────────── */

export async function getInvoice(id: string): Promise<InvoiceState | null> {
  await requireAdmin();
  const x = await prisma.invoice.findUnique({ where: { id }, include: withItems });
  return x ? toState(x as never) : null;
}

/** Used by the PDF route, which authenticates by its own signed link rather than a session. */
export async function getInvoiceForPdfRender(id: string): Promise<InvoiceState | null> {
  const x = await prisma.invoice.findUnique({ where: { id }, include: withItems });
  return x ? toState(x as never) : null;
}

export type InvoiceSort = "updated" | "created" | "number" | "client" | "due";
/**
 * `month` is "2026-10" and matches the invoice date. `kind`: "final" is an issued bill with a number,
 * "cash" an issued cash bill, "draft" a draft. `ca`: whether an issued bill has been sent to the CA.
 */
export type InvoiceListOptions = {
  sort?: InvoiceSort; dir?: "asc" | "desc"; from?: string; to?: string;
  month?: string; kind?: "final" | "cash" | "draft"; ca?: "sent" | "unsent";
};
/** The list's filters as one value, so the list, the bulk actions and the export all select the same invoices. */
export type InvoiceFilter = { search?: string; status?: string } & Omit<InvoiceListOptions, "sort" | "dir">;
const SORT_FIELDS: Record<InvoiceSort, string> = { updated: "updatedAt", created: "createdAt", number: "number", client: "clientCompanyName", due: "dueDate" };
const isoDay = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

/** The Prisma `where` for a set of list filters. */
export function invoiceWhere(f: InvoiceFilter): Record<string, unknown> {
  const status = f.status || "ALL";
  const search = f.search?.trim() ?? "";
  // "DELETED" is the bin, not a status: every other filter only ever sees live invoices.
  const where: Record<string, unknown> = status === "DELETED" ? { deletedAt: { not: null } } : { deletedAt: null };
  const and: Array<Record<string, unknown>> = [];
  if (status !== "ALL" && status !== "DELETED") where.status = status;
  if (search) {
    const asNumber = Number(search);
    and.push({ OR: [
      { clientCompanyName: { contains: search, mode: "insensitive" } },
      { quotationReference: { contains: search, mode: "insensitive" } },
      ...(Number.isInteger(asNumber) && asNumber > 0 ? [{ number: asNumber }] : []),
    ] });
  }
  const from = isoDay(f.from), to = isoDay(f.to);
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) };
  if (f.month && /^\d{4}-\d{2}$/.test(f.month)) where.date = { startsWith: f.month };
  if (f.kind === "final") and.push({ number: { not: null } }, { isCash: false }, { status: { notIn: ["DRAFT", "CANCELLED"] } });
  else if (f.kind === "cash") and.push({ isCash: true }, { status: { not: "DRAFT" } });
  else if (f.kind === "draft") and.push({ status: "DRAFT" });
  // Only an issued bill goes to the CA, so both CA filters leave drafts out.
  if (f.ca === "sent") and.push({ sentToCaAt: { not: null } }, { status: { not: "DRAFT" } });
  else if (f.ca === "unsent") and.push({ sentToCaAt: null }, { status: { not: "DRAFT" } });
  if (and.length) where.AND = and;
  return where;
}

export async function listInvoices(search = "", status = "ALL", page = 1, pageSize = 20, opts: InvoiceListOptions = {}) {
  await requireAdmin();
  const settings = (await getInvoiceConfig()).settings;
  const where = invoiceWhere({ ...opts, search, status });

  const dir = opts.dir === "asc" ? "asc" : "desc";
  const sort = opts.sort && opts.sort in SORT_FIELDS ? opts.sort : "updated";
  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ [SORT_FIELDS[sort]]: dir }, { id: "desc" }],
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: withItems,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    rows: rows.map((x) => {
      const inv = toState(x as never);
      // Each invoice is totalled with its own switches, as its page and PDF do, or the list disagrees with them.
      const totals = calcInvoiceTotals(inv, effectiveInvoiceSettings(settings, inv.settingsOverride));
      return {
        ...inv,
        createdAt: (x as { createdAt: Date }).createdAt.toISOString(),
        itemCount: inv.items.length,
        grandTotal: totals.grandTotal,
        paid: totals.paid,
        balance: totals.balance,
      };
    }),
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page,
  };
}

/** Invoices raised against a quotation, so the quotation can offer View and Download. */
export async function invoicesForQuotation(quotationId: string) {
  await requireAdmin();
  const rows = await prisma.invoice.findMany({
    where: { quotationId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, number: true, date: true, status: true },
  });
  return rows.map((r) => ({ id: r.id, number: r.number ?? undefined, date: r.date, status: r.status as InvoiceStatus }));
}

/* ────────────────────────── writes ────────────────────────── */

/* ────────────────────────── numbering ────────────────────────── */

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Takes the next free number from the counter. A number chosen by hand further up the series is
 * skipped rather than handed out twice.
 */
async function allocateNumber(tx: Tx): Promise<number> {
  const counter = await tx.invoiceNumberCounter.upsert({
    where: { id: COUNTER_ID },
    create: { id: COUNTER_ID, lastNumber: nextNumber(CONTINUES_FROM) },
    update: { lastNumber: { increment: 1 } },
  });
  // On create the row is written already holding the first number; on update it has just been bumped.
  let n = counter.lastNumber;
  while (await tx.invoice.findFirst({ where: { number: n }, select: { id: true } })) n += 1;
  if (n !== counter.lastNumber) await tx.invoiceNumberCounter.update({ where: { id: COUNTER_ID }, data: { lastNumber: n } });
  return n;
}

/**
 * Keeps the counter at the top of the series (the owner's choice, 2026-10-16): when the newest
 * numbered invoices have been deleted, their numbers are given back, so the next invoice continues
 * straight on instead of leaving a gap. Only the top of the series is given back; a deleted invoice
 * further down keeps its number, and that gap stays visible. A number chosen by hand above the
 * counter moves the counter up to it, leaving the numbers in between as gaps.
 */
async function settleCounter(tx: Tx): Promise<void> {
  for (;;) {
    const top = await tx.invoice.findFirst({
      where: { number: { not: null } }, orderBy: { number: "desc" }, select: { id: true, number: true, deletedAt: true },
    });
    if (top?.deletedAt) {
      await tx.invoice.update({
        where: { id: top.id },
        data: { number: null, edits: { create: { field: "number", oldValue: String(top.number), newValue: "given back when deleted" } } },
      });
      continue;
    }
    const last = Math.max(top?.number ?? 0, CONTINUES_FROM);
    await tx.invoiceNumberCounter.upsert({ where: { id: COUNTER_ID }, create: { id: COUNTER_ID, lastNumber: last }, update: { lastNumber: last } });
    return;
  }
}

/**
 * Whether a number can be given to an invoice. A number held by a live invoice cannot; one held only
 * by a deleted invoice can, and is taken from it.
 */
async function claimNumber(tx: Tx, n: number, forId?: string): Promise<void> {
  if (!Number.isInteger(n) || n < 1 || n > 999_999_999) throw new Error("NUMBER_INVALID: an invoice number is a whole number above 0");
  const holder = await tx.invoice.findFirst({ where: { number: n, ...(forId ? { NOT: { id: forId } } : {}) }, select: { id: true, deletedAt: true } });
  if (!holder) return;
  if (!holder.deletedAt) throw new Error(`NUMBER_TAKEN: invoice ${n} already exists`);
  await tx.invoice.update({
    where: { id: holder.id },
    data: { number: null, edits: { create: { field: "number", oldValue: String(n), newValue: "given to another invoice" } } },
  });
}

export type NumberCheck = { status: "free" | "taken" | "invalid"; next: number; message: string };

/**
 * What the editor shows beside the number field: whether a number can be used, and what the next
 * automatic number is. `forId` is the invoice being edited, so its own number reads as free.
 */
export async function checkInvoiceNumber(n: number | null, forId?: string): Promise<NumberCheck> {
  await requireAdmin();
  const counter = await prisma.invoiceNumberCounter.findUnique({ where: { id: COUNTER_ID }, select: { lastNumber: true } });
  let next = nextNumber(counter?.lastNumber ?? CONTINUES_FROM);
  while (await prisma.invoice.findFirst({ where: { number: next, deletedAt: null }, select: { id: true } })) next += 1;
  if (n === null) return { status: "free", next, message: "" };
  if (!Number.isInteger(n) || n < 1) return { status: "invalid", next, message: "Use a whole number above 0." };
  if (forId) {
    const own = await prisma.invoice.findUnique({ where: { id: forId }, select: { number: true } });
    if (own?.number === n) return { status: "free", next, message: "" };
  }
  const holder = await prisma.invoice.findFirst({ where: { number: n, deletedAt: null, ...(forId ? { NOT: { id: forId } } : {}) }, select: { id: true } });
  if (holder) return { status: "taken", next, message: `Invoice ${n} already exists. Pick another number.` };
  if (n > next) return { status: "free", next, message: `Numbers ${next}${n - 1 > next ? `–${n - 1}` : ""} will show as missing until used.` };
  return { status: "free", next, message: n < next ? `${n} is free: it fills a gap in the series.` : "" };
}

/** Fields worth recording when an issued invoice is edited. Items are summarised rather than diffed row by row. */
const TRACKED: Array<keyof ReturnType<typeof toInput>> = [
  "date", "dueDate", "clientCompanyName", "clientGstin", "clientState",
  "discountType", "discountValue", "gstEnabled", "gstMode", "gstRate", "purchaseOrder",
];

async function logEdits(tx: typeof prisma, invoiceId: string, before: Record<string, unknown>, after: Record<string, unknown>, who?: string) {
  const entries: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
  for (const field of TRACKED) {
    const a = before[field], b = after[field];
    const sa = a === null || a === undefined ? null : String(a);
    const sb = b === null || b === undefined ? null : String(b);
    if (sa !== sb) entries.push({ field, oldValue: sa, newValue: sb });
  }
  if (entries.length) {
    await tx.invoiceEdit.createMany({ data: entries.map((e) => ({ ...e, invoiceId, editedBy: who ?? null })) });
  }
}

/**
 * Creates or updates an invoice.
 *
 * A draft is rewritten freely. An issued one is editable too — the owner asked for that — but each
 * tracked field that changed is written to the edit log first, inside the same transaction, so the
 * record cannot be updated without the log being updated with it.
 */
/**
 * Changes the segments one invoice adds or removes, from its own page.
 *
 * It goes back through `saveInvoice` rather than writing the column directly, so an issued invoice
 * records the change in its edit history like any other: taking a block off a document a client is
 * holding is exactly the kind of edit that has to be explainable later.
 */
export async function saveInvoiceSegments(id: string, override: InvoiceSettingsOverride): Promise<InvoiceState> {
  await requireAdmin();
  const current = await getInvoice(id);
  if (!current) throw new Error("NOT_FOUND");
  return saveInvoice({ ...current, settingsOverride: override });
}

export async function saveInvoice(inv: InvoiceState, editedBy?: string): Promise<InvoiceState> {
  await requireAdmin();
  // Fill in any HSN code the owner has already chosen for an item name. Done before the transaction
  // so the lookup is not holding one open, and it never overwrites a code already typed on the row.
  const items = await attachKnownCodes(inv.items);
  inv = { ...inv, items };
  return prisma.$transaction(async (tx) => {
    const data = toInput(inv);
    if (inv.id) {
      const old = await tx.invoice.findUnique({ where: { id: inv.id } });
      if (!old) throw new Error("NOT_FOUND");
      if (old.status === "CANCELLED") throw new Error("CANCELLED_READ_ONLY");
      if (old.status !== "DRAFT") await logEdits(tx as never, inv.id, old as never, data as never, editedBy);
      // Cash or numbered is settled when the invoice is issued: switching later would either leave a
      // numbered invoice without its number or hand a cash one a place in the series after the fact.
      if (old.status !== "DRAFT") data.isCash = old.isCash;
      // The number can be chosen by hand: on a draft it is reserved for when it is issued, on an
      // issued bill it renumbers it. A cash invoice never has one.
      const wanted = data.isCash ? null : inv.number ?? null;
      const renumber = wanted !== old.number && !(old.status !== "DRAFT" && wanted === null);
      if (renumber && wanted !== null) await claimNumber(tx, wanted, inv.id);
      if (renumber && old.status !== "DRAFT") {
        await tx.invoiceEdit.create({ data: { invoiceId: inv.id, field: "number", oldValue: old.number === null ? null : String(old.number), newValue: String(wanted), editedBy: editedBy ?? null } });
      }
      const updated = await tx.invoice.update({
        where: { id: inv.id },
        data: { ...data, ...(renumber ? { number: wanted } : {}), items: { deleteMany: {}, ...itemRows(inv.items) } },
        include: withItems,
      });
      if (renumber) await settleCounter(tx);
      return toState(updated as never);
    }
    const wanted = data.isCash ? null : inv.number ?? null;
    if (wanted !== null) await claimNumber(tx, wanted);
    const created = await tx.invoice.create({
      data: { ...data, number: wanted, status: "DRAFT", items: itemRows(inv.items) },
      include: withItems,
    });
    if (wanted !== null) await settleCounter(tx);
    return toState(created as never);
  }, TX);
}

/**
 * Issues an invoice: allocates the next number (none for a cash invoice) and freezes the settings it
 * was drawn with.
 *
 * The counter is incremented inside the transaction, so two people issuing at the same moment cannot
 * take the same number. The frozen settings matter because the switches are editable: without the
 * snapshot, turning a column off next month would silently redraw an invoice a client already holds.
 */
export async function issueInvoice(id: string): Promise<InvoiceState> {
  await requireAdmin();
  const { settings } = await getInvoiceConfig();
  const head = await prisma.invoice.findUnique({ where: { id }, select: { status: true, templateId: true, templateSnapshot: true } });
  if (!head) throw new Error("NOT_FOUND");
  const wording = await resolveInvoiceTemplate(head);
  return prisma.$transaction(async (tx) => {
    const row = await tx.invoice.findUnique({ where: { id }, include: withItems });
    if (!row) throw new Error("NOT_FOUND");
    if (row.status !== "DRAFT") throw new Error("ALREADY_ISSUED");
    const inv = toState(row as never);
    // The freeze has to record what this invoice is actually drawn with, segments it removed for
    // itself included, or issuing would quietly hand them back to the global settings.
    const frozen = effectiveInvoiceSettings(settings, inv.settingsOverride);
    const missing = whatIsMissing(inv, frozen);
    if (missing.length) throw new Error(`INCOMPLETE: ${missing.join(", ")}`);

    // A cash invoice is issued without touching the counter, so the numbered series stays unbroken.
    // A number chosen by hand on the draft is kept; otherwise the next one is taken.
    let number: number | null = null;
    if (!inv.isCash) number = row.number ?? (await allocateNumber(tx));

    const issued = await tx.invoice.update({
      where: { id },
      data: {
        number, status: "ISSUED", issuedAt: new Date(),
        settingsSnapshot: frozen as object,
        // The wording is frozen alongside the switches: editing a template later must not rewrite
        // an invoice a client already holds.
        templateSnapshot: wording.content as object,
      },
      include: withItems,
    });
    if (row.number) await settleCounter(tx);
    return toState(issued as never);
  }, TX);
}

export async function cancelInvoice(id: string, reason: string) {
  await requireAdmin();
  const row = await prisma.invoice.findUnique({ where: { id }, select: { status: true } });
  if (!row) throw new Error("NOT_FOUND");
  if (row.status === "CANCELLED") throw new Error("ALREADY_CANCELLED");
  // The number stays used: a cancelled invoice keeps its place in the series rather than leaving a hole.
  const x = await prisma.invoice.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledReason: reason.trim() || null },
    include: withItems,
  });
  return toState(x as never);
}

/**
 * Moves any invoice to the Deleted list (the owner's choice, 2026-10-15). Nothing is removed, so a
 * mistake is undone with Restore; its number shows as missing from the series until then.
 */
export async function deleteInvoice(id: string) {
  await requireAdmin();
  const row = await prisma.invoice.findUnique({ where: { id }, select: { status: true, deletedAt: true } });
  if (!row) throw new Error("NOT_FOUND");
  if (row.deletedAt) return;
  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        // A draft only reserved its number, so deleting it frees the number outright.
        ...(row.status === "DRAFT" ? { number: null } : { edits: { create: { field: "deleted", oldValue: row.status, newValue: "moved to Deleted" } } }),
      },
    });
    await settleCounter(tx);
  }, TX);
}

/** Brings a deleted invoice back exactly as it was, number included. */
export async function restoreInvoice(id: string) {
  await requireAdmin();
  const row = await prisma.invoice.findUnique({ where: { id }, select: { status: true, deletedAt: true } });
  if (!row) throw new Error("NOT_FOUND");
  if (!row.deletedAt) return;
  await prisma.$transaction(async (tx) => {
    const full = await tx.invoice.findUnique({ where: { id }, select: { number: true, isCash: true } });
    // Its number may have been given back while it sat in Deleted; an issued bill then takes a fresh one.
    const number = row.status !== "DRAFT" && !full?.isCash && full?.number === null ? await allocateNumber(tx) : undefined;
    await tx.invoice.update({
      where: { id },
      data: {
        deletedAt: null,
        ...(number !== undefined ? { number } : {}),
        ...(row.status !== "DRAFT" ? { edits: { create: { field: "restored", oldValue: "Deleted", newValue: number !== undefined ? `${row.status}, new number ${number}` : row.status } } } : {}),
      },
    });
  }, TX);
}

/**
 * Removes an invoice for good, with its items, payments, credit notes and history. Only from the
 * Deleted list, so nothing live can be lost in one step.
 */
export async function purgeInvoice(id: string) {
  await requireAdmin();
  const row = await prisma.invoice.findUnique({ where: { id }, select: { deletedAt: true } });
  if (!row) return;
  if (!row.deletedAt) throw new Error("NOT_DELETED");
  await prisma.$transaction(async (tx) => {
    await tx.invoice.delete({ where: { id } });
    await settleCounter(tx);
  }, TX);
}

/**
 * Marks issued bills as sent to the CA, or not sent. Drafts are skipped: only an issued bill goes to
 * the accountant. Either `ids` or the list's filters choose the bills, so "every bill matching this
 * filter" works across pages. Each change is written to the bill's edit history.
 */
export async function markSentToCa(target: { ids?: string[]; filter?: InvoiceFilter }, sent: boolean): Promise<number> {
  await requireAdmin();
  const chosen = target.ids?.length ? { id: { in: target.ids.slice(0, 2000) }, deletedAt: null } : target.filter ? invoiceWhere(target.filter) : null;
  if (!chosen) return 0;
  const rows = await prisma.invoice.findMany({
    where: { AND: [chosen, { status: { not: "DRAFT" } }, sent ? { sentToCaAt: null } : { sentToCaAt: { not: null } }] },
    select: { id: true },
  });
  if (!rows.length) return 0;
  const ids = rows.map((r) => r.id);
  const at = new Date();
  await prisma.$transaction([
    prisma.invoice.updateMany({ where: { id: { in: ids } }, data: { sentToCaAt: sent ? at : null } }),
    prisma.invoiceEdit.createMany({
      data: ids.map((invoiceId) => ({ invoiceId, field: "sent to CA", oldValue: sent ? "not sent" : "sent", newValue: sent ? "sent" : "not sent" })),
    }),
  ]);
  return ids.length;
}

/** The ids the list's filters select, for bulk actions that need them one by one (sharing PDFs). */
export async function invoiceIdsFor(filter: InvoiceFilter, limit = 500): Promise<string[]> {
  await requireAdmin();
  const rows = await prisma.invoice.findMany({ where: invoiceWhere(filter), select: { id: true }, orderBy: [{ date: "asc" }, { number: "asc" }], take: limit });
  return rows.map((r) => r.id);
}

/* ────────────────────────── payments ────────────────────────── */

/** Records a receipt and moves the invoice to Partly paid or Paid as the balance dictates. */
export async function recordPayment(invoiceId: string, payment: { date: string; amount: number; method?: string; note?: string }) {
  await requireAdmin();
  const { settings } = await getInvoiceConfig();
  return prisma.$transaction(async (tx) => {
    const row = await tx.invoice.findUnique({ where: { id: invoiceId }, include: withItems });
    if (!row) throw new Error("NOT_FOUND");
    if (row.status === "DRAFT") throw new Error("NOT_ISSUED");
    if (row.status === "CANCELLED") throw new Error("CANCELLED_READ_ONLY");
    if (!(payment.amount > 0)) throw new Error("AMOUNT_MUST_BE_POSITIVE");

    await tx.invoicePayment.create({
      data: { invoiceId, date: payment.date, amount: payment.amount, method: payment.method || null, note: payment.note || null },
    });
    const fresh = await tx.invoice.findUnique({ where: { id: invoiceId }, include: withItems });
    const inv = toState(fresh as never);
    const totals = calcInvoiceTotals(inv, settings);
    const status: InvoiceStatus = totals.balance <= 0 ? "PAID" : "PARTLY_PAID";
    const updated = await tx.invoice.update({ where: { id: invoiceId }, data: { status }, include: withItems });
    return toState(updated as never);
  }, TX);
}

export async function deletePayment(paymentId: string) {
  await requireAdmin();
  const { settings } = await getInvoiceConfig();
  return prisma.$transaction(async (tx) => {
    const p = await tx.invoicePayment.findUnique({ where: { id: paymentId } });
    if (!p) throw new Error("NOT_FOUND");
    await tx.invoicePayment.delete({ where: { id: paymentId } });
    const fresh = await tx.invoice.findUnique({ where: { id: p.invoiceId }, include: withItems });
    if (!fresh) throw new Error("NOT_FOUND");
    const inv = toState(fresh as never);
    const totals = calcInvoiceTotals(inv, settings);
    if (inv.status !== "CANCELLED" && inv.status !== "DRAFT") {
      const status: InvoiceStatus = totals.paid <= 0 ? "ISSUED" : totals.balance <= 0 ? "PAID" : "PARTLY_PAID";
      await tx.invoice.update({ where: { id: p.invoiceId }, data: { status } });
    }
  }, TX);
}

/* ────────────────────────── conversion and duplication ────────────────────────── */

/**
 * Raises a draft invoice from a quotation. The copy is complete and independent: editing either
 * document afterwards never touches the other, and only the reference is kept so each can show it.
 * The owner chose one invoice per quotation, so a second attempt is refused.
 */
export async function convertQuotationToInvoice(quotationId: string): Promise<InvoiceState> {
  await requireAdmin();
  const { settings } = await getInvoiceConfig();
  const q = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!q || q.deletedAt) throw new Error("NOT_FOUND");
  // Only a finalized quotation is what the client agreed to; a draft can still change under the invoice.
  if (q.status !== "FINAL") throw new Error("NOT_FINAL");

  const existing = await prisma.invoice.findFirst({ where: { quotationId, deletedAt: null }, select: { id: true } });
  if (existing) throw new Error("INVOICE_EXISTS");

  const today = new Date().toISOString().slice(0, 10);
  const draft = fromQuotation(
    {
      id: q.id,
      quotationReference: q.reference,
      subject: q.subject,
      client: {
        companyName: q.clientCompanyName,
        contactPerson: q.clientContactPerson ?? "",
        addressLine1: q.clientAddressLine1 ?? "",
        addressLine2: q.clientAddressLine2 ?? "",
        city: q.clientCity ?? "",
        state: q.clientState ?? "",
        pinCode: q.clientPinCode ?? "",
        phone: q.clientPhone ?? "",
        email: q.clientEmail ?? "",
        gstin: q.clientGstin ?? "",
      },
      items: q.items.map((i) => ({
        id: i.id,
        ...decodeItemText(i.description),
        unit: i.unit,
        quantity: Number(i.quantity),
        rate: Number(i.rate),
      })),
      discountType: (q.discountType as InvoiceState["discountType"]) ?? null,
      discountValue: Number(q.discountValue ?? 0),
      gstEnabled: Boolean(q.gstEnabled),
      gstMode: (q.gstMode as InvoiceState["gstMode"]) ?? "CGST_SGST",
      gstRate: Number(q.gstRate ?? settings.gstRate),
    },
    settings,
    today,
    SELLER_STATE,
  );
  // saveInvoice fills in any HSN code already chosen for these item names.
  return saveInvoice(draft);
}

export async function duplicateInvoice(id: string): Promise<InvoiceState> {
  await requireAdmin();
  const source = await getInvoice(id);
  if (!source) throw new Error("NOT_FOUND");
  const { settings } = await getInvoiceConfig();
  const today = new Date().toISOString().slice(0, 10);
  const copy: InvoiceState = {
    ...source,
    id: undefined,
    number: undefined,
    status: "DRAFT",
    date: today,
    dueDate: dueDateFor(today, settings.creditDays),
    payments: [],
    // A duplicate is a new document, not a second copy of the same one: it keeps no link to the
    // quotation, so the "one invoice per quotation" rule still holds.
    quotationId: undefined,
    quotationReference: undefined,
  };
  return saveInvoice(copy);
}

/* ────────────────────────── the HSN library ────────────────────────── */

/** Fills in each item's HSN from the codes the owner has already saved, without overwriting one that is set. */
export async function attachKnownCodes(items: InvoiceItem[]): Promise<InvoiceItem[]> {
  const names = items.map((i) => i.description.trim()).filter(Boolean);
  if (!names.length) return items;
  const known = await prisma.invoiceItemCode.findMany({ where: { description: { in: names } } });
  const byName = new Map(known.map((k) => [k.description.toLowerCase(), k]));
  return items.map((i) => {
    if (i.hsn) return i;
    const hit = byName.get(i.description.trim().toLowerCase());
    return hit ? { ...i, hsn: hit.hsn, unit: i.unit || hit.unit || "" } : i;
  });
}

export async function listItemCodes(search = "") {
  await requireAdmin();
  return prisma.invoiceItemCode.findMany({
    where: search ? { description: { contains: search, mode: "insensitive" } } : undefined,
    orderBy: { description: "asc" },
  });
}

export async function saveItemCode(description: string, hsn: string, unit?: string) {
  await requireAdmin();
  const name = description.trim();
  const code = hsn.trim();
  if (!name) throw new Error("DESCRIPTION_REQUIRED");
  if (!/^[0-9]{4}([0-9]{2}([0-9]{2})?)?$/.test(code)) throw new Error("INVALID_HSN");
  return prisma.invoiceItemCode.upsert({
    where: { description: name },
    create: { description: name, hsn: code, unit: unit?.trim() || null },
    update: { hsn: code, ...(unit !== undefined ? { unit: unit.trim() || null } : {}) },
  });
}

export async function deleteItemCode(id: string) {
  await requireAdmin();
  await prisma.invoiceItemCode.delete({ where: { id } });
}

/* ────────────────────────── the unit library ────────────────────────── */

/** The units the owner has typed that were not built in, oldest first is no use: alphabetical. */
export async function listCustomUnits(): Promise<string[]> {
  const rows = await prisma.customUnit.findMany({ orderBy: { name: "asc" }, select: { name: true } });
  return rows.map((r) => r.name);
}

/** Remembers a unit so it is offered on every later quotation and invoice. Quietly idempotent. */
export async function saveCustomUnit(name: string): Promise<void> {
  await requireAdmin();
  const value = name.trim().slice(0, 24);
  if (!value) throw new Error("UNIT_REQUIRED");
  // A unit already built in is not worth storing, and storing it would list it twice.
  if (BUILT_IN_UNITS.some((u) => u.toLowerCase() === value.toLowerCase())) return;
  await prisma.customUnit.upsert({ where: { name: value }, create: { name: value }, update: {} });
}

export async function deleteCustomUnit(id: string): Promise<void> {
  await requireAdmin();
  await prisma.customUnit.delete({ where: { id } });
}

/* ────────────────────────── credit notes and the edit log ────────────────────────── */

/** Credit notes already raised against an invoice, and what they come to. */
export async function creditNotesFor(invoiceId: string) {
  await requireAdmin();
  const rows = await prisma.creditNote.findMany({ where: { invoiceId }, orderBy: { createdAt: "asc" } });
  const list = rows.map((r) => ({
    id: r.id, number: r.number ?? undefined, date: r.date,
    amount: Number(r.amount), reason: r.reason, issuedAt: r.issuedAt?.toISOString(),
  }));
  return { list, total: Math.round(list.reduce((s, c) => s + c.amount, 0) * 100) / 100 };
}

/**
 * Raises a credit note against an issued invoice — the correct way to reduce what is owed after the
 * fact, rather than editing a document the client already holds.
 *
 * It takes a number from its own series, as a credit note must: the invoice series and the credit
 * note series are separate and each has to run unbroken. The amount cannot take the total credited
 * past the invoice, so an invoice can never be credited for more than it was ever worth.
 */
export async function createCreditNote(invoiceId: string, amount: number, reason: string, date?: string) {
  await requireAdmin();
  const { settings } = await getInvoiceConfig();
  if (!(amount > 0)) throw new Error("AMOUNT_MUST_BE_POSITIVE");
  if (!reason.trim()) throw new Error("REASON_REQUIRED");

  const row = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: withItems });
  if (!row) throw new Error("NOT_FOUND");
  if (row.status === "DRAFT") throw new Error("NOT_ISSUED");
  const totals = calcInvoiceTotals(toState(row as never), settings);
  const already = (await creditNotesFor(invoiceId)).total;
  if (amount > round2(totals.grandTotal - already)) throw new Error("EXCEEDS_UNCREDITED_AMOUNT");

  return prisma.$transaction(async (tx) => {
    const counter = await tx.invoiceNumberCounter.upsert({
      where: { id: CREDIT_COUNTER_ID },
      create: { id: CREDIT_COUNTER_ID, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return tx.creditNote.create({
      data: {
        invoiceId, amount, reason: reason.trim(),
        date: date ?? new Date().toISOString().slice(0, 10),
        number: counter.lastNumber,
        issuedAt: new Date(),
      },
    });
  }, TX);
}

export async function invoiceEditLog(invoiceId: string) {
  await requireAdmin();
  const rows = await prisma.invoiceEdit.findMany({ where: { invoiceId }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, field: r.field, oldValue: r.oldValue, newValue: r.newValue,
    editedBy: r.editedBy, at: r.createdAt.toISOString(),
  }));
}

/** The GST split for a client, offered by the editor when the client's state changes. */
export const gstModeForClient = (state: string, gstin?: string) => inferGstMode(SELLER_STATE, state, gstin);

export { canIssue, whatIsMissing };
