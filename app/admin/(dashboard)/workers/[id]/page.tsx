import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, MessageCircle, Phone } from 'lucide-react';
import { auth } from '@/auth';
import { getWorker, lastRates } from '@/lib/worker-management';
import { listCustomUnits } from '@/lib/invoice-management';
import { mergeUnits } from '@/lib/units';
import { formatRupees, monthLabel, monthRange, previousMonth, statementFor, todayIST, workerTotals } from '@/lib/worker-ledger';
import { whatsappNumber } from '@/components/quotation/share/share-model';
import { BalanceLabel, balanceText } from '@/components/admin/workers/BalanceLabel';
import { WorkerArchiveButton, WorkerFormButton } from '@/components/admin/workers/WorkerForms';
import { WorkerLedger } from '@/components/admin/workers/WorkerLedger';
import { StatementShareButton } from '@/components/admin/workers/ShareButtons';

export const dynamic = 'force-dynamic';

export default async function WorkerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');
  const worker = await getWorker((await params).id);
  if (!worker) notFound();

  const thisMonth = todayIST().slice(0, 7);
  const lastMonth = previousMonth(thisMonth);
  const m = (await searchParams).m;
  // Opening a worker shows his whole record; the tabs narrow it to a month.
  const period = m === thisMonth || m === lastMonth ? m : 'all';
  const range = period === 'all' ? { from: null, to: null } : monthRange(period);
  const statement = statementFor(worker.openingBalance, worker.entries, range.from, range.to);
  const totals = workerTotals(worker.openingBalance, worker.entries);
  const units = mergeUnits(await listCustomUnits());
  const wa = whatsappNumber(worker.phone);
  const periodLabel = period === 'all' ? 'All time' : monthLabel(period);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: thisMonth, label: 'This month' },
    { key: lastMonth, label: 'Last month' },
  ];

  return (
    <div className="a-page">
      <Link href="/admin/workers" className="inline-flex items-center gap-1 text-[0.875rem]" style={{ color: 'var(--a-brand)' }}>
        <ChevronLeft size={16} aria-hidden /> Workers
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="a-eyebrow mb-[6px]">{worker.role || 'Worker'}{worker.active ? '' : ' · removed'}</p>
            <h1 className="a-title truncate">{worker.name}</h1>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <WorkerFormButton worker={{ id: worker.id, name: worker.name, phone: worker.phone, role: worker.role, notes: worker.notes, openingBalance: worker.openingBalance }} />
            <WorkerArchiveButton id={worker.id} name={worker.name} active={worker.active} />
          </div>
        </div>
        {worker.phone && (
          <div className="flex gap-2">
            <a href={`tel:${worker.phone.replace(/\s/g, '')}`} className="a-btn a-btn-secondary a-btn-sm"><Phone className="size-4" aria-hidden /> Call</a>
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="a-btn a-btn-secondary a-btn-sm"><MessageCircle className="size-4" aria-hidden /> WhatsApp</a>}
          </div>
        )}
      </header>

      <section className="a-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="a-label">Balance now</p>
          <BalanceLabel balance={totals.balance} size="lg" />
        </div>
        <dl className="a-num mt-3 grid grid-cols-2 gap-3 text-[0.875rem]">
          <div><dt style={{ color: 'var(--a-faint)' }}>Work done</dt><dd className="font-semibold" style={{ color: 'var(--a-positive)' }}>{formatRupees(totals.work)}</dd></div>
          <div><dt style={{ color: 'var(--a-faint)' }}>Money given</dt><dd className="font-semibold" style={{ color: 'var(--a-ink)' }}>{formatRupees(totals.payments)}</dd></div>
        </dl>
        {worker.openingBalance !== 0 && (
          <p className="a-num mt-2 text-[0.8125rem]" style={{ color: 'var(--a-muted)' }}>Pending from before the app: {balanceText(worker.openingBalance)}</p>
        )}
        {worker.notes && <p className="mt-3 text-[0.8125rem]" style={{ color: 'var(--a-muted)' }}>{worker.notes}</p>}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="a-segment" aria-label="Period">
          {tabs.map((t) => (
            <Link key={t.key} href={`/admin/workers/${worker.id}?m=${t.key}`} data-active={period === t.key} aria-current={period === t.key ? 'page' : undefined}>{t.label}</Link>
          ))}
        </nav>
        <StatementShareButton
          workerId={worker.id}
          workerName={worker.name}
          phone={worker.phone}
          period={period}
          periodLabel={periodLabel}
          work={statement.work}
          paid={statement.payments}
          closing={statement.closing}
        />
      </div>

      {period !== 'all' && (
        <p className="a-num -mt-2 text-[0.8125rem]" style={{ color: 'var(--a-muted)' }}>
          {periodLabel}: {formatRupees(statement.work)} work · {formatRupees(statement.payments)} given · brought forward {formatRupees(Math.abs(statement.broughtForward))}{statement.broughtForward < 0 ? ' advance' : statement.broughtForward > 0 ? ' to pay' : ''}
        </p>
      )}

      <WorkerLedger
        workerId={worker.id}
        rows={statement.rows}
        units={units}
        lastRates={lastRates(worker.entries)}
        emptyText={period === 'all' ? 'Nothing recorded yet. Add money given or work done above.' : `Nothing recorded in ${periodLabel}.`}
      />
    </div>
  );
}
