import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Inbox } from 'lucide-react';
import { auth } from '@/auth';
import { listEnquiries } from '@/lib/enquiries';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/shell/ui';

export const dynamic = 'force-dynamic';

const when = (d: Date) =>
  d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default async function EnquiriesPage() {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  let enquiries: Awaited<ReturnType<typeof listEnquiries>> = [];
  let error = '';
  try {
    enquiries = await listEnquiries();
  } catch {
    error = 'Enquiries are unavailable. Please try again.';
  }
  const unread = enquiries.filter((e) => !e.readAt).length;

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Records"
        title="Enquiries"
        description={unread ? `${unread} new. Proposal requests sent from the website's quote form.` : "Proposal requests sent from the website's quote form."}
      />

      {error ? (
        <div role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: 'var(--a-danger)' }}>{error}</div>
      ) : (
        <div className="a-card overflow-hidden">
          {enquiries.length ? (
            <ul className="a-divide">
              {enquiries.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/enquiries/${e.id}`} className="flex items-center gap-3 p-4 sm:px-5">
                    <span
                      aria-label={e.readAt ? undefined : 'New'}
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: e.readAt ? 'transparent' : 'var(--a-brand)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h2 className={`truncate text-[0.9375rem] ${e.readAt ? 'font-medium' : 'font-semibold'}`} style={{ color: 'var(--a-ink)' }}>{e.name}</h2>
                        <span className="a-num shrink-0 text-[0.75rem]" style={{ color: 'var(--a-faint)' }}>{when(e.createdAt)}</span>
                      </div>
                      <p className="mt-[3px] truncate text-[0.8125rem]" style={{ color: 'var(--a-faint)' }}>
                        {[e.service, e.location].join(' · ')}
                      </p>
                    </div>
                    <ChevronRight size={16} aria-hidden className="shrink-0" style={{ color: 'var(--a-faint)' }} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No enquiries yet"
              description="When someone sends a proposal request from the website, it appears here and on your phone."
            />
          )}
        </div>
      )}
    </div>
  );
}
