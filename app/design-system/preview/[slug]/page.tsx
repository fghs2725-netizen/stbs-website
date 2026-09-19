import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageRenderer } from "@/components/public/page-renderer";
import { DuotoneDefs } from "@/components/public/photo";
import { SiteHeader } from "@/components/site-header";
import { ABOUT_SECTIONS, CLIENTS_SECTIONS, fallbackClientRows, type DefaultSection } from "@/lib/website/page-defaults";

// Development-only: renders an interior page's BUILT-IN defaults (what the static fallback shows when
// no CMS page is published) under the real navbar, independent of what the CMS currently holds.
// 404s in production.
export const metadata: Metadata = { title: "Page preview", robots: { index: false, follow: false } };

const PAGES: Record<string, { sections: DefaultSection[]; seed?: Parameters<typeof PageRenderer>[0]["seed"] }> = {
  about: { sections: ABOUT_SECTIONS },
  clients: { sections: CLIENTS_SECTIONS, seed: { clients: fallbackClientRows(), featuredClients: [], testimonials: [] } },
};

export default async function PagePreview({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();
  return (
    <div className="relative min-w-0 w-full overflow-x-clip">
      <DuotoneDefs />
      <SiteHeader phone="9812003001" businessName="Saini Tubewell Boring Service" />
      <main>
        <PageRenderer sections={page.sections} seed={page.seed} />
      </main>
    </div>
  );
}
