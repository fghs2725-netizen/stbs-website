/**
 * Every invoice as an Excel workbook, for the Analytics page's Download button.
 *
 * Four sheets: Invoices (one row each, with the totals worked out exactly as the invoice's own page
 * does), Items, Payments, and a Summary by financial year. Deleted invoices are left out, as they are
 * everywhere else; drafts and cancelled invoices are included with their status, so the file is a
 * complete record that can be filtered down.
 */
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/quotation-management";
import { decodeItemText } from "@/components/quotation/item-text";
import { calcInvoiceTotals, lineAmount, type InvoiceItem, type InvoiceStatus } from "@/components/invoice/invoice-model";
import { effectiveInvoiceSettings, resolveSettings } from "@/components/invoice/invoice-settings";
import { computeInvoiceAnalytics, financialYear, type AnalyticsRow } from "@/lib/invoice-analytics";
import { buildXlsx, type Sheet } from "@/lib/xlsx";

const STATUS: Record<InvoiceStatus, string> = { DRAFT: "Draft", ISSUED: "Issued", PARTLY_PAID: "Part paid", PAID: "Paid", CANCELLED: "Cancelled" };
const day = (s: string | null | undefined) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(`${s.slice(0, 10)}T00:00:00Z`) : null);

/** One invoice with everything the workbook prints. */
export type ExportRow = AnalyticsRow & {
  clientAddressLine1: string | null; clientAddressLine2: string | null; clientCity: string | null;
  clientState: string | null; clientPinCode: string | null; clientPhone: string | null; clientEmail: string | null;
  subject: string | null; purchaseOrder: string | null; quotationReference: string | null;
  payments: Array<{ date: string; amount: unknown; method?: string | null; note?: string | null }>;
};

export async function buildInvoiceExport(today = new Date()): Promise<Buffer> {
  await requireAdmin();
  const [rows, setting] = await Promise.all([
    prisma.invoice.findMany({
      include: { items: { orderBy: { position: "asc" } }, payments: { orderBy: { date: "asc" } }, creditNotes: true },
      orderBy: [{ date: "asc" }, { number: "asc" }],
    }),
    prisma.invoiceSetting.findUnique({ where: { id: "singleton" }, select: { settings: true } }),
  ]);
  return buildXlsx(invoiceExportSheets(rows as unknown as ExportRow[], setting?.settings ?? {}, today));
}

/** The workbook's sheets, kept free of the database so it can be checked on its own. */
export function invoiceExportSheets(all: ExportRow[], storedSettings: unknown, today: Date): Sheet[] {
  const base = resolveSettings(storedSettings);
  const rows = all.filter((r) => !r.deletedAt);
  // A number where there is one, so the column sorts as numbers; otherwise what the invoice is.
  const label = (r: ExportRow) => (r.number ? r.number : r.isCash && r.status !== "DRAFT" ? "Cash" : "Draft");

  const invoices: Sheet = {
    name: "Invoices",
    columns: [
      { header: "Invoice no.", width: 11 }, { header: "Type", width: 8 }, { header: "Status", width: 10 },
      { header: "Date", width: 12, format: "date" }, { header: "Financial year", width: 10 }, { header: "Due date", width: 12, format: "date" },
      { header: "Client", width: 34 }, { header: "GSTIN", width: 17 }, { header: "State", width: 14 }, { header: "PIN", width: 8 },
      { header: "Address", width: 40 }, { header: "Phone", width: 13 }, { header: "Email", width: 22 },
      { header: "Subject", width: 28 }, { header: "Their order", width: 14 }, { header: "Quotation", width: 14 },
      { header: "Items", width: 6 }, { header: "Subtotal", width: 13, format: "money" }, { header: "Discount", width: 11, format: "money" },
      { header: "Taxable value", width: 13, format: "money" }, { header: "CGST", width: 11, format: "money" }, { header: "SGST", width: 11, format: "money" },
      { header: "IGST", width: 11, format: "money" }, { header: "Total GST", width: 12, format: "money" }, { header: "Round off", width: 9, format: "money" },
      { header: "Invoice total", width: 13, format: "money" }, { header: "Received", width: 13, format: "money" },
      { header: "Credit notes", width: 11, format: "money" }, { header: "Balance", width: 12, format: "money" },
    ],
    rows: [],
  };
  const items: Sheet = {
    name: "Items",
    columns: [
      { header: "Invoice no.", width: 11 }, { header: "Date", width: 12, format: "date" }, { header: "Client", width: 30 },
      { header: "Item", width: 50 }, { header: "Details", width: 30 }, { header: "HSN/SAC", width: 10 }, { header: "Unit", width: 8 },
      { header: "Quantity", width: 10, format: "number" }, { header: "Rate", width: 12, format: "money" },
      { header: "Amount", width: 13, format: "money" }, { header: "GST %", width: 7, format: "number" },
    ],
    rows: [],
  };
  const payments: Sheet = {
    name: "Payments",
    columns: [
      { header: "Invoice no.", width: 11 }, { header: "Client", width: 30 }, { header: "Payment date", width: 13, format: "date" },
      { header: "Amount", width: 13, format: "money" }, { header: "Method", width: 14 }, { header: "Note", width: 36 },
    ],
    rows: [],
  };

  for (const r of rows) {
    const lines: InvoiceItem[] = r.items.map((i) => ({
      id: i.id, ...decodeItemText(i.description), unit: i.unit, quantity: Number(i.quantity), rate: Number(i.rate),
      hsn: (i as { hsn?: string | null }).hsn ?? undefined,
      discountPercent: i.discountPercent === null || i.discountPercent === undefined ? undefined : Number(i.discountPercent),
      gstRate: i.gstRate === null || i.gstRate === undefined ? undefined : Number(i.gstRate),
    }));
    const effective = effectiveInvoiceSettings(base, r.settingsOverride);
    const t = calcInvoiceTotals(
      {
        items: lines, discountType: (r.discountType as "PERCENT" | "FLAT" | null) ?? null, discountValue: Number(r.discountValue),
        gstEnabled: r.gstEnabled, gstMode: r.gstMode === "IGST" ? "IGST" : "CGST_SGST", gstRate: Number(r.gstRate),
        payments: r.payments.map((p, n) => ({ id: String(n), date: p.date, amount: Number(p.amount) })),
      },
      effective,
    );
    const credited = r.creditNotes.reduce((s, c) => s + Number(c.amount), 0);
    const address = [r.clientAddressLine1, r.clientAddressLine2, r.clientCity].filter(Boolean).join(", ");
    invoices.rows.push([
      label(r), r.isCash ? "Cash" : "Tax", STATUS[r.status], day(r.date), financialYear(r.date), day(r.dueDate),
      r.clientCompanyName, r.clientGstin, r.clientState, r.clientPinCode, address, r.clientPhone, r.clientEmail,
      r.subject, r.purchaseOrder, r.quotationReference,
      lines.length, t.subtotal, t.discount, t.taxable, t.cgst, t.sgst, t.igst, t.tax, t.roundOff,
      t.grandTotal, t.paid, Math.round(credited * 100) / 100, Math.max(0, Math.round((t.balance - credited) * 100) / 100),
    ]);
    for (const it of lines) {
      const amount = lineAmount(it, effective.columns.lineDiscount);
      items.rows.push([
        label(r), day(r.date), r.clientCompanyName, it.description, it.details, it.hsn, it.unit, it.quantity, it.rate, amount,
        r.gstEnabled ? (effective.columns.lineGst ? it.gstRate ?? Number(r.gstRate) : Number(r.gstRate)) : 0,
      ]);
    }
    for (const p of r.payments) payments.rows.push([label(r), r.clientCompanyName, day(p.date), Number(p.amount), p.method, p.note]);
  }

  const a = computeInvoiceAnalytics(all, storedSettings, today);
  const summary: Sheet = {
    name: "Summary by year",
    columns: [
      { header: "Financial year", width: 14 }, { header: "Invoices", width: 10, format: "number" },
      { header: "Taxable value", width: 15, format: "money" }, { header: "GST", width: 14, format: "money" },
      { header: "Billed", width: 15, format: "money" }, { header: "Received", width: 15, format: "money" },
    ],
    rows: a.byYear.map((y) => [y.fy, y.count, y.taxable, y.gst, y.billed, y.received]),
  };

  return [invoices, items, payments, summary];
}
