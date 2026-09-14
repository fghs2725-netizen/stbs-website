import { PageHeader } from "@/components/admin/PageHeader";
import { PhotosManager } from "@/components/admin/website/PhotosManager";
import { getGalleryItems, getGalleryCategories, getMediaUsageMap } from "@/lib/website/actions";
import type { SerializedGalleryItem } from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

export default async function WebsitePhotosPage() {
  const [items, categories, usage] = await Promise.all([
    getGalleryItems() as unknown as Promise<SerializedGalleryItem[]>,
    getGalleryCategories(),
    getMediaUsageMap(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Website CMS / Photos"
        title="Photos"
        description="Media library and gallery manager. Every photo here can be shown on the public gallery, tagged by category, marked as real/stock/generated, and reused across sections."
        action={<span className="text-sm text-zinc-500">{items.filter((i) => i.visible).length} visible of {items.length}</span>}
      />
      <PhotosManager items={items} categories={categories} usage={usage} />
    </>
  );
}