import {
  getPublishedServices,
  getPublishedTestimonials,
  getPublishedGalleryItems,
  getPublishedClients,
  getPublishedFeaturedClients,
  getPublishedSettings,
} from "@/lib/website/queries";
import { getPublishedProjects } from "@/lib/website-projects";
import {
  SectionRenderer,
  type SectionData,
} from "@/components/public/sections";

export interface CmsPageSection {
  type: string;
  content: Record<string, unknown>;
}

export async function PageRenderer({
  sections,
  seed,
}: {
  sections: CmsPageSection[];
  seed?: Partial<SectionData>;
}) {
  const [services, testimonials, gallery, clients, featuredClients, settings, projects] =
    await Promise.all([
      seed?.services !== undefined ? Promise.resolve(seed.services) : getPublishedServices(),
      seed?.testimonials !== undefined ? Promise.resolve(seed.testimonials) : getPublishedTestimonials(),
      seed?.gallery !== undefined ? Promise.resolve(seed.gallery) : getPublishedGalleryItems(),
      seed?.clients !== undefined ? Promise.resolve(seed.clients) : getPublishedClients(),
      seed?.featuredClients !== undefined ? Promise.resolve(seed.featuredClients) : getPublishedFeaturedClients(),
      seed?.settings !== undefined ? Promise.resolve(seed.settings) : getPublishedSettings(),
      seed?.projects !== undefined ? Promise.resolve(seed.projects) : getPublishedProjects(),
    ]);

  const data: SectionData = { services, testimonials, gallery, clients, featuredClients, settings, projects };

  return (
    <>
      {sections.map((section, i) => (
        <SectionRenderer key={i} section={section} data={data} />
      ))}
    </>
  );
}
