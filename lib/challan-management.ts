/**
 * Delivery challans in the database. See lib/challan.ts for where each field is kept and why.
 *
 * A number is taken only when a challan is issued, so an abandoned draft leaves no gap in the series.
 * Issued challans are read-only apart from cancelling, like invoices.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/quotation-management";
import { formatInvoiceNumber } from "@/lib/invoice-numbering";
import { decodeItemText } from "@/components/quotation/item-text";
import {
  draftReference, emptyChallan, emptyParty, financialYearStart, formatChallanNumber, isDraftReference, nextChallanNumber,
  challanFromInvoice, challanTotals, savedItems, validItems, whatIsMissing,
  type ChallanItem, type ChallanParty, type ChallanState, type ChallanStatus,
} from "@/lib/challan";

const TYPE = "DELIVERY_CHALLAN" as const;
const SECTION = "challan";

type Meta = Omit<ChallanState, "id" | "reference" | "status" | "items" | "remarks" | "cancelledReason">;

const party = (v: unknown): ChallanParty => ({ ...emptyParty(), ...(v && typeof v === "object" ? (v as Partial<ChallanParty>) : {}) });
const str = (v: unknown) => (typeof v === "string" ? v : "");

function metaOf(c: ChallanState): Meta {
  return {
    date: c.date, purpose: c.purpose, client: c.client, deliverToSame: c.deliverToSame, deliverTo: c.deliverTo,
    vehicleNumber: c.vehicleNumber, driverName: c.driverName, driverPhone: c.driverPhone, transportMode: c.transportMode,
    ewayBill: c.ewayBill, invoiceId: c.invoiceId, invoiceRef: c.invoiceRef, quotationId: c.quotationId, quotationRef: c.quotationRef,
    showRates: c.showRates,
  };
}

type Row = {
  id: string; reference: string; status: string; notes: string | null; deletedAt: Date | null;
  items: Array<{ id: string; description: string; notes: string | null; hsnCode: string | null; quantity: unknown; unit: string | null; rate: unknown }>;
  sections: Array<{ type: string; content: unknown }>;
};

function toState(row: Row): ChallanState & { deletedAt: Date | null } {
  const base = emptyChallan();
  const m = (row.sections.find((s) => s.type === SECTION)?.content ?? {}) as Partial<Meta> & { cancelledReason?: string };
  const status = (["DRAFT", "ISSUED", "CANCELLED"].includes(row.status) ? row.status : "DRAFT") as ChallanStatus;
  return {
    ...base,
    id: row.id,
    reference: isDraftReference(row.reference) ? "" : row.reference,
    status,
    date: str(m.date) || base.date,
    purpose: str(m.purpose) || base.purpose,
    client: party(m.client),
    deliverToSame: m.deliverToSame !== false,
    deliverTo: party(m.deliverTo),
    vehicleNumber: str(m.vehicleNumber), driverName: str(m.driverName), driverPhone: str(m.driverPhone),
    transportMode: str(m.transportMode), ewayBill: str(m.ewayBill),
    invoiceId: str(m.invoiceId) || undefined, invoiceRef: str(m.invoiceRef),
    quotationId: str(m.quotationId) || undefined, quotationRef: str(m.quotationRef),
    showRates: Boolean(m.showRates),
    remarks: row.notes ?? "",
    cancelledReason: str(m.cancelledReason) || undefined,
    items: row.items.map((i): ChallanItem => ({
      id: i.id, description: i.description, details: i.notes ?? "", hsn: i.hsnCode ?? "",
      quantity: Number(i.quantity) || 0, unit: i.unit ?? "", rate: Number(i.rate) || 0,
    })),
    deletedAt: row.deletedAt,
  };
}

const include = { items: { orderBy: { position: "asc" as const } }, sections: { where: { type: SECTION } } };

function documentData(c: ChallanState) {
  const t = challanTotals(c);
  return {
    title: "Delivery challan",
    clientName: c.client.name.trim() || null,
    clientCompany: c.client.name.trim() || null,
    notes: c.remarks.trim() || null,
    totalAmount: c.showRates ? t.value : 0,
  };
}

function itemRows(c: ChallanState) {
  return savedItems(c.items).map((i, position) => ({
    position, description: i.description.trim(), notes: i.details.trim() || null, hsnCode: i.hsn.trim() || null,
    quantity: i.quantity, unit: i.unit.trim() || "Nos", rate: i.rate, amount: Math.round(i.quantity * i.rate * 100) / 100,
    gstPercent: 0, gstAmount: 0,
  }));
}

// ── reads ────────────────────────────────────────────────────────────────────

export type ChallanListRow = {
  id: string; reference: string; status: ChallanStatus; date: string; clientName: string; deliverTo: string;
  lines: number; invoiceRef: string; deleted: boolean; createdAt: Date;
};

export async function listChallans(opts: { q?: string; status?: string; deleted?: boolean } = {}): Promise<ChallanListRow[]> {
  await requireAdmin();
  const rows = await prisma.document.findMany({
    where: {
      type: TYPE,
      deletedAt: opts.deleted ? { not: null } : null,
      ...(opts.status && ["DRAFT", "ISSUED", "CANCELLED"].includes(opts.status) ? { status: opts.status as never } : {}),
      ...(opts.q?.trim() ? { OR: [
        { reference: { contains: opts.q.trim(), mode: "insensitive" as const } },
        { clientName: { contains: opts.q.trim(), mode: "insensitive" as const } },
      ] } : {}),
    },
    include,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((r) => {
    const c = toState(r as Row);
    const site = c.deliverToSame ? "" : [c.deliverTo.name, c.deliverTo.city].filter(Boolean).join(", ");
    return {
      id: c.id!, reference: c.reference, status: c.status, date: c.date, clientName: c.client.name, deliverTo: site,
      lines: validItems(c.items).length, invoiceRef: c.invoiceRef, deleted: Boolean(c.deletedAt), createdAt: r.createdAt,
    };
  });
}

export async function getChallan(id: string) {
  await requireAdmin();
  return getChallanForPdfRender(id);
}

/** Reached by the PDF render page, which holds its own short-lived token instead of a session. */
export async function getChallanForPdfRender(id: string) {
  const row = await prisma.document.findFirst({ where: { id, type: TYPE }, include });
  return row ? toState(row as Row) : null;
}

/** Challans already raised against one invoice, for its page. */
export async function challansForInvoice(invoiceId: string) {
  await requireAdmin();
  const rows = await prisma.document.findMany({
    where: { type: TYPE, deletedAt: null, sections: { some: { type: SECTION, content: { path: ["invoiceId"], equals: invoiceId } } } },
    include, orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => toState(r as Row));
}

// ── writes ───────────────────────────────────────────────────────────────────

export async function saveChallan(c: ChallanState, userId?: string): Promise<ChallanState> {
  await requireAdmin();
  const data = documentData(c);
  const items = itemRows(c);
  const meta = metaOf(c);
  return prisma.$transaction(async (tx) => {
    if (c.id) {
      const old = await tx.document.findFirst({ where: { id: c.id, type: TYPE } });
      if (!old) throw new Error("NOT_FOUND");
      if (old.status !== "DRAFT") throw new Error("ISSUED_READ_ONLY");
      await tx.documentSection.deleteMany({ where: { documentId: c.id, type: SECTION } });
      const row = await tx.document.update({
        where: { id: c.id },
        data: {
          ...data,
          items: { deleteMany: {}, create: items },
          sections: { create: { type: SECTION, title: "Challan details", content: meta as object } },
        },
        include,
      });
      return toState(row as Row);
    }
    const row = await tx.document.create({
      data: {
        ...data,
        type: TYPE,
        status: "DRAFT",
        reference: draftReference(randomUUID()),
        createdById: userId ?? null,
        items: { create: items },
        sections: { create: { type: SECTION, title: "Challan details", content: meta as object } },
      },
      include,
    });
    return toState(row as Row);
  });
}

/** Takes the next number in the challan's financial year. Retries once if two issues race for it. */
export async function issueChallan(id: string) {
  await requireAdmin();
  const current = await getChallanForPdfRender(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.status !== "DRAFT") throw new Error("ALREADY_ISSUED");
  const missing = whatIsMissing(current);
  if (missing.length) throw new Error(`INCOMPLETE: ${missing.join(", ")}`);
  const fy = financialYearStart(current.date);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const taken = await tx.document.findMany({
          where: { type: TYPE, reference: { startsWith: formatChallanNumber(fy, 0).slice(0, -4) } },
          select: { reference: true },
        });
        const reference = formatChallanNumber(fy, nextChallanNumber(taken.map((t) => t.reference), fy));
        await tx.document.update({ where: { id }, data: { reference, status: "ISSUED" } });
        return reference;
      });
    } catch (error) {
      // A unique-constraint clash means another challan took the same number a moment earlier.
      if ((error as { code?: string }).code !== "P2002" || attempt === 2) throw error;
    }
  }
  throw new Error("NUMBER_UNAVAILABLE");
}

/** A cancelled challan keeps its number, so the series has no unexplained gap. */
export async function cancelChallan(id: string, reason: string) {
  await requireAdmin();
  const row = await prisma.document.findFirst({ where: { id, type: TYPE }, include: { sections: { where: { type: SECTION } } } });
  if (!row) throw new Error("NOT_FOUND");
  if (row.status !== "ISSUED") throw new Error("NOT_ISSUED");
  const section = row.sections[0];
  await prisma.$transaction([
    prisma.document.update({ where: { id }, data: { status: "CANCELLED" } }),
    ...(section ? [prisma.documentSection.update({
      where: { id: section.id },
      data: { content: { ...(section.content as object), cancelledReason: reason.trim().slice(0, 300) } },
    })] : []),
  ]);
}

/** Drafts only: an issued challan has been handed to a driver and is cancelled instead. */
export async function deleteChallan(id: string) {
  await requireAdmin();
  const row = await prisma.document.findFirst({ where: { id, type: TYPE } });
  if (!row) throw new Error("NOT_FOUND");
  if (row.status !== "DRAFT") throw new Error("ISSUED_CANNOT_DELETE");
  await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function duplicateChallan(id: string, userId?: string) {
  const source = await getChallan(id);
  if (!source) throw new Error("NOT_FOUND");
  const copy: ChallanState = { ...source, id: undefined, reference: "", status: "DRAFT", cancelledReason: undefined, date: new Date().toISOString().slice(0, 10) };
  return saveChallan(copy, userId);
}

/** A draft challan from a quotation's client and lines. Nothing is saved until the owner saves it. */
export async function challanDraftFromQuotation(quotationId: string): Promise<ChallanState | null> {
  await requireAdmin();
  const q = await prisma.quotation.findUnique({ where: { id: quotationId }, include: { items: { orderBy: { position: "asc" } } } });
  if (!q) return null;
  const c = challanFromInvoice({
    client: {
      companyName: q.clientCompanyName, contactPerson: q.clientContactPerson ?? "", addressLine1: q.clientAddressLine1 ?? "",
      addressLine2: q.clientAddressLine2 ?? "", city: q.clientCity ?? "", state: q.clientState ?? "", pinCode: q.clientPinCode ?? "",
      phone: q.clientPhone ?? "", gstin: q.clientGstin ?? "",
    },
    items: q.items.map((i) => ({ ...decodeItemText(i.description), quantity: Number(i.quantity), unit: i.unit ?? "", rate: Number(i.rate) })),
  }, "");
  c.quotationId = q.id;
  c.quotationRef = q.reference;
  return c;
}

/** A draft challan from an invoice's client, site and lines. Nothing is saved until the owner saves it. */
export async function challanDraftFromInvoice(invoiceId: string): Promise<ChallanState | null> {
  await requireAdmin();
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { items: { orderBy: { position: "asc" } } } });
  if (!inv) return null;
  return challanFromInvoice({
    id: inv.id,
    client: {
      companyName: inv.clientCompanyName, contactPerson: inv.clientContactPerson ?? "", addressLine1: inv.clientAddressLine1 ?? "",
      addressLine2: inv.clientAddressLine2 ?? "", city: inv.clientCity ?? "", state: inv.clientState ?? "", pinCode: inv.clientPinCode ?? "",
      phone: inv.clientPhone ?? "", gstin: inv.clientGstin ?? "",
    },
    shipTo: {
      sameAsBilling: inv.shipToSameAsBilling, companyName: inv.shipToName ?? "", addressLine1: inv.shipToAddressLine1 ?? "",
      addressLine2: inv.shipToAddressLine2 ?? "", city: inv.shipToCity ?? "", state: inv.shipToState ?? "",
      pinCode: inv.shipToPinCode ?? "", phone: inv.shipToPhone ?? "",
    },
    items: inv.items.map((i) => ({
      ...decodeItemText(i.description), hsn: i.hsn ?? "", quantity: Number(i.quantity), unit: i.unit ?? "", rate: Number(i.rate),
    })),
  }, inv.number ? formatInvoiceNumber(inv.number) : "Draft invoice");
}
