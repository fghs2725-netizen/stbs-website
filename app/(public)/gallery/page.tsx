import type { Metadata } from "next";
import { GalleryClient } from "@/components/gallery-client";
import { PageRenderer } from "@/components/public/page-renderer";
import { getPublishedGalleryItems, getPublishedPage, getPublishedPageMeta } from "@/lib/website/queries";
import { pageMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

const SLUG = "gallery";

// Fallback sections shown when there is no published CMS `gallery` page yet.
// The section renderer adds its own sensible defaults for missing content.
const FALLBACK_SECTIONS = [
  {
    type: "page_hero",
    content: {
      eyebrow: "Proof of work",
      heading: "Gallery",
      text: "Images of drilling, installation and completed projects from our field operations.",
    },
  },
  {
    type: "gallery",
    content: {
      eyebrow: "From the field",
      heading: "Work in motion",
      linkText: "View gallery",
      maxItems: 24,
    },
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPublishedPageMeta(SLUG);
  if (meta && meta.seoTitle) return pageMetadata({ title: meta.seoTitle, description: meta.metaDescription ?? "Proof of work: images of drilling, installation, and completed projects from our field operations.", path: "/gallery", image: meta.ogImage });
  return pageMetadata({ title: "Gallery", description: "Proof of work: images of drilling, installation, and completed projects from our field operations.", path: "/gallery" });
}

export default async function Gallery() {
  const cmsPage = await getPublishedPage(SLUG);
  if (cmsPage && cmsPage.sections.length > 0) {
    return <PageRenderer sections={cmsPage.sections.map((s) => ({ type: s.type, content: s.content as Record<string, unknown> }))} />;
  }

  // Root cause fix: publishing a photo only publishes the item, never the
  // `gallery` page. When the page is still a draft (or missing), render any
  // published photos through the same shared renderer instead of hiding them.
  const publishedItems = await getPublishedGalleryItems();
  if (publishedItems && publishedItems.length > 0) {
    return <PageRenderer sections={FALLBACK_SECTIONS} seed={{ gallery: publishedItems }} />;
  }

  // Honest empty state: no published photos at all.
  return <GalleryClient />;
}