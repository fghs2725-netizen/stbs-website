import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listQuotations } from "@/lib/quotation-management";
import { duplicateAction } from "./actions";
import { AdminBackLink } from "@/components/admin-back-link";
import { Pagination } from "@/components/admin/Pagination";
import { DuplicateQuotationButton } from "@/components/quotation/DuplicateQuotationButton";

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
    // Bounded, paginated query (was unbounded fetch of every quotation).
    const result = await listQuotations(query, statusFilter, pageNumber);
    rows = result.rows;
    total = result.total;
    totalPages = result.totalPages;
  } catch {
    error = "Quotation history is unavailable.";
  }

  // Same rationale as the documents page: a page past the last result shows
  // an explanatory notice instead of an empty list under a clamped footer.
  const outOfRange = !error && total > 0 && pageNumber > totalPages;

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 py-8">
          <div>
            <AdminBackLink href="/admin" label="Admin dashboard" />
            <h1 className="mt-5 font-display text-4xl font-bold uppercase">Quotations</h1>
            {/* IA signpost: quotations created through the document engine
                live in Documents; this list is the legacy quotation system. */}
            <p className="mt-2 text-sm text-white/50">
              Legacy quotation engine ·{" "}
              <Link href="/admin/documents?type=QUOTATION" className="text-signal underline underline-offset-4 hover:text-signal/80">
                document-based quotations live in Documents
              </Link>
            </p>
          </div>
          <Link href="/admin/quotations/new" className="min-h-[40px] inline-flex items-center bg-signal px-5 py-3 text-xs font-bold uppercase tracking-wider text-black">
            New quotation
          </Link>
        </div>

        <form className="flex flex-col sm:flex-row flex-wrap gap-3 py-6">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search reference, client, service"
            className="min-h-[40px] min-w-0 flex-1 bg-white/10 px-4 py-3 rounded-none text-base sm:text-sm"
          />
          <select name="status" defaultValue={statusFilter} aria-label="Filter by status" className="min-h-[40px] bg-white/10 px-4 py-3 text-sm">
            <option value="ALL">ALL</option>
            <option value="DRAFT">DRAFT</option>
            <option value="FINAL">FINAL</option>
          </select>
          <button className="min-h-[40px] border border-signal px-5 py-3 text-sm text-signal">SEARCH</button>
        </form>

        {error && <p className="border border-red-400/40 p-4 text-red-300">{error}</p>}

        <div className="grid gap-3">
          {outOfRange ? (
            <div className="border border-white/10 bg-white/[.035] p-8 text-center">
              <h2 className="text-lg font-bold uppercase">Page out of range</h2>
              <p className="mt-1 text-sm text-white/50">That page goes past the last result. Head back to the first page.</p>
              <Link href="/admin/quotations" className="mt-4 inline-flex min-h-[40px] items-center bg-signal px-5 py-3 text-xs font-bold uppercase tracking-wider text-black">
                Go to page 1
              </Link>
            </div>
          ) : (
            <>
              {rows.map((q) => (
                <article key={q.id} data-testid="quotation-row" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border border-white/10 bg-white/[.035] p-5">
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <p className="font-bold text-signal truncate">{q.quotationReference}</p>
                    <p className="truncate">{q.client.companyName || "Unnamed client"} · {q.serviceType}</p>
                    <p className="text-sm text-white/45">
                      {q.status} · {q.itemCount} item{q.itemCount === 1 ? "" : "s"} · Updated {q.updatedAt}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 ml-auto">
                    {/* Single primary action: OPEN. The old "PDF" button pointed
                        at the same detail page and was removed as a duplicate. */}
                    <Link href={`/admin/quotations/${q.id}`} className="bg-signal min-h-[40px] inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-black">
                      Open
                    </Link>
                    {q.status === "DRAFT" && (
                      <Link href={`/admin/quotations/${q.id}/edit`} className="border border-white/20 min-h-[40px] inline-flex items-center px-4 py-2 text-xs uppercase">
                        Edit
                      </Link>
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
    </main>
  );
}
