import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search, UserRound } from 'lucide-react';
import { auth } from '@/auth';
import { listClients } from '@/lib/quotation-management';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState, FloatingAction } from '@/components/admin/shell/ui';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');
  const { q = '' } = await searchParams;

  let clients: any[] = [];
  let error = '';
  try {
    clients = await listClients(q);
  } catch {
    error = 'Client data is unavailable. Please try again.';
  }

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Records"
        title="Clients"
        description="Saved client details, ready to drop into a new quotation."
        action={<span className="hidden lg:block"><Link href="/admin/quotations/new" className="a-btn a-btn-primary">New quotation</Link></span>}
      />

      <form role="search" className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} strokeWidth={1.75} aria-hidden className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2" style={{ color: 'var(--a-faint)' }} />
          <label className="sr-only" htmlFor="client-search">Search clients</label>
          <input id="client-search" name="q" defaultValue={q} placeholder="Company, contact or phone" className="a-input a-input-search" />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {error ? (
        <div role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: 'var(--a-danger)' }}>{error}</div>
      ) : (
        <div className="a-card overflow-hidden">
          {clients.length ? (
            <ul className="a-divide">
              {clients.map((client) => (
                <li key={client.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <h2 className="truncate text-[0.9375rem] font-semibold" style={{ color: 'var(--a-ink)' }}>{client.companyName}</h2>
                    <p className="mt-[3px] text-[0.8125rem]" style={{ color: 'var(--a-faint)' }}>
                      {[client.contactPerson, client.phone, client.email, client.city].filter(Boolean).join(' · ') || 'No contact details recorded'}
                    </p>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/admin/quotations/new?clientId=${encodeURIComponent(client.id)}`}>Use in quotation</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={UserRound}
              title={q ? 'No clients found' : 'No clients yet'}
              description={q ? 'Try a different search term.' : 'Clients are saved automatically when you tick "save for future" while writing a quotation.'}
              action={<Link href="/admin/quotations/new" className="a-btn a-btn-primary a-btn-sm">New quotation</Link>}
            />
          )}
        </div>
      )}

      <FloatingAction href="/admin/quotations/new" label="New quotation" />
    </div>
  );
}
