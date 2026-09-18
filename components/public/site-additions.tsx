import Link from "next/link";
import { ArrowRight, BadgeCheck, Drill, MapPinned, ScanSearch, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { processSteps } from "@/lib/company";

export function WaveDivider() { return <div className="wave-divider" aria-hidden="true" />; }

export function Faq({ items }: { items: Array<[string, string]> }) {
  return <section className="bg-[#f0fdfa] px-5 py-20 text-ink lg:px-8"><div className="mx-auto max-w-5xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-water-dark">Questions, clearly answered</p><h2 className="mt-4 font-display text-4xl font-bold uppercase sm:text-5xl">Frequently asked questions</h2><div className="mt-10 divide-y divide-cyan-900/15 rounded-2xl border border-cyan-900/15 bg-white">{items.map(([q, a]) => <details key={q} className="group p-5"><summary className="cursor-pointer list-none font-semibold text-water-dark">{q}<span className="float-right text-signal group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl leading-7 text-slate-700">{a}</p></details>)}</div></div></section>;
}

export function ProcessSteps() { const icons = [MapPinned, ScanSearch, Drill, Settings2, BadgeCheck]; return <section className="water-surface-dark px-5 py-20 text-white lg:px-8"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-water-accent">Our process</p><h2 className="mt-4 font-display text-4xl font-bold sm:text-5xl">From surface conditions to working water infrastructure</h2><div className="mt-10 grid gap-4 md:grid-cols-5">{processSteps.map((step, index) => { const Icon = icons[index]; return <article key={step.step} className="water-card p-5"><span className="text-3xl font-bold text-water-accent">{step.step}</span><h3 className="mt-7 font-display text-xl font-bold">{step.title}</h3><p className="mt-3 text-sm leading-6 text-white/70">{step.text}</p><div className="mt-4 flex size-10 items-center justify-center rounded-xl border border-cyan-100/20 bg-slate-950/30 text-water-accent"><Icon size={19}/></div></article>; })}</div></div></section>; }

/* Testimonial quotes below are placeholder stand-ins.  Replace each entry
   with a genuine client testimonial once collected.  Do NOT add ratings,
   logos, or fabricated details. */
export function Testimonials() { const quotes: Array<{ text: string; name: string; org: string }> = [{ text: "Professional team, clear coordination from the first site visit through to handover.", name: "Client testimonial", org: "Coming soon" }, { text: "They understood our site requirements and worked around our operational schedule.", name: "Client testimonial", org: "Coming soon" }, { text: "Reliable work, practical advice, and consistent follow-through on every commitment.", name: "Client testimonial", org: "Coming soon" }]; return <section className="bg-[#f0fdfa] px-5 py-20 text-ink lg:px-8"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-water-dark">Testimonials</p><h2 className="mt-4 font-display text-4xl font-bold uppercase sm:text-5xl">What our clients say</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{quotes.map((q, i) => <article key={i} className="rounded-2xl border border-cyan-900/15 bg-white p-7 shadow-sm"><p className="leading-7 text-slate-700">&ldquo;{q.text}&rdquo;</p><p className="mt-6 text-sm font-bold text-water-dark">{q.name}</p><p className="text-xs text-slate-500">{q.org}</p></article>)}</div></div></section>; }

export function ServiceCta() { return <section className="water-surface-dark waterline px-5 py-16 text-white lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-water-accent">Talk to the field team</p><h2 className="mt-3 font-display text-4xl font-bold">Plan the next step for your site.</h2></div><Button asChild variant="primary" size="lg"><Link href="/quote">Request a quote <ArrowRight size={17}/></Link></Button></div></section>; }

export function VisualSlot({ label }: { label: string }) { return <div className="water-card-light flex min-h-36 flex-col items-center justify-center border-dashed p-5 text-center text-water-dark"><MapPinned size={26}/><p className="mt-2 text-xs font-bold uppercase tracking-wide">Visual slot: {label}</p><p className="mt-1 text-xs text-slate-500">Source separately; no Gallery image used.</p></div>; }

export function TrustMark() { return <ShieldCheck className="text-signal" aria-hidden="true" />; }
