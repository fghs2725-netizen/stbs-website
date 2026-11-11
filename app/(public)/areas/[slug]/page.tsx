import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CtaSection } from "@/components/public/sections";
import { Faq } from "@/components/public/site-additions";
import { pageMetadata } from "@/lib/page-metadata";
import { getAreaClients } from "@/lib/website/area-clients";
import { AREAS, areaBySlug } from "@/lib/website/areas";
import { SERVICE_FLOW, SERVICE_PAGES } from "@/lib/website/service-pages";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/website/structured-data";

export const revalidate = 86400;
export const dynamicParams = false;
export function generateStaticParams() {
  return AREAS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const area = areaBySlug((await params).slug);
  if (!area) return {};
  return pageMetadata({ title: area.title, description: area.description, path: `/areas/${area.slug}`, absoluteTitle: true });
}

const ORDERED = [...SERVICE_PAGES].sort((a, b) => SERVICE_FLOW.indexOf(a.slug) - SERVICE_FLOW.indexOf(b.slug));

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const area = areaBySlug((await params).slug);
  if (!area) notFound();
  const clients = await getAreaClients(area.slug);
  const others = AREAS.filter((a) => a.slug !== area.slug);

  return (
    <>
      <PageHero eyebrow={area.place} title={area.heading} text={area.intro} image={area.image.src} imageAlt={area.image.alt} />

      <section className="theme-public section-y">
        <div className="container-x grid gap-u6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-u8">
          <div>
            <p className="t-eyebrow">Working in {area.name}</p>
            <h2 className="t-h2 mt-u2 text-block">Surveyed first, then built to suit the site</h2>
            <div className="mt-u4 space-y-u3">
              {area.local.map((para) => <p key={para.slice(0, 24)} className="t-body measure">{para}</p>)}
            </div>
          </div>
          <aside className="tile self-start p-u3">
            <p className="t-eyebrow">Areas we cover from here</p>
            <ul className="mt-u2 flex flex-wrap gap-2">
              {area.places.map((p) => (
                <li key={p} className="inline-flex items-center gap-1 rounded-full bg-stbs-brand-mid/10 px-3 py-1 text-[.875rem] text-stbs-ink">
                  <MapPin size={13} strokeWidth={1.75} className="text-stbs-brand-mid" aria-hidden />{p}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="theme-public band-alt section-y">
        <div className="container-x">
          <p className="t-eyebrow">What we do in {area.name}</p>
          <h2 className="t-h2 mt-u2 text-block">One team, from survey to recharge</h2>
          <ul className="mt-u5 grid gap-u2 sm:grid-cols-2 lg:grid-cols-3">
            {ORDERED.map((s) => (
              <li key={s.slug}>
                <Link href={s.href} className="group flex h-full flex-col rounded-[18px] bg-[var(--card)] p-u3 shadow-[0_1px_0_rgba(19,24,25,.06)] transition-shadow duration-300 hover:shadow-[0_24px_50px_-36px_rgba(19,24,25,.5)]">
                  <h3 className="t-h3">{s.fullTitle}</h3>
                  <p className="mt-u1 text-[.9375rem] leading-[1.5] text-stbs-muted">{s.summary}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-u2 font-medium text-stbs-brand-mid">
                    Learn more <ArrowRight size={16} strokeWidth={1.75} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {clients.length > 0 && (
        <section className="theme-public section-y">
          <div className="container-x">
            <p className="t-eyebrow">Clients in {area.name}</p>
            <h2 className="t-h2 mt-u2 text-block">Who we have worked for here</h2>
            <ul className="mt-u5 grid gap-x-u4 md:grid-cols-2">
              {clients.map(([name, work, locality, years]) => (
                <li key={name} className="border-t border-stbs-hairline py-u2">
                  <p className="font-medium text-stbs-ink">{name}</p>
                  <p className="mt-[2px] text-[.9375rem] leading-[1.5] text-stbs-muted">{[work, locality, years].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ul>
            <Link href="/projects" className="link-arrow mt-u4 inline-flex">Project details</Link>
          </div>
        </section>
      )}

      <Faq items={area.faqs} />

      <section className="theme-public section-y">
        <div className="container-x">
          <p className="t-eyebrow">Other areas</p>
          <ul className="mt-u2 flex flex-wrap gap-2">
            {others.map((a) => (
              <li key={a.slug}><Link href={`/areas/${a.slug}`} className="inline-flex min-h-[44px] items-center rounded-full border border-stbs-hairline px-4 text-stbs-ink transition-colors hover:border-stbs-brand-mid">{a.name}</Link></li>
            ))}
          </ul>
        </div>
      </section>

      <CtaSection content={{}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: "Areas", path: "/areas" }, { name: area.name, path: `/areas/${area.slug}` }])) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(area.faqs)) }} />
    </>
  );
}
