import type { Metadata } from "next";
import { HomePage } from "@/components/home-page";
import { PageRenderer } from "@/components/public/page-renderer";
import { getPublishedPage, getPublishedPageMeta } from "@/lib/website/queries";
import { absolutePath } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const SLUG = "home";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPublishedPageMeta(SLUG);
  const canonical = { alternates: { canonical: absolutePath("/") } };
  if (!meta || !meta.seoTitle) return canonical;
  return {
    title: meta.seoTitle,
    description: meta.metaDescription ?? undefined,
    openGraph: meta.ogImage ? { title: meta.ogTitle ?? meta.seoTitle, description: meta.ogDescription ?? undefined, images: [meta.ogImage] } : undefined,
    ...canonical,
  };
}

export default async function Home() {
  const cmsPage = await getPublishedPage(SLUG);
  if (cmsPage && cmsPage.sections.length > 0) {
    return <PageRenderer sections={cmsPage.sections.map((s) => ({ type: s.type, content: s.content as Record<string, unknown> }))} />;
  }
  return <HomePage />;
}