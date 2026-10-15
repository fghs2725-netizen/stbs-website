import { Fragment } from "react";
import {
  getPublishedServices,
  getPublishedTestimonials,
  getPublishedGalleryItems,
  getPublishedClients,
  getPublishedFeaturedClients,
  getPublishedSettings,
} from "@/lib/website/queries";
import {
  SectionRenderer,
  type SectionData,
} from "@/components/public/sections";
import { FilmBand } from "@/components/public/film-band";
import type { FilmSceneId } from "@/lib/website/film-scenes";

export interface CmsPageSection {
  type: string;
  content: Record<string, unknown>;
}

/** A brand-film scene placed right after the first section of a given type (e.g. "hero"). */
export interface PageFilm {
  afterType: string;
  scene: FilmSceneId;
}

export async function PageRenderer({
  sections,
  seed,
  films,
}: {
  sections: CmsPageSection[];
  seed?: Partial<SectionData>;
  films?: PageFilm[];
}) {
  const [services, testimonials, gallery, clients, featuredClients, settings] =
    await Promise.all([
      seed?.services !== undefined ? Promise.resolve(seed.services) : getPublishedServices(),
      seed?.testimonials !== undefined ? Promise.resolve(seed.testimonials) : getPublishedTestimonials(),
      seed?.gallery !== undefined ? Promise.resolve(seed.gallery) : getPublishedGalleryItems(),
      seed?.clients !== undefined ? Promise.resolve(seed.clients) : getPublishedClients(),
      seed?.featuredClients !== undefined ? Promise.resolve(seed.featuredClients) : getPublishedFeaturedClients(),
      seed?.settings !== undefined ? Promise.resolve(seed.settings) : getPublishedSettings(),
    ]);

  const data: SectionData = { services, testimonials, gallery, clients, featuredClients, settings };

  return (
    <>
      {sections.map((section, i) => {
        // Each film goes after the FIRST section of its type, wherever the CMS has put that section.
        const here = (films ?? []).filter((f) => f.afterType === section.type && sections.findIndex((s) => s.type === f.afterType) === i);
        return (
          <Fragment key={i}>
            <SectionRenderer section={section} data={data} />
            {here.map((f) => <FilmBand key={f.scene} scene={f.scene} />)}
          </Fragment>
        );
      })}
    </>
  );
}
