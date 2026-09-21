import Link from "next/link";
import { redirect } from "next/navigation";
import { ReceiptText, Search, SlidersHorizontal } from "lucide-react";
import { auth } from "@/auth";
import { listInvoices, type InvoiceSort } from "@/lib/invoice-management";
import { formatINR, overdueBy, type InvoiceStatus } from "@/components/invoice/invoice-model";
import { formatInvoiceNumber } from "@/lib/invoice-numbering";
import { Pagination } from "@/components/admin/Pagination";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState, FloatingAction, Pill } from "@/components/admin/shell/ui";
import { Button } from "@/components/ui/button";

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
];
const LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Draft", ISSUED: "Issued", PARTLY_PAID: "Part paid", PAID: "Paid", CANCELLED: "Cancelled",
};
const TONE: Record<InvoiceStatus, "neutral" | "positive" | "warn" | "brand"> = {
  DRAFT: "warn", ISSUED: "brand", PARTLY_PAID: "warn", PAID: "positive", CANCELLED: "neutral",
};
const isSort = (v?: string): v is InvoiceSort => SORTS.some((s) => s.key === v);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; sort?: string; dir?: string; from?: string; to?: string }>;
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

  let rows: Awaited<ReturnType<typeof listInvoices>>["rows"] = [];
  let total = 0;
  let totalPages = 1;
  let error = "";
  try {
    const result = await listInvoices(query, statusFilter, pageNumber, 20, { sort, dir, from, to });
    rows = result.rows;
    total = result.total;
    totalPages = result.totalPages;
  } catch {
    error = "Invoice history is unavailable.";
  }

  const outOfRange = !error && total > 0 && pageNumber > totalPages;
  const filtered = Boolean(query || from || to || statusFilter !== "ALL");
  const baseParams = {
    q: query || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    from: from || undefined,
    to: to || undefined,
  };
  const statusHref = (key: string) => {
    const next = new URLSearchParams();
    Object.entries({ ...baseParams, status: key === "ALL" ? undefined : key }).forEach(([k, v]) => { if (v) next.set(k, v); });
    const qs = next.toString();
    return qs ? `/admin/invoices?${qs}` : "/admin/invoices";
  };

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Documents"
        title="Invoices"
        description="Raise, issue and track payment on tax invoices."
        action={
          <span className="hidden items-center gap-2 lg:flex">
            <Link href="/admin/invoices/settings" className="a-btn">Settings</Link>
          </span>
        }
      />

      <div className="flex flex-col gap-3">
        <form action="/admin/invoices" method="GET" role="search" className="flex gap-2">
          {statusFilter !== "ALL" && <input type="hidden" name="status" value={statusFilter} />}
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

        <details className="a-card-flat px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.875rem] font-medium" style={{ color: "var(--a-body)" }}>
            <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
            Date range and sorting
          </summary>
          <form action="/admin/invoices" method="GET" className="mt-3 flex flex-wrap items-end gap-3">
            {query && <input type="hidden" name="q" value={query} />}
            {statusFilter !== "ALL" && <input type="hidden" name="status" value={statusFilter} />}
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
            title={filtered ? "No matches" : "No invoices yet"}
            description={
              filtered
                ? "No invoices match these filters."
                : "Open a quotation and raise the invoice from it. Numbering continues from 764."
            }
            action={
              filtered
                ? <Link href="/admin/invoices" className="a-btn a-btn-primary a-btn-sm">Clear filters</Link>
                : <Link href="/admin/quotations" className="a-btn a-btn-primary a-btn-sm">Go to quotations</Link>
            }
          />
        ) : (
          <ul className="a-divide">
            {rows.map((inv) => {
              const late = overdueBy(inv);
              return (
                <li key={inv.id} data-testid="invoice-row" className="p-4 sm:px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/invoices/${inv.id}`} className="truncate text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>
                          {inv.client.companyName || "Unnamed client"}
                        </Link>
                        <Pill tone={TONE[inv.status]}>{LABEL[inv.status]}</Pill>
                        {late > 0 && <Pill tone="warn">{late} day{late === 1 ? "" : "s"} overdue</Pill>}
                      </div>
                      <p className="a-num mt-[3px] truncate text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                        {inv.number ? `Invoice ${formatInvoiceNumber(inv.number)}` : "No number yet"} · {day(inv.createdAt)} · {inv.itemCount} item{inv.itemCount === 1 ? "" : "s"}
                        {inv.quotationReference ? ` · from ${inv.quotationReference}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="a-num text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>
                        {inv.itemCount ? formatINR(inv.grandTotal) : "—"}
                      </p>
                      {inv.paid > 0 && inv.status !== "CANCELLED" && (
                        <p className="a-num text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                          {inv.balance > 0 ? `${formatINR(inv.balance)} due` : "Settled"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm"><Link href={`/admin/invoices/${inv.id}`}>View</Link></Button>
                    {inv.number && (
                      <Button asChild variant="secondary" size="sm">
                        <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer">PDF</a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
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

    </div>
  );
}
