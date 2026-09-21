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
import { QuotationPdfActions } from '@/components/quotation/share/QuotationPdfActions';
import { shareSubjectFrom } from '@/components/quotation/share/share-model';
import { calcAmount, calcTotal, formatINR } from '@/components/quotation/quotation-model';

export const dynamic = 'force-dynamic';

function StatusBadge({ status }: { status: string }) {
  const isFinal = status === 'FINAL';
  return (
    <span
      className={`a-pill ${isFinal ? 'a-pill-positive' : 'a-pill-warn'}`}
    >
      {isFinal ? 'Finalized' : 'Draft'}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="a-label">{label}</dt>
      <dd className="mt-1" style={{ color: 'var(--a-ink)' }}>{children}</dd>
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
            Open in Quotation Editor
          </Link>
        </Button>
      )}
      <QuotationPdfActions id={quotation.id} subject={shareSubjectFrom(quotation)} />
      <form action={duplicateAction.bind(null, quotation.id)}>
        <DuplicateQuotationButton />
      </form>
    </div>
  );

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Documents / Quotations"
        title={quotation.quotationReference}
        description={`${quotation.serviceType} · ${quotation.quotationDate}`}
        action={actions}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="a-card min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6" style={{ borderBottom: '1px solid var(--a-hairline)' }}>
            <h2 className="a-h2">Document preview</h2>
            <StatusBadge status={quotation.status || 'DRAFT'} />
          </div>
          <QuotationPreview quotation={quotation} embedded />
        </section>

        <aside className="space-y-4">
          <section className="a-card p-5">
            <h2 className="a-h2">Document details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <DetailRow label="Client">
                <span className="flex items-center gap-2">
                  <UserRound className="size-4" style={{ color: 'var(--a-faint)' }} />
                  {quotation.client.companyName || 'Not specified'}
                </span>
              </DetailRow>
              <DetailRow label="Subject">{quotation.subject || 'Not specified'}</DetailRow>
              <DetailRow label="Template">{quotation.template?.name ?? 'STBS Classic'}{isFinal ? ' · frozen' : ''}</DetailRow>
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="Total">
                  <span className="a-num font-semibold">{formatINR(total)}</span>
                </DetailRow>
                <DetailRow label="Validity">{quotation.validity || 'Not specified'}</DetailRow>
              </div>
              <DetailRow label="Date">
                <span className="flex items-center gap-2">
                  <Calendar className="size-4" style={{ color: 'var(--a-faint)' }} />
                  {quotation.quotationDate}
                </span>
              </DetailRow>
            </dl>
          </section>

          <section className="a-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="a-h2">Items</h2>
              <span className="a-num a-sub">{quotation.items.length}</span>
            </div>
            {quotation.items.length === 0 ? (
              <p className="a-sub mt-3">No price items added yet.</p>
            ) : (
              <ul className="a-divide mt-3">
                {quotation.items.map((item, index) => (
                  <li key={item.id} className="py-3 first:pt-0">
                    <p className="text-[0.875rem] font-medium" style={{ color: 'var(--a-ink)' }}>
                      {index + 1}. {item.description}
                    </p>
                    <div className="a-num mt-1 flex justify-between gap-3 text-[0.75rem]" style={{ color: 'var(--a-faint)' }}>
                      <span>
                        {item.quantity} {item.unit} × {formatINR(item.rate)}
                      </span>
                      <span className="shrink-0" style={{ color: 'var(--a-body)' }}>
                        {formatINR(calcAmount(item.quantity, item.rate))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!validForPdf && (
            <section className="a-card p-5 text-[0.875rem]" style={{ color: 'var(--a-warn)', background: 'var(--a-warn-soft)' }}>
              Add a client and at least one price item, then generate the PDF from the Document
              Editor.
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
