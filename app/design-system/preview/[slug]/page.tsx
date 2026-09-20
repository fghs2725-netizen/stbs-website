import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageRenderer } from "@/components/public/page-renderer";
import { SiteHeader } from "@/components/site-header";
import { ABOUT_SECTIONS, CLIENTS_SECTIONS, CONTACT_SECTIONS, QUOTE_SECTIONS, fallbackClientRows, type DefaultSection } from "@/lib/website/page-defaults";

// Development-only: renders an interior page's BUILT-IN defaults (what the static fallback shows when
// no CMS page is published) under the real navbar, independent of what the CMS currently holds.
// 404s in production.
export const metadata: Metadata = { title: "Page preview", robots: { index: false, follow: false } };

const PAGES: Record<string, { sections: DefaultSection[]; seed?: Parameters<typeof PageRenderer>[0]["seed"] }> = {
  about: { sections: ABOUT_SECTIONS },
  clients: { sections: CLIENTS_SECTIONS, seed: { clients: fallbackClientRows(), featuredClients: [], testimonials: [] } },
  contact: { sections: CONTACT_SECTIONS },
  quote: { sections: QUOTE_SECTIONS },
  // Sample items (the two existing site photos) purely to show the layout; nothing here is CMS data.
  gallery: {
    sections: [
      { type: "page_hero", name: "Page hero", position: 0, content: { eyebrow: "Proof of work", heading: "Gallery", text: "Images of drilling, installation and completed projects from our field operations." } },
      { type: "gallery", name: "Gallery", position: 1, content: { eyebrow: "From the field", heading: "Work in motion", maxItems: 24 } },
    ],
    seed: {
      gallery: [
        { id: "g1", mediaUrl: "/site_pic.jpeg", altText: "Worker in a ringed concrete pit guiding a pipe above a gravel bed", caption: "Recharge pit, gravel bed", category: null, position: 0 },
        { id: "g2", mediaUrl: "/Site_pic_2.jpeg", altText: "Crew lowering precast concrete rings into a trench beside a drilling rig", caption: "", category: null, position: 1 },
        { id: "g3", mediaUrl: "/hero/stbs-drilling-rig-site.webp", altText: "Drilling rig on an industrial site", caption: "Rig on site", category: null, position: 2 },
      ],
    },
  },
};

export default async function PagePreview({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();
  return (
    <div className="relative min-w-0 w-full overflow-x-clip">
      <SiteHeader phone="9812003001" businessName="Saini Tubewell Boring Service" />
      <main>
        <PageRenderer sections={page.sections} seed={page.seed} />
      </main>
    </div>
  );
}
