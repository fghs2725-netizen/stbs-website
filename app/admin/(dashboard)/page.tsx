import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FilePlus2, FileText, ReceiptText, Users } from 'lucide-react';
import { auth } from '@/auth';
import { listQuotations } from '@/lib/quotation-management';
import { formatINR } from '@/components/quotation/quotation-model';
import { PageHeader } from '@/components/admin/PageHeader';
import { FloatingAction, QuickLinks, StatTiles } from '@/components/admin/shell/ui';
import { QuotationRows, type QuotationRow } from '@/components/admin/shell/QuotationRows';

export const dynamic = 'force-dynamic';

const QUICK_LINKS = [
  { label: 'New quotation', href: '/admin/quotations/new', icon: FilePlus2, tone: 'brand' as const },
  { label: 'Quotations', href: '/admin/quotations', icon: FileText },
  { label: 'Invoices', href: '/admin/invoices', icon: ReceiptText },
  { label: 'Clients', href: '/admin/clients', icon: Users },
];

export default async function AdminHome() {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  let recent: QuotationRow[] = [];
  let total = 0;
  let drafts = 0;
  let finals = 0;
  let openValue = 0;
  let error = '';

  try {
    // One page of rows drives the list; the two status counts come from their
    // own filtered totals so they stay right beyond the first 20 rows.
    const [latest, draftPage, finalPage] = await Promise.all([
      listQuotations('', 'ALL', 1, 6),
      listQuotations('', 'DRAFT', 1, 1),
      listQuotations('', 'FINAL', 1, 1),
    ]);
    recent = latest.rows as QuotationRow[];
    total = latest.total;
    drafts = draftPage.total;
    finals = finalPage.total;
    openValue = recent.reduce((sum, r) => sum + (r.amount || 0), 0);
  } catch {
    error = 'Quotation data is unavailable right now.';
  }

  const stats = [
    { label: 'Quotations', value: String(total) },
    { label: 'Drafts', value: String(drafts), hint: 'Not finalised' },
    { label: 'Finalised', value: String(finals) },
    { label: 'Recent value', value: formatINR(openValue), hint: 'Last 6 quotations' },
  ];

  return (
    <div className="a-page">
      <PageHeader
        title="Home"
        description="Everything in progress, and the quickest way into the next job."
        action={
          <span className="hidden lg:block">
            <Link href="/admin/quotations/new" className="a-btn a-btn-primary">New quotation</Link>
          </span>
        }
      />

      {error ? (
        <div role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: 'var(--a-danger)' }}>{error}</div>
      ) : (
        <StatTiles stats={stats} />
      )}

      <QuickLinks links={QUICK_LINKS} />

      <section className="a-card overflow-hidden" aria-labelledby="recent-heading">
        <div className="flex items-center justify-between px-4 py-4 sm:px-5" style={{ borderBottom: '1px solid var(--a-hairline)' }}>
          <h2 id="recent-heading" className="a-h2">Recent quotations</h2>
          <Link href="/admin/quotations" className="a-link text-[0.875rem]">View all</Link>
        </div>
        <QuotationRows rows={recent} emptyDescription="Once you create a quotation it will show up here." />
      </section>

      <FloatingAction href="/admin/quotations/new" label="New quotation" />
    </div>
  );
}
