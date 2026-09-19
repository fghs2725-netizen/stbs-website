"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowDown, ArrowUp, BadgeCheck, Boxes, Building2, CloudRain, Construction, Copy, Download, Drill, Droplets, Eye, EyeOff, Factory, Home, Landmark, MapPin, Pencil, Sprout, Store, Trash2, type LucideIcon } from "lucide-react";
import { HOME_HERO, HOME_SECTORS, HOME_SERVICES, HOME_STATS } from "@/lib/website/home-defaults";
import { SERVICE_PAGES, serviceHref, servicePageFor, type ServiceIconKey } from "@/lib/website/service-pages";
import { HOME_PROJECTS, resolveProjects } from "@/lib/website/projects-data";
import { StatsStrip } from "@/components/public/stats-strip";
import { Reveal } from "@/components/reveal";
import { QuoteForm } from "@/components/quote-form";
import type { SerializedSection } from "@/lib/website/action-types";
import { useWebsiteEditor, type EditorSignal } from "@/lib/website/editor-context";
import { Editable } from "@/components/website/editable";

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
  logoUrl?: string | null; primaryLogoUrl?: string | null; lightLogoUrl?: string | null; darkLogoUrl?: string | null; mobileLogoUrl?: string | null; faviconUrl?: string | null;
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

/**
 * The minimal shape SectionRenderer needs. The public site passes {type,
 * content}; the visual editor additionally passes id/name/visible/position and
 * an EditorSignal so the section can be edited in place.
 */
export interface RenderableSection {
  type: string;
  content: Record<string, unknown>;
  id?: string;
  name?: string;
  visible?: boolean;
  position?: number;
  publishedAt?: string | null;
  editorSignal?: EditorSignal;
}

/* ── static fallback imports ─────────────────────────────────────────────── */
import {
  whyChoose,
  processSteps,
  company,
} from "@/lib/company";

/* ── editor overrides (never rendered on the public site) ─────────────────── */

function collectionSignal(type: string): EditorSignal | null {
  switch (type) {
    case "services": return { kind: "services" };
    case "gallery": return { kind: "gallery" };
    case "testimonials": return { kind: "testimonials" };
    case "clients":
    case "featured_clients": return { kind: "clients" };
    default: return null;
  }
}

function asSection(owner: RenderableSection | undefined): SerializedSection {
  return (owner ?? { type: "unknown", content: {} }) as unknown as SerializedSection;
}

function SectionChrome({ section, children }: { section: RenderableSection; children: ReactNode }) {
  const editor = useWebsiteEditor();
  if (!editor.isEditor || editor.mode !== "edit") return <>{children}</>;

  const target: SerializedSection = section as unknown as SerializedSection;
  const collection = collectionSignal(section.type);
  const open = () =>
    editor.openEditor(collection ?? { kind: "section", section: target });
  const chipHidden = section.visible === false;

  return (
    <div className="group/edsec relative" data-editor-safe>
      <div className="pointer-events-none absolute inset-0 z-[48] border-2 border-dashed border-transparent transition-colors group-hover/edsec:border-signal/70" />
      {chipHidden && (
        <div className="absolute inset-0 z-[48] grid place-items-center bg-black/50 backdrop-blur-[1px]">
          <span className="rounded-sm border border-white/20 bg-black/90 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white">Hidden section</span>
        </div>
      )}
      {/* Mobile visible controls */}
      <div className="absolute right-2 top-2 z-[58] flex lg:hidden items-center gap-1 rounded-lg border border-white/15 bg-black/90 p-1 shadow-md">
        <button type="button" onClick={open} className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-bold text-signal hover:bg-white/10" title={`Edit ${section.type} section`}>
          <Pencil size={12} /> Edit
        </button>
        <button type="button" onClick={() => editor.moveSection(section.id!, "up")} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-zinc-300 hover:bg-white/10" title="Move up"><ArrowUp size={13} /></button>
        <button type="button" onClick={() => editor.moveSection(section.id!, "down")} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-zinc-300 hover:bg-white/10" title="Move down"><ArrowDown size={13} /></button>
        <button type="button" onClick={() => editor.hideSection(section.id!)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-zinc-300 hover:bg-white/10" title={chipHidden ? "Show section" : "Hide section"}>
          {chipHidden ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      </div>
      {/* Desktop hover controls */}
      <div className="absolute right-3 top-3 z-[58] hidden items-center gap-1 rounded-lg border border-white/10 bg-black/90 p-1 shadow-[0_10px_40px_rgba(0,0,0,.5)] lg:group-hover/edsec:flex">
        <button type="button" onClick={open} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold text-signal hover:bg-white/10" title={`Edit ${section.type} section`}>
          <Pencil size={13} /> Edit
        </button>
        <button type="button" onClick={() => editor.moveSection(section.id!, "up")} className="inline-flex min-h-9 items-center rounded-md px-2 text-zinc-300 hover:bg-white/10 hover:text-white" title="Move up"><ArrowUp size={14} /></button>
        <button type="button" onClick={() => editor.moveSection(section.id!, "down")} className="inline-flex min-h-9 items-center rounded-md px-2 text-zinc-300 hover:bg-white/10 hover:text-white" title="Move down"><ArrowDown size={14} /></button>
        <button type="button" onClick={() => editor.hideSection(section.id!)} className="inline-flex min-h-9 items-center rounded-md px-2 text-zinc-300 hover:bg-white/10 hover:text-white" title={chipHidden ? "Show section" : "Hide section"}>
          {chipHidden ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button type="button" onClick={() => editor.duplicateSectionById(section.id!)} className="inline-flex min-h-9 items-center rounded-md px-2 text-zinc-300 hover:bg-white/10 hover:text-white" title="Duplicate section"><Copy size={14} /></button>
        <button type="button" onClick={() => editor.removeSectionById(section.id!)} className="inline-flex min-h-9 items-center rounded-md px-2 text-red-400 hover:bg-red-500/10 hover:text-red-300" title="Delete section (live site keeps last published version)"><Trash2 size={14} /></button>
      </div>
      {children}
    </div>
  );
}

/* ── individual section renderers ────────────────────────────────────────── */

/** Downloads, tel: and external targets are plain anchors; only real app pages use next/link. */
function CtaLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const plain = /^(tel:|mailto:|https?:)/.test(href) || href.endsWith(".pdf") || href.startsWith("/company-profile");
  if (!plain) return <Link href={href} className={className}>{children}</Link>;
  return <a href={href} className={className} {...(href.endsWith(".pdf") || href.startsWith("/company-profile") ? { download: "STBS-Company-Profile.pdf" } : {})}>{children}</a>;
}

export function HeroSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", HOME_HERO.eyebrow);
  const heading = str(content, "heading", HOME_HERO.heading);
  const headingLine2 = str(content, "headingLine2", HOME_HERO.headingLine2);
  const supportingText = str(content, "supportingText", HOME_HERO.supportingText);
  const primaryCtaText = str(content, "primaryCtaText", HOME_HERO.primaryCtaText);
  const primaryCtaUrl = str(content, "primaryCtaUrl", HOME_HERO.primaryCtaUrl);
  const secondaryCtaText = str(content, "secondaryCtaText", HOME_HERO.secondaryCtaText);
  const secondaryCtaUrl = str(content, "secondaryCtaUrl", HOME_HERO.secondaryCtaUrl);
  const heroImage = str(content, "heroImage", HOME_HERO.heroImage);
  const mobileImage = str(content, "mobileImage");
  const heroImageAlt = str(content, "heroImageAlt", HOME_HERO.heroImageAlt);
  const target = asSection(owner);
  // Duotone: luminance mapped from --brand-deep (shadows) to a cool light steel (highlights).
  const duotone = { filter: "url(#stbs-duotone)" } as const;

  return (
    <section className="band-deep relative flex min-h-[560px] items-center overflow-hidden lg:min-h-[640px]">
      <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute">
        <defs>
          <filter id="stbs-duotone" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.043 0.47" />
              <feFuncG type="table" tableValues="0.122 0.59" />
              <feFuncB type="table" tableValues="0.2 0.69" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <Editable target={{ kind: "section-field", section: target, fieldKey: "heroImage" }} label="Edit Image" className="absolute inset-0">
        <div className="absolute inset-0">
          <Image src={heroImage} alt={heroImageAlt} fill priority data-keep-filter="" style={duotone} className={`object-cover object-[70%_center] ${mobileImage ? "hidden sm:block" : ""}`} sizes="100vw" />
          {mobileImage && <Image src={mobileImage} alt={heroImageAlt} fill priority data-keep-filter="" style={duotone} className="object-cover object-center sm:hidden" sizes="100vw" />}
        </div>
      </Editable>
      {/* Flat brand-deep scrim (no gradient) keeps text contrast independent of the photo. */}
      <div className="hero-scrim pointer-events-none absolute inset-0" />
      <div className="container-x relative z-10 section-y w-full">
        <Editable target={{ kind: "section", section: target }} label="Badge" className="max-w-fit">
          <p className="t-eyebrow inline-flex items-center gap-u1 rounded-[4px] border border-stbs-hairline-on-dark bg-stbs-brand-deep px-u2 py-u1">
            <BadgeCheck size={16} strokeWidth={1.75} className="text-stbs-verified" aria-hidden />{eyebrow}
          </p>
        </Editable>
        <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
          <h1 className="t-h1 mt-u3 max-w-[880px]">
            {heading}
            {headingLine2 && <>{" "}<span className="block">{headingLine2}</span></>}
          </h1>
        </Editable>
        <Editable target={{ kind: "section", section: target }} label="Subheadline" className="max-w-fit">
          <p className="t-body mt-u3 max-w-[48rem] text-stbs-ink-on-dark">{supportingText}</p>
        </Editable>
        <div className="mt-u5 flex flex-col gap-u2 sm:flex-row sm:items-center">
          <Editable target={{ kind: "section", section: target }} label="Primary CTA">
            <CtaLink href={primaryCtaUrl} className="btn btn-primary w-full sm:w-auto">{primaryCtaText}</CtaLink>
          </Editable>
          <Editable target={{ kind: "section", section: target }} label="Secondary CTA">
            <CtaLink href={secondaryCtaUrl} className="btn btn-secondary-dark w-full sm:w-auto"><Download size={18} strokeWidth={1.75} aria-hidden />{secondaryCtaText}</CtaLink>
          </Editable>
        </div>
      </div>
    </section>
  );
}

function PageHeroSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const target = asSection(owner);
  return (
    <section className="water-page-hero relative overflow-hidden px-4 pb-12 pt-28 sm:px-5 sm:pb-20 sm:pt-40 lg:px-8 lg:pb-28">
      <div className="absolute left-0 top-20 h-px w-1/3 bg-water-accent" />
      <div className="pointer-events-none absolute -bottom-36 right-[8%] size-[34rem] rounded-full border border-cyan-100/10" />
      <Reveal className="relative mx-auto max-w-7xl">
        <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
          <p className="mb-4 sm:mb-5 text-xs font-bold uppercase tracking-[.24em] text-signal">{str(content, "eyebrow")}</p>
        </Editable>
        <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
          <h1 className="max-w-5xl font-display text-3xl font-bold leading-[1.05] sm:text-5xl lg:text-7xl sm:leading-[.95]">{str(content, "heading")}</h1>
        </Editable>
        <Editable target={{ kind: "section", section: target }} label="Intro text" className="max-w-fit">
          <p className="mt-6 sm:mt-8 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base sm:leading-8">{str(content, "text")}</p>
        </Editable>
      </Reveal>
    </section>
  );
}

export function StatsSection({ content }: { _owner?: RenderableSection; content: Record<string, unknown> }) {
  const items = arr(content, "items").map((i) => ({ value: str(i, "value"), label: str(i, "label") })).filter((i) => i.value);
  return <StatsStrip items={items.length > 0 ? items : HOME_STATS} />;
}

function WhyChooseSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const heading = str(content, "heading", "Why choose STBS");
  const items = arr(content, "items");
  const display = items.length > 0 ? items : whyChoose.map(w => ({ title: w.title, text: w.text }));
  const target = asSection(owner);
  return (
    <section className="water-surface-dark px-4 py-12 sm:px-5 sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <Editable target={{ kind: "section", section: target }} label="Heading" className="mx-auto w-fit">
          <h2 className="text-center font-display text-3xl font-semibold tracking-[.08em] text-white/70 sm:text-4xl lg:text-7xl">{heading}</h2>
        </Editable>
        <div className="mt-8 sm:mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 lg:mt-16">
          {display.map((item, i) => (
            <div key={i} className="water-card h-full p-5 sm:p-8 transition-all hover:-translate-y-1 hover:border-signal/60">
              <p className="font-display text-xl sm:text-2xl font-bold uppercase leading-tight text-signal">{str(item, "title")}</p>
              <p className="mt-2.5 sm:mt-3 text-sm leading-relaxed sm:leading-7 text-white/65">{str(item, "text")}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", "Our process");
  const heading = str(content, "heading", "Planned from");
  const headingLine2 = str(content, "headingLine2", "ground level");
  const description = str(content, "description");
  const steps = arr(content, "steps");
  const display = steps.length > 0 ? steps : processSteps.map(p => ({ step: p.step, title: p.title, text: p.text }));
  const target = asSection(owner);
  return (
    <section className="water-surface-dark px-4 py-12 sm:px-5 sm:py-24 lg:px-8 lg:py-32">
      <div className="mx-auto w-full max-w-[88rem]">
        <Reveal>
          <div className="mb-10 sm:mb-16 flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end">
            <div>
              <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
                <p className="mb-3 sm:mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
              </Editable>
              <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
                <h2 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold uppercase leading-none">{heading}<br />{headingLine2}</h2>
              </Editable>
            </div>
            {description && <p className="max-w-md text-sm leading-relaxed sm:leading-7 text-white/50">{description}</p>}
          </div>
        </Reveal>
        <div className="relative mt-8 sm:mt-16 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-5">
          {display.map((step, i) => (
            <div key={i} className="water-card group relative flex flex-col p-5 sm:p-6">
              <div className="font-display text-4xl sm:text-5xl font-bold leading-none select-none text-water-accent/45 transition-all duration-300 group-hover:text-water-accent group-hover:-translate-y-1">
                {str(step, "step")}
              </div>
              <div className="mt-4 sm:mt-5 mb-3 sm:mb-4 h-px w-8 sm:w-10 bg-signal transition-all duration-300 group-hover:w-16" />
              <h3 className="font-display text-lg sm:text-xl font-bold tracking-wide text-white">{str(step, "title")}</h3>
              <p className="mt-2.5 sm:mt-3 text-sm leading-relaxed sm:leading-[1.7] text-white/55">{str(step, "text")}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SERVICE_ICONS: Record<ServiceIconKey, LucideIcon> = { drill: Drill, rain: CloudRain, supply: Boxes, tubewell: Construction };

export function ServicesSection({ owner, content, data }: { owner?: RenderableSection; content: Record<string, unknown>; data: SectionData }) {
  const eyebrow = str(content, "eyebrow", HOME_SERVICES.eyebrow);
  // Older content split the heading in two (heading + highlighted word); join them.
  const heading = [str(content, "heading", HOME_SERVICES.heading), str(content, "headingHighlight")].filter(Boolean).join(" ");
  const target = asSection(owner);
  const cms = data.services;
  const items = cms && cms.length > 0
    ? cms.map((s) => ({ title: s.title, slug: s.slug }))
    : SERVICE_PAGES.map((s) => ({ title: s.title, slug: s.slug }));

  return (
    <section className="theme-public band-alt section-y">
      <div className="container-x">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="t-eyebrow">{eyebrow}</p>
          </Editable>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="t-h2 mt-u2 text-block">{heading}</h2>
          </Editable>
        </Reveal>
        <ul className="mt-u5 grid auto-rows-fr grid-cols-2 gap-u2 lg:grid-cols-4 lg:gap-u3">
          {items.map((s, i) => {
            const page = servicePageFor(s.slug);
            const Icon = page ? SERVICE_ICONS[page.icon] : Droplets;
            return (
              <li key={`${s.slug}-${i}`}>
                <Reveal delay={i * 0.05} className="h-full">
                  <Editable target={{ kind: "services" }} label="Edit service" className="block h-full">
                    <Link href={serviceHref(s.slug)} className="hairline-card flex h-full flex-col gap-u3 p-u2 md:p-u3">
                      <Icon size={32} strokeWidth={1.75} className="shrink-0 text-stbs-brand-mid" aria-hidden />
                      <h3 className="t-h3">{s.title}</h3>
                    </Link>
                  </Editable>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function TestimonialsSection({ owner, content, data }: { owner?: RenderableSection; content: Record<string, unknown>; data: SectionData }) {
  const eyebrow = str(content, "eyebrow", "Client voices");
  const heading = str(content, "heading", "What they say");
  const description = str(content, "description");
  const target = asSection(owner);
  const cms = data.testimonials;
  const items = cms && cms.length > 0
    ? cms.map(t => ({ name: t.personName, quote: t.quote, rating: t.rating ?? 5, designation: t.designation, company: t.company, location: t.location, project: t.project, photo: t.photo }))
    : null;

  // No approved, visible testimonials → do not render fabricated social proof.
  if (!items || items.length === 0) return null;

  return (
    <section className="bg-black px-4 py-12 sm:px-5 sm:py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-10 sm:mb-16 flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end">
            <div>
              <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
                <p className="mb-3 sm:mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
              </Editable>
              <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
                <h2 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold uppercase leading-none">{heading}</h2>
              </Editable>
            </div>
            {description && <p className="max-w-md text-sm leading-relaxed sm:leading-7 text-white/50">{description}</p>}
          </div>
        </Reveal>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <Reveal key={i}>
              <Editable target={{ kind: "testimonials" }} label="Edit Testimonial" className="h-full block">
                <div className="flex h-full flex-col gap-5 sm:gap-6 border border-white/10 bg-white/5 p-5 sm:p-8">
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <span key={j} className={`text-sm ${j < t.rating ? "text-signal" : "text-white/20"}`}>★</span>
                    ))}
                  </div>
                  <blockquote className="text-sm sm:text-base leading-relaxed sm:leading-7 text-white/80">&quot;{t.quote}&quot;</blockquote>
                  <div className="mt-auto pt-2">
                    {t.photo && <Image src={t.photo} alt={t.name} width={48} height={48} className="mb-3 size-12 rounded-full object-cover" />}
                    <p className="font-bold text-white text-sm sm:text-base">{t.name}</p>
                    <p className="text-[11px] sm:text-xs uppercase tracking-wider text-white/50">
                      {[t.location, t.project].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </Editable>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection({ owner, content, data }: { owner?: RenderableSection; content: Record<string, unknown>; data: SectionData }) {
  const eyebrow = str(content, "eyebrow", "From the field");
  const heading = str(content, "heading", "Work in motion");
  const linkText = str(content, "linkText", "View gallery");
  const maxItems = num(content, "maxItems", 6);
  const target = asSection(owner);
  const cms = data.gallery;
  const items = cms && cms.length > 0
    ? cms.slice(0, maxItems).map(g => ({ src: g.mediaUrl, alt: g.altText ?? g.caption ?? "", label: g.caption ?? g.altText ?? "" }))
    : null;

  // No published gallery images → do not render stock-image placeholders.
  if (!items || items.length === 0) return null;

  return (
    <section className="bg-black px-4 pb-12 sm:px-5 sm:pb-24 lg:px-8 lg:pb-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-8 sm:mb-12 flex items-end justify-between">
            <div>
              <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
                <p className="mb-3 sm:mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
              </Editable>
              <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
                <h2 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold uppercase">{heading}</h2>
              </Editable>
            </div>
            <Link href="/gallery" className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-signal md:flex">
              {linkText} <ArrowRight size={16} />
            </Link>
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ gridAutoRows: "minmax(200px, 240px)" }}>
          {items.map((item, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <Editable target={{ kind: "gallery" }} label="Edit Image" className="h-full block">
                <Link href="/gallery" className="group relative block h-full overflow-hidden">
                  <Image src={item.src} alt={item.alt} fill className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0" sizes="(max-width:768px) 100vw,33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <p className="absolute bottom-4 left-4 font-display text-lg sm:text-xl uppercase text-white transition group-hover:text-signal">{item.label}</p>
                </Link>
              </Editable>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const heading = str(content, "heading", "Let us get your project moving.");
  const ctaText = str(content, "ctaText", "Request a proposal");
  const ctaUrl = str(content, "ctaUrl", "/quote");
  const backgroundText = str(content, "backgroundText", "1992");
  const target = asSection(owner);
  return (
    <section className="relative overflow-hidden bg-signal px-4 py-12 sm:px-5 sm:py-20 text-black lg:px-8">
      <div className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 font-display text-[7rem] sm:text-[16rem] font-bold text-black/5 select-none">{backgroundText}</div>
      <Reveal className="relative mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:gap-8 md:flex-row md:items-center">
        <Editable target={{ kind: "section", section: target }} label="CTA heading" className="max-w-fit">
          <h2 className="max-w-3xl font-display text-3xl sm:text-5xl lg:text-7xl font-bold uppercase leading-tight sm:leading-none">{heading}</h2>
        </Editable>
        <Editable target={{ kind: "section", section: target }} label="CTA button">
          <Link href={ctaUrl} className="inline-flex min-h-12 items-center gap-2 bg-black px-6 text-sm font-bold uppercase tracking-wider text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-black">
            {ctaText} <ArrowRight size={17} />
          </Link>
        </Editable>
      </Reveal>
    </section>
  );
}

function TextImageSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
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
  const target = asSection(owner);

  const imageCol = image ? (
    <Reveal className="group relative h-[280px] sm:h-[400px] lg:h-[500px]">
      <Editable target={{ kind: "section-field", section: target, fieldKey: "image" }} label="Edit Image" className="absolute inset-0">
        <Image src={image} alt={imageAlt} fill className="object-cover grayscale transition duration-700 group-hover:grayscale-0 group-hover:scale-105" sizes="(max-width:1024px) 100vw,50vw" />
      </Editable>
      {badgeText && (
        <div className="absolute -bottom-3 -left-3 sm:-bottom-5 sm:-left-5 z-10 bg-signal p-4 sm:p-7">
          <span className="font-display text-3xl sm:text-5xl font-bold">{badgeText}</span>
          {badgeSubtext && <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">{badgeSubtext}</p>}
        </div>
      )}
    </Reveal>
  ) : null;

  const textCol = (
    <Reveal>
      {eyebrow && <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit"><p className="text-xs font-extrabold uppercase tracking-[.2em]">{eyebrow}</p></Editable>}
      {heading && <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit"><h2 className="mt-4 sm:mt-5 font-display text-3xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight sm:leading-none">{heading}{headingLine2 && <><br />{headingLine2}</>}</h2></Editable>}
      {body && <Editable target={{ kind: "section", section: target }} label="Body text" className="max-w-fit"><p className="mt-5 sm:mt-7 text-sm leading-relaxed sm:text-base sm:leading-8 text-black/60">{body}</p></Editable>}
      {body2 && <Editable target={{ kind: "section", section: target }} label="Body text" className="max-w-fit"><p className="mt-3 sm:mt-4 text-sm leading-relaxed sm:text-base sm:leading-8 text-black/60">{body2}</p></Editable>}
    </Reveal>
  );

  if (layout === "center" || !image) {
    return (
      <section className="bg-neutral-100 px-4 py-12 sm:px-5 sm:py-24 text-black lg:px-8">
        <div className="mx-auto max-w-7xl text-center">{textCol}</div>
      </section>
    );
  }

  return (
    <section className="bg-neutral-100 px-4 py-12 sm:px-5 sm:py-24 text-black lg:px-8">
      <div className={`mx-auto grid max-w-7xl gap-8 sm:gap-14 lg:grid-cols-2 lg:items-center ${layout === "left-image" ? "" : ""}`}>
        {layout === "left-image" ? <>{imageCol}{textCol}</> : <>{textCol}{imageCol}</>}
      </div>
    </section>
  );
}

function MissionVisionSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const target = asSection(owner);
  return (
    <section className="bg-signal px-4 py-12 sm:px-5 sm:py-20 text-black lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 sm:gap-12 md:grid-cols-2">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Mission" className="max-w-fit">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em]">{str(content, "missionEyebrow", "Our mission")}</p>
              <h2 className="mt-4 sm:mt-5 font-display text-2xl sm:text-4xl font-bold uppercase">{str(content, "missionHeading", "Quality that endures.")}</h2>
              <p className="mt-3 sm:mt-5 text-sm leading-relaxed sm:text-base sm:leading-8 text-black/65">{str(content, "missionText", company.mission)}</p>
            </div>
          </Editable>
        </Reveal>
        <Reveal delay={0.1}>
          <Editable target={{ kind: "section", section: target }} label="Vision" className="max-w-fit">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em]">{str(content, "visionEyebrow", "Our vision")}</p>
              <h2 className="mt-4 sm:mt-5 font-display text-2xl sm:text-4xl font-bold uppercase">{str(content, "visionHeading", "A safer community.")}</h2>
              <p className="mt-3 sm:mt-5 text-sm leading-relaxed sm:text-base sm:leading-8 text-black/65">{str(content, "visionText", company.vision)}</p>
            </div>
          </Editable>
        </Reveal>
      </div>
    </section>
  );
}

function FounderSection({ owner, content, data }: { owner?: RenderableSection; content: Record<string, unknown>; data: SectionData }) {
  const name = str(content, "name", "Rajesh Saini");
  const title = str(content, "title", "Founder & Managing Director");
  const bio = str(content, "bio");
  const additionalText = str(content, "additionalText");
  const photo = data.settings?.founderPhoto || str(content, "photo", "/founder/rajesh-saini.jpeg");
  const eyebrow = str(content, "eyebrow", "Leadership");
  const heading = str(content, "heading", "Field-First");
  const headingLine2 = str(content, "headingLine2", "Leadership");
  const target = asSection(owner);

  return (
    <section className="bg-steel px-4 py-12 sm:px-5 sm:py-24 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 sm:gap-14 lg:grid-cols-[1.2fr_1.8fr] lg:items-center">
          <Reveal className="group relative h-[300px] sm:h-[420px] lg:h-[480px]">
            <Editable target={{ kind: "section-field", section: target, fieldKey: "photo" }} label="Edit Image" className="absolute inset-0">
              <Image src={photo} alt={name} fill className="object-cover grayscale transition duration-700 group-hover:grayscale-0 group-hover:scale-105" sizes="(max-width:1024px) 100vw, 40vw" />
            </Editable>
            <div className="absolute -bottom-3 -right-3 sm:-bottom-5 sm:-right-5 z-10 bg-signal p-4 sm:p-6 text-black">
              <p className="font-display text-lg sm:text-xl font-bold uppercase tracking-wider">{name}</p>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-75">{title}</p>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
              <p className="text-xs font-bold uppercase tracking-[.25em] text-signal">{eyebrow}</p>
            </Editable>
            <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
              <h2 className="mt-4 sm:mt-5 font-display text-3xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight sm:leading-none">{heading}<br />{headingLine2}</h2>
            </Editable>
            {bio && <Editable target={{ kind: "section", section: target }} label="Bio" className="max-w-fit"><p className="mt-5 sm:mt-7 text-sm leading-relaxed sm:text-lg sm:leading-8 text-white/70">{bio}</p></Editable>}
            {additionalText && <Editable target={{ kind: "section", section: target }} label="Additional text" className="max-w-fit"><p className="mt-3 sm:mt-4 text-xs leading-relaxed sm:text-sm sm:leading-8 text-white/55">{additionalText}</p></Editable>}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function WhyStbsSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", "Why STBS");
  const heading = str(content, "heading", "What sets us apart");
  const items = arr(content, "items");
  const target = asSection(owner);
  return (
    <section className="bg-black px-4 py-12 sm:px-5 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="mb-3 sm:mb-4 text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
          </Editable>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight sm:leading-none">{heading}</h2>
          </Editable>
        </Reveal>
        <div className="mt-8 sm:mt-12 grid gap-px bg-white/10 md:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={i} className="bg-black p-5 sm:p-9">
              <p className="font-display text-2xl sm:text-3xl font-bold text-signal">{str(item, "title")}</p>
              {str(item, "subtitle") && <h3 className="mt-2 sm:mt-3 font-display text-lg sm:text-xl uppercase text-white">{str(item, "subtitle")}</h3>}
              <p className="mt-3 sm:mt-4 text-xs leading-relaxed sm:text-sm sm:leading-7 text-white/45">{str(item, "description")}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExperienceCultureSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const heading = str(content, "heading", "34 years");
  const headingLine2 = str(content, "headingLine2", "of expertise.");
  const image = str(content, "image", "/Site_pic_2.jpeg");
  const imageAlt = str(content, "imageAlt", "Professional drilling team at work");
  const badgeText = str(content, "badgeText", "1992");
  const badgeSubtext = str(content, "badgeSubtext", "Established");
  const sections = arr(content, "sections");
  const values = arr(content, "values");
  const target = asSection(owner);

  return (
    <section className="bg-neutral-100 px-4 py-12 sm:px-5 sm:py-24 text-black lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:gap-16 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
              <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight sm:leading-none">{heading}<br />{headingLine2}</h2>
            </Editable>
            <div className="mt-8 sm:mt-12 space-y-6 sm:space-y-8">
              {sections.map((sec, i) => (
                <div key={i}>
                  <h3 className="mb-3 sm:mb-4 font-display text-xl sm:text-2xl font-bold uppercase">{str(sec, "title")}</h3>
                  <p className="text-sm leading-relaxed sm:text-base sm:leading-8 text-black/60">{str(sec, "body")}</p>
                </div>
              ))}
              {values.length > 0 && (
                <div>
                  <h3 className="mb-3 sm:mb-4 font-display text-xl sm:text-2xl font-bold uppercase">Our Values</h3>
                  <div className="space-y-2.5 sm:space-y-3">
                    {values.map((v, i) => (
                      <div key={i} className="flex items-center gap-3 sm:gap-4">
                        <div className="size-1 bg-black/20" />
                        <p className="text-sm font-medium">{str(v, "value")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative h-full min-h-[280px] sm:min-h-[400px] lg:min-h-[500px]">
            <div className="group relative h-full">
              <Editable target={{ kind: "section-field", section: target, fieldKey: "image" }} label="Edit Image" className="absolute inset-0">
                <Image src={image} alt={imageAlt} fill className="object-cover grayscale transition duration-700 group-hover:grayscale-0 group-hover:scale-105" sizes="(max-width:1024px) 100vw,40vw" />
              </Editable>
              <div className="absolute -bottom-4 -left-4 sm:-bottom-8 sm:-left-8 bg-signal p-4 sm:p-8">
                <span className="font-display text-4xl lg:text-6xl font-bold">{badgeText}</span>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider">{badgeSubtext}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Lucide icon by sector name (the CMS list stores names only). One icon set, one stroke weight. */
function sectorIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (/industr|factory|manufactur/.test(n)) return Factory;
  if (/real estate|realty|builder|develop/.test(n)) return Building2;
  if (/government|tender|institution|public|civic/.test(n)) return Landmark;
  if (/residen|home|housing|villa/.test(n)) return Home;
  if (/agri|farm/.test(n)) return Sprout;
  if (/commercial|retail|mall/.test(n)) return Store;
  if (/infrastructure|construction/.test(n)) return Construction;
  return Droplets;
}

export function SectorsSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", HOME_SECTORS.eyebrow);
  const heading = str(content, "heading", HOME_SECTORS.heading);
  const description = str(content, "description");
  const listed = arr(content, "sectors").filter((s) => str(s, "name"));
  const sectors: Array<Record<string, unknown>> = listed.length > 0 ? listed : HOME_SECTORS.sectors.map((s) => ({ ...s }));
  const target = asSection(owner);
  return (
    <section className="theme-public section-y">
      <div className="container-x">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="t-eyebrow">{eyebrow}</p>
          </Editable>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="t-h2 mt-u2 text-block">{heading}</h2>
          </Editable>
          {description && <p className="t-body measure mt-u2">{description}</p>}
        </Reveal>
        <ul className="mt-u5 grid auto-rows-fr grid-cols-2 gap-u2 md:grid-cols-4 lg:gap-u3">
          {sectors.map((sec, i) => {
            const name = str(sec, "name");
            const Icon = sectorIcon(name);
            const note = str(sec, "description");
            return (
              <li key={`${name}-${i}`}>
                <Reveal delay={i * 0.05} className="h-full">
                  <div className="tile flex h-full flex-col gap-u3 p-u2 md:p-u3">
                    <Icon size={28} strokeWidth={1.75} className="shrink-0 text-stbs-brand-mid" aria-hidden />
                    <h3 className="t-h3">{name}</h3>
                    {note && <p className="text-sm text-stbs-muted">{note}</p>}
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function CaseStudiesSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", HOME_PROJECTS.eyebrow);
  const heading = str(content, "heading", HOME_PROJECTS.heading);
  const ctaText = str(content, "ctaText", HOME_PROJECTS.ctaText);
  const ctaUrl = str(content, "ctaUrl", HOME_PROJECTS.ctaUrl);
  const projects = resolveProjects(content.projects).slice(0, 3);
  const target = asSection(owner);
  return (
    <section className="theme-public section-y">
      <div className="container-x">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="t-eyebrow">{eyebrow}</p>
          </Editable>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="t-h2 mt-u2 text-block">{heading}</h2>
          </Editable>
        </Reveal>
        <ul className="mt-u5 grid auto-rows-fr gap-u2 lg:grid-cols-3 lg:gap-u3">
          {projects.map((p, i) => (
            <li key={`${p.title}-${i}`}>
              <Reveal delay={i * 0.05} className="h-full">
                <Editable target={{ kind: "section", section: target }} label="Edit projects" className="block h-full">
                  <article className="tile flex h-full flex-col p-u3">
                    {p.sector && <p className="t-eyebrow">{p.sector}</p>}
                    <h3 className="t-h3 mt-u1">{p.title}</h3>
                    <p className="mt-u2 flex items-start gap-u1 text-sm text-stbs-muted">
                      <MapPin size={16} strokeWidth={1.75} className="mt-[2px] shrink-0 text-stbs-brand-mid" aria-hidden />
                      {p.location}
                    </p>
                    {p.summary && <p className="t-body mt-u2">{p.summary}</p>}
                  </article>
                </Editable>
              </Reveal>
            </li>
          ))}
        </ul>
        {ctaText && ctaUrl && (
          <Link href={ctaUrl} className="btn btn-secondary mt-u5 w-full sm:w-auto">{ctaText}</Link>
        )}
      </div>
    </section>
  );
}

function FeaturedClientsSection({ owner, content, data }: { owner?: RenderableSection; content: Record<string, unknown>; data: SectionData }) {
  const eyebrow = str(content, "eyebrow", "Selected partners");
  const heading = str(content, "heading", "Trusted on demanding sites.");
  const description = str(content, "description", "A selection of organisations supported by Saini Tubewell.");
  const target = asSection(owner);
  const cms = data.featuredClients;
  const items = cms && cms.length > 0
    ? cms.slice(0, 6).map(c => ({ name: c.name, sector: c.sector ?? "", logoUrl: c.logoUrl }))
    : [
        { name: "Ashoka University", sector: "Institutional", logoUrl: null },
        { name: "Amul Milk, Murthal", sector: "Dairy & Food", logoUrl: null },
        { name: "BigBasket, Sonipat Site", sector: "Retail & Distribution", logoUrl: null },
      ];

  return (
    <section className="bg-black px-4 py-12 sm:px-5 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
          </Editable>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="mt-4 sm:mt-5 max-w-4xl font-display text-3xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight sm:leading-[.92]">{heading}</h2>
          </Editable>
          {description && <p className="mt-4 sm:mt-6 max-w-xl text-sm leading-relaxed sm:leading-7 text-white/45">{description}</p>}
        </Reveal>
        <div className="mt-8 sm:mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <Editable target={{ kind: "clients" }} label="Edit Logo" className="h-full block">
                <article className="group relative flex min-h-36 sm:min-h-48 flex-col justify-between overflow-hidden border border-white/10 bg-white/[.035] p-5 sm:p-7 transition duration-300 hover:-translate-y-1 hover:border-signal/60 hover:bg-white/[.07]">
                  <div>
                    {/* Full-colour logo on a white tile: an invert filter would turn logos into white silhouettes. */}
                    {c.logoUrl && <div className="flex h-14 w-fit items-center rounded-[4px] bg-white px-3 sm:h-16"><Image src={c.logoUrl} alt={`${c.name} logo`} width={144} height={48} className="h-10 w-auto max-w-[144px] object-contain sm:h-12" /></div>}
                    <h3 className="mt-4 sm:mt-6 max-w-sm font-display text-xl sm:text-2xl uppercase leading-tight text-white transition group-hover:text-signal">{c.name}</h3>
                  </div>
                  <div className="mt-6 sm:mt-8 flex items-center justify-between border-t border-white/10 pt-3 sm:pt-4 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">
                    <span>{c.sector}</span>
                    <span className="h-px w-8 bg-signal/60" />
                  </div>
                </article>
              </Editable>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactInfoSection({ owner, content, data }: { owner?: RenderableSection; content: Record<string, unknown>; data: SectionData }) {
  const heading = str(content, "heading", "Get in touch");
  const description = str(content, "description");
  const ctaText = str(content, "ctaText", "Request a proposal");
  const ctaUrl = str(content, "ctaUrl", "/quote");
  const target = asSection(owner);
  const s = data.settings;
  const phone = s?.phone ?? "";
  const phone2 = s?.phone2 ?? "";
  const email = s?.email ?? "";
  const address = s?.address ?? "";

  return (
    <section className="bg-neutral-100 px-4 py-12 sm:px-5 sm:py-24 text-black lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight sm:leading-none">{heading}</h2>
          </Editable>
          {description && <p className="mt-4 sm:mt-6 max-w-2xl text-sm leading-relaxed sm:leading-8 text-black/55">{description}</p>}
        </Reveal>
        <div className="mt-8 sm:mt-14 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(phone || phone2) && (
            <Reveal className="border border-black/10 bg-white p-5 sm:p-8">
              <p className="font-display text-xl sm:text-2xl uppercase">Call us</p>
              <p className="mt-2 sm:mt-3 text-sm text-black/60">{phone && <>+91 {phone}<br />{phone2 && <>+91 {phone2}</>}</>}</p>
            </Reveal>
          )}
          {email && (
            <Reveal delay={0.05} className="border border-black/10 bg-white p-5 sm:p-8">
              <p className="font-display text-xl sm:text-2xl uppercase">Email us</p>
              <p className="mt-2 sm:mt-3 break-all text-sm text-black/60">{email}</p>
            </Reveal>
          )}
          <Reveal delay={0.1} className="border border-black/10 bg-white p-5 sm:p-8">
            <p className="font-display text-xl sm:text-2xl uppercase">Visit us</p>
            {address && <p className="mt-2 sm:mt-3 text-sm text-black/60">{address}</p>}
            <Link href={ctaUrl} className="mt-4 sm:mt-5 inline-flex items-center gap-2 text-sm font-bold text-signal hover:underline">{ctaText} <ArrowRight size={14} /></Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function MapSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", "Find us");
  const embedUrl = str(content, "embedUrl", "https://www.google.com/maps?q=Sonipat,Haryana&output=embed");
  const target = asSection(owner);
  return (
    <section className="bg-black px-4 py-12 sm:px-5 sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="mb-4 sm:mb-6 text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
          </Editable>
          <div className="overflow-hidden border border-white/10">
            <iframe title="Saini Tubewell Boring Service location" src={embedUrl} className="h-[300px] sm:h-[400px] w-full grayscale" loading="lazy" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function QuoteIntroSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", "Start a project");
  const heading = str(content, "heading", "Tell us what the site needs.");
  const steps = arr(content, "steps");
  const target = asSection(owner);
  const displaySteps = steps.length > 0
    ? steps.map(s => str(s, "step"))
    : ["Required service", "Project or site location", "Known depth or capacity needs", "Preferred project timeline"];

  return (
    <section className="bg-black px-4 py-12 sm:px-5 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="text-xs font-bold uppercase tracking-[.24em] text-signal">{eyebrow}</p>
          </Editable>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="mt-4 sm:mt-5 font-display text-2xl sm:text-4xl font-bold uppercase">{heading}</h2>
          </Editable>
          <ol className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            {displaySteps.map((step, i) => (
              <li key={i} className="flex items-center gap-3 sm:gap-4 border-b border-white/10 pb-4 sm:pb-5">
                <span className="font-display text-xl sm:text-2xl text-signal">0{i + 1}</span>
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
    <section className="bg-black px-4 py-12 sm:px-5 sm:py-24 lg:px-8">
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
  section: RenderableSection;
  data: SectionData;
}) {
  const { type, content } = section;

  let body: ReactNode;
  switch (type) {
    case "hero": body = <HeroSection owner={section} content={content} />; break;
    case "page_hero": body = <PageHeroSection owner={section} content={content} />; break;
    case "stats": body = <StatsSection _owner={section} content={content} />; break;
    case "why_choose": body = <WhyChooseSection owner={section} content={content} />; break;
    case "process": body = <ProcessSection owner={section} content={content} />; break;
    case "services": body = <ServicesSection owner={section} content={content} data={data} />; break;
    case "testimonials": body = <TestimonialsSection owner={section} content={content} data={data} />; break;
    case "gallery": body = <GallerySection owner={section} content={content} data={data} />; break;
    case "cta": body = <CtaSection owner={section} content={content} />; break;
    case "text_image": body = <TextImageSection owner={section} content={content} />; break;
    case "mission_vision": body = <MissionVisionSection owner={section} content={content} />; break;
    case "founder": body = <FounderSection owner={section} content={content} data={data} />; break;
    case "why_stbs": body = <WhyStbsSection owner={section} content={content} />; break;
    case "experience_culture": body = <ExperienceCultureSection owner={section} content={content} />; break;
    case "sectors": body = <SectorsSection owner={section} content={content} />; break;
    case "case_studies": body = <CaseStudiesSection owner={section} content={content} />; break;
    case "featured_clients": body = <FeaturedClientsSection owner={section} content={content} data={data} />; break;
    case "contact_info": body = <ContactInfoSection owner={section} content={content} data={data} />; break;
    case "map": body = <MapSection owner={section} content={content} />; break;
    case "quote_intro": body = <QuoteIntroSection owner={section} content={content} />; break;
    case "quote_form": body = <QuoteFormSection />; break;
    default: body = null;
  }

  return <SectionChrome section={section}>{body}</SectionChrome>;
}
