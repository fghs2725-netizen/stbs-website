/**
 * Read-only lookups the admin AI may call. Each one does its sums in code and hands back a small
 * JSON summary, so the model never adds up figures itself and never sees more rows than it needs.
 *
 * What never goes to the AI: phone numbers, email addresses, and website visitors' names. Clients
 * appear by company name; workers by name, since "how much do I owe Ravi" needs it.
 */
import { prisma } from "@/lib/prisma";
import { ANALYTICS_SELECT, BILLED, getInvoiceAnalytics, rowTotals, type AnalyticsRow } from "@/lib/invoice-analytics";
import { resolveSettings } from "@/components/invoice/invoice-settings";
import { overdueBy } from "@/components/invoice/invoice-model";
import { listQuotations } from "@/lib/quotation-management";
import { listExpenses, listWorkers } from "@/lib/worker-management";
import { describeBalance, monthOf, todayIST, workerTotals } from "@/lib/worker-ledger";
import type { ToolDef } from "./llm";
import { addDays, fyStart, withoutContacts } from "./helpers";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const str = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** The range a lookup covers: what was asked for, else the given default. */
export function range(args: Record<string, unknown>, fallbackFrom: string, today: string) {
  const from = isDay(args.from) ? args.from : fallbackFrom;
  const to = isDay(args.to) ? args.to : today;
  return from <= to ? { from, to } : { from: to, to: from };
}

/** Adds up a list into { key: amount }, largest first. */
export function totalsBy<T>(list: T[], key: (x: T) => string, amount: (x: T) => number) {
  const map = new Map<string, number>();
  for (const x of list) map.set(key(x) || "Other", round2((map.get(key(x) || "Other") ?? 0) + amount(x)));
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1]));
}

const DATE_ARGS = {
  from: { type: "string", description: "First day, YYYY-MM-DD" },
  to: { type: "string", description: "Last day, YYYY-MM-DD" },
};

export function businessTools(now = new Date()): ToolDef[] {
  const today = todayIST(now);
  const monthStart = `${today.slice(0, 7)}-01`;

  return [
    {
      name: "overview",
      description:
        "Invoice figures for one financial year (April to March): billed, GST, received, month by month, top clients, money still owed and overdue, drafts, and gaps in the bill numbers. Use first for questions about sales, billing, income or clients.",
      parameters: { type: "object", properties: { financialYear: { type: "string", description: 'Like "2025-26". Leave out for the current year.' } } },
      run: async (args) => {
        const a = await getInvoiceAnalytics(str(args.financialYear, 7) || undefined);
        return {
          financialYear: a.fy,
          yearsWithBills: a.years,
          bills: a.current.count,
          billed: a.current.billed,
          taxable: a.current.taxable,
          gst: a.current.gst,
          receivedThisYear: a.current.received,
          averageBill: a.current.average,
          cashBills: a.current.cash,
          clients: a.current.clients,
          months: a.months.filter((m) => m.count),
          topClients: a.topClients,
          owedNow: { total: a.outstanding.total, bills: a.outstanding.count, overdueTotal: a.outstanding.overdueTotal, overdueBills: a.outstanding.overdueCount },
          draftInvoices: a.drafts,
          missingBillNumbers: a.missing.text || "none",
          earlierYears: a.byYear.filter((y) => y.fy !== a.fy).slice(0, 3),
        };
      },
    },
    {
      name: "invoices",
      description:
        "List invoices with each one's total, money received and balance. Filter by date (invoice date), client name and status. Defaults to the current financial year.",
      parameters: {
        type: "object",
        properties: {
          ...DATE_ARGS,
          client: { type: "string", description: "Part of the client's company name" },
          status: { type: "string", enum: ["all", "unpaid", "overdue", "paid", "draft", "cancelled"] },
        },
      },
      run: async (args) => {
        const { from, to } = range(args, fyStart(today), today);
        const client = str(args.client);
        const rows = (await prisma.invoice.findMany({
          where: { deletedAt: null, date: { gte: from, lte: to }, ...(client ? { clientCompanyName: { contains: client, mode: "insensitive" } } : {}) },
          select: ANALYTICS_SELECT,
          orderBy: { date: "desc" },
        })) as AnalyticsRow[];
        const settings = resolveSettings((await prisma.invoiceSetting.findUnique({ where: { id: "singleton" }, select: { settings: true } }))?.settings ?? {});
        return summariseInvoices(rows, settings, str(args.status, 10) || "all", now, { from, to });
      },
    },
    {
      name: "payments",
      description: "Money received against invoices between two dates (by the day it came in), with totals by client and by method. Defaults to this month.",
      parameters: { type: "object", properties: DATE_ARGS },
      run: async (args) => {
        const { from, to } = range(args, monthStart, today);
        const list = await prisma.invoicePayment.findMany({
          where: { date: { gte: from, lte: to }, invoice: { deletedAt: null, status: { in: [...BILLED] } } },
          select: { date: true, amount: true, method: true, invoice: { select: { number: true, isCash: true, clientCompanyName: true } } },
          orderBy: { date: "desc" },
        });
        const rows = list.map((p) => ({ date: p.date, amount: Number(p.amount), method: p.method ?? "", client: p.invoice.clientCompanyName, bill: p.invoice.isCash ? "cash bill" : p.invoice.number ?? "draft" }));
        return {
          from, to, count: rows.length,
          total: round2(rows.reduce((s, r) => s + r.amount, 0)),
          byClient: totalsBy(rows, (r) => r.client, (r) => r.amount),
          byMethod: totalsBy(rows, (r) => r.method, (r) => r.amount),
          latest: rows.slice(0, 30),
        };
      },
    },
    {
      name: "quotations",
      description: "List quotations with their amounts. Filter by status, by created date, or by text in the reference, client or service.",
      parameters: {
        type: "object",
        properties: { ...DATE_ARGS, status: { type: "string", enum: ["ALL", "DRAFT", "FINAL"] }, search: { type: "string" } },
      },
      run: async (args) => {
        const status = ["DRAFT", "FINAL"].includes(str(args.status, 5)) ? str(args.status, 5) : "ALL";
        const page = await listQuotations(str(args.search), status, 1, 40, { from: isDay(args.from) ? args.from : undefined, to: isDay(args.to) ? args.to : undefined });
        return {
          matching: page.total,
          shown: page.rows.length,
          totalValueShown: round2(page.rows.reduce((s, r) => s + (r.grandTotal || 0), 0)),
          quotations: page.rows.map((r) => ({
            reference: r.quotationReference, date: r.quotationDate, client: r.client.companyName,
            service: r.serviceType === "Custom" ? r.customServiceType : r.serviceType, status: r.status, amount: r.grandTotal,
          })),
        };
      },
    },
    {
      name: "expenses",
      description: "Business expenses between two dates: total, by category, and the largest ones. Defaults to this month.",
      parameters: { type: "object", properties: DATE_ARGS },
      run: async (args) => {
        const { from, to } = range(args, monthStart, today);
        const list = await listExpenses(from, to);
        return {
          from, to, count: list.length,
          total: round2(list.reduce((s, e) => s + e.amount, 0)),
          byCategory: totalsBy(list, (e) => e.category, (e) => e.amount),
          largest: [...list].sort((a, b) => b.amount - a.amount).slice(0, 15).map((e) => ({ date: e.date, amount: e.amount, category: e.category, note: [e.description, e.forWhat].filter(Boolean).join(" · ") })),
        };
      },
    },
    {
      name: "enquiries",
      description: "Website enquiries between two dates: how many, how many are unread, what service and which places. Defaults to the last 30 days.",
      parameters: { type: "object", properties: DATE_ARGS },
      run: async (args) => {
        const { from, to } = range(args, addDays(today, -30), today);
        const list = await prisma.enquiry.findMany({
          where: { createdAt: { gte: new Date(`${from}T00:00:00+05:30`), lte: new Date(`${to}T23:59:59+05:30`) } },
          select: { service: true, location: true, organisation: true, details: true, readAt: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        });
        return {
          from, to, count: list.length, unread: list.filter((e) => !e.readAt).length,
          byService: totalsBy(list, (e) => e.service, () => 1),
          byPlace: totalsBy(list, (e) => e.location, () => 1),
          latest: list.slice(0, 20).map((e) => ({ date: todayIST(e.createdAt), service: e.service, place: e.location, organisation: withoutContacts(e.organisation ?? ""), details: withoutContacts(e.details ?? "").slice(0, 140), read: Boolean(e.readAt) })),
        };
      },
    },
    {
      name: "workers",
      description: "Each worker's balance (what the business owes them, or their advance), and this month's work and payments.",
      parameters: { type: "object", properties: {} },
      run: async () => {
        const month = today.slice(0, 7);
        const workers = await listWorkers();
        const rows = workers.map((w) => {
          const b = describeBalance(workerTotals(w.openingBalance, w.entries).balance);
          const thisMonth = w.entries.filter((e) => monthOf(e.date) === month);
          return {
            name: w.name, role: w.role ?? "",
            balance: b.kind === "TO_PAY" ? `owed to worker ₹${b.amount}` : b.kind === "ADVANCE" ? `advance with worker ₹${b.amount}` : "settled",
            workThisMonth: round2(thisMonth.filter((e) => e.kind === "WORK").reduce((s, e) => s + e.amount, 0)),
            paidThisMonth: round2(thisMonth.filter((e) => e.kind === "PAYMENT").reduce((s, e) => s + e.amount, 0)),
          };
        });
        const balances = workers.map((w) => workerTotals(w.openingBalance, w.entries).balance);
        return {
          workers: rows,
          totalOwedToWorkers: round2(balances.filter((b) => b > 0).reduce((s, b) => s + b, 0)),
          totalAdvances: round2(-balances.filter((b) => b < 0).reduce((s, b) => s + b, 0)),
        };
      },
    },
  ];
}

/** The arithmetic behind the `invoices` tool, kept free of the database so it can be tested. */
export function summariseInvoices(rows: AnalyticsRow[], settings: ReturnType<typeof resolveSettings>, status: string, now: Date, span: { from: string; to: string }) {
  const all = rows.map((r) => {
    const t = rowTotals(r, settings);
    const credited = r.creditNotes.reduce((s, c) => s + Number(c.amount), 0);
    const billed = BILLED.has(r.status);
    const balance = billed ? Math.max(0, round2(t.balance - credited)) : 0;
    return {
      bill: r.isCash ? "cash bill" : r.number ?? "draft",
      date: r.date, client: r.clientCompanyName, status: r.status,
      total: t.grandTotal, received: round2(t.grandTotal - t.balance), balance,
      overdueDays: balance > 0 ? overdueBy({ dueDate: r.dueDate ?? undefined, status: r.status }, now) : 0,
    };
  });
  const keep = all.filter((i) => {
    switch (status) {
      case "unpaid": return i.balance > 0;
      case "overdue": return i.balance > 0 && i.overdueDays > 0;
      case "paid": return i.status === "PAID";
      case "draft": return i.status === "DRAFT";
      case "cancelled": return i.status === "CANCELLED";
      default: return true;
    }
  });
  const billedOnes = keep.filter((i) => BILLED.has(i.status as never));
  return {
    ...span, status, count: keep.length,
    billed: round2(billedOnes.reduce((s, i) => s + i.total, 0)),
    received: round2(billedOnes.reduce((s, i) => s + i.received, 0)),
    stillOwed: round2(billedOnes.reduce((s, i) => s + i.balance, 0)),
    note: keep.length > 40 ? `Showing the 40 newest of ${keep.length}; the totals cover all of them.` : undefined,
    invoices: keep.slice(0, 40),
  };
}
