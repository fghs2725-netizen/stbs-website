import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CtaSection } from "@/components/public/sections";
import { SERVICE_ICONS } from "@/components/public/service-icons";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
import { SERVICE_PAGES } from "@/lib/website/service-pages";

export const metadata: Metadata = pageMetadata({ ...SEO["services"], path: "/services", absoluteTitle: true });

export default function Services() {
  return (
    <>
      <PageHero eyebrow="Services" title="Water infrastructure, one service at a time." text="Choose a service to see the process, planning points and questions we can work through with you." />
      <section className="theme-public section-y">
        <div className="container-x">
          <ul className="grid auto-rows-fr gap-u2 md:grid-cols-2 lg:gap-u3">
            {SERVICE_PAGES.map((s) => {
              const Icon = SERVICE_ICONS[s.icon];
              return (
                <li key={s.slug}>
                  <Link href={s.href} className="hairline-card flex h-full flex-col p-u3 md:p-u4">
                    <Icon size={32} strokeWidth={1.75} className="text-stbs-brand-mid" aria-hidden />
                    <h2 className="t-h3 mt-u3">{s.fullTitle}</h2>
                    <p className="t-body mt-u1">{s.summary}</p>
                    <span className="mt-u3 inline-flex items-center gap-u1 font-medium text-stbs-brand-mid">
                      Explore service <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <CtaSection content={{}} />
    </>
  );
}
