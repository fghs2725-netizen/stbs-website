import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { assistantEnabled } from "@/lib/assistant/providers";
import * as gbp from "@/lib/google-business/api";
import { getGbpState } from "@/lib/google-business/connection";
import { GbpError, errorMessage } from "@/lib/google-business/errors";
import { needsReply, starValue, type GReview } from "@/lib/google-business/model";
import { GbpErrorCard, GbpFrame } from "@/components/admin/google-business/GbpFrame";
import { GbpSetup } from "@/components/admin/google-business/GbpSetup";
import { Stars, formatCount } from "@/components/admin/google-business/bits";
import { ReviewsPanel, type ReviewView } from "@/components/admin/google-business/ReviewsPanel";

export const dynamic = "force-dynamic";

const SORTS = { newest: { label: "Newest", order: "updateTime desc" }, lowest: { label: "Lowest rated", order: "rating" }, highest: { label: "Highest rated", order: "rating desc" } } as const;
type SortKey = keyof typeof SORTS;

const toView = (r: GReview): ReviewView => ({
  name: r.name,
  reviewer: r.reviewer?.isAnonymous ? "A Google user" : r.reviewer?.displayName || "A Google user",
  photo: r.reviewer?.isAnonymous ? null : r.reviewer?.profilePhotoUrl ?? null,
  stars: starValue(r.starRating),
  comment: r.comment ?? "",
  createTime: r.createTime ?? "",
  edited: Boolean(r.updateTime && r.createTime && r.updateTime.slice(0, 16) !== r.createTime.slice(0, 16)),
  reply: r.reviewReply?.comment
    ? { comment: r.reviewReply.comment, updateTime: r.reviewReply.updateTime ?? "", state: r.reviewReply.reviewReplyState ?? null, policy: r.reviewReply.policyViolation ?? null }
    : null,
  media: (r.reviewMediaItems ?? []).filter((m) => m.thumbnailUrl).map((m) => ({ thumb: m.thumbnailUrl!, video: m.videoUrl ?? null, label: m.thumbnailLabel ?? "" })),
});

export default async function GoogleReviewsPage({ searchParams }: { searchParams: Promise<{ page?: string; sort?: string; filter?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const sp = await searchParams;
  const state = await getGbpState();
  if (state.kind !== "ready") return <GbpSetup state={state} />;

  const sort: SortKey = sp.sort && sp.sort in SORTS ? (sp.sort as SortKey) : "newest";
  const unrepliedOnly = sp.filter === "unreplied";
  const href = (next: { sort?: SortKey; filter?: string | null; page?: string | null }) => {
    const p = new URLSearchParams();
    const s = next.sort ?? sort;
    if (s !== "newest") p.set("sort", s);
    const f = next.filter === undefined ? (unrepliedOnly ? "unreplied" : null) : next.filter;
    if (f) p.set("filter", f);
    if (next.page) p.set("page", next.page);
    const q = p.toString();
    return `/admin/google-business/reviews${q ? `?${q}` : ""}`;
  };

  let page;
  try {
    page = await gbp.listReviews(state.parent, { pageToken: sp.page || undefined, orderBy: SORTS[sort].order });
  } catch (e) {
    if (!(e instanceof GbpError)) console.error("[google-business] reviews failed:", e);
    return (
      <GbpFrame tab="reviews" title={state.locationTitle}>
        <GbpErrorCard message={errorMessage(e)} activationUrl={e instanceof GbpError ? e.extra.activationUrl : undefined} retryHref="/admin/google-business/reviews" />
      </GbpFrame>
    );
  }

  const all = page.reviews ?? [];
  const shown = unrepliedOnly ? all.filter(needsReply) : all;
  const waiting = all.filter(needsReply).length;

  return (
    <GbpFrame tab="reviews" title={state.locationTitle}>
      <section className="a-card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="text-[1.75rem] font-semibold" style={{ color: "var(--a-ink)" }}>{page.averageRating ? page.averageRating.toFixed(1) : "–"}</span>
          <div>
            <Stars value={page.averageRating ?? 0} />
            <p className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>{formatCount(page.totalReviewCount ?? 0)} reviews on Google</p>
          </div>
        </div>
        <p className="text-[0.875rem]" style={{ color: waiting ? "var(--a-warn)" : "var(--a-positive)" }}>
          {waiting ? `${waiting} on this page waiting for a reply` : "Every review on this page has a reply"}
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <nav className="a-segment" aria-label="Show">
          <Link href={href({ filter: null, page: null })} data-active={!unrepliedOnly}>All</Link>
          <Link href={href({ filter: "unreplied", page: null })} data-active={unrepliedOnly}>Needs reply</Link>
        </nav>
        <nav className="a-segment" aria-label="Sort">
          {(Object.keys(SORTS) as SortKey[]).map((k) => (
            <Link key={k} href={href({ sort: k, page: null })} data-active={k === sort}>{SORTS[k].label}</Link>
          ))}
        </nav>
      </div>

      <ReviewsPanel
        reviews={shown.map(toView)}
        aiEnabled={assistantEnabled()}
        emptyText={unrepliedOnly ? "Nothing waiting on this page. Every review here has a reply." : "No reviews yet. Use “Ask for a review” on the Overview tab to send customers your review link."}
      />

      <div className="flex flex-wrap justify-between gap-2">
        {sp.page ? <Link href={href({ page: null })} className="a-btn a-btn-secondary a-btn-sm">Back to the start</Link> : <span />}
        {page.nextPageToken && <Link href={href({ page: page.nextPageToken })} className="a-btn a-btn-secondary a-btn-sm">Next 50 reviews</Link>}
      </div>
    </GbpFrame>
  );
}
