import Link from 'next/link';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  basePath: string;
  params: Record<string, string | undefined>;
}

/**
 * Offset-pagination controls that preserve arbitrary query parameters
 * (search/type/status) across pages so filtered views stay shareable.
 * Hidden when everything fits on one page.
 */
export function Pagination({ page, totalPages, totalItems, basePath, params }: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <div data-testid="result-line" className="px-4 py-3 border-t border-white/5 text-xs text-gray-500">
        {totalItems} {totalItems === 1 ? 'result' : 'results'}
      </div>
    );
  }

  const hrefFor = (targetPage: number) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value);
    }
    qs.set('page', String(targetPage));
    return `${basePath}?${qs.toString()}`;
  };

  const prev = page > 1 ? hrefFor(page - 1) : null;
  const next = page < totalPages ? hrefFor(page + 1) : null;

  // Compact window around the current page; first and last always shown.
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 1, totalPages - 2));
  const end = Math.min(totalPages, start + 2);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div data-testid="result-line" className="px-4 py-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-gray-500">
        {totalItems} {totalItems === 1 ? 'result' : 'results'} · page {page} of {totalPages}
      </span>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        {prev ? (
          <Link href={prev} aria-label="Previous page" className="min-h-[40px] px-3 inline-flex items-center rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5 hover:text-white">
            Prev
          </Link>
        ) : (
          <span aria-disabled="true" className="min-h-[40px] px-3 inline-flex items-center rounded-lg border border-white/5 text-sm text-gray-600">
            Prev
          </span>
        )}
        {start > 1 && <span className="px-1 text-gray-600">…</span>}
        {pages.map((p) =>
          p === page ? (
            <span key={p} aria-current="page" className="min-h-[40px] min-w-[40px] px-2 inline-flex items-center justify-center rounded-lg bg-signal text-sm font-bold text-black">
              {p}
            </span>
          ) : (
            <Link key={p} href={hrefFor(p)} className="min-h-[40px] min-w-[40px] px-2 inline-flex items-center justify-center rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5 hover:text-white">
              {p}
            </Link>
          )
        )}
        {end < totalPages && <span className="px-1 text-gray-600">…</span>}
        {next ? (
          <Link href={next} aria-label="Next page" className="min-h-[40px] px-3 inline-flex items-center rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5 hover:text-white">
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className="min-h-[40px] px-3 inline-flex items-center rounded-lg border border-white/5 text-sm text-gray-600">
            Next
          </span>
        )}
      </nav>
    </div>
  );
}
