import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { Calendar, FileText, UserRound } from 'lucide-react';
import { auth } from '@/auth';
import { getQuotation } from '@/lib/quotation-management';
import { QuotationPreview } from '@/components/quotation/QuotationPreview';
import { duplicateAction } from '../actions';
import { DuplicateQuotationButton } from '@/components/quotation/DuplicateQuotationButton';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { calcAmount, calcTotal, formatINR } from '@/components/quotation/quotation-model';

export const dynamic = 'force-dynamic';

function StatusBadge({ status }: { status: string }) {
  const isFinal = status === 'FINAL';
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-medium ${
        isFinal
          ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200'
          : 'border-amber-300/20 bg-amber-400/10 text-amber-100'
      }`}
    >
      {isFinal ? 'Finalized' : 'Draft'}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="mt-1 text-zinc-100">{children}</dd>
    </div>
  );
}

export default async function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');
  const quotation = await getQuotation((await params).id);
  if (!quotation?.id) notFound();
  const total = calcTotal(quotation.items);
  const isFinal = quotation.status === 'FINAL';
  const validForPdf = quotation.items.length > 0 && quotation.client.companyName;

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {!isFinal && (
        <Button asChild>
          <Link href={`/admin/quotations/${quotation.id}/edit`}>
            <FileText className="size-4" />
            Open in Document Editor
          </Link>
        </Button>
      )}
      <form action={duplicateAction.bind(null, quotation.id)}>
        <DuplicateQuotationButton />
      </form>
    </div>
  );

  return (
    <main className="admin-page">
      <PageHeader
        eyebrow="Documents / Quotations"
        title={quotation.quotationReference}
        description={`${quotation.serviceType} · ${quotation.quotationDate}`}
        action={actions}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="admin-card min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.08] px-4 py-3 sm:px-6">
            <h2 className="text-lg font-semibold text-white">Document preview</h2>
            <StatusBadge status={quotation.status || 'DRAFT'} />
          </div>
          <QuotationPreview quotation={quotation} embedded />
        </section>

        <aside className="space-y-4">
          <section className="admin-card p-5">
            <h2 className="text-lg font-semibold text-white">Document details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <DetailRow label="Client">
                <span className="flex items-center gap-2">
                  <UserRound className="size-4 text-zinc-500" />
                  {quotation.client.companyName || 'Not specified'}
                </span>
              </DetailRow>
              <DetailRow label="Subject">{quotation.subject || 'Not specified'}</DetailRow>
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="Total">
                  <span className="font-semibold text-white">{formatINR(total)}</span>
                </DetailRow>
                <DetailRow label="Validity">{quotation.validity || 'Not specified'}</DetailRow>
              </div>
              <DetailRow label="Date">
                <span className="flex items-center gap-2">
                  <Calendar className="size-4 text-zinc-500" />
                  {quotation.quotationDate}
                </span>
              </DetailRow>
            </dl>
          </section>

          <section className="admin-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Items</h2>
              <span className="text-sm text-zinc-400">{quotation.items.length}</span>
            </div>
            {quotation.items.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-400">No price items added yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[.08]">
                {quotation.items.map((item, index) => (
                  <li key={item.id} className="py-3 first:pt-0">
                    <p className="text-sm font-medium text-white">
                      {index + 1}. {item.description}
                    </p>
                    <div className="mt-1 flex justify-between gap-3 text-xs text-zinc-400">
                      <span>
                        {item.quantity} {item.unit} × {formatINR(item.rate)}
                      </span>
                      <span className="shrink-0 text-zinc-200">
                        {formatINR(calcAmount(item.quantity, item.rate))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!validForPdf && (
            <section className="admin-card border-amber-300/20 p-5 text-sm text-amber-100">
              Add a client and at least one price item, then generate the PDF from the Document
              Editor.
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
