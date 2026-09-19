import type { Metadata } from "next";
import { PageRenderer } from "@/components/public/page-renderer";
import { pageMetadata } from "@/lib/page-metadata";
import { QUOTE_SECTIONS } from "@/lib/website/page-defaults";
import { getPublishedPage, getPublishedPageMeta } from "@/lib/website/queries";

export const dynamic = "force-dynamic";

const SLUG = "quote";
const DESCRIPTION = "Request a proposal for borewell drilling, rainwater harvesting, material supply or tubewell construction.";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPublishedPageMeta(SLUG);
  if (meta && meta.seoTitle) return pageMetadata({ title: meta.seoTitle, description: meta.metaDescription ?? DESCRIPTION, path: "/quote", image: meta.ogImage });
  return pageMetadata({ title: "Request a Proposal", description: DESCRIPTION, path: "/quote" });
}

export default async function Quote() {
  const cmsPage = await getPublishedPage(SLUG);
  if (cmsPage && cmsPage.sections.length > 0) {
    return <PageRenderer sections={cmsPage.sections.map((s) => ({ type: s.type, content: s.content as Record<string, unknown> }))} />;
  }
  // Same section renderers as the CMS, fed the built-in defaults.
  return <PageRenderer sections={QUOTE_SECTIONS} />;
}
