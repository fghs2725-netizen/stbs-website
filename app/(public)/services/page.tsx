import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { FilmBand } from "@/components/public/film-band";
import { CtaSection } from "@/components/public/sections";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
import { SERVICE_ACCENTS, SERVICE_CARD_IMAGES, SERVICE_FLOW, SERVICE_PAGES } from "@/lib/website/service-pages";

export const metadata: Metadata = pageMetadata({ ...SEO["services"], path: "/services", absoluteTitle: true });

const ORDERED = [...SERVICE_PAGES].sort((a, b) => SERVICE_FLOW.indexOf(a.slug) - SERVICE_FLOW.indexOf(b.slug));

export default function Services() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Water infrastructure, *one service at a time.*"
        text="Choose a service to see the process, planning points and questions we can work through with you."
        image={SERVICE_CARD_IMAGES["borewell-drilling"].src}
        imageAlt={SERVICE_CARD_IMAGES["borewell-drilling"].alt}
      />
      <FilmBand scene="intro5" />
      <section className="theme-public section-y">
        <div className="container-x">
          <ol className="grid gap-u3 md:grid-cols-6">
            {ORDERED.map((s, i) => {
              const photo = SERVICE_CARD_IMAGES[s.slug];
              return (
                <li key={s.slug} className={i < 2 ? "md:col-span-3" : "md:col-span-2"}>
                  <Link href={s.href} className="group relative flex h-full min-h-[360px] flex-col justify-end overflow-hidden rounded-[18px] bg-stbs-ink md:min-h-[420px]">
                    <Image src={photo.src} alt={photo.alt} fill sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 600px" className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.28,0.11,0.32,1)] group-hover:scale-105 motion-reduce:transition-none" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5" />
                    <div className="relative p-u4 text-white">
                      <span className="text-[.75rem] font-bold tracking-[.18em] text-stbs-bronze-light">{String(i + 1).padStart(2, "0")}</span>
                      <h2 className="t-h3 mt-1 !text-white">{s.fullTitle}</h2>
                      <p className="t-serif mt-1 text-[1.25rem] !text-stbs-bronze-light">{SERVICE_ACCENTS[s.slug]}</p>
                      <p className="mt-u1 max-w-[30rem] text-[.9375rem] leading-[1.5] text-white/75">{s.summary}</p>
                      <span className="mt-u2 inline-flex items-center gap-u1 font-medium text-stbs-bronze-light">
                        Explore service <ArrowRight size={16} strokeWidth={1.75} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
      <CtaSection content={{}} />
    </>
  );
}
