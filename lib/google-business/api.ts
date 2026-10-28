import { API } from "./config";
import { getAccessToken, type LocationChoice } from "./connection";
import { GbpError, describeGoogleError } from "./errors";
import {
  DAILY_METRICS, MANAGED_READ_MASK, formatAddress,
  type GAccount, type GDate, type GKeywordsPage, type GLocalPost, type GLocation, type GMediaItem, type GMultiDailyMetrics,
  type GReview, type GReviewPage, type MediaCategory,
} from "./model";

/**
 * Thin, typed calls to the Business Profile APIs. Every call goes through `call`, which adds the
 * access token and turns Google's errors into a GbpError with a plain message.
 */

async function call<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getAccessToken();
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: { authorization: `Bearer ${token}`, ...(init.body !== undefined ? { "content-type": "application/json" } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new GbpError("unavailable", "Could not reach Google. Check the internet connection and try again.");
  }
  const text = await res.text();
  let body: unknown = {};
  if (text) {
    try { body = JSON.parse(text); } catch { body = {}; }
  }
  if (!res.ok) {
    const error = describeGoogleError(res.status, body);
    console.warn(`[google-business] ${init.method ?? "GET"} ${url.split("?")[0]} -> ${res.status}: ${error.extra.detail ?? error.message}`);
    throw error;
  }
  return body as T;
}

const qs = (params: Record<string, string | number | undefined | Array<string | number>>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    for (const item of Array.isArray(v) ? v : [v]) sp.append(k, String(item));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

// ─── Accounts and listings ──────────────────────────────────────────────────

export async function listAccounts(): Promise<GAccount[]> {
  const out: GAccount[] = [];
  let pageToken: string | undefined;
  do {
    const page = await call<{ accounts?: GAccount[]; nextPageToken?: string }>(`${API.accounts}/accounts${qs({ pageSize: 20, pageToken })}`);
    out.push(...(page.accounts ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken && out.length < 200);
  return out;
}

export async function listLocations(accountName: string): Promise<GLocation[]> {
  const out: GLocation[] = [];
  let pageToken: string | undefined;
  do {
    const page = await call<{ locations?: GLocation[]; nextPageToken?: string }>(
      `${API.info}/${accountName}/locations${qs({ readMask: "name,title,storefrontAddress,metadata", pageSize: 100, pageToken })}`,
    );
    out.push(...(page.locations ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken && out.length < 500);
  return out;
}

/** Every listing the connected account can manage, across its personal account and any location groups. */
export async function listAllLocations(): Promise<LocationChoice[]> {
  const accounts = await listAccounts();
  const seen = new Set<string>();
  const choices: LocationChoice[] = [];
  for (const account of accounts) {
    for (const loc of await listLocations(account.name)) {
      if (seen.has(loc.name)) continue;
      seen.add(loc.name);
      choices.push({ accountName: account.name, accountLabel: account.accountName ?? account.name, locationName: loc.name, title: loc.title ?? loc.name, address: formatAddress(loc) });
    }
  }
  return choices;
}

const INFO_READ_MASK = "name,title,languageCode,phoneNumbers,categories,storefrontAddress,websiteUri,regularHours,serviceArea,openInfo,metadata,profile";

export async function getLocation(locationName: string): Promise<GLocation> {
  return call<GLocation>(`${API.info}/${locationName}${qs({ readMask: INFO_READ_MASK })}`);
}

/** Google's own version of the listing, and which fields differ from the owner's (`diffMask`). */
export async function getGoogleUpdated(locationName: string): Promise<{ location?: GLocation; diffMask?: string; pendingMask?: string }> {
  return call(`${API.info}/${locationName}:getGoogleUpdated${qs({ readMask: MANAGED_READ_MASK })}`);
}

export async function patchLocation(locationName: string, body: Partial<GLocation>, mask: string[]): Promise<GLocation> {
  return call<GLocation>(`${API.info}/${locationName}${qs({ updateMask: mask.join(",") })}`, { method: "PATCH", body });
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export type ReviewOrder = "updateTime desc" | "rating" | "rating desc";

export async function listReviews(parent: string, opts: { pageToken?: string; orderBy?: ReviewOrder; pageSize?: number } = {}): Promise<GReviewPage> {
  return call<GReviewPage>(`${API.v4}/${parent}/reviews${qs({ pageSize: opts.pageSize ?? 50, pageToken: opts.pageToken, orderBy: opts.orderBy })}`);
}

export async function putReply(reviewName: string, comment: string): Promise<NonNullable<GReview["reviewReply"]>> {
  return call(`${API.v4}/${reviewName}/reply`, { method: "PUT", body: { comment } });
}

export async function deleteReply(reviewName: string): Promise<void> {
  await call(`${API.v4}/${reviewName}/reply`, { method: "DELETE" });
}

// ─── Posts ──────────────────────────────────────────────────────────────────

export async function listPosts(parent: string, pageToken?: string): Promise<{ localPosts?: GLocalPost[]; nextPageToken?: string }> {
  return call(`${API.v4}/${parent}/localPosts${qs({ pageSize: 50, pageToken })}`);
}

export async function createPost(parent: string, post: GLocalPost): Promise<GLocalPost> {
  return call<GLocalPost>(`${API.v4}/${parent}/localPosts`, { method: "POST", body: post });
}

export async function deletePost(postName: string): Promise<void> {
  await call(`${API.v4}/${postName}`, { method: "DELETE" });
}

// ─── Photos ─────────────────────────────────────────────────────────────────

export async function listMedia(parent: string, pageToken?: string): Promise<{ mediaItems?: GMediaItem[]; totalMediaItemCount?: number; nextPageToken?: string }> {
  return call(`${API.v4}/${parent}/media${qs({ pageSize: 100, pageToken })}`);
}

/** Google fetches the photo from `sourceUrl` itself, so it must be publicly reachable (the site's Blob storage is). */
export async function createMedia(parent: string, sourceUrl: string, category: MediaCategory): Promise<GMediaItem> {
  return call<GMediaItem>(`${API.v4}/${parent}/media`, { method: "POST", body: { mediaFormat: "PHOTO", locationAssociation: { category }, sourceUrl } });
}

export async function deleteMedia(mediaName: string): Promise<void> {
  await call(`${API.v4}/${mediaName}`, { method: "DELETE" });
}

// ─── Performance ────────────────────────────────────────────────────────────

const dateParams = (prefix: string, d: GDate) => ({ [`${prefix}.year`]: d.year, [`${prefix}.month`]: d.month, ...(d.day ? { [`${prefix}.day`]: d.day } : {}) });

export async function fetchDailyMetrics(locationName: string, start: GDate, end: GDate): Promise<GMultiDailyMetrics> {
  return call<GMultiDailyMetrics>(
    `${API.performance}/${locationName}:fetchMultiDailyMetricsTimeSeries${qs({
      dailyMetrics: [...DAILY_METRICS],
      ...dateParams("dailyRange.start_date", start),
      ...dateParams("dailyRange.end_date", end),
    })}`,
  );
}

/** What people typed into Google before seeing the listing, summed over whole months (newest data lags a few days). */
export async function fetchSearchKeywords(locationName: string, startMonth: GDate, endMonth: GDate, maxPages = 2): Promise<GKeywordsPage[]> {
  const pages: GKeywordsPage[] = [];
  let pageToken: string | undefined;
  do {
    const page = await call<GKeywordsPage>(
      `${API.performance}/${locationName}/searchkeywords/impressions/monthly${qs({
        ...dateParams("monthlyRange.start_month", { year: startMonth.year, month: startMonth.month }),
        ...dateParams("monthlyRange.end_month", { year: endMonth.year, month: endMonth.month }),
        pageSize: 100,
        pageToken,
      })}`,
    );
    pages.push(page);
    pageToken = page.nextPageToken;
  } while (pageToken && pages.length < maxPages);
  return pages;
}
