"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowDown, ArrowUp, BadgeCheck, Boxes, Building2, CloudRain, Construction, Copy, Download, Drill, Droplets, Eye, EyeOff, Factory, Home, Landmark, Mail, MapPin, MessageCircle, Pencil, Phone, Sprout, Store, Trash2, type LucideIcon } from "lucide-react";
import { HOME_CTA, HOME_HERO, HOME_SECTORS, HOME_SERVICES, HOME_STATS } from "@/lib/website/home-defaults";
import { SERVICE_PAGES, serviceHref, servicePageFor } from "@/lib/website/service-pages";
import { SERVICE_ICONS } from "@/components/public/service-icons";
import { HOME_PROJECTS, resolveProjects } from "@/lib/website/projects-data";
import { StatsStrip } from "@/components/public/stats-strip";
import { PagePhoto } from "@/components/public/photo";
import { LogoMarquee } from "@/components/public/logo-marquee";
import { formatIndianPhone, telHref } from "@/lib/phone";
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
  businessInfo,
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

  return (
    <section className="band-deep relative flex min-h-[calc(100svh-56px)] overflow-hidden">
      <Editable target={{ kind: "section-field", section: target, fieldKey: "heroImage" }} label="Edit Image" className="absolute inset-0">
        <div className="absolute inset-0 overflow-hidden">
          {/* Slow settle from a slight zoom, like a product reveal. Reduced-motion users get the still image. */}
          <div className="absolute inset-0 motion-safe:animate-[heroZoom_2.6s_cubic-bezier(0.28,0.11,0.32,1)_both]">
            <Image src={heroImage} alt={heroImageAlt} fill priority className={`object-cover object-[46%_center] sm:object-[70%_center] ${mobileImage ? "hidden sm:block" : ""}`} sizes="100vw" />
            {mobileImage && <Image src={mobileImage} alt={heroImageAlt} fill priority className="object-cover object-center sm:hidden" sizes="100vw" />}
          </div>
        </div>
      </Editable>
      {/* Flat neutral scrim keeps text contrast independent of the photo; the fade into the next band is a soft bottom edge. */}
      <div className="hero-scrim pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="container-x relative z-10 flex w-full flex-1 flex-col items-center justify-center py-u10 text-center">
        <Editable target={{ kind: "section", section: target }} label="Badge" className="max-w-fit">
          <p className="inline-flex items-center gap-u1 rounded-full border border-white/20 bg-white/10 px-u2 py-[7px] text-[0.9375rem] font-medium text-white backdrop-blur-md animate-[fadeSlideUp_0.9s_cubic-bezier(0.28,0.11,0.32,1)_0.15s_both]">
            <BadgeCheck size={16} strokeWidth={1.75} className="text-[#5bd18a]" aria-hidden />{eyebrow}
          </p>
        </Editable>
        <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
          <h1 className="t-h1 mt-u3 max-w-[1080px] animate-[fadeSlideUp_1s_cubic-bezier(0.28,0.11,0.32,1)_0.3s_both]">
            {heading}
            {headingLine2 && <>{" "}<span className="block">{headingLine2}</span></>}
          </h1>
        </Editable>
        <Editable target={{ kind: "section", section: target }} label="Subheadline" className="max-w-fit">
          <p className="t-body mx-auto mt-u3 max-w-[40rem] text-white/80 animate-[fadeSlideUp_1s_cubic-bezier(0.28,0.11,0.32,1)_0.5s_both]">{supportingText}</p>
        </Editable>
        <div className="mt-u5 flex flex-col items-center gap-u2 sm:flex-row sm:gap-u4 animate-[fadeSlideUp_1s_cubic-bezier(0.28,0.11,0.32,1)_0.7s_both]">
          <Editable target={{ kind: "section", section: target }} label="Primary CTA">
            <CtaLink href={primaryCtaUrl} className="btn btn-primary">{primaryCtaText}</CtaLink>
          </Editable>
          {secondaryCtaText && secondaryCtaUrl ? (
            <Editable target={{ kind: "section", section: target }} label="Secondary CTA">
              <CtaLink href={secondaryCtaUrl} className="btn btn-secondary-dark"><Download size={18} strokeWidth={1.75} aria-hidden />{secondaryCtaText}</CtaLink>
            </Editable>
          ) : (
            <CtaLink href="/services" className="link-arrow !text-[#2997ff]">Explore our services</CtaLink>
          )}
        </div>
      </div>
    </section>
  );
}

function PageHeroSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const target = asSection(owner);
  const eyebrow = str(content, "eyebrow");
  const text = str(content, "text");
  // Same markup and classes as components/page-hero.tsx; this one wraps fields for the visual editor.
  return (
    <section className="theme-public band-alt page-head">
      <div className="container-x">
        {eyebrow && (
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="t-eyebrow">{eyebrow}</p>
          </Editable>
        )}
        <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
          <h1 className="t-h2 mt-u3 text-block">{str(content, "heading")}</h1>
        </Editable>
        {text && (
          <Editable target={{ kind: "section", section: target }} label="Intro text" className="max-w-fit">
            <p className="t-body measure mt-u4 text-stbs-muted">{text}</p>
          </Editable>
        )}
      </div>
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
    <section className="theme-public band-alt section-y">
      <div className="container-x">
        <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
          <h2 className="t-h2 text-block">{heading}</h2>
        </Editable>
        <ul className="mt-u6 grid auto-rows-fr gap-u2 md:grid-cols-2 lg:grid-cols-3 lg:gap-u3">
          {display.map((item, i) => (
            <li key={i}>
              <Reveal delay={i * 0.06} className="h-full">
                <div className="hairline-card flex h-full flex-col p-u4">
                  <h3 className="text-[1.375rem] font-semibold leading-tight tracking-[-0.025em] text-stbs-ink">{str(item, "title")}</h3>
                  <p className="mt-u2 text-[1.0625rem] leading-[1.5] text-stbs-muted">{str(item, "text")}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
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
    <section className="band-deep section-y">
      <div className="container-x">
        <Reveal className="flex flex-col gap-u4 md:flex-row md:items-end md:justify-between">
          <div>
            <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
              <p className="t-eyebrow">{eyebrow}</p>
            </Editable>
            <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
              <h2 className="t-h2 mt-u2">{heading}{headingLine2 && <><br />{headingLine2}</>}</h2>
            </Editable>
          </div>
          {description && <p className="max-w-[26rem] text-[1.0625rem] leading-[1.5] text-white/60">{description}</p>}
        </Reveal>
        <ol className="mt-u7 grid gap-u2 sm:grid-cols-2 lg:grid-cols-5 lg:gap-u3">
          {display.map((step, i) => (
            <li key={i}>
              <Reveal delay={i * 0.06} className="h-full">
                <div className="flex h-full flex-col rounded-[22px] bg-white/[.06] p-u3 transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.28,0.11,0.32,1)] hover:-translate-y-1 hover:bg-white/[.1] motion-reduce:transform-none">
                  <span className="font-semibold tabular-nums text-[2.5rem] leading-none tracking-[-0.04em] text-white/30">{str(step, "step")}</span>
                  <h3 className="mt-u3 text-[1.25rem] font-semibold leading-tight tracking-[-0.02em] text-white">{str(step, "title")}</h3>
                  <p className="mt-u2 text-[0.9375rem] leading-[1.5] text-white/60">{str(step, "text")}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Home-page photography for each service card. Falls back to the icon tile when a slug has no photo. */
const SERVICE_CARD_IMAGES: Record<string, { src: string; alt: string }> = {
  "borewell-drilling": { src: "/services/borewell-drilling-rods.webp", alt: "Two workers threading a drill rod into the borehole at a rig" },
  "rainwater-harvesting": { src: "/services/rainwater-harvesting-recharge.webp", alt: "Precast concrete rings beside an excavated recharge pit at a commercial site" },
  "tubewell-construction": { src: "/services/tubewell-yield-discharge.webp", alt: "Water discharging from a commissioned tubewell outlet into a drainage channel" },
  "borewell-material-supply": { src: "/services/borewell-material-supply-yard.webp", alt: "Casing pipes, cable drums and submersible pump motors stacked in a supply yard" },
};

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
        {/* Bento: the first service gets a full-height feature tile, the rest stack beside it. */}
        <ul className="mt-u6 grid gap-u2 md:grid-cols-2 lg:grid-cols-3 lg:gap-u3">
          {items.map((s, i) => {
            const page = servicePageFor(s.slug);
            const Icon = page ? SERVICE_ICONS[page.icon] : Droplets;
            const photo = SERVICE_CARD_IMAGES[s.slug];
            const feature = i === 0;
            return (
              <li key={`${s.slug}-${i}`} className={feature ? "lg:row-span-2" : undefined}>
                <Reveal delay={i * 0.06} className="h-full">
                  <Editable target={{ kind: "services" }} label="Edit service" className="block h-full">
                    <Link href={serviceHref(s.slug)} className="hairline-card group relative flex h-full min-h-[280px] flex-col justify-end overflow-hidden lg:min-h-[320px]">
                      {photo ? (
                        <>
                          <Image
                            src={photo.src}
                            alt={photo.alt}
                            fill
                            sizes={feature ? "(max-width:768px) 100vw, 33vw" : "(max-width:768px) 100vw, 33vw"}
                            className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.28,0.11,0.32,1)] group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/10" />
                        </>
                      ) : (
                        <span className="absolute left-u3 top-u3 text-stbs-brand-mid"><Icon size={32} strokeWidth={1.75} aria-hidden /></span>
                      )}
                      <div className={`relative p-u3 ${photo ? "text-white" : ""}`}>
                        <h3 className={`font-semibold tracking-[-0.03em] ${feature ? "text-[2rem] leading-[1.08]" : "text-[1.5rem] leading-[1.15]"} ${photo ? "!text-white" : "text-stbs-ink"}`}>{s.title}</h3>
                        {page?.summary && <p className={`mt-u1 max-w-[30rem] text-[0.9375rem] leading-[1.5] ${photo ? "text-white/75" : "text-stbs-muted"}`}>{page.summary}</p>}
                        <span className={`mt-u2 inline-flex items-center gap-1 text-[0.9375rem] font-medium ${photo ? "text-[#2997ff]" : "text-stbs-brand-mid"}`}>
                          Learn more
                          <span aria-hidden className="text-[1.3em] leading-none transition-transform duration-300 ease-[cubic-bezier(0.28,0.11,0.32,1)] group-hover:translate-x-1">&#8250;</span>
                        </span>
                      </div>
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
    ? cms.map((t) => ({ name: t.personName, quote: t.quote, designation: t.designation, company: t.company, location: t.location, project: t.project, photo: t.photo }))
    : null;

  // No approved, visible testimonials: render nothing rather than fabricated social proof.
  // Star ratings are deliberately not shown either: only the words a client actually gave.
  if (!items || items.length === 0) return null;

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
          {description && <p className="t-body measure mt-u3">{description}</p>}
        </Reveal>
        <ul className="mt-u5 grid auto-rows-fr gap-u2 md:grid-cols-2 lg:grid-cols-3 lg:gap-u3">
          {items.map((t, i) => (
            <li key={i}>
              <Reveal delay={i * 0.05} className="h-full">
                <Editable target={{ kind: "testimonials" }} label="Edit Testimonial" className="block h-full">
                  <figure className="tile m-0 flex h-full flex-col gap-u3 p-u3">
                    <blockquote className="t-body m-0">&ldquo;{t.quote}&rdquo;</blockquote>
                    <figcaption className="mt-auto">
                      {t.photo && <Image src={t.photo} alt={t.name} width={48} height={48} className="mb-u1 size-12 rounded-[4px] object-cover" />}
                      <p className="font-medium text-stbs-ink">{t.name}</p>
                      <p className="text-sm text-stbs-muted">{[t.designation, t.company, t.location, t.project].filter(Boolean).join(" · ")}</p>
                    </figcaption>
                  </figure>
                </Editable>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GallerySection({ owner, content, data }: { owner?: RenderableSection; content: Record<string, unknown>; data: SectionData }) {
  const eyebrow = str(content, "eyebrow", "From the field");
  const heading = str(content, "heading", "Work in motion");
  const maxItems = num(content, "maxItems", 6);
  const target = asSection(owner);
  const cms = data.gallery;
  const items = cms && cms.length > 0
    ? cms.slice(0, maxItems).map((g) => ({ src: g.mediaUrl, alt: g.altText || g.caption || "Project photograph", caption: g.caption ?? "" }))
    : null;

  // No published gallery images: do not render stock-image placeholders.
  if (!items || items.length === 0) return null;

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
        <ul className="mt-u5 grid gap-u2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-u3">
          {items.map((item, i) => (
            <li key={i}>
              <Reveal delay={(i % 3) * 0.05}>
                <Editable target={{ kind: "gallery" }} label="Edit Image" className="block">
                  <figure className="m-0">
                    <PagePhoto src={item.src} alt={item.alt} sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" />
                    {item.caption && <figcaption className="mt-u1 text-sm text-stbs-muted">{item.caption}</figcaption>}
                  </figure>
                </Editable>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CtaSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const heading = str(content, "heading", HOME_CTA.heading);
  const text = str(content, "text", HOME_CTA.text);
  const ctaText = str(content, "ctaText", HOME_CTA.ctaText);
  const ctaUrl = str(content, "ctaUrl", HOME_CTA.ctaUrl);
  const target = asSection(owner);
  return (
    <section className="band-deep">
      <div className="container-x section-y">
        <Reveal className="mx-auto flex max-w-[52rem] flex-col items-center text-center">
          <Editable target={{ kind: "section", section: target }} label="CTA heading" className="max-w-fit">
            <h2 className="t-h2">{heading}</h2>
          </Editable>
          {text && <p className="t-body mt-u3 max-w-[38rem] text-white/70">{text}</p>}
          <Editable target={{ kind: "section", section: target }} label="CTA button" className="mt-u5">
            <Link href={ctaUrl} className="btn btn-primary">{ctaText}</Link>
          </Editable>
        </Reveal>
      </div>
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
    <Reveal>
      <Editable target={{ kind: "section-field", section: target, fieldKey: "image" }} label="Edit Image" className="block">
        <PagePhoto src={image} alt={imageAlt} sizes="(max-width:1024px) 100vw, 50vw" />
      </Editable>
      {badgeText && (
        <p className="mt-u2 flex items-baseline gap-u1">
          <span className="font-heading text-2xl font-bold tabular-nums text-stbs-ink">{badgeText}</span>
          {badgeSubtext && <span className="t-eyebrow">{badgeSubtext}</span>}
        </p>
      )}
    </Reveal>
  ) : null;

  const textCol = (
    <Reveal>
      {eyebrow && <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit"><p className="t-eyebrow">{eyebrow}</p></Editable>}
      {heading && (
        <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
          <h2 className="t-h2 mt-u2 text-block">{heading}{headingLine2 && <>{" "}<span className="block">{headingLine2}</span></>}</h2>
        </Editable>
      )}
      {body && <Editable target={{ kind: "section", section: target }} label="Body text" className="max-w-fit"><p className="t-body measure mt-u3">{body}</p></Editable>}
      {body2 && <Editable target={{ kind: "section", section: target }} label="Body text" className="max-w-fit"><p className="t-body measure mt-u2">{body2}</p></Editable>}
    </Reveal>
  );

  if (layout === "center" || !image) {
    return (
      <section className="theme-public section-y">
        <div className="container-x">{textCol}</div>
      </section>
    );
  }
  return (
    <section className="theme-public section-y">
      <div className="container-x grid gap-u5 lg:grid-cols-2 lg:items-center lg:gap-u8">
        {layout === "left-image" ? <>{imageCol}{textCol}</> : <>{textCol}{imageCol}</>}
      </div>
    </section>
  );
}

function MissionVisionSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const target = asSection(owner);
  const cols = [
    { key: "mission", eyebrow: str(content, "missionEyebrow", "Our mission"), heading: str(content, "missionHeading", "Quality that endures."), text: str(content, "missionText", company.mission), label: "Mission" },
    { key: "vision", eyebrow: str(content, "visionEyebrow", "Our vision"), heading: str(content, "visionHeading", "A safer community."), text: str(content, "visionText", company.vision), label: "Vision" },
  ];
  return (
    <section className="theme-public band-alt section-y">
      <div className="container-x grid gap-u5 md:grid-cols-2 md:gap-u8">
        {cols.map((c, i) => (
          <Reveal key={c.key} delay={i * 0.1}>
            <Editable target={{ kind: "section", section: target }} label={c.label} className="max-w-fit">
              <div>
                <p className="t-eyebrow">{c.eyebrow}</p>
                <h2 className="t-h2 mt-u2">{c.heading}</h2>
                <p className="t-body measure mt-u3">{c.text}</p>
              </div>
            </Editable>
          </Reveal>
        ))}
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
    <section className="theme-public band-alt section-y">
      <div className="container-x grid gap-u5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-u8">
        <Reveal>
          <Editable target={{ kind: "section-field", section: target, fieldKey: "photo" }} label="Edit Image" className="block">
            <PagePhoto src={photo} alt={`${name}, ${title}`} sizes="(max-width:1024px) 100vw, 40vw" position="top" />
          </Editable>
          <p className="mt-u2 font-heading text-lg font-bold text-stbs-ink">{name}</p>
          <p className="t-eyebrow mt-u1">{title}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="t-eyebrow">{eyebrow}</p>
          </Editable>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="t-h2 mt-u2">{heading}{headingLine2 && <>{" "}<span className="block">{headingLine2}</span></>}</h2>
          </Editable>
          {bio && <Editable target={{ kind: "section", section: target }} label="Bio" className="max-w-fit"><p className="t-body measure mt-u3">{bio}</p></Editable>}
          {additionalText && <Editable target={{ kind: "section", section: target }} label="Additional text" className="max-w-fit"><p className="t-body measure mt-u2">{additionalText}</p></Editable>}
        </Reveal>
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
        <ul className="mt-u5 grid auto-rows-fr gap-u2 md:grid-cols-3 lg:gap-u3">
          {items.map((item, i) => (
            <li key={i}>
              <Reveal delay={i * 0.05} className="h-full">
                <div className="tile flex h-full flex-col p-u3">
                  <h3 className="t-h2 tabular-nums">{str(item, "title")}</h3>
                  {str(item, "subtitle") && <p className="t-eyebrow mt-u1">{str(item, "subtitle")}</p>}
                  <p className="t-body mt-u2">{str(item, "description")}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ExperienceCultureSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const heading = str(content, "heading", "34 years");
  const headingLine2 = str(content, "headingLine2", "of expertise.");
  const image = str(content, "image", "/Site_pic_2.jpeg");
  const imageAlt = str(content, "imageAlt", "Crew lowering precast concrete rings into a trench beside a drilling rig");
  const badgeText = str(content, "badgeText", "1992");
  const badgeSubtext = str(content, "badgeSubtext", "Established");
  const sections = arr(content, "sections");
  const values = arr(content, "values");
  const target = asSection(owner);

  return (
    <section className="theme-public section-y">
      <div className="container-x grid gap-u6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-u8">
        <div>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="t-h2">{heading}{headingLine2 && <>{" "}<span className="block">{headingLine2}</span></>}</h2>
          </Editable>
          {sections.map((sec, i) => (
            <div key={i} className="mt-u5">
              <h3 className="t-h3">{str(sec, "title")}</h3>
              <p className="t-body measure mt-u1">{str(sec, "body")}</p>
            </div>
          ))}
          {values.length > 0 && (
            <div className="mt-u5">
              <h3 className="t-h3">Our values</h3>
              <ul className="measure mt-u1 list-disc space-y-u1 pl-u3 marker:text-stbs-muted">
                {values.map((v, i) => (
                  <li key={i}>{str(v, "value")}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <Reveal>
          <Editable target={{ kind: "section-field", section: target, fieldKey: "image" }} label="Edit Image" className="block">
            <PagePhoto src={image} alt={imageAlt} sizes="(max-width:1024px) 100vw, 40vw" />
          </Editable>
          {badgeText && (
            <p className="mt-u2 flex items-baseline gap-u1">
              <span className="font-heading text-2xl font-bold tabular-nums text-stbs-ink">{badgeText}</span>
              {badgeSubtext && <span className="t-eyebrow">{badgeSubtext}</span>}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

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
          {description && <p className="t-body measure mt-u3 text-stbs-muted">{description}</p>}
        </Reveal>
        <ul className={`mt-u6 grid auto-rows-fr grid-cols-2 gap-u2 lg:gap-u3 ${sectors.length % 3 === 0 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
          {sectors.map((sec, i) => {
            const name = str(sec, "name");
            const Icon = sectorIcon(name);
            const note = str(sec, "description");
            return (
              <li key={`${name}-${i}`}>
                <Reveal delay={i * 0.06} className="h-full">
                  <div className="hairline-card flex h-full flex-col gap-u4 p-u3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-stbs-brand-mid/10 text-stbs-brand-mid">
                      <Icon size={22} strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="mt-auto">
                      <h3 className="text-[1.375rem] font-semibold leading-tight tracking-[-0.025em] text-stbs-ink">{name}</h3>
                      {note && <p className="mt-u1 text-[0.9375rem] leading-[1.5] text-stbs-muted">{note}</p>}
                    </div>
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
    <section className="theme-public band-alt section-y">
      <div className="container-x">
        <Reveal className="flex flex-col gap-u3 md:flex-row md:items-end md:justify-between">
          <div>
            <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
              <p className="t-eyebrow">{eyebrow}</p>
            </Editable>
            <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
              <h2 className="t-h2 mt-u2 text-block">{heading}</h2>
            </Editable>
          </div>
          {ctaText && ctaUrl && <Link href={ctaUrl} className="link-arrow hidden shrink-0 md:inline-flex">{ctaText}</Link>}
        </Reveal>
        <ul className="mt-u6 grid auto-rows-fr gap-u2 lg:grid-cols-3 lg:gap-u3">
          {projects.map((p, i) => (
            <li key={`${p.title}-${i}`}>
              <Reveal delay={i * 0.06} className="h-full">
                <Editable target={{ kind: "section", section: target }} label="Edit projects" className="block h-full">
                  <article className="hairline-card flex h-full flex-col p-u4">
                    {p.sector && <span className="inline-flex w-fit rounded-full bg-stbs-brand-mid/10 px-u2 py-[5px] text-[0.8125rem] font-medium text-stbs-brand-mid">{p.sector}</span>}
                    <h3 className="mt-u3 text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.025em] text-stbs-ink">{p.title}</h3>
                    {p.summary && <p className="mt-u2 text-[1.0625rem] leading-[1.5] text-stbs-body">{p.summary}</p>}
                    <p className="mt-auto flex items-center gap-u1 pt-u3 text-[0.9375rem] text-stbs-muted">
                      <MapPin size={16} strokeWidth={1.75} className="shrink-0" aria-hidden />
                      {p.location}
                    </p>
                  </article>
                </Editable>
              </Reveal>
            </li>
          ))}
        </ul>
        {ctaText && ctaUrl && <Link href={ctaUrl} className="btn btn-secondary mt-u5 w-full md:hidden">{ctaText}</Link>}
      </div>
    </section>
  );
}

function FeaturedClientsSection({ owner, content, data }: { owner?: RenderableSection; content: Record<string, unknown>; data: SectionData }) {
  const eyebrow = str(content, "eyebrow", "Selected partners");
  const heading = str(content, "heading", "Trusted on demanding sites.");
  const description = str(content, "description", "A selection of organisations supported by Saini Tubewell.");
  const target = asSection(owner);
  // Every published client, not just the featured few: logos ride the marquee, the rest stay a plain list.
  const all = (data.clients && data.clients.length > 0 ? data.clients : data.featuredClients) ?? [];
  const withLogo = all.filter((c) => c.logoUrl).map((c) => ({ id: c.id, name: c.name, logoUrl: c.logoUrl as string, altText: c.altText }));
  const others = all.filter((c) => !c.logoUrl);

  return (
    <section className="theme-public band-alt section-y overflow-x-clip">
      <div className="container-x">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="t-eyebrow">{eyebrow}</p>
          </Editable>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="t-h2 mt-u2 text-block">{heading}</h2>
          </Editable>
          {description && <p className="t-body measure mt-u3 text-stbs-muted">{description}</p>}
        </Reveal>
      </div>
      {withLogo.length > 0 && (
        <Editable target={{ kind: "clients" }} label="Edit Logos">
          <div className="marquee-mask mt-u6">
            <LogoMarquee logos={withLogo} />
          </div>
        </Editable>
      )}
      {others.length > 0 && (
        <div className="container-x mt-u6">
          <p className="t-eyebrow">More clients</p>
          <ul className="mt-u3 grid gap-x-u5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => (
              <li key={c.id} className="border-b border-stbs-hairline py-u2 text-[1.0625rem] text-stbs-body">{c.name}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ContactInfoSection({ owner, content, data }: { owner?: RenderableSection; content: Record<string, unknown>; data: SectionData }) {
  const heading = str(content, "heading", "Get in touch");
  const description = str(content, "description");
  const ctaText = str(content, "ctaText", "Request a proposal");
  const ctaUrl = str(content, "ctaUrl", "/quote");
  // Hours and service area are existing site copy, not verified data: confirm them (see TODO) or edit here.
  const hours = str(content, "hours", businessInfo.hours.join("\n")).split(/\r?\n/).filter(Boolean);
  const serviceArea = str(content, "serviceArea", "Sonipat, Panipat, Kundli, Rohtak and across Haryana and Delhi NCR");
  const target = asSection(owner);
  const s = data.settings;
  const phones = [s?.phone, s?.phone2].filter((p): p is string => Boolean(p));
  const email = s?.email ?? "";
  const address = s?.address ?? "";
  const whatsapp = s?.whatsapp || phones[0] || "";
  const waHref = whatsapp ? `https://wa.me/91${whatsapp.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "")}?text=${encodeURIComponent("Hi, I'd like a proposal for borewell drilling.")}` : "";
  const tile = "hairline-card flex flex-col gap-u1 p-u3";
  const link = "inline-flex min-h-[48px] items-center font-medium text-stbs-brand-mid hover:underline";

  return (
    <section className="theme-public section-y">
      <div className="container-x grid gap-u6 lg:grid-cols-2 lg:gap-u8">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="t-h2 text-block">{heading}</h2>
          </Editable>
          {description && <p className="t-body measure mt-u3">{description}</p>}
          <Link href={ctaUrl} className="btn btn-primary mt-u4 w-full sm:w-auto">{ctaText}</Link>
          <dl className="mt-u5 border-t border-stbs-hairline">
            <div className="grid gap-u1 border-b border-stbs-hairline py-u3 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <dt className="t-eyebrow">Working hours</dt>
              <dd className="t-body m-0">{hours.map((h) => <span key={h} className="block">{h}</span>)}</dd>
            </div>
            <div className="grid gap-u1 border-b border-stbs-hairline py-u3 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <dt className="t-eyebrow">Service area</dt>
              <dd className="t-body m-0">{serviceArea}</dd>
            </div>
          </dl>
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="grid gap-u2 sm:grid-cols-2">
            {phones.length > 0 && (
              <li className={tile}>
                <Phone size={28} strokeWidth={1.75} className="text-stbs-brand-mid" aria-hidden />
                <h3 className="t-h3 mt-u2">Call us</h3>
                {phones.map((p) => (
                  <a key={p} href={telHref(p)} className={`${link} tabular-nums`}>{formatIndianPhone(p)}</a>
                ))}
              </li>
            )}
            {waHref && (
              <li className={tile}>
                <MessageCircle size={28} strokeWidth={1.75} className="text-stbs-brand-mid" aria-hidden />
                <h3 className="t-h3 mt-u2">WhatsApp</h3>
                <a href={waHref} target="_blank" rel="noopener noreferrer" className={link}>Message us</a>
              </li>
            )}
            {email && (
              <li className={tile}>
                <Mail size={28} strokeWidth={1.75} className="text-stbs-brand-mid" aria-hidden />
                <h3 className="t-h3 mt-u2">Email us</h3>
                <a href={`mailto:${email}`} className={`${link} break-all`}>{email}</a>
              </li>
            )}
            {address && (
              <li className={tile}>
                <MapPin size={28} strokeWidth={1.75} className="text-stbs-brand-mid" aria-hidden />
                <h3 className="t-h3 mt-u2">Visit us</h3>
                <p className="t-body">{address}</p>
              </li>
            )}
            <li className={`${tile} sm:col-span-2`}>
              <h3 className="t-h3">{company.managingDirector}</h3>
              <p className="t-eyebrow">Managing Director</p>
            </li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function MapSection({ owner, content }: { owner?: RenderableSection; content: Record<string, unknown> }) {
  const eyebrow = str(content, "eyebrow", "Service area");
  const embedUrl = str(content, "embedUrl", "https://www.google.com/maps?q=Sonipat,Haryana&output=embed");
  const openUrl = embedUrl.replace(/&output=embed/, "");
  const target = asSection(owner);
  return (
    <section className="theme-public band-alt section-y">
      <div className="container-x">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="t-eyebrow">{eyebrow}</p>
          </Editable>
          <h2 className="t-h2 mt-u2 text-block">Where we work</h2>
          {/* The map is centred on Sonipat (the service area), not a street address: none is published yet. */}
          <div className="img-zoom mt-u4 border border-stbs-hairline">
            <iframe title="Map of Sonipat, Haryana: our service area" src={embedUrl} className="block h-[320px] w-full sm:h-[400px]" loading="lazy" />
          </div>
          <a href={openUrl} target="_blank" rel="noopener noreferrer" className="mt-u2 inline-flex min-h-[48px] items-center font-medium text-stbs-brand-mid hover:underline">Open in Google Maps</a>
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
  // Seed data stores plain strings; the editor stores { step } rows. Accept both.
  const fromContent = (steps as unknown[]).map((s) => (typeof s === "string" ? s : str(s as Record<string, unknown>, "step"))).filter(Boolean);
  const displaySteps = fromContent.length > 0 ? fromContent : ["Required service", "Project or site location", "Known depth or capacity needs", "Preferred project timeline"];

  return (
    <section className="theme-public section-y">
      <div className="container-x grid gap-u5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-u8">
        <Reveal>
          <Editable target={{ kind: "section", section: target }} label="Eyebrow" className="max-w-fit">
            <p className="t-eyebrow">{eyebrow}</p>
          </Editable>
          <Editable target={{ kind: "section", section: target }} label="Heading" className="max-w-fit">
            <h2 className="t-h2 mt-u2 text-block">{heading}</h2>
          </Editable>
        </Reveal>
        <Reveal delay={0.1}>
          <ol className="border-b border-stbs-hairline">
            {displaySteps.map((step, i) => (
              <li key={i} className="rule flex items-baseline gap-u3 py-u2">
                <span className="font-heading text-lg font-bold tabular-nums text-stbs-brand-mid">0{i + 1}</span>
                <span className="t-body">{step}</span>
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
    <section className="theme-public band-alt section-y">
      <div className="container-x">
        <h2 className="t-h2 text-block">Your details</h2>
        <div className="tile mt-u4 max-w-[880px] p-u3 md:p-u5">
          <QuoteForm />
        </div>
      </div>
    </section>
  );
}

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
