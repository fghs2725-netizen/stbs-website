import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp, Download, Plus } from "lucide-react";
import { auth } from "@/auth";
import { listQuotations, type QuotationSort } from "@/lib/quotation-management";
import { duplicateAction } from "./actions";
import { Pagination } from "@/components/admin/Pagination";
import { DuplicateQuotationButton } from "@/components/quotation/DuplicateQuotationButton";
import { DeleteQuotationButton } from "@/components/quotation/DeleteQuotationButton";
import { formatINR } from "@/components/quotation/quotation-model";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const SORTS: { key: QuotationSort; label: string }[] = [
  { key: "updated", label: "Last updated" },
  { key: "created", label: "Created" },
  { key: "reference", label: "Number" },
  { key: "client", label: "Client" },
];
const isSort = (v?: string): v is QuotationSort => SORTS.some((s) => s.key === v);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

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
  const sortHref = (key: QuotationSort) => {
    const next = new URLSearchParams();
    Object.entries({ ...baseParams, sort: key, dir: sort === key && dir === "desc" ? "asc" : "desc" }).forEach(([k, v]) => { if (v) next.set(k, v); });
    return `/admin/quotations?${next.toString()}`;
  };

  return (
    <div className="admin-page">
        <PageHeader eyebrow="Documents" title="Quotations" description="Search, review and continue quotation work." action={<Button asChild><Link href="/admin/quotations/new"><Plus className="size-4" />New quotation</Link></Button>} />

        <form className="admin-card flex flex-col sm:flex-row flex-wrap items-end gap-3 p-4">
          <label className="min-w-0 flex-1 basis-56 text-xs text-white/50">Search
            <input name="q" defaultValue={query} placeholder="Reference, client, service" className="admin-input mt-1 w-full" />
          </label>
          <label className="text-xs text-white/50">Status
            <select name="status" defaultValue={statusFilter} className="admin-input mt-1 block w-auto sm:text-sm">
              <option value="ALL">All</option>
              <option value="DRAFT">Draft</option>
              <option value="FINAL">Final</option>
            </select>
          </label>
          <label className="text-xs text-white/50">Created from
            <input type="date" name="from" defaultValue={from} className="admin-input mt-1 block w-auto sm:text-sm" />
          </label>
          <label className="text-xs text-white/50">Created to
            <input type="date" name="to" defaultValue={to} className="admin-input mt-1 block w-auto sm:text-sm" />
          </label>
          <label className="text-xs text-white/50">Sort by
            <select name="sort" defaultValue={sort} className="admin-input mt-1 block w-auto sm:text-sm">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/50">Order
            <select name="dir" defaultValue={dir} className="admin-input mt-1 block w-auto sm:text-sm">
              <option value="desc">Newest / Z-A first</option>
              <option value="asc">Oldest / A-Z first</option>
            </select>
          </label>
          <Button type="submit" variant="secondary">Apply</Button>
          {filtered && <Button asChild variant="secondary"><Link href="/admin/quotations">Clear</Link></Button>}
        </form>

        {error && <p role="alert" className="border border-red-400/40 p-4 text-red-300">{error}</p>}

        <div className="admin-card overflow-hidden">
          {outOfRange ? (
            <div className="flex flex-col items-center border border-white/10 bg-white/[.035] p-8 text-center">
              <h2 className="text-lg font-bold uppercase">Page out of range</h2>
              <p className="mt-1 text-sm text-white/50">That page goes past the last result. Head back to the first page.</p>
              <Link href="/admin/quotations" className="mt-4 inline-flex min-h-[40px] items-center bg-signal px-5 py-3 text-xs font-bold uppercase tracking-wider text-black">
                Go to page 1
              </Link>
            </div>
          ) : (
            <>
              {rows.length > 0 && (
                <div className="hidden items-center gap-4 border-b border-white/[.08] px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/40 md:flex">
                  <Link href={sortHref("reference")} className="inline-flex w-44 items-center gap-1 hover:text-white" aria-label="Sort by number">Number{sort === "reference" && (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}</Link>
                  <Link href={sortHref("client")} className="inline-flex min-w-0 flex-1 items-center gap-1 hover:text-white" aria-label="Sort by client">Client{sort === "client" && (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}</Link>
                  <Link href={sortHref("created")} className="inline-flex w-24 items-center gap-1 hover:text-white" aria-label="Sort by created date">Created{sort === "created" && (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}</Link>
                  <span className="w-32 text-right">Amount</span>
                  <span className="w-20">Status</span>
                  <span className="w-[22rem]">Actions</span>
                </div>
              )}
              {rows.map((q) => (
                <article key={q.id} data-testid="quotation-row" className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-white/[.08] p-4 sm:px-5 last:border-b-0">
                  <div className="w-full md:w-44">
                    <Link href={`/admin/quotations/${q.id}`} className="font-semibold text-signal truncate hover:text-white">
                      {q.quotationReference}
                    </Link>
                  </div>
                  <div className="min-w-0 flex-1 basis-full md:basis-0">
                    <p className="truncate text-sm text-zinc-200">{q.client.companyName || "Unnamed client"}</p>
                    <p className="truncate text-xs text-white/45">{q.serviceType} · {q.itemCount} item{q.itemCount === 1 ? "" : "s"}</p>
                  </div>
                  <span className="text-sm text-white/60 md:w-24">{day(q.createdAt)}</span>
                  <span className="text-sm font-semibold tabular-nums md:w-32 md:text-right">{q.itemCount ? formatINR(q.amount) : "—"}</span>
                  <span className={`text-xs font-semibold md:w-20 ${q.status === "FINAL" ? "text-emerald-300" : "text-amber-200"}`}>{q.status === "FINAL" ? "Final" : "Draft"}</span>
                  <div className="flex flex-wrap gap-2 md:w-[22rem]">
                    <Button asChild size="sm">
                      <Link href={`/admin/quotations/${q.id}`}>View</Link>
                    </Button>
                    {q.status === "DRAFT" && (
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/quotations/${q.id}/edit`}>Edit</Link>
                      </Button>
                    )}
                    <Button asChild variant="secondary" size="sm">
                      <a href={`/api/quotations/${q.id}/pdf`} download><Download className="size-4" />PDF</a>
                    </Button>
                    <form action={duplicateAction.bind(null, q.id)}>
                      <DuplicateQuotationButton />
                    </form>
                    <DeleteQuotationButton id={q.id} reference={q.quotationReference} status={q.status} />
                  </div>
                </article>
              ))}
              {!rows.length && !error && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <p className="text-white/60">{filtered ? "No quotations match these filters." : "No quotations yet."}</p>
                  <Button asChild size="sm"><Link href={filtered ? "/admin/quotations" : "/admin/quotations/new"}>{filtered ? "Clear filters" : "Create the first quotation"}</Link></Button>
                </div>
              )}
            </>
          )}
        </div>

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
  );
}
