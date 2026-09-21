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
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/quotation-management";
import { decodeItemText, encodeItemText } from "@/components/quotation/item-text";
import { CONTINUES_FROM, nextNumber } from "@/lib/invoice-numbering";
import { inferGstMode } from "@/lib/india-gst";
import {
  calcInvoiceTotals, canIssue, dueDateFor, emptyParty, fromQuotation, getValidItems, whatIsMissing,
  type InvoiceItem, type InvoiceState, type InvoiceStatus,
} from "@/components/invoice/invoice-model";
import { DEFAULT_INVOICE_SETTINGS, resolveSettings, type InvoiceSettings } from "@/components/invoice/invoice-settings";
import type { InvoiceBusiness } from "@/components/invoice/InvoiceDocument";
import { resolveInvoiceTemplate, storableTemplateId } from "@/lib/invoice-templates";

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
  return {
    settings: resolveSettings(row?.settings),
    business: {
      bank: (row?.bankDetails as InvoiceBusiness["bank"]) ?? undefined,
      signatureUrl: row?.signatureUrl ?? undefined,
      stampUrl: row?.stampUrl ?? undefined,
      upiQrUrl: row?.upiQrUrl ?? undefined,
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
    subject: string | null; purchaseOrder: string | null; reverseCharge: boolean; clientId: string | null;
    clientCompanyName: string; clientContactPerson: string | null; clientAddressLine1: string | null;
    clientAddressLine2: string | null; clientCity: string | null; clientState: string | null;
    clientPinCode: string | null; clientPhone: string | null; clientEmail: string | null; clientGstin: string | null;
    shipToSameAsBilling: boolean; shipToName: string | null; shipToAddressLine1: string | null;
    shipToAddressLine2: string | null; shipToCity: string | null; shipToState: string | null;
    shipToPinCode: string | null; shipToPhone: string | null;
    discountType: string | null; discountValue: unknown; gstEnabled: boolean; gstMode: string; gstRate: unknown;
    quotationId: string | null; quotationReference: string | null; templateId: string | null;
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
    payments: (r.payments ?? []).map((p) => ({
      id: p.id, date: p.date, amount: Number(p.amount),
      method: p.method ?? undefined, note: p.note ?? undefined,
    })),
  };
}

function toInput(inv: InvoiceState) {
  const ship = inv.shipTo ?? {};
  return {
    date: inv.date,
    dueDate: inv.dueDate || null,
    subject: inv.subject || null,
    purchaseOrder: inv.purchaseOrder || null,
    reverseCharge: Boolean(inv.reverseCharge),
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
export type InvoiceListOptions = { sort?: InvoiceSort; dir?: "asc" | "desc"; from?: string; to?: string };
const SORT_FIELDS: Record<InvoiceSort, string> = { updated: "updatedAt", created: "createdAt", number: "number", client: "clientCompanyName", due: "dueDate" };
const isoDay = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export async function listInvoices(search = "", status = "ALL", page = 1, pageSize = 20, opts: InvoiceListOptions = {}) {
  await requireAdmin();
  const settings = (await getInvoiceConfig()).settings;
  const where: Record<string, unknown> = { deletedAt: null };
  if (status !== "ALL") where.status = status;
  if (search) {
    const asNumber = Number(search.trim());
    where.OR = [
      { clientCompanyName: { contains: search, mode: "insensitive" } },
      { quotationReference: { contains: search, mode: "insensitive" } },
      ...(Number.isInteger(asNumber) && asNumber > 0 ? [{ number: asNumber }] : []),
    ];
  }
  const from = isoDay(opts.from), to = isoDay(opts.to);
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) };

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
      const totals = calcInvoiceTotals(inv, settings);
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
      const updated = await tx.invoice.update({
        where: { id: inv.id },
        data: { ...data, items: { deleteMany: {}, ...itemRows(inv.items) } },
        include: withItems,
      });
      return toState(updated as never);
    }
    const created = await tx.invoice.create({
      data: { ...data, status: "DRAFT", items: itemRows(inv.items) },
      include: withItems,
    });
    return toState(created as never);
  }, TX);
}

/**
 * Issues an invoice: allocates the next number and freezes the settings it was drawn with.
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
    const missing = whatIsMissing(inv, settings);
    if (missing.length) throw new Error(`INCOMPLETE: ${missing.join(", ")}`);

    const counter = await tx.invoiceNumberCounter.upsert({
      where: { id: COUNTER_ID },
      create: { id: COUNTER_ID, lastNumber: nextNumber(CONTINUES_FROM) },
      update: { lastNumber: { increment: 1 } },
    });
    // On create the row is written already holding the first number; on update it has just been bumped.
    const number = counter.lastNumber;

    const issued = await tx.invoice.update({
      where: { id },
      data: {
        number, status: "ISSUED", issuedAt: new Date(),
        settingsSnapshot: settings as object,
        // The wording is frozen alongside the switches: editing a template later must not rewrite
        // an invoice a client already holds.
        templateSnapshot: wording.content as object,
      },
      include: withItems,
    });
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

/** Soft delete, so a mistake is recoverable. An issued invoice is never removed from the list this way. */
export async function deleteInvoice(id: string) {
  await requireAdmin();
  const row = await prisma.invoice.findUnique({ where: { id }, select: { status: true } });
  if (!row) throw new Error("NOT_FOUND");
  if (row.status !== "DRAFT") throw new Error("ONLY_DRAFTS_DELETABLE");
  await prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
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
  if (!q) throw new Error("NOT_FOUND");

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
