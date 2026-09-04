import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { listQuotations } from "@/lib/quotation-management";
import { duplicateAction } from "./actions";
import { Pagination } from "@/components/admin/Pagination";
import { DuplicateQuotationButton } from "@/components/quotation/DuplicateQuotationButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const p = await searchParams;
  const query = p.q || "";
  const statusFilter = p.status || "ALL";
  const pageNumber = Math.max(1, parseInt(p.page || "1", 10) || 1);

  let rows: any[] = [];
  let total = 0;
  let totalPages = 1;
  let error = "";
  try {
    const result = await listQuotations(query, statusFilter, pageNumber);
    rows = result.rows;
    total = result.total;
    totalPages = result.totalPages;
  } catch {
    error = "Quotation history is unavailable.";
  }

  const outOfRange = !error && total > 0 && pageNumber > totalPages;

  return (
    <div className="admin-page">
        <PageHeader eyebrow="Documents" title="Quotations" description="Search, review and continue quotation work." action={<Button asChild><Link href="/admin/quotations/new"><Plus className="size-4" />New quotation</Link></Button>} />

        <form className="admin-card flex flex-col sm:flex-row flex-wrap gap-3 p-4">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search reference, client, service"
            className="admin-input min-w-0 flex-1"
          />
          <select name="status" defaultValue={statusFilter} aria-label="Filter by status" className="admin-input w-auto sm:text-sm">
            <option value="ALL">ALL</option>
            <option value="DRAFT">DRAFT</option>
            <option value="FINAL">FINAL</option>
          </select>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        {error && <p className="border border-red-400/40 p-4 text-red-300">{error}</p>}

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
              {rows.map((q) => (
                <article key={q.id} data-testid="quotation-row" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-white/[.08] p-4 sm:p-5 last:border-b-0">
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <Link href={`/admin/quotations/${q.id}`} className="font-semibold text-signal truncate hover:text-white">
                      {q.quotationReference}
                    </Link>
                    <p className="text-sm text-zinc-300 truncate">{q.client.companyName || "Unnamed client"} · {q.serviceType}</p>
                    <p className="text-sm text-white/45">
                      {q.status} · {q.itemCount} item{q.itemCount === 1 ? "" : "s"} · Updated {q.updatedAt}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 ml-auto">
                    <Button asChild size="sm">
                      <Link href={`/admin/quotations/${q.id}`}>Open</Link>
                    </Button>
                    {q.status === "DRAFT" && (
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/quotations/${q.id}/edit`}>Edit</Link>
                      </Button>
                    )}
                    <form action={duplicateAction.bind(null, q.id)}>
                      <DuplicateQuotationButton />
                    </form>
                  </div>
                </article>
              ))}
              {!rows.length && !error && (
                <p className="py-12 text-white/50">No quotations found. Try a different search or create a new quotation.</p>
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
            params={{ q: query, status: statusFilter === "ALL" ? undefined : statusFilter }}
          />
        )}
    </div>
  );
}
