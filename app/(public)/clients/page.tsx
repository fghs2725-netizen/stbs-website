import type { Metadata } from "next";
import { PageRenderer } from "@/components/public/page-renderer";
import { pageMetadata } from "@/lib/page-metadata";
import { CLIENTS_SECTIONS, fallbackClientRows } from "@/lib/website/page-defaults";
import { getPublishedPage, getPublishedPageMeta } from "@/lib/website/queries";

export const dynamic = "force-dynamic";

const SLUG = "clients";
const DESCRIPTION = "Water infrastructure support for residential, agricultural, commercial, institutional and industrial requirements.";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPublishedPageMeta(SLUG);
  if (meta && meta.seoTitle) return pageMetadata({ title: meta.seoTitle, description: meta.metaDescription ?? DESCRIPTION, path: "/clients", image: meta.ogImage });
  return pageMetadata({ title: "Clients", description: DESCRIPTION, path: "/clients" });
}

export default async function Clients() {
  const cmsPage = await getPublishedPage(SLUG);
  if (cmsPage && cmsPage.sections.length > 0) {
    return <PageRenderer sections={cmsPage.sections.map((s) => ({ type: s.type, content: s.content as Record<string, unknown> }))} />;
  }
  // Same section renderers as the CMS, fed the built-in defaults.
  return <PageRenderer sections={CLIENTS_SECTIONS} seed={{ clients: fallbackClientRows(), featuredClients: [], testimonials: [] }} />;
}
