import type { Metadata } from "next";
import { PageRenderer } from "@/components/public/page-renderer";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
import { CONTACT_SECTIONS } from "@/lib/website/page-defaults";
import { getPublishedPage, getPublishedPageMeta } from "@/lib/website/queries";

export const revalidate = 86400;

const SLUG = "contact";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPublishedPageMeta(SLUG);
  if (meta && meta.seoTitle) return pageMetadata({ title: meta.seoTitle, description: meta.metaDescription ?? SEO.contact.description, path: "/contact", image: meta.ogImage });
  return pageMetadata({ ...SEO.contact, path: "/contact", absoluteTitle: true });
}

export default async function Contact() {
  const cmsPage = await getPublishedPage(SLUG);
  if (cmsPage && cmsPage.sections.length > 0) {
    return <PageRenderer films={[{ afterType: "page_hero", scene: "map" }]} sections={cmsPage.sections.map((s) => ({ type: s.type, content: s.content as Record<string, unknown> }))} />;
  }
  // Same section renderers as the CMS, fed the built-in defaults.
  return <PageRenderer films={[{ afterType: "page_hero", scene: "map" }]} sections={CONTACT_SECTIONS} />;
}
