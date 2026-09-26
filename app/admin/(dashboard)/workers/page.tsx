import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, HardHat } from 'lucide-react';
import { auth } from '@/auth';
import { countArchivedWorkers, listExpenses, listWorkers } from '@/lib/worker-management';
import { dashboardTotals, expenseTotals, formatRupees, monthLabel, monthRange, todayIST, workerTotals } from '@/lib/worker-ledger';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/shell/ui';
import { BalanceLabel } from '@/components/admin/workers/BalanceLabel';
import { WorkerArchiveButton, WorkerFormButton } from '@/components/admin/workers/WorkerForms';
import { SummaryShareButton } from '@/components/admin/workers/ShareButtons';

export const dynamic = 'force-dynamic';

export default async function WorkersPage({ searchParams }: { searchParams: Promise<{ removed?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');
  const showRemoved = (await searchParams).removed === '1';

  const month = todayIST().slice(0, 7);
  const { from, to } = monthRange(month);
  const [workers, removedCount, expenses] = await Promise.all([
    listWorkers({ archived: showRemoved }),
    countArchivedWorkers(),
    showRemoved ? Promise.resolve([]) : listExpenses(from, to),
  ]);

  if (showRemoved) {
    return (
      <div className="a-page">
        <Link href="/admin/workers" className="a-link text-[0.875rem]">← Workers</Link>
        <PageHeader eyebrow="Workers" title="Removed workers" description="Their records are kept. Restore one to bring him back to the dashboard." />
        <div className="a-card overflow-hidden">
          {workers.length ? (
            <ul className="a-divide">
              {workers.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 p-4 sm:px-5">
                  <Link href={`/admin/workers/${w.id}`} className="min-w-0">
                    <p className="truncate text-[0.9375rem] font-medium" style={{ color: 'var(--a-ink)' }}>{w.name}</p>
                    <div className="mt-1"><BalanceLabel balance={workerTotals(w.openingBalance, w.entries).balance} /></div>
                  </Link>
                  <WorkerArchiveButton id={w.id} name={w.name} active={false} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-[0.9375rem]" style={{ color: 'var(--a-faint)' }}>No removed workers.</p>
          )}
        </div>
      </div>
    );
  }

  const totals = dashboardTotals(workers, month);
  const spent = expenseTotals(expenses, month);

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Records"
        title="Workers"
        description="Advances, work done and what is still to pay, for every crew member."
        action={<div className="flex flex-wrap gap-2"><WorkerFormButton /><SummaryShareButton month={month} /></div>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="a-card p-4">
          <p className="a-label">To pay</p>
          <p className="a-num mt-1 text-[1.5rem] font-semibold leading-tight" style={{ color: 'var(--a-warn)' }}>{formatRupees(totals.toPay)}</p>
          <p className="mt-1 text-[0.75rem]" style={{ color: 'var(--a-faint)' }}>What you owe the crew</p>
        </div>
        <div className="a-card p-4">
          <p className="a-label">Advance given</p>
          <p className="a-num mt-1 text-[1.5rem] font-semibold leading-tight" style={{ color: 'var(--a-brand)' }}>{formatRupees(totals.advance)}</p>
          <p className="mt-1 text-[0.75rem]" style={{ color: 'var(--a-faint)' }}>Taken more than earned</p>
        </div>
        <div className="a-card p-4">
          <p className="a-label">{monthLabel(month)}</p>
          <p className="a-num mt-1 text-[1.125rem] font-semibold leading-tight" style={{ color: 'var(--a-ink)' }}>{formatRupees(totals.monthWork)} work</p>
          <p className="a-num mt-1 text-[0.8125rem]" style={{ color: 'var(--a-muted)' }}>{formatRupees(totals.monthPaid)} given</p>
        </div>
        <Link href="/admin/expenses" className="a-card block p-4">
          <p className="a-label">Expenses · {monthLabel(month).split(' ')[0]}</p>
          <p className="a-num mt-1 text-[1.5rem] font-semibold leading-tight" style={{ color: 'var(--a-ink)' }}>{formatRupees(spent.total)}</p>
          <p className="mt-1 truncate text-[0.75rem]" style={{ color: 'var(--a-faint)' }}>{spent.byCategory[0] ? `Most on ${spent.byCategory[0].category}` : 'Tap to add one'}</p>
        </Link>
      </div>

      <section className="a-card overflow-hidden" aria-label="Workers">
        {workers.length ? (
          <ul className="a-divide">
            {workers.map((w) => (
              <li key={w.id}>
                <Link href={`/admin/workers/${w.id}`} className="flex items-center gap-3 p-4 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-semibold" style={{ color: 'var(--a-ink)' }}>{w.name}</p>
                    <p className="mt-[2px] truncate text-[0.8125rem]" style={{ color: 'var(--a-faint)' }}>{[w.role, w.phone].filter(Boolean).join(' · ') || 'No details yet'}</p>
                  </div>
                  <BalanceLabel balance={workerTotals(w.openingBalance, w.entries).balance} />
                  <ChevronRight size={16} aria-hidden className="shrink-0" style={{ color: 'var(--a-faint)' }} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={HardHat} title="No workers yet" description="Add your crew to record advances, work done and what you still owe each person." action={<WorkerFormButton />} />
        )}
      </section>

      {removedCount > 0 && (
        <Link href="/admin/workers?removed=1" className="a-link self-start text-[0.875rem]">Removed workers ({removedCount})</Link>
      )}
    </div>
  );
}
