import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { auth } from "@/auth";
import { todayIST } from "@/lib/worker-ledger";
import * as gbp from "@/lib/google-business/api";
import { getGbpState } from "@/lib/google-business/connection";
import { GbpError, errorMessage } from "@/lib/google-business/errors";
import {
  METRICS_LAG_DAYS, RANGES, bucketWeekly, changePct, isoToGDate, lastWholeMonths, metricRanges, needsReply, parseDailyMetrics, parseKeywords, sliceSeries, summariseMetrics,
  type RangeDays,
} from "@/lib/google-business/model";
import { GbpErrorCard, GbpFrame, Notice } from "@/components/admin/google-business/GbpFrame";
import { GbpSetup } from "@/components/admin/google-business/GbpSetup";
import { DailyBars, type BarPoint } from "@/components/admin/google-business/DailyBars";
import { MetricTiles, SplitBar, Stars, formatCount, longDate, shortDate } from "@/components/admin/google-business/bits";
import { ReviewLinkCard } from "@/components/admin/google-business/ReviewLinkCard";
import { disconnectAction, switchLocationAction } from "./actions";

export const dynamic = "force-dynamic";

const RANGE_LABEL: Record<RangeDays, string> = { 7: "7 days", 28: "28 days", 90: "3 months" };

const settled = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
const failure = (r: PromiseSettledResult<unknown>) => (r.status === "rejected" ? r.reason : null);

export default async function GoogleBusinessOverview({ searchParams }: { searchParams: Promise<{ range?: string; error?: string; connected?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const sp = await searchParams;
  const state = await getGbpState();
  if (state.kind !== "ready") return <GbpSetup state={state} notice={sp} />;

  const days = (RANGES.find((r) => String(r) === sp.range) ?? 28) as RangeDays;
  const today = todayIST();
  const range = metricRanges(today, days);
  const months = lastWholeMonths(today, 3);

  const [locR, metricsR, keywordsR, reviewsR] = await Promise.allSettled([
    gbp.getLocation(state.locationName),
    // One request covers this period and the one before it, for the comparison.
    gbp.fetchDailyMetrics(state.locationName, isoToGDate(range.prevStart), isoToGDate(range.end)),
    gbp.fetchSearchKeywords(state.locationName, months.start, months.end, 1),
    gbp.listReviews(state.parent, { pageSize: 50 }),
  ]);

  const loc = settled(locR);
  // When the listing itself cannot be read, the cause (not approved, API off, sign-in expired) applies to every section.
  const blocking = failure(locR);
  if (blocking) {
    if (!(blocking instanceof GbpError)) console.error("[google-business] overview failed:", blocking);
    return (
      <GbpFrame tab="overview" title={state.locationTitle}>
        <GbpErrorCard message={errorMessage(blocking)} activationUrl={blocking instanceof GbpError ? blocking.extra.activationUrl : undefined} retryHref="/admin/google-business" />
        {blocking instanceof GbpError && blocking.kind === "reauth" && <a href="/api/google-business/connect" className="a-btn a-btn-primary self-start">Connect again</a>}
        <ConnectionCard email={state.email} title={state.locationTitle} connectedAt={state.connectedAt} />
      </GbpFrame>
    );
  }

  const metrics = settled(metricsR);
  const series = metrics ? parseDailyMetrics(metrics, range.prevStart, range.end) : null;
  const prev = series ? summariseMetrics(sliceSeries(series, 0, days)) : null;
  const cur = series ? summariseMetrics(sliceSeries(series, days)) : null;

  const toPoints = (values: number[]): BarPoint[] => {
    if (!cur) return [];
    if (days === 90) return bucketWeekly(cur.days, values).map((w) => ({ label: shortDate(w.start), detail: `Week of ${shortDate(w.start)} – ${shortDate(w.end)}`, value: w.value }));
    return cur.days.map((d, i) => ({ label: shortDate(d), detail: shortDate(d), value: values[i] }));
  };
  const viewsPerDay = cur ? cur.searchViews.map((n, i) => n + cur.mapsViews[i]) : [];
  const actionsPerDay = cur ? cur.calls.map((n, i) => n + cur.website[i] + cur.directions[i]) : [];

  const keywords = settled(keywordsR) ? parseKeywords(settled(keywordsR)!).slice(0, 10) : null;
  const reviews = settled(reviewsR);
  const unreplied = reviews?.reviews?.filter(needsReply).length ?? 0;
  const monthName = (m: { year?: number; month?: number }) => new Date(Date.UTC(m.year!, m.month! - 1, 1)).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });

  return (
    <GbpFrame tab="overview" title={loc?.title ?? state.locationTitle} mapsUri={loc?.metadata?.mapsUri}>
      {sp.connected && <Notice tone="positive">Connected. Your listing is now managed from here.</Notice>}
      {loc?.metadata?.hasGoogleUpdated && (
        <Notice tone="warn">Google changed some details on your listing. <Link href="/admin/google-business/info" className="font-semibold underline">Review the changes</Link></Notice>
      )}
      {loc?.metadata?.hasPendingEdits && <Notice tone="brand">Some of your edits are still waiting for Google&apos;s review.</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <nav className="a-segment" aria-label="Period">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin/google-business?range=${r}`} data-active={r === days} aria-current={r === days ? "page" : undefined}>{RANGE_LABEL[r]}</Link>
          ))}
        </nav>
        <p className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>
          {shortDate(range.start)} – {shortDate(range.end)} · Google&apos;s figures arrive about {METRICS_LAG_DAYS} days late
        </p>
      </div>

      {!cur || !prev ? (
        <GbpErrorCard message={`Performance figures: ${errorMessage(failure(metricsR))}`} activationUrl={(failure(metricsR) as GbpError | null)?.extra?.activationUrl} />
      ) : (
        <>
          <MetricTiles
            tiles={[
              { label: "Profile views", value: cur.totals.views, change: changePct(cur.totals.views, prev.totals.views) },
              { label: "Calls", value: cur.totals.calls, change: changePct(cur.totals.calls, prev.totals.calls) },
              { label: "Website clicks", value: cur.totals.website, change: changePct(cur.totals.website, prev.totals.website) },
              { label: "Direction requests", value: cur.totals.directions, change: changePct(cur.totals.directions, prev.totals.directions) },
            ]}
          />

          <section className="a-card p-4 sm:p-5" aria-labelledby="views-chart-heading">
            <h2 id="views-chart-heading" className="a-h2">Profile views {days === 90 ? "per week" : "per day"}</h2>
            <p className="a-sub mt-1">Times your listing was shown on Google Search or Maps.</p>
            <div className="mt-3"><DailyBars title={`Profile views ${days === 90 ? "per week" : "per day"}`} points={toPoints(viewsPerDay)} unit="views" /></div>
          </section>

          <section className="a-card p-4 sm:p-5" aria-labelledby="actions-chart-heading">
            <h2 id="actions-chart-heading" className="a-h2">Customer actions {days === 90 ? "per week" : "per day"}</h2>
            <p className="a-sub mt-1">Calls, website clicks and direction requests together.</p>
            <div className="mt-3"><DailyBars title={`Customer actions ${days === 90 ? "per week" : "per day"}`} points={toPoints(actionsPerDay)} unit="actions" /></div>
          </section>

          <section className="a-card space-y-5 p-4 sm:p-5" aria-labelledby="where-heading">
            <h2 id="where-heading" className="a-h2">Where people saw you</h2>
            <SplitBar label="Google product" a={{ name: "Search", value: cur.totals.searchViews }} b={{ name: "Maps", value: cur.totals.mapsViews }} />
            <SplitBar label="Device" a={{ name: "Phone", value: cur.totals.mobileViews }} b={{ name: "Computer", value: cur.totals.desktopViews }} />
          </section>

          <details className="a-card p-4 sm:p-5">
            <summary className="cursor-pointer text-[0.9375rem] font-medium" style={{ color: "var(--a-ink)" }}>Day-by-day table</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[0.8125rem]" style={{ fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr style={{ color: "var(--a-muted)" }}>
                    {["Date", "Views", "Calls", "Website", "Directions"].map((h, i) => <th key={h} className={`py-2 font-semibold ${i ? "text-right" : "text-left"}`}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cur.days.map((d, i) => (
                    <tr key={d} style={{ borderTop: "1px solid var(--a-hairline)", color: "var(--a-body)" }}>
                      <td className="py-[6px]">{shortDate(d)}</td>
                      <td className="text-right">{formatCount(viewsPerDay[i])}</td>
                      <td className="text-right">{formatCount(cur.calls[i])}</td>
                      <td className="text-right">{formatCount(cur.website[i])}</td>
                      <td className="text-right">{formatCount(cur.directions[i])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      <section className="a-card p-4 sm:p-5" aria-labelledby="reviews-summary-heading">
        <div className="flex items-start justify-between gap-3">
          <h2 id="reviews-summary-heading" className="a-h2">Reviews</h2>
          <Link href="/admin/google-business/reviews" className="a-link text-[0.875rem]">Open reviews</Link>
        </div>
        {reviews ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[1.75rem] font-semibold" style={{ color: "var(--a-ink)" }}>{reviews.averageRating ? reviews.averageRating.toFixed(1) : "–"}</span>
              <div>
                <Stars value={reviews.averageRating ?? 0} />
                <p className="text-[0.8125rem]" style={{ color: "var(--a-faint)" }}>{formatCount(reviews.totalReviewCount ?? 0)} reviews</p>
              </div>
            </div>
            {unreplied > 0 ? (
              <Link href="/admin/google-business/reviews?filter=unreplied" className="a-btn a-btn-primary a-btn-sm"><MessageSquareText className="size-4" aria-hidden /> {unreplied} waiting for a reply</Link>
            ) : (
              <p className="text-[0.875rem]" style={{ color: "var(--a-positive)" }}>Every recent review has a reply.</p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-[0.875rem]" style={{ color: "var(--a-danger)" }}>{errorMessage(failure(reviewsR))}</p>
        )}
      </section>

      {loc?.metadata?.newReviewUri && <ReviewLinkCard url={loc.metadata.newReviewUri} businessName={loc.title ?? state.locationTitle} />}

      <section className="a-card p-4 sm:p-5" aria-labelledby="keywords-heading">
        <h2 id="keywords-heading" className="a-h2">What people searched</h2>
        <p className="a-sub mt-1">Searches that showed your listing, {monthName(months.start)}–{monthName(months.end)} {months.end.year}. Counts are people, not searches.</p>
        {keywords === null ? (
          <p className="mt-3 text-[0.875rem]" style={{ color: "var(--a-danger)" }}>{errorMessage(failure(keywordsR))}</p>
        ) : keywords.length ? (
          <ol className="mt-3 a-divide">
            {keywords.map((k, i) => (
              <li key={k.keyword} className="flex items-center justify-between gap-3 py-2 text-[0.9375rem]">
                <span className="min-w-0 truncate" style={{ color: "var(--a-body)" }}><span className="mr-2 inline-block w-5 text-right" style={{ color: "var(--a-faint)" }}>{i + 1}</span>{k.keyword}</span>
                <span className="shrink-0 font-semibold" style={{ color: "var(--a-ink)", fontVariantNumeric: "tabular-nums" }}>{k.below ? `< ${formatCount(k.count)}` : formatCount(k.count)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-[0.875rem]" style={{ color: "var(--a-faint)" }}>Google has no search terms for these months yet.</p>
        )}
      </section>

      <ConnectionCard email={state.email} title={loc?.title ?? state.locationTitle} connectedAt={state.connectedAt} />
    </GbpFrame>
  );
}

function ConnectionCard({ email, title, connectedAt }: { email: string | null; title: string; connectedAt: Date }) {
  return (
    <section className="a-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" aria-label="Google connection">
      <div className="min-w-0 text-[0.875rem]" style={{ color: "var(--a-muted)" }}>
        <p>Managing <strong style={{ color: "var(--a-ink)" }}>{title}</strong>{email ? <> as {email}</> : null}</p>
        <p style={{ color: "var(--a-faint)" }}>Connected {longDate(connectedAt.toISOString())}</p>
      </div>
      <div className="flex gap-2">
        <form action={switchLocationAction}><button type="submit" className="a-btn a-btn-secondary a-btn-sm">Switch listing</button></form>
        <form action={disconnectAction}><button type="submit" className="a-btn a-btn-danger a-btn-sm">Disconnect</button></form>
      </div>
    </section>
  );
}
