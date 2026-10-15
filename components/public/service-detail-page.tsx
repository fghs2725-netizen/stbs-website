import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CtaSection } from "@/components/public/sections";
import { Faq, ProcessSteps } from "@/components/public/site-additions";
import { SERVICE_FAQS } from "@/lib/website/service-faqs";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/website/structured-data";

/**
 * `image` is illustrative site photography, not a record of a specific job, so it carries no
 * caption tying it to a client or project. Pass `imageAlt` describing only what is visible.
 */
export function ServiceDetailPage({ slug, eyebrow, title, intro, icon: Icon, bullets, specs, process, segments, image, imageAlt, diagram, diagramTitle = "How it works", table, specsTitle = "Planning specifications" }: { slug: string; diagram?: ReactNode; diagramTitle?: string; table?: { head: string[]; rows: string[][] }; eyebrow: string; title: string; intro: string; icon: LucideIcon; bullets: string[]; specs?: string[]; process?: boolean; segments?: string[]; image?: string; imageAlt?: string; specsTitle?: string }) {
  const faqs = SERVICE_FAQS[slug] ?? [];
  const hasAside = Boolean(specs?.length || segments?.length);
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} text={intro} image={image} imageAlt={imageAlt} />

      <section className="theme-public section-y">
        <div className={`container-x grid gap-u6 ${hasAside ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-u8" : ""}`}>
          <div>
            <Icon size={32} strokeWidth={1.75} className="text-stbs-brand-mid" aria-hidden />
            <h2 className="t-h2 mt-u3 text-block">Built around site conditions</h2>
            <ul className={`mt-u4 grid gap-u2 ${hasAside ? "" : "sm:grid-cols-2"}`}>
              {bullets.map((item) => (
                <li key={item} className="tile flex items-start gap-u2 p-u2">
                  <Check size={20} strokeWidth={1.75} className="mt-[2px] shrink-0 text-stbs-verified" aria-hidden />
                  <span className="t-body">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {hasAside && (
            <aside className="grid content-start gap-u2">
              {specs && specs.length > 0 && (
                <div className="tile p-u3">
                  <p className="t-eyebrow">{specsTitle}</p>
                  <ul className="mt-u2 space-y-u1">
                    {specs.map((x) => (
                      <li key={x} className="font-medium tabular-nums text-stbs-ink">{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {segments && segments.length > 0 && (
                <div className="tile p-u3">
                  <p className="t-eyebrow">Who this is for</p>
                  <ul className="mt-u2 space-y-u1">
                    {segments.map((x) => (
                      <li key={x} className="t-body">{x}</li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          )}
        </div>
      </section>

      {diagram && (
        <section className="band-deep section-y">
          <div className="container-x">
            <p className="t-eyebrow !text-stbs-bronze-light">{diagramTitle}</p>
            <div className="mt-u5 overflow-hidden rounded-[18px] border border-white/10 bg-[#0e1213] p-[clamp(12px,3vw,40px)]"><div className="overflow-x-auto"><div className="min-w-[720px]">{diagram}</div></div></div>
            <p className="mt-u2 text-[.8125rem] text-white/45">Schematic illustration. Actual design depends on the site survey.</p>
          </div>
        </section>
      )}

      {table && (
        <section className="theme-public section-y">
          <div className="container-x">
            <p className="t-eyebrow">What we supply</p>
            <h2 className="t-h2 mt-u2 text-block">Ranges and brands</h2>
            <div className="mt-u5 overflow-x-auto rounded-[18px] border border-stbs-hairline bg-[var(--card)]">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-stbs-hairline">
                    {table.head.map((h) => <th key={h} scope="col" className="t-eyebrow px-u3 py-u2 !text-[.75rem]">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r) => (
                    <tr key={r[0]} className="border-b border-stbs-hairline last:border-0">
                      {r.map((c, i) => <td key={i} className={`px-u3 py-u2 align-top ${i === 0 ? "font-semibold text-stbs-ink" : i === 1 ? "tabular-nums text-stbs-ink" : "text-stbs-muted"}`}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {process && <ProcessSteps />}
      {faqs.length > 0 && <Faq items={faqs} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: "Services", path: "/services" }, { name: eyebrow, path: `/${slug}` }])) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }} />}
      <CtaSection content={{}} />
    </>
  );
}
