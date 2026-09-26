import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { auth } from '@/auth';
import { listExpenses } from '@/lib/worker-management';
import { expenseTotals, formatRupees, monthLabel, monthRange, previousMonth, todayIST } from '@/lib/worker-ledger';
import { PageHeader } from '@/components/admin/PageHeader';
import { ExpensesPanel } from '@/components/admin/workers/ExpensesPanel';

export const dynamic = 'force-dynamic';

const nextMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');
  const current = todayIST().slice(0, 7);
  const asked = (await searchParams).m;
  const month = asked && /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) && asked <= current ? asked : current;
  const { from, to } = monthRange(month);
  const expenses = await listExpenses(from, to);
  const totals = expenseTotals(expenses, month);

  return (
    <div className="a-page">
      <PageHeader eyebrow="Records" title="Expenses" description="Business costs: rig diesel, repairs, material, site food. Money handed to a worker goes on his page instead." />

      <div className="flex items-center justify-between gap-3">
        <Link href={`/admin/expenses?m=${previousMonth(month)}`} className="a-btn a-btn-secondary a-btn-sm" aria-label="Previous month"><ChevronLeft className="size-4" aria-hidden /></Link>
        <p className="a-h2">{monthLabel(month)}</p>
        {month < current ? (
          <Link href={`/admin/expenses?m=${nextMonth(month)}`} className="a-btn a-btn-secondary a-btn-sm" aria-label="Next month"><ChevronRight className="size-4" aria-hidden /></Link>
        ) : <span className="w-[44px]" aria-hidden />}
      </div>

      <section className="a-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="a-label">Total spent</p>
          <p className="a-num text-[1.5rem] font-semibold" style={{ color: 'var(--a-ink)' }}>{formatRupees(totals.total)}</p>
        </div>
        {totals.byCategory.length > 0 && (
          <ul className="mt-3 space-y-2">
            {totals.byCategory.map((c) => (
              <li key={c.category}>
                <div className="a-num flex justify-between text-[0.875rem]"><span style={{ color: 'var(--a-body)' }}>{c.category}</span><span style={{ color: 'var(--a-ink)' }}>{formatRupees(c.amount)}</span></div>
                <div className="mt-1 h-[6px] overflow-hidden rounded-full" style={{ background: 'rgba(0,0,0,.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.round((c.amount / totals.total) * 100))}%`, background: 'var(--a-brand)' }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ExpensesPanel expenses={expenses} defaultDate={month === current ? todayIST() : to} />
    </div>
  );
}
