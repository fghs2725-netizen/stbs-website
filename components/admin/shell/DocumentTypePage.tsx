import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState, Pill } from './ui';

const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const day = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

/**
 * Shared list for the document types that share the `Document` table. Each one
 * has its own route so the nav can link straight to it and the URL says what
 * you are looking at.
 *
 * `types` is empty for a type the schema does not model yet (sale returns):
 * the page then states plainly that the editor is still to come rather than
 * rendering an empty list that looks like lost data.
 */
export async function DocumentTypePage({
  eyebrow,
  title,
  description,
  types,
  icon,
  plannedNote,
}: {
  eyebrow: string;
  title: string;
  description: string;
  types: string[];
  icon: LucideIcon;
  plannedNote: string;
}) {
  let rows: Array<{ id: string; reference: string; title: string; clientName: string | null; status: string; totalAmount: number; createdAt: Date }> = [];
  let error = '';

  if (types.length > 0) {
    try {
      const found = await prisma.document.findMany({
        where: { type: { in: types as never[] }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      rows = found.map((d) => ({
        id: d.id,
        reference: d.reference,
        title: d.title,
        clientName: d.clientName,
        status: d.status,
        totalAmount: Number(d.totalAmount) || 0,
        createdAt: d.createdAt,
      }));
    } catch {
      error = `${title} are unavailable right now.`;
    }
  }

  return (
    <div className="a-page">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="a-card p-4 sm:p-5" style={{ background: 'var(--a-brand-soft)' }}>
        <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--a-ink)' }}>
          <strong className="font-semibold">Editor still to come.</strong> {plannedNote} Quotations are the
          one document you can create and print today — <Link href="/admin/quotations/new" className="a-link">start a quotation</Link>.
        </p>
      </div>

      {error && <p role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: 'var(--a-danger)' }}>{error}</p>}

      {types.length > 0 && !error && (
        <div className="a-card overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState icon={icon} title={`No ${title.toLowerCase()} yet`} description={`Nothing has been recorded under ${title.toLowerCase()}.`} />
          ) : (
            <ul className="a-divide">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-[14px] sm:px-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[0.9375rem] font-semibold" style={{ color: 'var(--a-ink)' }}>
                        {row.clientName?.trim() || row.title}
                      </p>
                      <Pill tone="neutral">{row.status.replace(/_/g, ' ').toLowerCase()}</Pill>
                    </div>
                    <p className="a-num mt-[3px] truncate text-[0.8125rem]" style={{ color: 'var(--a-faint)' }}>
                      {row.reference} · {day(row.createdAt)}
                    </p>
                  </div>
                  <p className="a-num shrink-0 text-[0.9375rem] font-semibold" style={{ color: 'var(--a-ink)' }}>
                    {inr(row.totalAmount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
