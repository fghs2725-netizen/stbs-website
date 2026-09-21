import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { PhotosManager } from "@/components/admin/photos/PhotosManager";
import { getGalleryItems, getGalleryCategories, getMediaUsageMap } from "@/lib/website/actions";
import type { SerializedGalleryItem } from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

/**
 * The only place the public site's imagery is edited. Photos upload as drafts;
 * publishing one puts it on /gallery. Alt text is required before publishing,
 * because an undescribed photo is unusable to anyone on a screen reader.
 */
export default async function PhotosPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  let items: SerializedGalleryItem[] = [];
  let categories: string[] = [];
  let usage: Record<string, { sections: string[]; services: string[] }> = {};
  let error = "";
  try {
    [items, categories, usage] = await Promise.all([
      getGalleryItems() as unknown as Promise<SerializedGalleryItem[]>,
      getGalleryCategories(),
      getMediaUsageMap(),
    ]);
  } catch {
    error = "The photo library is unavailable right now.";
  }

  const live = items.filter((i) => i.status === "PUBLISHED").length;

  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Setup"
        title="Website photos"
        description="Upload, describe and publish the photos that appear in the public gallery."
        action={
          <div className="flex items-center gap-3">
            <span className="a-num a-sub hidden sm:inline">{live} live of {items.length}</span>
            <Link href="/gallery" target="_blank" rel="noopener noreferrer" className="a-btn a-btn-secondary">
              View gallery
            </Link>
          </div>
        }
      />

      {error ? (
        <div role="alert" className="a-card p-4 text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{error}</div>
      ) : (
        <PhotosManager items={items} categories={categories} usage={usage} />
      )}
    </div>
  );
}
