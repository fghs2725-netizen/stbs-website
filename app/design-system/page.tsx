import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, Check, Drill, Factory, Home, Landmark } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { SiteHeader } from "@/components/site-header";
import { CaseStudiesSection, HeroSection, SectorsSection, ServicesSection, StatsSection } from "@/components/public/sections";

// Development-only style guide for the public design system. 404s in production.
export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

const swatches: Array<[string, string, string]> = [
  ["--ink", "#102235", "headings, nav"], ["--body", "#4A5A66", "paragraphs"], ["--muted", "#5F6F7A", "labels, captions"],
  ["--hairline", "#E2E8EB", "every border"], ["--surface", "#FFFFFF", "cards"], ["--surface-alt", "#F4F7F6", "alt sections"],
  ["--brand-deep", "#0B1F33", "dark bands"], ["--brand-mid", "#1677A8", "links, icons"], ["--accent", "#D18B35", "primary CTA only"],
  ["--verified", "#1F7A52", "checks, trust"],
];
const scale = [8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112];

export default function DesignSystem() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="theme-public min-h-screen">
      {/* Real navbar with default links, independent of what the CMS nav table currently holds. */}
      <SiteHeader phone="9812003001" businessName="Saini Tubewell Boring Service" />
      {/* Real hero with its built-in defaults (what the CMS renders once migrated). */}
      <HeroSection content={{}} />

      <section className="section-y">
        <div className="container-x">
          <p className="t-eyebrow">Design system</p>
          <h1 className="t-h1 mt-u2 text-block">Water infrastructure for industrial &amp; commercial sites</h1>
          <p className="t-body mt-u3 measure">Body copy is Inter 400 at 16 to 17px on a 1.6 line height, capped at 65ch and left-aligned. Numbers stay aligned with tabular figures: 9812003001 / 7988024114.</p>
          <div className="mt-u4 flex flex-wrap gap-u2">
            <a className="btn btn-primary" href="#">Get a site assessment</a>
            <a className="btn btn-secondary" href="#">Download company profile</a>
            <a className="btn btn-secondary" href="#"><Drill size={20} strokeWidth={1.75} aria-hidden /> With icon</a>
          </div>
        </div>
      </section>

      <section className="section-y rule band-alt">
        <div className="container-x">
          <p className="t-eyebrow">Colour</p>
          <h2 className="t-h2 mt-u2 text-block">Ten slots, one accent</h2>
          <ul className="mt-u5 grid grid-cols-2 gap-u2 md:grid-cols-5">
            {swatches.map(([name, hex, use]) => (
              <li key={name} className="hairline-card p-u2">
                <div className="h-u6 rounded-[4px] border border-[var(--hairline)]" style={{ background: hex }} />
                <p className="mt-u1 text-sm font-medium text-stbs-ink">{name}</p>
                <p className="tabular text-xs text-stbs-muted">{hex} · {use}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-y rule">
        <div className="container-x">
          <p className="t-eyebrow">Type scale</p>
          <div className="mt-u4 space-y-u4">
            <div><p className="t-eyebrow mb-u1">H2 · 28 → 44</p><p className="t-h2 text-block">Borewell drilling, tubewell construction</p></div>
            <div><p className="t-eyebrow mb-u1">H3 · 18 → 22</p><p className="t-h3 text-block">Rainwater harvesting and groundwater recharge</p></div>
            <div><p className="t-eyebrow mb-u1">Eyebrow · 12 → 13</p><p className="t-eyebrow">Trusted since 1992</p></div>
            <div><p className="t-eyebrow mb-u1">Stat · 44 → 72</p><p className="t-stat text-stbs-brand-deep">1200+</p></div>
          </div>
        </div>
      </section>

      <StatsSection content={{}} />
      <SectorsSection content={{}} />
      <ServicesSection content={{}} data={{}} />
      <CaseStudiesSection content={{}} />

      <section className="section-y">
        <div className="container-x">
          <p className="t-eyebrow">Cards, icons, motion</p>
          <ul className="mt-u4 grid gap-u2 sm:grid-cols-2 lg:grid-cols-4">
            {[[Factory, "Industrial"], [Building2, "Real estate"], [Landmark, "Government & tenders"], [Home, "Residential"]].map(([Icon, label], i) => {
              const I = Icon as typeof Factory;
              return (
                <li key={label as string}>
                  <Reveal delay={i * 0.05}>
                    <a href="#" className="hairline-card flex min-h-[112px] items-center gap-u2 p-u3">
                      <I size={28} strokeWidth={1.75} className="shrink-0 text-stbs-brand-mid" aria-hidden />
                      <span className="t-h3">{label as string}</span>
                    </a>
                  </Reveal>
                </li>
              );
            })}
          </ul>
          <p className="mt-u4 flex items-center gap-u1 text-sm text-stbs-muted"><Check size={16} strokeWidth={1.75} className="text-stbs-verified" aria-hidden /> Verified trust badge</p>
        </div>
      </section>

      <section className="section-y rule band-alt">
        <div className="container-x">
          <p className="t-eyebrow">8px spacing scale</p>
          <ul className="mt-u4 space-y-u1">
            {scale.map((px, i) => (
              <li key={px} className="flex items-center gap-u2">
                <span className="tabular w-u12 shrink-0 text-xs text-stbs-muted">--s{i + 1} · {px}px</span>
                <span className="h-u1 rounded-[4px] bg-stbs-brand-mid" style={{ width: px }} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
