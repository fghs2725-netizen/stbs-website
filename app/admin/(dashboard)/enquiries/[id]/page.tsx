import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, Mail, MessageCircle, Phone } from 'lucide-react';
import { auth } from '@/auth';
import { dialNumber, openEnquiry } from '@/lib/enquiries';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="a-label">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-[0.9375rem]" style={{ color: 'var(--a-ink)' }}>{children}</dd>
    </div>
  );
}

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');
  const e = await openEnquiry((await params).id);
  if (!e) notFound();

  const number = dialNumber(e.phone);
  const greeting = `Hello ${e.name}, this is Saini Tubewell Boring Service about your ${e.service.toLowerCase()} enquiry for ${e.location}.`;
  const received = e.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="a-page">
      <Link href="/admin/enquiries" className="inline-flex items-center gap-1 text-[0.875rem]" style={{ color: 'var(--a-brand)' }}>
        <ChevronLeft size={16} aria-hidden /> Enquiries
      </Link>
      <PageHeader eyebrow={`Received ${received}`} title={e.name} description={`${e.service} · ${e.location}`} />

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button asChild className="col-span-2">
          <a href={`tel:+${number}`}><Phone className="size-4" /> Call</a>
        </Button>
        <Button asChild variant="secondary" className={e.email ? undefined : 'col-span-2'}>
          <a href={`https://wa.me/${number}?text=${encodeURIComponent(greeting)}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> WhatsApp</a>
        </Button>
        {e.email ? (
          <Button asChild variant="secondary">
            <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Your ${e.service} enquiry`)}`}><Mail className="size-4" /> Email</a>
          </Button>
        ) : null}
      </div>

      <section className="a-card p-5">
        <dl className="space-y-4">
          <Row label="Phone"><a href={`tel:+${number}`} className="a-num" style={{ color: 'var(--a-brand)' }}>{e.phone}</a></Row>
          {e.email ? <Row label="Email">{e.email}</Row> : null}
          {e.organisation ? <Row label="Organisation">{e.organisation}</Row> : null}
          <Row label="Service">{e.service}</Row>
          <Row label="Site location">{e.location}</Row>
          <Row label="Details">{e.details || 'None given'}</Row>
        </dl>
      </section>
    </div>
  );
}
