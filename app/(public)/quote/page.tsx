import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { QuoteForm } from "@/components/quote-form";
import { Reveal } from "@/components/reveal";
import { PageRenderer } from "@/components/public/page-renderer";
import { getPublishedPage, getPublishedPageMeta } from "@/lib/website/queries";
import { pageMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

const SLUG = "quote";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPublishedPageMeta(SLUG);
  if (meta && meta.seoTitle) return pageMetadata({ title: meta.seoTitle, description: meta.metaDescription ?? "Request a quote for borewell drilling, rainwater harvesting, material supply or tubewell construction.", path: "/quote", image: meta.ogImage });
  return pageMetadata({ title: "Request a Quote", description: "Request a quote for borewell drilling, rainwater harvesting, material supply or tubewell construction.", path: "/quote" });
}

function QuoteStatic() {
  return <><PageHero eyebrow="Start a project" title="Tell us what the site needs." text="Share the basic project details. The request form is structured to help the team understand your service and site requirements."/><section className="bg-black px-5 py-24 lg:px-8"><div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[.7fr_1.3fr]"><Reveal><p className="text-xs font-bold uppercase tracking-[.24em] text-signal">Before we begin</p><h2 className="mt-5 font-display text-4xl font-bold uppercase">Useful project details</h2><ol className="mt-8 space-y-6">{["Required service","Project or site location","Known depth or capacity needs","Preferred project timeline"].map((x,i)=><li key={x} className="flex items-center gap-4 border-b border-white/10 pb-5"><span className="font-display text-2xl text-signal">0{i+1}</span><span className="text-sm text-white/60">{x}</span></li>)}</ol></Reveal><Reveal delay={.1}><QuoteForm/></Reveal></div></section></>;
}

export default async function Quote() {
  const cmsPage = await getPublishedPage(SLUG);
  if (cmsPage && cmsPage.sections.length > 0) {
    return <PageRenderer sections={cmsPage.sections.map((s) => ({ type: s.type, content: s.content as Record<string, unknown> }))} />;
  }
  return <QuoteStatic />;
}
