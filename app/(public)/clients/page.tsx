import type { Metadata } from "next";
import { Building2, Factory, Home, Landmark, Sprout, Warehouse } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { clients } from "@/lib/company";
import { PageRenderer } from "@/components/public/page-renderer";
import { getPublishedPage, getPublishedPageMeta } from "@/lib/website/queries";
import { pageMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

const SLUG = "clients";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPublishedPageMeta(SLUG);
  if (meta && meta.seoTitle) return pageMetadata({ title: meta.seoTitle, description: meta.metaDescription ?? "Water infrastructure support for residential, agricultural, commercial, institutional and industrial requirements.", path: "/clients", image: meta.ogImage });
  return pageMetadata({ title: "Clients", description: "Water infrastructure support for residential, agricultural, commercial, institutional and industrial requirements.", path: "/clients" });
}

const sectors = [[Home, "Residential", "Practical planning for homes and housing sites."], [Sprout, "Agriculture", "Water access planned around field operations."], [Building2, "Commercial", "Coordinated work for active commercial premises."], [Factory, "Industrial", "Execution aligned to site safety and operations."], [Landmark, "Institutional", "Clear coordination for campuses and public sites."], [Warehouse, "Infrastructure", "Site-aware support for larger development work."]] as const;
const featuredClients = [
  ["Ashoka University", "AU", "Institutional"],
  ["Amul Milk, Murthal", "AMUL", "Dairy & Food"],
  ["BigBasket, Sonipat Site", "bb", "Retail & Distribution"],
  ["Voestalpine VAE VKN India Pvt. Ltd.", "VAE VKN", "Industrial"],
  ["LT Overseas Pvt. Ltd. (Dawat Rice Mill)", "DAWAT", "Food Manufacturing"],
  ["ITEC Technopark, IIT Delhi Sonipat Campus", "ITEC", "Technology & Research"],
] as const;

function ClientsStatic() {
  return <>
    <PageHero eyebrow="Who we serve" title="Grounded partnerships." text="Our service model supports diverse water infrastructure requirements with the same focus on practical planning and dependable execution." />
    <section className="bg-neutral-100 px-5 py-24 text-black lg:px-8"><div className="mx-auto max-w-7xl"><Reveal><h2 className="max-w-3xl font-display text-5xl font-bold uppercase leading-none sm:text-6xl">Built to support every kind of site.</h2><p className="mt-6 max-w-2xl leading-8 text-black/55">From individual properties to operational facilities, our work begins by understanding the requirement, access, ground conditions and intended use.</p></Reveal><div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3">{sectors.map(([Icon, name, detail], i) => <Reveal key={name} delay={i * .05}><div className="group rounded-2xl border border-black/10 p-8 transition hover:bg-black hover:text-white"><Icon className="text-black group-hover:text-signal" size={36} /><h3 className="mt-16 font-display text-3xl uppercase">{name}</h3><p className="mt-3 text-sm text-black/50 group-hover:text-white/50">{detail}</p></div></Reveal>)}</div></div></section>
    <section className="bg-black px-5 py-24 lg:px-8"><div className="mx-auto max-w-7xl"><Reveal><p className="text-xs font-bold uppercase tracking-[.24em] text-signal">Selected partners</p><h2 className="mt-5 max-w-4xl font-display text-5xl font-bold uppercase leading-[.92] sm:text-6xl">Trusted on demanding sites.</h2><p className="mt-6 max-w-xl text-sm leading-7 text-white/45">A selection of organisations supported by Saini Tubewell across institutional, industrial, food and technology environments.</p></Reveal><div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-12">{featuredClients.map(([name, mark, sector], i) => <Reveal key={name} delay={i * .05} className={i === 0 ? "lg:col-span-7" : i === 1 ? "lg:col-span-5" : "lg:col-span-4"}><article className={`group relative flex min-h-48 h-full flex-col justify-between overflow-hidden border border-white/10 bg-white/[.035] p-7 transition duration-300 hover:-translate-y-1 hover:border-signal/60 hover:bg-white/[.07] ${i === 0 ? "lg:min-h-64" : ""}`}><span className="absolute right-6 top-5 font-mono text-[10px] tracking-[.25em] text-white/25">0{i + 1}</span><div><div className="flex h-14 w-36 items-center justify-start"><span className="text-sm font-black tracking-[.12em] text-signal transition group-hover:text-white">{mark}</span></div><h3 className="mt-6 max-w-sm font-display text-2xl uppercase leading-tight text-white transition group-hover:text-signal">{name}</h3></div><div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] font-bold uppercase tracking-[.2em] text-white/35"><span>{sector}</span><span className="h-px w-8 bg-signal/60 transition-all duration-300 group-hover:w-16" /></div></article></Reveal>)}</div><div className="mt-20 border-t border-white/10 pt-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.24em] text-signal">More clients</p><p className="mt-3 text-sm text-white/40">Additional organisations and sites supported by our team.</p></div><p className="text-sm text-white/35">{clients.length} listed organisations</p></div><div className="mt-7 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{clients.filter(client => !featuredClients.some(([name]) => name === client)).map(client => <div key={client} className="border-b border-white/10 py-3 text-sm text-white/55">{client}</div>)}</div></div></div></section>
  </>;
}

export default async function Clients() {
  const cmsPage = await getPublishedPage(SLUG);
  if (cmsPage && cmsPage.sections.length > 0) {
    return <PageRenderer sections={cmsPage.sections.map((s) => ({ type: s.type, content: s.content as Record<string, unknown> }))} />;
  }
  return <ClientsStatic />;
}
