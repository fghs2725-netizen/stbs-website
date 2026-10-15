import Link from "next/link";
import { redirect } from "next/navigation";
import { ReceiptText, Search, SlidersHorizontal } from "lucide-react";
import { auth } from "@/auth";
import { getInvoiceConfig, listInvoices, type InvoiceFilter, type InvoiceSort } from "@/lib/invoice-management";
import { getInvoiceAnalytics, type InvoiceAnalytics } from "@/lib/invoice-analytics";
import { shareSubjectFromInvoice } from "@/components/invoice/share/invoice-share";
import { overdueBy } from "@/components/invoice/invoice-model";
import { formatInvoiceNumber } from "@/lib/invoice-numbering";
import { Pagination } from "@/components/admin/Pagination";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState, FloatingAction } from "@/components/admin/shell/ui";
import { InvoiceSummaryStrip } from "@/components/invoice/analytics/InvoiceAnalyticsView";
import { Button } from "@/components/ui/button";
import { InvoiceList, type InvoiceListRow } from "@/components/invoice/list/InvoiceList";

export const dynamic = "force-dynamic";

const SORTS: { key: InvoiceSort; label: string }[] = [
  { key: "updated", label: "Last updated" },
  { key: "created", label: "Created" },
  { key: "number", label: "Invoice number" },
  { key: "client", label: "Client" },
  { key: "due", label: "Due date" },
];
const STATUSES = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "ISSUED", label: "Issued" },
  { key: "PARTLY_PAID", label: "Part paid" },
  { key: "PAID", label: "Paid" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "DELETED", label: "Deleted" },
];
const KINDS = [
  { key: "", label: "All bills" },
  { key: "final", label: "Final" },
  { key: "cash", label: "Cash" },
  { key: "draft", label: "Drafts" },
];
const CA = [
  { key: "", label: "CA: any" },
  { key: "unsent", label: "Not sent to CA" },
  { key: "sent", label: "Sent to CA" },
];
const isSort = (v?: string): v is InvoiceSort => SORTS.some((s) => s.key === v);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; sort?: string; dir?: string; from?: string; to?: string; month?: string; kind?: string; ca?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const p = await searchParams;
  const query = p.q || "";
  const statusFilter = p.status || "ALL";
  const pageNumber = Math.max(1, parseInt(p.page || "1", 10) || 1);
  const sort: InvoiceSort = isSort(p.sort) ? p.sort : "updated";
  const dir = p.dir === "asc" ? "asc" : "desc";
  const from = p.from || "";
  const to = p.to || "";
  const month = /^\d{4}-\d{2}$/.test(p.month ?? "") ? p.month! : "";
  const kind = p.kind === "final" || p.kind === "cash" || p.kind === "draft" ? p.kind : undefined;
  const ca = p.ca === "sent" || p.ca === "unsent" ? p.ca : undefined;

  const { settings } = await getInvoiceConfig();
  let rows: Awaited<ReturnType<typeof listInvoices>>["rows"] = [];
  let total = 0;
  let totalPages = 1;
  let error = "";
  try {
    const result = await listInvoices(query, statusFilter, pageNumber, 20, { sort, dir, from, to, month, kind, ca });
    rows = result.rows;
    total = result.total;
    totalPages = result.totalPages;
  } catch {
    error = "Invoice history is unavailable.";
  }

  // The strip above the list is a convenience: if it fails, the list still loads.
  let stats: InvoiceAnalytics | null = null;
  try {
    stats = await getInvoiceAnalytics();
  } catch {
    stats = null;
  }
  const inDeleted = statusFilter === "DELETED";

  const outOfRange = !error && total > 0 && pageNumber > totalPages;
  const filtered = Boolean(query || from || to || month || kind || ca || statusFilter !== "ALL");
  const baseParams: Record<string, string | undefined> = {
    q: query || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    from: from || undefined,
    to: to || undefined,
    month: month || undefined,
    kind,
    ca,
  };
  const hrefWith = (change: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    Object.entries({ ...baseParams, ...change }).forEach(([k, v]) => { if (v) next.set(k, v); });
    const qs = next.toString();
    return qs ? `/admin/invoices?${qs}` : "/admin/invoices";
  };
  const statusHref = (key: string) => hrefWith({ status: key === "ALL" ? undefined : key });
  const hidden = (skip: string[]) =>
    Object.entries(baseParams).filter(([k, v]) => v && !skip.includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
  // The same filters for the bulk actions: "every bill matching" means exactly what the list shows.
  const filter: InvoiceFilter = { search: query, status: statusFilter, from, to, month, kind, ca };
  const filterQuery = new URLSearchParams(Object.entries(baseParams).filter((e): e is [string, string] => Boolean(e[1]))).toString();
  const listRows: InvoiceListRow[] = rows.map((inv) => ({
    id: inv.id!,
    title: inv.client.companyName || "Unnamed client",
    status: inv.status,
    isCash: Boolean(inv.isCash),
    meta: `${inv.number ? `Invoice ${formatInvoiceNumber(inv.number)}` : inv.isCash && inv.status !== "DRAFT" ? "Cash invoice" : "No number yet"} · ${day(inv.date)} · ${inv.itemCount} item${inv.itemCount === 1 ? "" : "s"}${inv.quotationReference ? ` · from ${inv.quotationReference}` : ""}`,
    late: overdueBy(inv),
    itemCount: inv.itemCount,
    grandTotal: inv.grandTotal,
    paid: inv.paid,
    balance: inv.balance,
    sentToCaAt: inv.sentToCaAt,
    subject: shareSubjectFromInvoice(inv, settings, { grandTotal: inv.grandTotal, balance: inv.balance }),
  }));

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Documents"
        title="Invoices"
        description="Raise, issue and track payment on tax invoices."
        action={
          <span className="hidden items-center gap-2 lg:flex">
            <Link href="/admin/invoices/analytics" className="a-btn">Analytics</Link>
            <Link href="/admin/invoices/settings" className="a-btn">Settings</Link>
            <Link href="/admin/invoices/new" className="a-btn a-btn-primary">New invoice</Link>
          </span>
        }
      />

      {stats && <InvoiceSummaryStrip stats={stats} />}

      <div className="flex flex-col gap-3">
        <form action="/admin/invoices" method="GET" role="search" className="flex gap-2">
          {hidden(["q"])}
          <div className="relative min-w-0 flex-1">
            <Search size={16} strokeWidth={1.75} aria-hidden className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2" style={{ color: "var(--a-faint)" }} />
            <label className="sr-only" htmlFor="invoice-search">Search invoices</label>
            <input id="invoice-search" name="q" defaultValue={query} placeholder="Number, client, quotation" className="a-input a-input-search" />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="a-segment" aria-label="Filter by status">
            {STATUSES.map((s) => (
              <Link key={s.key} href={statusHref(s.key)} data-active={statusFilter === s.key} aria-current={statusFilter === s.key ? "page" : undefined}>
                {s.label}
              </Link>
            ))}
          </nav>
          {filtered && <Link href="/admin/invoices" className="a-link text-[0.875rem]">Clear filters</Link>}
        </div>

        {!inDeleted && (
          <div className="flex flex-wrap items-center gap-3">
            <nav className="a-segment" aria-label="Filter by bill type">
              {KINDS.map((k) => (
                <Link key={k.key || "all"} href={hrefWith({ kind: k.key || undefined })} data-active={(kind ?? "") === k.key} aria-current={(kind ?? "") === k.key ? "page" : undefined}>
                  {k.label}
                </Link>
              ))}
            </nav>
            <nav className="a-segment" aria-label="Filter by CA">
              {CA.map((c) => (
                <Link key={c.key || "any"} href={hrefWith({ ca: c.key || undefined })} data-active={(ca ?? "") === c.key} aria-current={(ca ?? "") === c.key ? "page" : undefined}>
                  {c.label}
                </Link>
              ))}
            </nav>
            <form action="/admin/invoices" method="GET" className="flex items-center gap-2">
              {hidden(["month"])}
              <label className="sr-only" htmlFor="invoice-month">Month</label>
              <input id="invoice-month" type="month" name="month" defaultValue={month} className="a-input w-auto" />
              <Button type="submit" variant="secondary" size="sm">Show month</Button>
              {month && <Link href={hrefWith({ month: undefined })} className="a-link whitespace-nowrap text-[0.875rem]">All months</Link>}
            </form>
          </div>
        )}

        <details className="a-card-flat px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.875rem] font-medium" style={{ color: "var(--a-body)" }}>
            <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
            Date range and sorting
          </summary>
          <form action="/admin/invoices" method="GET" className="mt-3 flex flex-wrap items-end gap-3">
            {hidden(["from", "to"])}
            <label className="a-label">Created from
              <input type="date" name="from" defaultValue={from} className="a-input mt-1 w-auto" />
            </label>
            <label className="a-label">Created to
              <input type="date" name="to" defaultValue={to} className="a-input mt-1 w-auto" />
            </label>
            <label className="a-label">Sort by
              <select name="sort" defaultValue={sort} className="a-input mt-1 w-auto">
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <label className="a-label">Order
              <select name="dir" defaultValue={dir} className="a-input mt-1 w-auto">
                <option value="desc">Newest / Z-A first</option>
                <option value="asc">Oldest / A-Z first</option>
              </select>
            </label>
            <Button type="submit" variant="secondary">Apply</Button>
          </form>
        </details>
      </div>

      {error && <p role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</p>}

      <div className="a-card overflow-hidden">
        {outOfRange ? (
          <EmptyState
            icon={ReceiptText}
            title="Page out of range"
            description="That page goes past the last result."
            action={<Link href="/admin/invoices" className="a-btn a-btn-primary a-btn-sm">Go to page 1</Link>}
          />
        ) : rows.length === 0 && !error ? (
          <EmptyState
            icon={ReceiptText}
            title={inDeleted ? "Nothing in Deleted" : filtered ? "No matches" : "No invoices yet"}
            description={
              inDeleted
                ? "Deleted invoices appear here, ready to restore or delete for good."
                : filtered
                ? "No invoices match these filters."
                : "Raise one from a quotation, or start a fresh invoice. Numbering continues from 764."
            }
            action={
              filtered
                ? <Link href="/admin/invoices" className="a-btn a-btn-primary a-btn-sm">Clear filters</Link>
                : <Link href="/admin/invoices/new" className="a-btn a-btn-primary a-btn-sm">New invoice</Link>
            }
          />
        ) : (
          <InvoiceList rows={listRows} total={total} filter={filter} filterQuery={filterQuery} inDeleted={inDeleted} />
        )}

        {!error && (
          <Pagination
            page={Math.min(pageNumber, totalPages)}
            totalPages={totalPages}
            totalItems={total}
            basePath="/admin/invoices"
            params={{ ...baseParams, sort: sort === "updated" ? undefined : sort, dir: dir === "desc" ? undefined : dir }}
          />
        )}
      </div>

      <FloatingAction href="/admin/invoices/new" label="New invoice" />
    </div>
  );
}
