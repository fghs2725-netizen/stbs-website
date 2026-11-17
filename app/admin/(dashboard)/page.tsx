import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FilePlus2, FileText, ReceiptText, Users } from 'lucide-react';
import { auth } from '@/auth';
import { listQuotations } from '@/lib/quotation-management';
import { prisma } from '@/lib/prisma';
import { BILLED, getInvoiceAnalytics } from '@/lib/invoice-analytics';
import { listExpenses } from '@/lib/worker-management';
import { todayIST } from '@/lib/worker-ledger';
import { PageHeader } from '@/components/admin/PageHeader';
import { FloatingAction, QuickLinks, StatTiles } from '@/components/admin/shell/ui';
import { QuotationRows, type QuotationRow } from '@/components/admin/shell/QuotationRows';
import { TodaySummary } from '@/components/admin/ai/TodaySummary';

export const dynamic = 'force-dynamic';

/** Whole rupees, shortened past a lakh so a figure fits a half-width tile on a phone: ₹45,000, ₹4.05 L, ₹1.2 Cr. */
function tileINR(n: number): string {
  const v = Math.round(n);
  if (Math.abs(v) >= 1e7) return `₹${+(v / 1e7).toFixed(2)} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${+(v / 1e5).toFixed(2)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

type Stat = { label: string; value: string; hint?: string; href?: string; tone?: 'danger' };

/** The four figures the owner checks first: money owed, money in, money out, and new leads. */
async function businessStats(): Promise<Stat[]> {
  const today = todayIST();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [analytics, paid, expenses, unread] = await Promise.all([
    getInvoiceAnalytics(),
    prisma.invoicePayment.aggregate({
      _sum: { amount: true },
      where: { date: { gte: monthStart, lte: today }, invoice: { deletedAt: null, status: { in: [...BILLED] } } },
    }),
    listExpenses(monthStart, today),
    prisma.enquiry.count({ where: { readAt: null } }),
  ]);
  const owed = analytics.outstanding;
  const month = new Date(`${today}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' });
  return [
    {
      label: 'Clients owe you', value: tileINR(owed.total), href: '/admin/invoices/analytics',
      hint: owed.overdueCount ? `${owed.overdueCount} bill${owed.overdueCount === 1 ? '' : 's'} overdue` : `${owed.count} bill${owed.count === 1 ? '' : 's'} open`,
      tone: owed.overdueCount ? 'danger' : undefined,
    },
    { label: 'Received', value: tileINR(Number(paid._sum.amount ?? 0)), hint: `In ${month}`, href: '/admin/invoices/analytics' },
    { label: 'Expenses', value: tileINR(expenses.reduce((sum, e) => sum + e.amount, 0)), hint: `In ${month}`, href: '/admin/expenses' },
    { label: 'New enquiries', value: String(unread), hint: unread ? 'Not opened yet' : 'All read', href: '/admin/enquiries', tone: unread ? 'danger' : undefined },
  ];
}

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
  let drafts = 0;
  let stats: Stat[] = [];
  let error = '';
  let quotesError = false;

  const [figures, quotations] = await Promise.allSettled([
    businessStats(),
    Promise.all([listQuotations('', 'ALL', 1, 6), listQuotations('', 'DRAFT', 1, 1)]),
  ]);
  if (figures.status === 'fulfilled') stats = figures.value;
  else error = 'Business figures are unavailable right now.';
  if (quotations.status === 'fulfilled') {
    recent = quotations.value[0].rows as QuotationRow[];
    drafts = quotations.value[1].total;
  } else quotesError = true;

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

      <TodaySummary />

      <QuickLinks links={QUICK_LINKS} />

      <section className="a-card overflow-hidden" aria-labelledby="recent-heading">
        <div className="flex items-center justify-between px-4 py-4 sm:px-5" style={{ borderBottom: '1px solid var(--a-hairline)' }}>
          <h2 id="recent-heading" className="a-h2">
            Recent quotations
            {drafts > 0 && <span className="a-label ml-2 inline">{drafts} in draft</span>}
          </h2>
          <Link href="/admin/quotations" className="a-link text-[0.875rem]">View all</Link>
        </div>
        {quotesError ? (
          <p role="alert" className="px-4 py-4 text-[0.9375rem] sm:px-5" style={{ color: 'var(--a-danger)' }}>Quotation data is unavailable right now.</p>
        ) : (
          <QuotationRows rows={recent} emptyDescription="Once you create a quotation it will show up here." />
        )}
      </section>

      <FloatingAction href="/admin/quotations/new" label="New quotation" />
    </div>
  );
}
