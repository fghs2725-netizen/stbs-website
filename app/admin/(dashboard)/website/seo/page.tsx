import { PageHeader } from "@/components/admin/PageHeader";
import { SeoPage } from "@/components/admin/website/SeoPage";
import { getWebsiteSeo } from "@/lib/website/actions";
import type { SerializedWebsiteSeo } from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

export default async function WebsiteSeoRoute() {
  const seo = (await getWebsiteSeo()) as unknown as SerializedWebsiteSeo;
  return (
    <>
      <PageHeader
        eyebrow="Website CMS / SEO"
        title="SEO"
        description="Global title, description, OG images, Twitter cards, robots directives and structured data. Only publish verified facts."
      />
      <SeoPage initial={seo} />
    </>
  );
}