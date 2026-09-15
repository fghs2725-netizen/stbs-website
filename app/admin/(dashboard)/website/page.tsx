import { WebsiteEditor } from "@/components/admin/website/editor/website-editor";
import {
  getGalleryItems,
  getNavItems,
  getPageWithSections,
  getPages,
  getServices,
  getTestimonials,
  getWebsiteClients,
  getWebsiteSeo,
  getWebsiteSettings,
} from "@/lib/website/actions";
import type {
  SerializedClient,
  SerializedGalleryItem,
  SerializedNavItem,
  SerializedPage,
  SerializedSection,
  SerializedService,
  SerializedTestimonial,
  SerializedWebsiteSeo,
  SerializedWebsiteSettings,
} from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

export default async function WebsiteEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requested = await searchParams;

  const [rawPages, rawServices, rawGallery, rawClients, rawTestimonials, rawNavItems, rawSettings, rawSeo] =
    await Promise.all([
      getPages(),
      getServices(),
      getGalleryItems(),
      getWebsiteClients(),
      getTestimonials(),
      getNavItems(),
      getWebsiteSettings(),
      getWebsiteSeo(),
    ]);

  const pages = rawPages as unknown as SerializedPage[];
  const services = rawServices as unknown as SerializedService[];
  const gallery = rawGallery as unknown as SerializedGalleryItem[];
  const clients = rawClients as unknown as SerializedClient[];
  const testimonials = rawTestimonials as unknown as SerializedTestimonial[];
  const navItems = rawNavItems as unknown as SerializedNavItem[];
  const settings = rawSettings as unknown as SerializedWebsiteSettings | null;
  const seo = rawSeo as unknown as SerializedWebsiteSeo | null;

  const selected = pages.find((p) => p.slug === requested?.page) ?? pages[0];
  if (!selected) {
    return (
      <div className="admin-card p-8 text-sm text-zinc-400">
        No website pages found. Create a page in the page editor first.
      </div>
    );
  }

  const rawPage = await getPageWithSections(selected.id);
  const page = rawPage as unknown as SerializedPage & { sections: SerializedSection[] };

  return (
    <WebsiteEditor
      pages={pages}
      page={page}
      services={services}
      gallery={gallery}
      clients={clients}
      testimonials={testimonials}
      navItems={navItems}
      settings={settings}
      seo={seo}
    />
  );
}