import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search, UserRound } from 'lucide-react';
import { auth } from '@/auth';
import { listClients } from '@/lib/quotation-management';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');
  const { q = '' } = await searchParams;
  let clients: any[] = []; let error = '';
  try { clients = await listClients(q); } catch { error = 'Client data is unavailable. Please try again.'; }
  return <div className="admin-page">
    <PageHeader eyebrow="Clients" title="Clients" description="Find saved client details and start a new quotation." action={<Button asChild><Link href="/admin/quotations/new">New quotation</Link></Button>} />
    <form className="admin-card flex flex-col gap-3 p-4 sm:flex-row" role="search">
      <label className="sr-only" htmlFor="client-search">Search clients</label><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" /><input id="client-search" name="q" defaultValue={q} placeholder="Search company, contact, phone" className="admin-input pl-10" /></div>
      <Button type="submit" variant="secondary">Search</Button>
    </form>
    {error ? <div role="alert" className="admin-card border-red-400/40 p-4 text-sm text-red-200">{error}</div> : <div className="admin-card overflow-hidden">
      {clients.length ? <ul className="divide-y divide-white/[.08]">{clients.map((client) => <li key={client.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="min-w-0"><h2 className="font-semibold text-white">{client.companyName}</h2><p className="mt-1 text-sm text-zinc-400">{[client.contactPerson, client.phone, client.email, client.city].filter(Boolean).join(' · ') || 'No contact details recorded'}</p></div><Button asChild variant="secondary" size="sm"><Link href={`/admin/quotations/new?clientId=${encodeURIComponent(client.id)}`}>Use in quotation</Link></Button></li>)}</ul> : <div className="flex flex-col items-center px-4 py-12 text-center"><UserRound className="mb-3 size-8 text-zinc-500" /><h2 className="font-semibold text-white">No clients found</h2><p className="mt-1 text-sm text-zinc-400">Try a different search or add a client while creating a quotation.</p></div>}
    </div>}
  </div>;
}
