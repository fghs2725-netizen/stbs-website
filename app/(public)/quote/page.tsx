import type { Metadata } from "next";
import { PageRenderer } from "@/components/public/page-renderer";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
import { QUOTE_SECTIONS } from "@/lib/website/page-defaults";
import { getPublishedPage, getPublishedPageMeta } from "@/lib/website/queries";

export const revalidate = 86400;

const SLUG = "quote";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPublishedPageMeta(SLUG);
  if (meta && meta.seoTitle) return pageMetadata({ title: meta.seoTitle, description: meta.metaDescription ?? SEO.quote.description, path: "/quote", image: meta.ogImage });
  return pageMetadata({ ...SEO.quote, path: "/quote", absoluteTitle: true });
}

export default async function Quote() {
  const cmsPage = await getPublishedPage(SLUG);
  if (cmsPage && cmsPage.sections.length > 0) {
    return <PageRenderer sections={cmsPage.sections.map((s) => ({ type: s.type, content: s.content as Record<string, unknown> }))} />;
  }
  // Same section renderers as the CMS, fed the built-in defaults.
  return <PageRenderer sections={QUOTE_SECTIONS} />;
}
