import type { Metadata } from "next";
import { GalleryClient } from "@/components/gallery-client";
import { PageRenderer } from "@/components/public/page-renderer";
import { getPublishedPage, getPublishedPageMeta } from "@/lib/website/queries";
import { absolutePath } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const SLUG = "gallery";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPublishedPageMeta(SLUG);
  const canonical = { alternates: { canonical: absolutePath("/gallery") } };
  if (meta && meta.seoTitle) return { title: meta.seoTitle, description: meta.metaDescription ?? undefined, ...canonical };
  return { title: "Gallery", description: "Proof of work: images of drilling, installation, and completed projects from our field operations.", ...canonical };
}

export default async function Gallery() {
  const cmsPage = await getPublishedPage(SLUG);
  if (cmsPage && cmsPage.sections.length > 0) {
    return <PageRenderer sections={cmsPage.sections.map((s) => ({ type: s.type, content: s.content as Record<string, unknown> }))} />;
  }
  return <GalleryClient />;
}