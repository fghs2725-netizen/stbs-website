import Link from 'next/link';
import { FileText } from 'lucide-react';
import { formatINR } from '@/components/quotation/quotation-model';
import { EmptyState, Pill } from './ui';

export interface QuotationRow {
  id?: string;
  quotationReference: string;
  quotationDate?: string;
  createdAt?: string;
  status?: 'DRAFT' | 'FINAL';
  amount: number;
  itemCount?: number;
  client: { companyName?: string };
}

const day = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
};

/**
 * One row per quotation: who it is for, its state, and what it is worth —
 * the three things you scan for. The whole row is the link; nothing else
 * competes with it, so a mis-tap can never fire a destructive action.
 */
export function QuotationRows({ rows, emptyDescription }: { rows: QuotationRow[]; emptyDescription: string }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No quotations yet"
        description={emptyDescription}
        action={<Link href="/admin/quotations/new" className="a-btn a-btn-primary a-btn-sm">New quotation</Link>}
      />
    );
  }

  return (
    <ul className="a-divide">
      {rows.map((row) => {
        const isFinal = row.status === 'FINAL';
        return (
          <li key={row.id ?? row.quotationReference}>
            <Link
              href={row.id ? `/admin/quotations/${row.id}` : '/admin/quotations'}
              className="flex items-center gap-4 px-4 py-[14px] transition-colors duration-200 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[0.9375rem] font-semibold" style={{ color: 'var(--a-ink)' }}>
                    {row.client.companyName?.trim() || 'Unnamed client'}
                  </p>
                  <Pill tone={isFinal ? 'positive' : 'warn'}>{isFinal ? 'Final' : 'Draft'}</Pill>
                </div>
                <p className="a-num mt-[3px] truncate text-[0.8125rem]" style={{ color: 'var(--a-faint)' }}>
                  {[row.quotationReference, day(row.quotationDate || row.createdAt)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <p className="a-num shrink-0 text-[0.9375rem] font-semibold" style={{ color: 'var(--a-ink)' }}>
                {formatINR(row.amount)}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
