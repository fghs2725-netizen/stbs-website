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
  const rule = { borderTop: '1px solid var(--a-hairline)' };
  const count = `${totalItems} ${totalItems === 1 ? 'result' : 'results'}`;

  if (totalPages <= 1) {
    return (
      <div data-testid="result-line" className="px-4 py-3 text-[0.75rem]" style={{ ...rule, color: 'var(--a-faint)' }}>
        {count}
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

  const step = 'inline-flex min-h-11 items-center rounded-[10px] px-3 text-[0.875rem]';
  const box = { border: '1px solid var(--a-hairline-strong)', color: 'var(--a-body)' };
  const boxOff = { border: '1px solid var(--a-hairline)', color: 'var(--a-faint)' };

  return (
    <div data-testid="result-line" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={rule}>
      <span className="text-[0.75rem]" style={{ color: 'var(--a-faint)' }}>
        {count} · page {page} of {totalPages}
      </span>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        {prev ? (
          <Link href={prev} aria-label="Previous page" className={step} style={box}>Prev</Link>
        ) : (
          <span aria-disabled="true" className={step} style={boxOff}>Prev</span>
        )}
        {start > 1 && <span className="px-1" style={{ color: 'var(--a-faint)' }}>…</span>}
        {pages.map((p) =>
          p === page ? (
            <span key={p} aria-current="page" className="a-num inline-flex min-h-11 min-w-[40px] items-center justify-center rounded-[10px] px-2 text-[0.875rem] font-semibold" style={{ background: 'var(--a-brand)', color: '#fff' }}>
              {p}
            </span>
          ) : (
            <Link key={p} href={hrefFor(p)} className="a-num inline-flex min-h-11 min-w-[40px] items-center justify-center rounded-[10px] px-2 text-[0.875rem]" style={box}>
              {p}
            </Link>
          )
        )}
        {end < totalPages && <span className="px-1" style={{ color: 'var(--a-faint)' }}>…</span>}
        {next ? (
          <Link href={next} aria-label="Next page" className={step} style={box}>Next</Link>
        ) : (
          <span aria-disabled="true" className={step} style={boxOff}>Next</span>
        )}
      </nav>
    </div>
  );
}
