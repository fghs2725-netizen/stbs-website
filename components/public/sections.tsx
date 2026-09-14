"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { QuoteForm } from "@/components/quote-form";

/* ── helpers ─────────────────────────────────────────────────────────────── */

function str(c: Record<string, unknown>, k: string, fb = ""): string {
  const v = c[k];
  return typeof v === "string" ? v : fb;
}
function num(c: Record<string, unknown>, k: string, fb = 0): number {
  const v = c[k];
  return typeof v === "number" ? v : fb;
}
function arr(c: Record<string, unknown>, k: string): Record<string, unknown>[] {
  const v = c[k];
  return Array.isArray(v) ? v : [];
}

/* ── supplementary data types ────────────────────────────────────────────── */

export interface CmsService {
  id: string; title: string; slug: string; shortDescription: string | null;
  image: string | null; position: number;
}
export interface CmsTestimonial {
  id: string; personName: string; quote: string; rating: number | null;
  designation: string | null; company: string | null; location: string | null;
  project: string | null; photo: string | null;
}
export interface CmsGalleryItem {
  id: string; mediaUrl: string; altText: string | null; caption: string | null;
  category: string | null; position: number;
}
export interface CmsClient {
  id: string; name: string; logoUrl: string | null; altText: string | null;
  websiteUrl: string | null; sector: string | null; description: string | null;
  featured: boolean; position: number;
}
export interface CmsSettings {
  businessName?: string | null; shortDescription?: string | null;
  phone?: string | null; phone2?: string | null; whatsapp?: string | null;
  email?: string | null; address?: string | null;
  city?: string | null; state?: string | null; pincode?: string | null;
  logoUrl?: string | null; faviconUrl?: string | null;
  founderName?: string | null; founderTitle?: string | null; founderBio?: string | null;
  founderPhoto?: string | null;
  businessHours?: unknown;
}

export interface SectionData {
  services?: CmsService[] | null;
  testimonials?: CmsTestimonial[] | null;
  gallery?: CmsGalleryItem[] | null;
  clients?: CmsClient[] | null;
  featuredClients?: CmsClient[] | null;
  settings?: CmsSettings | null;
}

/* ── static fallback imports ─────────────────────────────────────────────── */
import {
  services as staticServices,
  trustItems,
  whyChoose,
  processSteps,
  company,
} from "@/lib/company";

/* ── individual section renderers ────────────────────────────────────────── */

function HeroSection({ content }: { content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", "Trusted since 1992");
  const heading = str(content, "heading", "Go deeper.");
  const headingLine2 = str(content, "headingLine2", "Build stronger.");
  const supportingText = str(content, "supportingText", company.tagline);
  const primaryCtaText = str(content, "primaryCtaText", "Request a quote");
  const primaryCtaUrl = str(content, "primaryCtaUrl", "/quote");
  const secondaryCtaText = str(content, "secondaryCtaText", "Call now");
  const secondaryCtaUrl = str(content, "secondaryCtaUrl", `tel:+91${company.phones[0]}`);
  const heroImage = str(content, "heroImage", "/hero-industrial-cross-section.png");
  const heroImageAlt = str(content, "heroImageAlt", "Industrial site with a borewell cross-section showing groundwater layers");

  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden bg-black pt-24 lg:min-h-[85vh]">
      <div className="absolute inset-0">
        <Image src={heroImage} alt={heroImageAlt} fill priority className="object-cover object-center opacity-[.58]" sizes="100vw" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 pt-24 lg:px-8 lg:pb-24">
        <p className="mb-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[.25em] text-signal">
          <span className="h-px w-12 bg-signal" />{eyebrow}
        </p>
        <h1 className="max-w-4xl font-display text-6xl font-bold uppercase leading-[.85] text-white sm:text-7xl lg:text-[7.5rem]">
          <span className="block">{heading}</span>
          {headingLine2 && <span className="block text-signal">{headingLine2}</span>}
        </h1>
        <p className="mt-8 max-w-xl text-base leading-8 text-white/70 lg:text-lg">{supportingText}</p>
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href={primaryCtaUrl} className="inline-flex h-12 items-center gap-2 bg-signal px-6 text-sm font-bold uppercase tracking-wider text-black transition hover:-translate-y-0.5 hover:bg-white">
            {primaryCtaText} <ArrowRight size={16} />
          </Link>
          <Link href={secondaryCtaUrl} className="inline-flex h-12 items-center gap-2 border border-white/20 px-6 text-sm font-bold uppercase tracking-wider text-white transition hover:border-signal/60 hover:text-white">
            {secondaryCtaText}
          </Link>
        </div>
      </div>
    </section>
  );
}

function PageHeroSection({ content }: { content: Record<string, unknown> }) {
  return (
    <section className="relative overflow-hidden bg-black bg-industrial-grid bg-[size:42px_42px] px-5 pb-20 pt-40 lg:px-8 lg:pb-28">
      <div className="absolute left-0 top-20 h-1 w-1/3 bg-signal" />
      <Reveal className="mx-auto max-w-7xl">
        <p className="mb-5 text-xs font-bold uppercase tracking-[.24em] text-signal">{str(content, "eyebrow")}</p>
        <h1 className="max-w-5xl font-display text-6xl font-bold uppercase leading-[.9] sm:text-8xl">{str(content, "heading")}</h1>
        <p className="mt-8 max-w-2xl text-base leading-8 text-white/55">{str(content, "text")}</p>
      </Reveal>
    </section>
  );
}

function StatsSection({ content }: { content: Record<string, unknown> }) {
  const items = arr(content, "items");
  const stats = items.length > 0 ? items : trustItems;
  return (
    <section className="bg-signal text-black">
      <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="border-b border-black/15 p-6 last:border-r-0 sm:p-8 lg:border-b-0 lg:border-r">
            <p className="font-display text-4xl font-bold sm:text-5xl">{str(s, "value")}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] opacity-60">{str(s, "label")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyChooseSection({ content }: { content: Record<string, unknown> }) {
  const heading = str(content, "heading", "Why choose STBS");
  const items = arr(content, "items");
  const display = items.length > 0 ? items : whyChoose.map(w => ({ title: w.title, text: w.text }));
  return (
    <section className="bg-black px-5 py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center font-display text-5xl font-semibold uppercase tracking-[.24em] text-white/40 sm:text-6xl lg:text-7xl">{heading}</h2>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:mt-16">
          {display.map((item, i) => (
            <div key={i} className="h-full border border-white/10 bg-white/5 p-7 transition-all hover:border-signal/30 hover:bg-white/8 sm:p-8">
              <p className="font-display text-2xl font-bold uppercase leading-tight text-signal">{str(item, "title")}</p>
              <p className="mt-3 text-sm leading-7 text-white/65">{str(item, "text")}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessSection({ content }: { content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", "Our process");
  const heading = str(content, "heading", "Planned from");
  const headingLine2 = str(content, "headingLine2", "ground level");
  const description = str(content, "description");
  const steps = arr(content, "steps");
  const display = steps.length > 0 ? steps : processSteps.map(p => ({ step: p.step, title: p.title, text: p.text }));
  return (
    <section className="bg-black px-5 py-24 lg:px-8 lg:py-32">
      <div className="mx-auto w-full max-w-[88rem]">
        <Reveal>
          <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
              <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-7xl">{heading}<br />{headingLine2}</h2>
            </div>
            {description && <p className="max-w-md text-sm leading-7 text-white/50">{description}</p>}
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mt-16">
          {display.map((step, i) => (
            <div key={i} className="flex flex-col group relative">
              <div className="font-display text-8xl lg:text-[7rem] xl:text-[8rem] font-bold leading-none select-none outline-text opacity-40 transition-all duration-300 group-hover:opacity-90 group-hover:text-signal/10 group-hover:-translate-y-1">
                {str(step, "step")}
              </div>
              <div className="w-10 h-[2px] bg-signal mt-2 mb-4 transition-all duration-300 group-hover:w-20" />
              <h3 className="font-display text-xl font-bold uppercase tracking-wider text-white">{str(step, "title")}</h3>
              <p className="mt-3 text-sm leading-[1.7] text-white/55">{str(step, "text")}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesSection({ content, data }: { content: Record<string, unknown>; data: SectionData }) {
  const eyebrow = str(content, "eyebrow", "What we do");
  const heading = str(content, "heading", "Complete water");
  const headingHighlight = str(content, "headingHighlight", "infrastructure");
  const description = str(content, "description", "From the first site assessment to final construction and supply, every service is delivered with field discipline and practical expertise.");

  const cmsServices = data.services;
  const useCms = cmsServices && cmsServices.length > 0;
  const displayServices = useCms
    ? cmsServices.map(s => ({ title: s.title, text: s.shortDescription ?? "", image: s.image, slug: s.slug }))
    : staticServices.map(s => ({ title: s.title, text: s.text, image: null, slug: "/services" }));

  return (
    <section className="bg-[#0b0b0b] px-5 py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
              <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-7xl">
                {heading}<br /><span className="text-signal">{headingHighlight}</span>
              </h2>
            </div>
            {description && <p className="max-w-md text-sm leading-7 text-white/50">{description}</p>}
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          {displayServices.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <Link href={s.slug} className="group flex flex-col gap-6 border border-white/10 bg-white/5 p-8 transition-all hover:border-signal/30 hover:bg-white/8">
                <div className="flex items-start justify-between">
                  <span className="font-display text-6xl text-white/5">0{i + 1}</span>
                </div>
                <h3 className="font-display text-3xl font-semibold uppercase">{s.title}</h3>
                <p className="text-sm leading-7 text-white/60">{s.text}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ content, data }: { content: Record<string, unknown>; data: SectionData }) {
  const eyebrow = str(content, "eyebrow", "Client voices");
  const heading = str(content, "heading", "What they say");
  const description = str(content, "description");
  const cms = data.testimonials;
  const items = cms && cms.length > 0
    ? cms.map(t => ({ name: t.personName, quote: t.quote, rating: t.rating ?? 5, designation: t.designation, company: t.company, location: t.location, project: t.project }))
    : null;

  // No approved, visible testimonials → do not render fabricated social proof.
  if (!items || items.length === 0) return null;

  return (
    <section className="bg-black px-5 py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
              <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-7xl">{heading}</h2>
            </div>
            {description && <p className="max-w-md text-sm leading-7 text-white/50">{description}</p>}
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <Reveal key={i}>
              <div className="flex flex-col gap-6 border border-white/10 bg-white/5 p-8">
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} className={`text-sm ${j < t.rating ? "text-signal" : "text-white/20"}`}>★</span>
                  ))}
                </div>
                <blockquote className="text-base leading-7 text-white/80">&quot;{t.quote}&quot;</blockquote>
                <div className="mt-auto">
                  <p className="font-bold text-white">{t.name}</p>
                  <p className="text-xs uppercase tracking-wider text-white/50">
                    {[t.location, t.project].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection({ content, data }: { content: Record<string, unknown>; data: SectionData }) {
  const eyebrow = str(content, "eyebrow", "From the field");
  const heading = str(content, "heading", "Work in motion");
  const linkText = str(content, "linkText", "View gallery");
  const maxItems = num(content, "maxItems", 6);
  const cms = data.gallery;
  const items = cms && cms.length > 0
    ? cms.slice(0, maxItems).map(g => ({ src: g.mediaUrl, alt: g.altText ?? g.caption ?? "", label: g.caption ?? g.altText ?? "" }))
    : null;

  // No published gallery images → do not render stock-image placeholders.
  if (!items || items.length === 0) return null;

  return (
    <section className="bg-black px-5 pb-24 lg:px-8 lg:pb-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-12 flex items-end justify-between">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
              <h2 className="font-display text-5xl font-bold uppercase sm:text-7xl">{heading}</h2>
            </div>
            <Link href="/gallery" className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-signal md:flex">
              {linkText} <ArrowRight size={16} />
            </Link>
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ gridAutoRows: "240px" }}>
          {items.map((item, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <Link href="/gallery" className="group relative overflow-hidden">
                <Image src={item.src} alt={item.alt} fill className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0" sizes="(max-width:768px) 100vw,33vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <p className="absolute bottom-4 left-4 font-display text-xl uppercase text-white transition group-hover:text-signal">{item.label}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ content }: { content: Record<string, unknown> }) {
  const heading = str(content, "heading", "Let us get your project moving.");
  const ctaText = str(content, "ctaText", "Request quote");
  const ctaUrl = str(content, "ctaUrl", "/quote");
  const backgroundText = str(content, "backgroundText", "1992");
  return (
    <section className="relative overflow-hidden bg-signal px-5 py-20 text-black lg:px-8">
      <div className="absolute -right-10 top-1/2 -translate-y-1/2 font-display text-[16rem] font-bold text-black/5">{backgroundText}</div>
      <Reveal className="relative mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
        <h2 className="max-w-3xl font-display text-5xl font-bold uppercase leading-none sm:text-7xl">{heading}</h2>
        <Link href={ctaUrl} className="inline-flex h-12 items-center gap-2 bg-black px-6 text-sm font-bold uppercase tracking-wider text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-black">
          {ctaText} <ArrowRight size={17} />
        </Link>
      </Reveal>
    </section>
  );
}

function TextImageSection({ content }: { content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow");
  const heading = str(content, "heading");
  const headingLine2 = str(content, "headingLine2");
  const body = str(content, "body");
  const body2 = str(content, "body2");
  const image = str(content, "image");
  const imageAlt = str(content, "imageAlt", "");
  const layout = str(content, "layout", "right-image");
  const badgeText = str(content, "badgeText");
  const badgeSubtext = str(content, "badgeSubtext");

  const imageCol = image ? (
    <Reveal className="group relative h-[400px] lg:h-[500px]">
      <Image src={image} alt={imageAlt} fill className="object-cover grayscale transition duration-700 group-hover:grayscale-0 group-hover:scale-105" sizes="(max-width:1024px) 100vw,50vw" />
      {badgeText && (
        <div className="absolute -bottom-5 -left-5 bg-signal p-7">
          <span className="font-display text-5xl font-bold">{badgeText}</span>
          {badgeSubtext && <p className="text-xs font-bold uppercase tracking-widest">{badgeSubtext}</p>}
        </div>
      )}
    </Reveal>
  ) : null;

  const textCol = (
    <Reveal>
      {eyebrow && <p className="text-xs font-extrabold uppercase tracking-[.2em]">{eyebrow}</p>}
      {heading && <h2 className="mt-5 font-display text-5xl font-bold uppercase leading-none sm:text-6xl">{heading}{headingLine2 && <><br />{headingLine2}</>}</h2>}
      {body && <p className="mt-7 leading-8 text-black/60">{body}</p>}
      {body2 && <p className="mt-4 leading-8 text-black/60">{body2}</p>}
    </Reveal>
  );

  if (layout === "center" || !image) {
    return (
      <section className="bg-neutral-100 px-5 py-24 text-black lg:px-8">
        <div className="mx-auto max-w-7xl text-center">{textCol}</div>
      </section>
    );
  }

  return (
    <section className="bg-neutral-100 px-5 py-24 text-black lg:px-8">
      <div className={`mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center ${layout === "left-image" ? "" : ""}`}>
        {layout === "left-image" ? <>{imageCol}{textCol}</> : <>{textCol}{imageCol}</>}
      </div>
    </section>
  );
}

function MissionVisionSection({ content }: { content: Record<string, unknown> }) {
  return (
    <section className="bg-signal px-5 py-20 text-black lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2">
        <Reveal>
          <p className="text-xs font-extrabold uppercase tracking-[.2em]">{str(content, "missionEyebrow", "Our mission")}</p>
          <h2 className="mt-5 font-display text-4xl font-bold uppercase">{str(content, "missionHeading", "Quality that endures.")}</h2>
          <p className="mt-5 leading-8 text-black/65">{str(content, "missionText", company.mission)}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-xs font-extrabold uppercase tracking-[.2em]">{str(content, "visionEyebrow", "Our vision")}</p>
          <h2 className="mt-5 font-display text-4xl font-bold uppercase">{str(content, "visionHeading", "A safer community.")}</h2>
          <p className="mt-5 leading-8 text-black/65">{str(content, "visionText", company.vision)}</p>
        </Reveal>
      </div>
    </section>
  );
}

function FounderSection({ content }: { content: Record<string, unknown> }) {
  const name = str(content, "name", "Rajesh Saini");
  const title = str(content, "title", "Founder & Managing Director");
  const bio = str(content, "bio");
  const additionalText = str(content, "additionalText");
  const photo = str(content, "photo", "/founder/rajesh-saini.jpeg");
  const eyebrow = str(content, "eyebrow", "Leadership");
  const heading = str(content, "heading", "Field-First");
  const headingLine2 = str(content, "headingLine2", "Leadership");

  return (
    <section className="bg-steel px-5 py-24 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-14 lg:grid-cols-[1.2fr_1.8fr] lg:items-center">
          <Reveal className="group relative h-[480px]">
            <Image src={photo} alt={name} fill className="object-cover grayscale transition duration-700 group-hover:grayscale-0 group-hover:scale-105" sizes="(max-width:1024px) 100vw, 40vw" />
            <div className="absolute -bottom-5 -right-5 bg-signal p-6 text-black">
              <p className="font-display text-xl font-bold uppercase tracking-wider">{name}</p>
              <p className="text-xs font-bold uppercase tracking-widest opacity-75">{title}</p>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-signal">{eyebrow}</p>
            <h2 className="mt-5 font-display text-5xl font-bold uppercase leading-none sm:text-6xl">{heading}<br />{headingLine2}</h2>
            {bio && <p className="mt-7 text-lg leading-8 text-white/70">{bio}</p>}
            {additionalText && <p className="mt-4 leading-8 text-white/55">{additionalText}</p>}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function WhyStbsSection({ content }: { content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", "Why STBS");
  const heading = str(content, "heading", "What sets us apart");
  const items = arr(content, "items");
  return (
    <section className="bg-black px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
          <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-6xl">{heading}</h2>
        </Reveal>
        <div className="mt-12 grid gap-px bg-white/10 md:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={i} className="bg-black p-9">
              <p className="font-display text-3xl font-bold text-signal">{str(item, "title")}</p>
              {str(item, "subtitle") && <h3 className="mt-3 font-display text-xl uppercase text-white">{str(item, "subtitle")}</h3>}
              <p className="mt-4 text-sm leading-7 text-white/45">{str(item, "description")}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExperienceCultureSection({ content }: { content: Record<string, unknown> }) {
  const heading = str(content, "heading", "Three decades");
  const headingLine2 = str(content, "headingLine2", "of expertise.");
  const image = str(content, "image", "/Site_pic_2.jpeg");
  const imageAlt = str(content, "imageAlt", "Professional drilling team at work");
  const badgeText = str(content, "badgeText", "1992");
  const badgeSubtext = str(content, "badgeSubtext", "Established");
  const sections = arr(content, "sections");
  const values = arr(content, "values");

  return (
    <section className="bg-neutral-100 px-5 py-24 text-black lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-16 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-6xl">{heading}<br />{headingLine2}</h2>
            <div className="mt-12 space-y-8">
              {sections.map((sec, i) => (
                <div key={i}>
                  <h3 className="mb-4 font-display text-2xl font-bold uppercase">{str(sec, "title")}</h3>
                  <p className="leading-8 text-black/60">{str(sec, "body")}</p>
                </div>
              ))}
              {values.length > 0 && (
                <div>
                  <h3 className="mb-4 font-display text-2xl font-bold uppercase">Our Values</h3>
                  <div className="space-y-3">
                    {values.map((v, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="size-1 bg-black/20" />
                        <p className="text-sm font-medium">{str(v, "value")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative h-full min-h-[400px] lg:min-h-[500px]">
            <div className="group relative h-full">
              <Image src={image} alt={imageAlt} fill className="object-cover grayscale transition duration-700 group-hover:grayscale-0 group-hover:scale-105" sizes="(max-width:1024px) 100vw,40vw" />
              <div className="absolute -bottom-8 -left-8 bg-signal p-8">
                <span className="font-display text-6xl font-bold">{badgeText}</span>
                <p className="text-sm font-bold uppercase tracking-wider">{badgeSubtext}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectorsSection({ content }: { content: Record<string, unknown> }) {
  const heading = str(content, "heading", "Built to support every kind of site.");
  const description = str(content, "description", "Focused planning. Professional coordination. Practical delivery.");
  const sectors = arr(content, "sectors");
  return (
    <section className="bg-neutral-100 px-5 py-24 text-black lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <h2 className="max-w-3xl font-display text-5xl font-bold uppercase leading-none sm:text-6xl">{heading}</h2>
          {description && <p className="mt-6 max-w-2xl leading-8 text-black/55">{description}</p>}
        </Reveal>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sec, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="group border border-black/10 p-8 transition hover:bg-black hover:text-white">
                <h3 className="mt-8 font-display text-3xl uppercase">{str(sec, "name")}</h3>
                {str(sec, "description") && <p className="mt-3 text-sm text-black/50 group-hover:text-white/50">{str(sec, "description")}</p>}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedClientsSection({ content, data }: { content: Record<string, unknown>; data: SectionData }) {
  const eyebrow = str(content, "eyebrow", "Selected partners");
  const heading = str(content, "heading", "Trusted on demanding sites.");
  const description = str(content, "description", "A selection of organisations supported by Saini Tubewell.");
  const cms = data.featuredClients;
  const items = cms && cms.length > 0
    ? cms.slice(0, 6).map(c => ({ name: c.name, sector: c.sector ?? "", logoUrl: c.logoUrl }))
    : [
        { name: "Ashoka University", sector: "Institutional", logoUrl: null },
        { name: "Amul Milk, Murthal", sector: "Dairy & Food", logoUrl: null },
        { name: "BigBasket, Sonipat Site", sector: "Retail & Distribution", logoUrl: null },
      ];

  return (
    <section className="bg-black px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
          <h2 className="mt-5 max-w-4xl font-display text-5xl font-bold uppercase leading-[.92] sm:text-6xl">{heading}</h2>
          {description && <p className="mt-6 max-w-xl text-sm leading-7 text-white/45">{description}</p>}
        </Reveal>
        <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <article className="group relative flex min-h-48 flex-col justify-between overflow-hidden border border-white/10 bg-white/[.035] p-7 transition duration-300 hover:-translate-y-1 hover:border-signal/60 hover:bg-white/[.07]">
                <div>
                  {c.logoUrl && <div className="flex h-14 items-center"><Image src={c.logoUrl} alt={c.name} width={120} height={48} className="object-contain brightness-0 invert opacity-80" /></div>}
                  <h3 className="mt-6 max-w-sm font-display text-2xl uppercase leading-tight text-white transition group-hover:text-signal">{c.name}</h3>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">
                  <span>{c.sector}</span>
                  <span className="h-px w-8 bg-signal/60" />
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactInfoSection({ content, data }: { content: Record<string, unknown>; data: SectionData }) {
  const heading = str(content, "heading", "Get in touch");
  const description = str(content, "description");
  const ctaText = str(content, "ctaText", "Request a quote");
  const ctaUrl = str(content, "ctaUrl", "/quote");
  const s = data.settings;
  const phone = s?.phone ?? "";
  const phone2 = s?.phone2 ?? "";
  const email = s?.email ?? "";
  const address = s?.address ?? "";

  return (
    <section className="bg-neutral-100 px-5 py-24 text-black lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-6xl">{heading}</h2>
          {description && <p className="mt-6 max-w-2xl leading-8 text-black/55">{description}</p>}
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(phone || phone2) && (
            <Reveal className="border border-black/10 bg-white p-8">
              <p className="font-display text-2xl uppercase">Call us</p>
              <p className="mt-3 text-sm text-black/60">{phone && <>+91 {phone}<br />{phone2 && <>+91 {phone2}</>}</>}</p>
            </Reveal>
          )}
          {email && (
            <Reveal delay={0.05} className="border border-black/10 bg-white p-8">
              <p className="font-display text-2xl uppercase">Email us</p>
              <p className="mt-3 break-all text-sm text-black/60">{email}</p>
            </Reveal>
          )}
          <Reveal delay={0.1} className="border border-black/10 bg-white p-8">
            <p className="font-display text-2xl uppercase">Visit us</p>
            {address && <p className="mt-3 text-sm text-black/60">{address}</p>}
            <Link href={ctaUrl} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-signal hover:underline">{ctaText} <ArrowRight size={14} /></Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function MapSection({ content }: { content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", "Find us");
  const embedUrl = str(content, "embedUrl", "https://www.google.com/maps?q=Sonipat,Haryana&output=embed");
  return (
    <section className="bg-black px-5 py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="mb-6 text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
          <div className="overflow-hidden border border-white/10">
            <iframe title="Saini Tubewell Boring Service location" src={embedUrl} className="h-[400px] w-full grayscale" loading="lazy" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function QuoteIntroSection({ content }: { content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", "Start a project");
  const heading = str(content, "heading", "Tell us what the site needs.");
  const steps = arr(content, "steps");
  const displaySteps = steps.length > 0
    ? steps.map(s => str(s, "step"))
    : ["Required service", "Project or site location", "Known depth or capacity needs", "Preferred project timeline"];

  return (
    <section className="bg-black px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
          <h2 className="mt-5 font-display text-4xl font-bold uppercase">{heading}</h2>
          <ol className="mt-8 space-y-6">
            {displaySteps.map((step, i) => (
              <li key={i} className="flex items-center gap-4 border-b border-white/10 pb-5">
                <span className="font-display text-2xl text-signal">0{i + 1}</span>
                <span className="text-sm text-white/60">{step}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

function QuoteFormSection() {
  return (
    <section className="bg-black px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <QuoteForm />
      </div>
    </section>
  );
}

/* ── section dispatcher ──────────────────────────────────────────────────── */

export function SectionRenderer({
  section,
  data,
}: {
  section: { type: string; content: Record<string, unknown> };
  data: SectionData;
}) {
  const { type, content } = section;

  switch (type) {
    case "hero": return <HeroSection content={content} />;
    case "page_hero": return <PageHeroSection content={content} />;
    case "stats": return <StatsSection content={content} />;
    case "why_choose": return <WhyChooseSection content={content} />;
    case "process": return <ProcessSection content={content} />;
    case "services": return <ServicesSection content={content} data={data} />;
    case "testimonials": return <TestimonialsSection content={content} data={data} />;
    case "gallery": return <GallerySection content={content} data={data} />;
    case "cta": return <CtaSection content={content} />;
    case "text_image": return <TextImageSection content={content} />;
    case "mission_vision": return <MissionVisionSection content={content} />;
    case "founder": return <FounderSection content={content} />;
    case "why_stbs": return <WhyStbsSection content={content} />;
    case "experience_culture": return <ExperienceCultureSection content={content} />;
    case "sectors": return <SectorsSection content={content} />;
    case "featured_clients": return <FeaturedClientsSection content={content} data={data} />;
    case "contact_info": return <ContactInfoSection content={content} data={data} />;
    case "map": return <MapSection content={content} />;
    case "quote_intro": return <QuoteIntroSection content={content} />;
    case "quote_form": return <QuoteFormSection />;
    default: return null;
  }
}
