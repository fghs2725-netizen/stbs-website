import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CtaSection } from "@/components/public/sections";
import { pageMetadata } from "@/lib/page-metadata";
import { AREAS } from "@/lib/website/areas";
import { breadcrumbJsonLd } from "@/lib/website/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Areas We Serve in Haryana & NCR | Saini Tubewell",
  description: "Borewell, tubewell and rainwater harvesting work across Sonipat, Kundli, Panipat, Rohtak, Gurugram and Delhi NCR, from our base in Bahalgarh, Sonipat.",
  path: "/areas",
  absoluteTitle: true,
});

export default function Areas() {
  return (
    <>
      <PageHero eyebrow="Areas" title="Where we *work*" text="We are based in Bahalgarh, Sonipat, and take up borewell, tubewell and rainwater harvesting work across Haryana and Delhi NCR." />
      <section className="theme-public section-y">
        <div className="container-x">
          <ul className="grid gap-u3 md:grid-cols-2 lg:grid-cols-3">
            {AREAS.map((a) => (
              <li key={a.slug}>
                <Link href={`/areas/${a.slug}`} className="group flex h-full flex-col rounded-[18px] bg-[var(--card)] p-u4 shadow-[0_1px_0_rgba(19,24,25,.06)] transition-shadow duration-300 hover:shadow-[0_24px_50px_-36px_rgba(19,24,25,.5)]">
                  <p className="t-eyebrow">{a.place}</p>
                  <h2 className="t-h3 mt-u1">{a.name}</h2>
                  <p className="mt-u1 text-[.9375rem] leading-[1.5] text-stbs-muted">{a.intro}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-u3 font-medium text-stbs-brand-mid">
                    See {a.name} <ArrowRight size={16} strokeWidth={1.75} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="t-body measure mt-u5 text-stbs-muted">Elsewhere in Delhi NCR? Send the site location through the <Link href="/quote" className="link-arrow inline-flex">proposal form</Link> and we will tell you whether we can take it up.</p>
        </div>
      </section>
      <CtaSection content={{}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: "Areas", path: "/areas" }])) }} />
    </>
  );
}
