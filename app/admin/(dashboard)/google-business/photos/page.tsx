import { redirect } from "next/navigation";
import { auth } from "@/auth";
import * as gbp from "@/lib/google-business/api";
import { getGbpState } from "@/lib/google-business/connection";
import { GbpError, errorMessage } from "@/lib/google-business/errors";
import { GbpErrorCard, GbpFrame } from "@/components/admin/google-business/GbpFrame";
import { GbpSetup } from "@/components/admin/google-business/GbpSetup";
import { PhotosPanel, type PhotoView } from "@/components/admin/google-business/PhotosPanel";

export const dynamic = "force-dynamic";

export default async function GooglePhotosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const sp = await searchParams;
  const state = await getGbpState();
  if (state.kind !== "ready") return <GbpSetup state={state} />;

  let page;
  try {
    page = await gbp.listMedia(state.parent, sp.page || undefined);
  } catch (e) {
    if (!(e instanceof GbpError)) console.error("[google-business] photos failed:", e);
    return (
      <GbpFrame tab="photos" title={state.locationTitle}>
        <GbpErrorCard message={errorMessage(e)} activationUrl={e instanceof GbpError ? e.extra.activationUrl : undefined} retryHref="/admin/google-business/photos" />
      </GbpFrame>
    );
  }

  const photos: PhotoView[] = (page.mediaItems ?? [])
    .filter((m) => m.mediaFormat !== "VIDEO")
    .map((m) => ({
      name: m.name,
      thumb: m.thumbnailUrl ?? m.googleUrl ?? "",
      full: m.googleUrl ?? m.thumbnailUrl ?? "",
      category: m.locationAssociation?.category ?? "",
      views: m.insights?.viewCount ? Number(m.insights.viewCount) : null,
      createTime: m.createTime ?? "",
    }))
    .filter((p) => p.thumb);

  return (
    <GbpFrame tab="photos" title={state.locationTitle}>
      <PhotosPanel photos={photos} total={page.totalMediaItemCount ?? photos.length} nextPage={page.nextPageToken ?? null} isFirstPage={!sp.page} />
    </GbpFrame>
  );
}
