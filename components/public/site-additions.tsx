import { BadgeCheck, Drill, MapPinned, Plus, ScanSearch, Settings2, ShieldCheck } from "lucide-react";
import { processSteps } from "@/lib/company";

export function Faq({ items }: { items: Array<[string, string]> }) {
  return (
    <section className="theme-public section-y">
      <div className="container-x">
        <p className="t-eyebrow">Questions, clearly answered</p>
        <h2 className="t-h2 mt-u2 text-block">Frequently asked questions</h2>
        <div className="mt-u5 max-w-[880px] border-b border-stbs-hairline">
          {items.map(([q, a]) => (
            <details key={q} className="group rule">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-u2 py-u2 text-lg font-medium text-stbs-ink [&::-webkit-details-marker]:hidden">
                {q}
                <Plus size={20} strokeWidth={1.75} className="shrink-0 text-stbs-brand-mid transition-transform duration-[250ms] group-open:rotate-45" aria-hidden />
              </summary>
              <p className="t-body measure pb-u3">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Five-step process, as a spec-sheet list (number | step | what happens). */
export function ProcessSteps() {
  const icons = [MapPinned, ScanSearch, Drill, Settings2, BadgeCheck];
  return (
    <section className="theme-public band-alt section-y">
      <div className="container-x">
        <p className="t-eyebrow">Our process</p>
        <h2 className="t-h2 mt-u2 text-block">From surface conditions to working water infrastructure</h2>
        <ol className="mt-u5 border-b border-stbs-hairline">
          {processSteps.map((step, index) => {
            const Icon = icons[index];
            return (
              <li key={step.step} className="rule grid gap-u1 py-u3 lg:grid-cols-[6rem_14rem_minmax(0,1fr)] lg:items-baseline lg:gap-u3">
                <span className="flex items-center gap-u1 font-heading text-lg font-bold tabular-nums text-stbs-brand-mid">
                  <Icon size={20} strokeWidth={1.75} aria-hidden />
                  {step.step}
                </span>
                <h3 className="t-h3">{step.title}</h3>
                <p className="t-body measure">{step.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* Testimonial quotes below are placeholder stand-ins.  Replace each entry
   with a genuine client testimonial once collected.  Do NOT add ratings,
   logos, or fabricated details. */
export function Testimonials() { const quotes: Array<{ text: string; name: string; org: string }> = [{ text: "Professional team, clear coordination from the first site visit through to handover.", name: "Client testimonial", org: "Coming soon" }, { text: "They understood our site requirements and worked around our operational schedule.", name: "Client testimonial", org: "Coming soon" }, { text: "Reliable work, practical advice, and consistent follow-through on every commitment.", name: "Client testimonial", org: "Coming soon" }]; return <section className="bg-[#f0fdfa] px-5 py-20 text-ink lg:px-8"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-water-dark">Testimonials</p><h2 className="mt-4 font-display text-4xl font-bold uppercase sm:text-5xl">What our clients say</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{quotes.map((q, i) => <article key={i} className="rounded-2xl border border-cyan-900/15 bg-white p-7 shadow-sm"><p className="leading-7 text-slate-700">&ldquo;{q.text}&rdquo;</p><p className="mt-6 text-sm font-bold text-water-dark">{q.name}</p><p className="text-xs text-slate-500">{q.org}</p></article>)}</div></div></section>; }

export function TrustMark() { return <ShieldCheck className="text-signal" aria-hidden="true" />; }
