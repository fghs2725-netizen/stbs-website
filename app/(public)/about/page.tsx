import type { Metadata } from "next";
import { PageRenderer } from "@/components/public/page-renderer";
import { pageMetadata } from "@/lib/page-metadata";
import { ABOUT_SECTIONS } from "@/lib/website/page-defaults";
import { getPublishedPage, getPublishedPageMeta } from "@/lib/website/queries";

export const dynamic = "force-dynamic";

const SLUG = "about";
const DESCRIPTION = "Learn about Saini Tubewell Boring Service, providing professional water infrastructure services since 1992.";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPublishedPageMeta(SLUG);
  if (meta && meta.seoTitle) return pageMetadata({ title: meta.seoTitle, description: meta.metaDescription ?? DESCRIPTION, path: "/about", image: meta.ogImage });
  return pageMetadata({ title: "About", description: DESCRIPTION, path: "/about" });
}

export default async function About() {
  const cmsPage = await getPublishedPage(SLUG);
  if (cmsPage && cmsPage.sections.length > 0) {
    return <PageRenderer sections={cmsPage.sections.map((s) => ({ type: s.type, content: s.content as Record<string, unknown> }))} />;
  }
  // Same section renderers as the CMS, fed the built-in defaults.
  return <PageRenderer sections={ABOUT_SECTIONS} />;
}
