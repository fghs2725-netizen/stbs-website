import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canonicalSiteUrl } from "@/lib/site-url";
import * as gbp from "@/lib/google-business/api";
import { getGbpState } from "@/lib/google-business/connection";
import { GbpError, errorMessage } from "@/lib/google-business/errors";
import { CTA_OPTIONS, gDateToIso, type GLocalPost, type GTimeOfDay, type PostTopic } from "@/lib/google-business/model";
import { GbpErrorCard, GbpFrame, Notice } from "@/components/admin/google-business/GbpFrame";
import { GbpSetup } from "@/components/admin/google-business/GbpSetup";
import { PostsPanel, type PostView } from "@/components/admin/google-business/PostsPanel";
import { shortDate } from "@/components/admin/google-business/bits";

export const dynamic = "force-dynamic";

const time = (t?: GTimeOfDay) => `${String(t?.hours ?? 0).padStart(2, "0")}:${String(t?.minutes ?? 0).padStart(2, "0")}`;

function toView(p: GLocalPost): PostView | null {
  if (!p.name) return null;
  const s = p.event?.schedule;
  const startIso = gDateToIso(s?.startDate);
  const endIso = gDateToIso(s?.endDate);
  const dates = startIso && endIso
    ? `${shortDate(startIso)}${s?.startTime && time(s.startTime) !== "00:00" ? ` ${time(s.startTime)}` : ""} – ${shortDate(endIso)}${s?.endTime && time(s.endTime) !== "23:59" ? ` ${time(s.endTime)}` : ""}`
    : null;
  const topic = (["STANDARD", "OFFER", "EVENT"].includes(p.topicType ?? "") ? p.topicType : "STANDARD") as PostTopic;
  return {
    name: p.name,
    topic,
    state: p.state ?? null,
    summary: p.summary ?? "",
    title: p.event?.title ?? "",
    dates,
    image: p.media?.[0]?.googleUrl ?? p.media?.[0]?.sourceUrl ?? null,
    searchUrl: p.searchUrl ?? null,
    createTime: p.createTime ?? "",
    button: p.callToAction ? CTA_OPTIONS.find((o) => o.value === p.callToAction?.actionType)?.label ?? null : null,
    coupon: p.offer?.couponCode ?? null,
  };
}

export default async function GooglePostsPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const state = await getGbpState();
  if (state.kind !== "ready") return <GbpSetup state={state} />;

  const [postsR, locR] = await Promise.allSettled([gbp.listPosts(state.parent), gbp.getLocation(state.locationName)]);
  if (postsR.status === "rejected") {
    const e = postsR.reason;
    if (!(e instanceof GbpError)) console.error("[google-business] posts failed:", e);
    return (
      <GbpFrame tab="posts" title={state.locationTitle}>
        <GbpErrorCard message={errorMessage(e)} activationUrl={e instanceof GbpError ? e.extra.activationUrl : undefined} retryHref="/admin/google-business/posts" />
      </GbpFrame>
    );
  }
  const loc = locR.status === "fulfilled" ? locR.value : null;
  const posts = (postsR.value.localPosts ?? []).map(toView).filter((p): p is PostView => p !== null);

  return (
    <GbpFrame tab="posts" title={loc?.title ?? state.locationTitle} mapsUri={loc?.metadata?.mapsUri}>
      {loc?.metadata?.canOperateLocalPost === false && (
        <Notice tone="warn">Google does not allow posts on this listing right now (this happens while a listing is unverified or suspended). Existing posts are still shown below.</Notice>
      )}
      <PostsPanel posts={posts} siteUrl={canonicalSiteUrl()} />
    </GbpFrame>
  );
}
