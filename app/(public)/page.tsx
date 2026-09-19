import type { Metadata } from "next";
import { HomePage } from "@/components/home-page";
import { PageRenderer } from "@/components/public/page-renderer";
import { getPublishedPage, getPublishedPageMeta } from "@/lib/website/queries";
import { pageMetadata, SITE_DEFAULT_DESCRIPTION, SITE_DEFAULT_TITLE } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

const SLUG = "home";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPublishedPageMeta(SLUG);
  return pageMetadata({
    title: meta?.seoTitle || SITE_DEFAULT_TITLE,
    description: meta?.metaDescription || SITE_DEFAULT_DESCRIPTION,
    ogTitle: meta?.ogTitle,
    ogDescription: meta?.ogDescription,
    path: "/",
    image: meta?.ogImage,
    absoluteTitle: true,
  });
}

export default async function Home() {
  const cmsPage = await getPublishedPage(SLUG);
  if (cmsPage && cmsPage.sections.length > 0) {
    return <PageRenderer sections={cmsPage.sections.map((s) => ({ type: s.type, content: s.content as Record<string, unknown> }))} />;
  }
  return <HomePage />;
}
