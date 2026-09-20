import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CtaSection } from "@/components/public/sections";
import { Faq, ProcessSteps } from "@/components/public/site-additions";

/* FAQ answers are intentionally generic until the business owner confirms
   exact depth ranges, turnaround commitments, licensing scope and warranty
   terms.  Do NOT insert specific figures without owner sign-off. */
const sharedFaq: Array<[string, string]> = [
  ["What depth can you support?", "Depth capacity depends on the ground conditions at your site. We assess this during the initial site visit and recommend the most practical approach."],
  ["How long will the work take?", "Turnaround varies with access, ground conditions and scope. We share a realistic timeline after reviewing your site."],
  ["Do you handle permissions or licensing?", "We can advise on what's typically required. Discuss your specific situation with us during the planning stage."],
  ["What warranty terms apply?", "Warranty coverage depends on the work and materials involved. We'll outline the applicable terms as part of your quotation."],
  ["Which areas do you serve?", "Sonipat, Panipat, Kundli, Rohtak, Haryana and Delhi NCR."],
];

/** FAQPage structured data built from the exact visible FAQ text. */
function faqJsonLd(items: Array<[string, string]>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

/**
 * `image` is illustrative site photography, not a record of a specific job, so it carries no
 * caption tying it to a client or project. Pass `imageAlt` describing only what is visible.
 */
export function ServiceDetailPage({ eyebrow, title, intro, icon: Icon, bullets, specs, process, segments, image, imageAlt }: { eyebrow: string; title: string; intro: string; icon: LucideIcon; bullets: string[]; specs?: string[]; process?: boolean; segments?: string[]; image?: string; imageAlt?: string }) {
  const hasAside = Boolean(specs?.length || segments?.length);
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} text={intro} />

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
                  <p className="t-eyebrow">Planning specifications</p>
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

      {image && imageAlt && (
        <section className="theme-public pb-u7">
          <div className="container-x">
            <div className="relative aspect-[16/9] w-full overflow-hidden border border-stbs-hairline sm:aspect-[21/9]">
              <Image src={image} alt={imageAlt} fill className="object-cover" sizes="(max-width:1280px) 100vw, 1280px" />
            </div>
          </div>
        </section>
      )}

      {process && <ProcessSteps />}
      <Faq items={sharedFaq} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(sharedFaq)) }} />
      <CtaSection content={{}} />
    </>
  );
}
