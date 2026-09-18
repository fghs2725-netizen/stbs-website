import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Faq, ProcessSteps, ServiceCta, VisualSlot, WaveDivider } from "@/components/public/site-additions";

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

export function ServiceDetailPage({ eyebrow, title, intro, icon: Icon, bullets, specs, process, segments }: { eyebrow: string; title: string; intro: string; icon: LucideIcon; bullets: string[]; specs?: string[]; process?: boolean; segments?: string[] }) {
  return <><PageHero eyebrow={eyebrow} title={title} text={intro}/><section className="bg-[#f0fdfa] px-5 py-20 text-ink lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_.8fr]"><div><div className="flex size-14 items-center justify-center rounded-2xl bg-signal text-white"><Icon size={28}/></div><h2 className="mt-6 font-display text-4xl font-bold uppercase">Built around site conditions</h2><ul className="mt-7 grid gap-4 sm:grid-cols-2">{bullets.map((item) => <li key={item} className="flex gap-3 rounded-xl bg-white p-4 shadow-sm"><Check className="mt-0.5 shrink-0 text-signal" size={18}/><span className="text-sm leading-6 text-slate-700">{item}</span></li>)}</ul></div><VisualSlot label={`${eyebrow} supporting illustration`}/></div></section>{specs && <><WaveDivider/><section className="bg-white px-5 py-16 text-ink lg:px-8"><div className="mx-auto max-w-7xl rounded-2xl border border-cyan-900/15 p-7"><h2 className="font-display text-3xl uppercase">Planning specifications</h2><div className="mt-6 grid gap-3 sm:grid-cols-3">{specs.map(x => <p key={x} className="rounded-xl bg-cyan-50 p-4 text-sm font-semibold text-water-dark">{x}</p>)}</div></div></section></>}{segments && <section className="bg-white px-5 py-16 text-ink lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="font-display text-3xl uppercase">Who this is for</h2><div className="mt-6 grid gap-3 sm:grid-cols-3">{segments.map(x => <p key={x} className="rounded-xl bg-cyan-50 p-4 text-sm text-slate-700">{x}</p>)}</div></div></section>}{process && <ProcessSteps/>}<Faq items={sharedFaq}/><ServiceCta/></>;
}
