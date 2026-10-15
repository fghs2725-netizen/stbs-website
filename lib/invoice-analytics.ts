/**
 * Invoice figures for the stats strip on Invoices and the Analytics page.
 *
 * Every total comes from `calcInvoiceTotals` with each invoice's own switches, exactly as its page and
 * PDF compute it, so a figure here can always be traced back to the invoices behind it. Totals are not
 * stored anywhere; at this volume (a few hundred invoices a year) reading them all is cheap and can
 * never drift from the documents.
 *
 * What counts:
 *  - Billed figures include issued, part-paid and paid invoices. Drafts have not gone out and
 *    cancelled invoices were withdrawn, so neither is billed. Deleted invoices are left out entirely.
 *  - The financial year runs April to March and goes by the invoice date.
 *  - Received is what the recorded payments add up to, by payment date.
 *  - Outstanding is what is still owed after payments and credit notes.
 */
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/quotation-management";
import { decodeItemText } from "@/components/quotation/item-text";
import { calcInvoiceTotals, overdueBy, type InvoiceItem, type InvoiceStatus } from "@/components/invoice/invoice-model";
import { effectiveInvoiceSettings, resolveSettings } from "@/components/invoice/invoice-settings";

/** The owner's numbering in Vyapar began at 503 (April 2021); gaps are looked for from there on. */
export const SERIES_START = 503;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const BILLED: ReadonlySet<InvoiceStatus> = new Set(["ISSUED", "PARTLY_PAID", "PAID"]);
const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

/** "2025-26" for any date from 1 April 2025 to 31 March 2026. */
export function financialYear(date: string): string {
  const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7));
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** 0 for April through 11 for March. */
const fyMonth = (date: string) => (Number(date.slice(5, 7)) + 8) % 12;

/** [503, 504, 505, 507] -> "503–505, 507". */
export function compressRanges(nums: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < nums.length; i++) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    out.push(j === i ? String(nums[i]) : `${nums[i]}–${nums[j]}`);
    i = j;
  }
  return out.join(", ");
}

/**
 * Numbers from SERIES_START to the highest in use that no live invoice holds. A cancelled invoice
 * keeps its number; a deleted one gives it up until restored, so it is listed here.
 */
export function missingNumbers(used: number[]): number[] {
  const have = new Set(used);
  const top = Math.max(SERIES_START - 1, ...used);
  const gaps: number[] = [];
  for (let n = SERIES_START; n <= top; n++) if (!have.has(n)) gaps.push(n);
  return gaps;
}

export type YearRow = { fy: string; count: number; taxable: number; gst: number; billed: number; received: number };
export type ClientRow = { name: string; count: number; billed: number; outstanding: number };
export type OwedRow = { id: string; number?: number; client: string; date: string; balance: number; overdueDays: number };

export type InvoiceAnalytics = {
  years: string[];
  fy: string;
  current: { count: number; taxable: number; cgst: number; sgst: number; igst: number; gst: number; billed: number; received: number; clients: number; average: number };
  months: Array<{ label: string; billed: number; count: number }>;
  byYear: YearRow[];
  topClients: ClientRow[];
  statusCounts: Record<InvoiceStatus, number>;
  outstanding: { total: number; count: number; overdueTotal: number; overdueCount: number; list: OwedRow[] };
  missing: { numbers: number[]; text: string; deletedNumbers: number[] };
  drafts: number;
};

const SELECT = {
  id: true, number: true, date: true, dueDate: true, status: true, clientCompanyName: true, clientGstin: true,
  discountType: true, discountValue: true, gstEnabled: true, gstMode: true, gstRate: true, settingsOverride: true, deletedAt: true,
  items: { select: { id: true, description: true, unit: true, quantity: true, rate: true, discountPercent: true, gstRate: true } },
  payments: { select: { date: true, amount: true } },
  creditNotes: { select: { amount: true } },
} as const;

/** One invoice as the figures need it: the columns `SELECT` reads. */
export type AnalyticsRow = {
  id: string; number: number | null; date: string; dueDate: string | null; status: InvoiceStatus;
  clientCompanyName: string; clientGstin: string | null;
  discountType: string | null; discountValue: unknown; gstEnabled: boolean; gstMode: string; gstRate: unknown;
  settingsOverride: unknown; deletedAt: Date | null;
  items: Array<{ id: string; description: string; unit: string; quantity: unknown; rate: unknown; discountPercent: unknown; gstRate: unknown }>;
  payments: Array<{ date: string; amount: unknown }>;
  creditNotes: Array<{ amount: unknown }>;
};

export async function getInvoiceAnalytics(fyWanted?: string): Promise<InvoiceAnalytics> {
  await requireAdmin();
  const [rows, setting] = await Promise.all([
    prisma.invoice.findMany({ select: SELECT }),
    prisma.invoiceSetting.findUnique({ where: { id: "singleton" }, select: { settings: true } }),
  ]);
  return computeInvoiceAnalytics(rows as AnalyticsRow[], setting?.settings ?? {}, new Date(), fyWanted);
}

/** The arithmetic behind `getInvoiceAnalytics`, kept free of the database so it can be checked on its own. */
export function computeInvoiceAnalytics(rows: AnalyticsRow[], storedSettings: unknown, today: Date, fyWanted?: string): InvoiceAnalytics {
  const base = resolveSettings(storedSettings);

  const live = rows.filter((r) => !r.deletedAt);
  const thisFy = financialYear(today.toISOString().slice(0, 10));

  type Calc = { r: (typeof live)[number]; fy: string; taxable: number; cgst: number; sgst: number; igst: number; tax: number; total: number; owed: number };
  const billed: Calc[] = [];
  const statusCounts: Record<InvoiceStatus, number> = { DRAFT: 0, ISSUED: 0, PARTLY_PAID: 0, PAID: 0, CANCELLED: 0 };
  for (const r of live) {
    statusCounts[r.status] += 1;
    if (!BILLED.has(r.status)) continue;
    const items: InvoiceItem[] = r.items.map((i) => ({
      id: i.id, ...decodeItemText(i.description), unit: i.unit, quantity: Number(i.quantity), rate: Number(i.rate),
      discountPercent: i.discountPercent === null || i.discountPercent === undefined ? undefined : Number(i.discountPercent),
      gstRate: i.gstRate === null || i.gstRate === undefined ? undefined : Number(i.gstRate),
    }));
    const t = calcInvoiceTotals(
      {
        items, discountType: (r.discountType as "PERCENT" | "FLAT" | null) ?? null, discountValue: Number(r.discountValue),
        gstEnabled: r.gstEnabled, gstMode: r.gstMode === "IGST" ? "IGST" : "CGST_SGST", gstRate: Number(r.gstRate),
        payments: r.payments.map((p, n) => ({ id: String(n), date: p.date, amount: Number(p.amount) })),
      },
      effectiveInvoiceSettings(base, r.settingsOverride),
    );
    const credited = r.creditNotes.reduce((s, c) => s + Number(c.amount), 0);
    billed.push({
      r, fy: financialYear(r.date), taxable: t.taxable, cgst: t.cgst, sgst: t.sgst, igst: t.igst, tax: t.tax,
      total: t.grandTotal, owed: Math.max(0, round2(t.balance - credited)),
    });
  }

  // Received goes by when the money came in, not by the invoice it settled.
  const receivedByFy = new Map<string, number>();
  for (const r of live) {
    if (!BILLED.has(r.status)) continue;
    for (const p of r.payments) receivedByFy.set(financialYear(p.date), round2((receivedByFy.get(financialYear(p.date)) ?? 0) + Number(p.amount)));
  }

  const years = [...new Set([...billed.map((b) => b.fy), thisFy])].sort().reverse();
  const fy = fyWanted && years.includes(fyWanted) ? fyWanted : thisFy;

  const byYear: YearRow[] = years.map((y) => {
    const list = billed.filter((b) => b.fy === y);
    return {
      fy: y, count: list.length,
      taxable: round2(list.reduce((s, b) => s + b.taxable, 0)),
      gst: round2(list.reduce((s, b) => s + b.tax, 0)),
      billed: round2(list.reduce((s, b) => s + b.total, 0)),
      received: receivedByFy.get(y) ?? 0,
    };
  });

  const inFy = billed.filter((b) => b.fy === fy);
  const sum = (f: (b: Calc) => number) => round2(inFy.reduce((s, b) => s + f(b), 0));
  const clientKey = (b: Calc) => (b.r.clientGstin || b.r.clientCompanyName).trim().toUpperCase();
  const current = {
    count: inFy.length, taxable: sum((b) => b.taxable), cgst: sum((b) => b.cgst), sgst: sum((b) => b.sgst), igst: sum((b) => b.igst),
    gst: sum((b) => b.tax), billed: sum((b) => b.total), received: receivedByFy.get(fy) ?? 0,
    clients: new Set(inFy.map(clientKey)).size,
    average: inFy.length ? round2(sum((b) => b.total) / inFy.length) : 0,
  };

  const months = MONTHS.map((label, n) => {
    const list = inFy.filter((b) => fyMonth(b.r.date) === n);
    return { label, count: list.length, billed: round2(list.reduce((s, b) => s + b.total, 0)) };
  });

  const clients = new Map<string, ClientRow>();
  for (const b of inFy) {
    const k = clientKey(b);
    const c = clients.get(k) ?? { name: b.r.clientCompanyName, count: 0, billed: 0, outstanding: 0 };
    c.count += 1; c.billed = round2(c.billed + b.total); c.outstanding = round2(c.outstanding + b.owed);
    clients.set(k, c);
  }
  const topClients = [...clients.values()].sort((a, b) => b.billed - a.billed).slice(0, 10);

  const owing = billed.filter((b) => b.owed > 0);
  const list: OwedRow[] = owing
    .map((b) => ({
      id: b.r.id, number: b.r.number ?? undefined, client: b.r.clientCompanyName, date: b.r.date, balance: b.owed,
      overdueDays: overdueBy({ dueDate: b.r.dueDate ?? undefined, status: b.r.status }, today),
    }))
    .sort((a, b) => b.overdueDays - a.overdueDays || b.balance - a.balance);
  const overdue = list.filter((o) => o.overdueDays > 0);

  const used = live.map((r) => r.number).filter((n): n is number => n !== null);
  const gaps = missingNumbers(used);
  const deletedNumbers = new Set(rows.filter((r) => r.deletedAt && r.number !== null).map((r) => r.number as number));

  return {
    years, fy, current, months, byYear, topClients, statusCounts,
    outstanding: {
      total: round2(list.reduce((s, o) => s + o.balance, 0)), count: list.length,
      overdueTotal: round2(overdue.reduce((s, o) => s + o.balance, 0)), overdueCount: overdue.length,
      list: list.slice(0, 15),
    },
    missing: { numbers: gaps, text: compressRanges(gaps), deletedNumbers: gaps.filter((n) => deletedNumbers.has(n)) },
    drafts: statusCounts.DRAFT,
  };
}
