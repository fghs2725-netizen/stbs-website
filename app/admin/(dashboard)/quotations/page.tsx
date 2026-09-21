import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText, Search, SlidersHorizontal } from "lucide-react";
import { auth } from "@/auth";
import { listQuotations, type QuotationSort } from "@/lib/quotation-management";
import { duplicateAction } from "./actions";
import { Pagination } from "@/components/admin/Pagination";
import { DuplicateQuotationButton } from "@/components/quotation/DuplicateQuotationButton";
import { DeleteQuotationButton } from "@/components/quotation/DeleteQuotationButton";
import { formatINR } from "@/components/quotation/quotation-model";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState, FloatingAction, Pill } from "@/components/admin/shell/ui";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const SORTS: { key: QuotationSort; label: string }[] = [
  { key: "updated", label: "Last updated" },
  { key: "created", label: "Created" },
  { key: "reference", label: "Number" },
  { key: "client", label: "Client" },
];
const STATUSES = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "FINAL", label: "Final" },
];
const isSort = (v?: string): v is QuotationSort => SORTS.some((s) => s.key === v);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; sort?: string; dir?: string; from?: string; to?: string }>
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const p = await searchParams;
  const query = p.q || "";
  const statusFilter = p.status || "ALL";
  const pageNumber = Math.max(1, parseInt(p.page || "1", 10) || 1);
  const sort: QuotationSort = isSort(p.sort) ? p.sort : "updated";
  const dir = p.dir === "asc" ? "asc" : "desc";
  const from = p.from || "";
  const to = p.to || "";

  let rows: any[] = [];
  let total = 0;
  let totalPages = 1;
  let error = "";
  try {
    const result = await listQuotations(query, statusFilter, pageNumber, 20, { sort, dir, from, to });
    rows = result.rows;
    total = result.total;
    totalPages = result.totalPages;
  } catch {
    error = "Quotation history is unavailable.";
  }

  const outOfRange = !error && total > 0 && pageNumber > totalPages;
  const filtered = Boolean(query || from || to || statusFilter !== "ALL");
  const baseParams = { q: query || undefined, status: statusFilter === "ALL" ? undefined : statusFilter, from: from || undefined, to: to || undefined };
  // The status segment keeps the current search and dates; only the status changes.
  const statusHref = (key: string) => {
    const next = new URLSearchParams();
    Object.entries({ ...baseParams, status: key === "ALL" ? undefined : key }).forEach(([k, v]) => { if (v) next.set(k, v); });
    const qs = next.toString();
    return qs ? `/admin/quotations?${qs}` : "/admin/quotations";
  };

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Documents"
        title="Quotations"
        description="Search, review and continue quotation work."
        action={<span className="hidden lg:block"><Link href="/admin/quotations/new" className="a-btn a-btn-primary">New quotation</Link></span>}
      />

      <div className="flex flex-col gap-3">
        <form action="/admin/quotations" method="GET" role="search" className="flex gap-2">
          {statusFilter !== "ALL" && <input type="hidden" name="status" value={statusFilter} />}
          <div className="relative min-w-0 flex-1">
            <Search size={16} strokeWidth={1.75} aria-hidden className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2" style={{ color: "var(--a-faint)" }} />
            <label className="sr-only" htmlFor="quotation-search">Search quotations</label>
            <input id="quotation-search" name="q" defaultValue={query} placeholder="Reference, client, service" className="a-input a-input-search" />
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
          {filtered && <Link href="/admin/quotations" className="a-link text-[0.875rem]">Clear filters</Link>}
        </div>

        {/* Date range and sort are secondary: folded away so the list starts higher. */}
        <details className="a-card-flat px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.875rem] font-medium" style={{ color: "var(--a-body)" }}>
            <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
            Date range and sorting
          </summary>
          <form action="/admin/quotations" method="GET" className="mt-3 flex flex-wrap items-end gap-3">
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
            icon={FileText}
            title="Page out of range"
            description="That page goes past the last result."
            action={<Link href="/admin/quotations" className="a-btn a-btn-primary a-btn-sm">Go to page 1</Link>}
          />
        ) : rows.length === 0 && !error ? (
          <EmptyState
            icon={FileText}
            title={filtered ? "No matches" : "No quotations yet"}
            description={filtered ? "No quotations match these filters." : "Create the first quotation and it will appear here."}
            action={
              <Link href={filtered ? "/admin/quotations" : "/admin/quotations/new"} className="a-btn a-btn-primary a-btn-sm">
                {filtered ? "Clear filters" : "New quotation"}
              </Link>
            }
          />
        ) : (
          <ul className="a-divide">
            {rows.map((q) => (
              <li key={q.id} data-testid="quotation-row" className="p-4 sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/quotations/${q.id}`} className="truncate text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>
                        {q.client.companyName || "Unnamed client"}
                      </Link>
                      <Pill tone={q.status === "FINAL" ? "positive" : "warn"}>{q.status === "FINAL" ? "Final" : "Draft"}</Pill>
                    </div>
                    <p className="a-num mt-[3px] truncate text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
                      {q.quotationReference} · {day(q.createdAt)} · {q.itemCount} item{q.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="a-num shrink-0 text-[0.9375rem] font-semibold" style={{ color: "var(--a-ink)" }}>
                    {q.itemCount ? formatINR(q.amount) : "—"}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm"><Link href={`/admin/quotations/${q.id}`}>View</Link></Button>
                  {q.status === "DRAFT" && (
                    <Button asChild variant="secondary" size="sm"><Link href={`/admin/quotations/${q.id}/edit`}>Edit</Link></Button>
                  )}
                  <Button asChild variant="secondary" size="sm">
                    <a href={`/api/quotations/${q.id}/pdf`} download><Download className="size-4" />PDF</a>
                  </Button>
                  <form action={duplicateAction.bind(null, q.id)}>
                    <DuplicateQuotationButton />
                  </form>
                  <DeleteQuotationButton id={q.id} reference={q.quotationReference} status={q.status} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!error && (
          <Pagination
            page={Math.min(pageNumber, totalPages)}
            totalPages={totalPages}
            totalItems={total}
            basePath="/admin/quotations"
            params={{ ...baseParams, sort: sort === "updated" ? undefined : sort, dir: dir === "desc" ? undefined : dir }}
          />
        )}
      </div>

      <FloatingAction href="/admin/quotations/new" label="New quotation" />
    </div>
  );
}
