/**
 * Google Business Profile shapes and the pure logic around them: opening hours, metrics, posts,
 * listing edits and replies. No network and no database, so it runs in the browser and in
 * scripts/test-google-business.ts alike.
 */

import { GbpInputError } from "./errors";

// ─── Google wire types (only the fields this app reads or writes) ───────────

export interface GDate { year?: number; month?: number; day?: number }
export interface GTimeOfDay { hours?: number; minutes?: number; seconds?: number; nanos?: number }

export const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export type DayOfWeek = (typeof DAYS)[number];
export const DAY_LABEL: Record<DayOfWeek, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};

export interface GTimePeriod { openDay: DayOfWeek; openTime?: GTimeOfDay; closeDay: DayOfWeek; closeTime?: GTimeOfDay }

export interface GAccount { name: string; accountName?: string; type?: string; role?: string }

export interface GLocation {
  name: string;
  title?: string;
  languageCode?: string;
  phoneNumbers?: { primaryPhone?: string; additionalPhones?: string[] };
  categories?: { primaryCategory?: { name?: string; displayName?: string }; additionalCategories?: Array<{ name?: string; displayName?: string }> };
  storefrontAddress?: { addressLines?: string[]; locality?: string; sublocality?: string; administrativeArea?: string; postalCode?: string; regionCode?: string };
  websiteUri?: string;
  regularHours?: { periods?: GTimePeriod[] };
  serviceArea?: { businessType?: string; places?: { placeInfos?: Array<{ placeName?: string; placeId?: string }> } };
  openInfo?: { status?: string };
  metadata?: {
    mapsUri?: string; newReviewUri?: string; placeId?: string; hasGoogleUpdated?: boolean; hasPendingEdits?: boolean;
    canOperateLocalPost?: boolean; hasVoiceOfMerchant?: boolean; duplicateLocation?: string;
  };
  profile?: { description?: string };
}

export type StarRating = "STAR_RATING_UNSPECIFIED" | "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
export type ReplyState = "REVIEW_REPLY_STATE_UNSPECIFIED" | "PENDING" | "REJECTED" | "APPROVED";

export interface GReview {
  name: string;
  reviewId?: string;
  reviewer?: { profilePhotoUrl?: string; displayName?: string; isAnonymous?: boolean };
  starRating?: StarRating;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment?: string; updateTime?: string; reviewReplyState?: ReplyState; policyViolation?: string };
  reviewMediaItems?: Array<{ thumbnailUrl?: string; thumbnailLabel?: string; videoUrl?: string }>;
}
export interface GReviewPage { reviews?: GReview[]; averageRating?: number; totalReviewCount?: number; nextPageToken?: string }

export type PostTopic = "STANDARD" | "EVENT" | "OFFER";
export type PostState = "LOCAL_POST_STATE_UNSPECIFIED" | "REJECTED" | "LIVE" | "PROCESSING" | "SCHEDULED" | "RECURRING";
export type CtaType = "BOOK" | "ORDER" | "SHOP" | "LEARN_MORE" | "SIGN_UP" | "CALL";

export interface GLocalPost {
  name?: string;
  languageCode?: string;
  summary?: string;
  callToAction?: { actionType: CtaType; url?: string };
  createTime?: string;
  updateTime?: string;
  event?: { title?: string; schedule?: { startDate: GDate; startTime: GTimeOfDay; endDate: GDate; endTime: GTimeOfDay } };
  state?: PostState;
  media?: Array<{ mediaFormat?: "PHOTO"; sourceUrl?: string; googleUrl?: string }>;
  searchUrl?: string;
  topicType?: PostTopic | "ALERT" | "LOCAL_POST_TOPIC_TYPE_UNSPECIFIED";
  offer?: { couponCode?: string; redeemOnlineUrl?: string; termsConditions?: string };
}

export type MediaCategory = "COVER" | "PROFILE" | "EXTERIOR" | "INTERIOR" | "PRODUCT" | "AT_WORK" | "TEAMS" | "ADDITIONAL";
export interface GMediaItem {
  name: string;
  mediaFormat?: "PHOTO" | "VIDEO";
  locationAssociation?: { category?: string };
  googleUrl?: string;
  thumbnailUrl?: string;
  createTime?: string;
  dimensions?: { widthPixels?: number; heightPixels?: number };
  insights?: { viewCount?: string };
  description?: string;
}

// ─── Small shared helpers ───────────────────────────────────────────────────

const STAR_VALUE: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
export const starValue = (r?: string): number => STAR_VALUE[r ?? ""] ?? 0;

const bytes = (s: string) => new TextEncoder().encode(s).length;

/** "accounts/1/locations/2/reviews/3" belongs to "accounts/1/locations/2". Used to refuse names that point elsewhere. */
export function belongsTo(name: unknown, parent: string, collection: "reviews" | "localPosts" | "media"): name is string {
  if (typeof name !== "string") return false;
  const prefix = `${parent}/${collection}/`;
  return name.startsWith(prefix) && /^[A-Za-z0-9_\-]+$/.test(name.slice(prefix.length));
}

export function isHttpUrl(value: string, httpsOnly = false): boolean {
  try {
    const u = new URL(value);
    return httpsOnly ? u.protocol === "https:" : u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// ─── Dates (calendar dates as "YYYY-MM-DD", no time zone drift) ──────────────

export function isoToGDate(iso: string): GDate {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}
export function gDateToIso(d?: GDate): string {
  if (!d?.year || !d.month) return "";
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day || 1).padStart(2, "0")}`;
}
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
export function daysBetween(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  for (let d = fromIso; d <= toIso; d = addDays(d, 1)) out.push(d);
  return out;
}

/** The last `count` whole months before the month of `todayIso`, oldest first, as {year, month}. */
export function lastWholeMonths(todayIso: string, count: number): { start: GDate; end: GDate } {
  const [y, m] = todayIso.split("-").map(Number);
  const end = new Date(Date.UTC(y, m - 2, 1));
  const start = new Date(Date.UTC(y, m - 1 - count, 1));
  return {
    start: { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1 },
    end: { year: end.getUTCFullYear(), month: end.getUTCMonth() + 1 },
  };
}

export const RANGES = [7, 28, 90] as const;
export type RangeDays = (typeof RANGES)[number];
/** Google's daily figures arrive a few days late, so ranges stop short of today rather than show false zeros. */
export const METRICS_LAG_DAYS = 3;

export function metricRanges(todayIso: string, days: RangeDays) {
  const end = addDays(todayIso, -METRICS_LAG_DAYS);
  const start = addDays(end, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return { start, end, prevStart, prevEnd };
}

// ─── Performance metrics ────────────────────────────────────────────────────

export const DAILY_METRICS = [
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "CALL_CLICKS",
  "WEBSITE_CLICKS",
  "BUSINESS_DIRECTION_REQUESTS",
] as const;
export type DailyMetric = (typeof DAILY_METRICS)[number];

export interface GMultiDailyMetrics {
  multiDailyMetricTimeSeries?: Array<{
    dailyMetricTimeSeries?: Array<{ dailyMetric?: string; timeSeries?: { datedValues?: Array<{ date?: GDate; value?: string }> } }>;
  }>;
}

export interface MetricsSeries {
  days: string[];
  /** One value per day in `days`, per metric. Missing days are zero, as Google omits zero values. */
  values: Record<DailyMetric, number[]>;
}

export function parseDailyMetrics(resp: GMultiDailyMetrics, start: string, end: string): MetricsSeries {
  const days = daysBetween(start, end);
  const index = new Map(days.map((d, i) => [d, i]));
  const values = Object.fromEntries(DAILY_METRICS.map((m) => [m, days.map(() => 0)])) as Record<DailyMetric, number[]>;
  for (const multi of resp.multiDailyMetricTimeSeries ?? []) {
    for (const series of multi.dailyMetricTimeSeries ?? []) {
      const metric = series.dailyMetric as DailyMetric;
      if (!values[metric]) continue;
      for (const point of series.timeSeries?.datedValues ?? []) {
        const i = index.get(gDateToIso(point.date));
        const n = Number(point.value ?? 0);
        if (i !== undefined && Number.isFinite(n)) values[metric][i] = n;
      }
    }
  }
  return { days, values };
}

/** Part of a series, by day index (as Array.slice), e.g. to split "previous period + this period" in two. */
export function sliceSeries(series: MetricsSeries, from: number, to?: number): MetricsSeries {
  return {
    days: series.days.slice(from, to),
    values: Object.fromEntries(DAILY_METRICS.map((m) => [m, series.values[m].slice(from, to)])) as Record<DailyMetric, number[]>,
  };
}

export interface MetricsSummary {
  days: string[];
  searchViews: number[];
  mapsViews: number[];
  calls: number[];
  website: number[];
  directions: number[];
  totals: { views: number; searchViews: number; mapsViews: number; mobileViews: number; desktopViews: number; calls: number; website: number; directions: number; actions: number };
}

const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);
const addArrays = (a: number[], b: number[]) => a.map((n, i) => n + (b[i] ?? 0));

export function summariseMetrics(series: MetricsSeries): MetricsSummary {
  const v = series.values;
  const searchViews = addArrays(v.BUSINESS_IMPRESSIONS_MOBILE_SEARCH, v.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH);
  const mapsViews = addArrays(v.BUSINESS_IMPRESSIONS_MOBILE_MAPS, v.BUSINESS_IMPRESSIONS_DESKTOP_MAPS);
  const calls = v.CALL_CLICKS;
  const website = v.WEBSITE_CLICKS;
  const directions = v.BUSINESS_DIRECTION_REQUESTS;
  return {
    days: series.days,
    searchViews,
    mapsViews,
    calls,
    website,
    directions,
    totals: {
      views: sum(searchViews) + sum(mapsViews),
      searchViews: sum(searchViews),
      mapsViews: sum(mapsViews),
      mobileViews: sum(v.BUSINESS_IMPRESSIONS_MOBILE_SEARCH) + sum(v.BUSINESS_IMPRESSIONS_MOBILE_MAPS),
      desktopViews: sum(v.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH) + sum(v.BUSINESS_IMPRESSIONS_DESKTOP_MAPS),
      calls: sum(calls),
      website: sum(website),
      directions: sum(directions),
      actions: sum(calls) + sum(website) + sum(directions),
    },
  };
}

/** Groups daily values into runs of 7 days (the last run may be shorter), labelled by their first day. */
export function bucketWeekly(days: string[], values: number[]): Array<{ start: string; end: string; value: number }> {
  const out: Array<{ start: string; end: string; value: number }> = [];
  for (let i = 0; i < days.length; i += 7) {
    const slice = values.slice(i, i + 7);
    out.push({ start: days[i], end: days[Math.min(i + 6, days.length - 1)], value: sum(slice) });
  }
  return out;
}

/** Whole-number percentage change, or null when there is nothing to compare against. */
export function changePct(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export interface GKeywordsPage {
  searchKeywordsCounts?: Array<{ searchKeyword?: string; insightsValue?: { value?: string; threshold?: string } }>;
  nextPageToken?: string;
}
export interface KeywordRow { keyword: string; count: number; /** true when Google only says "fewer than count" */ below: boolean }

export function parseKeywords(pages: GKeywordsPage[]): KeywordRow[] {
  const rows: KeywordRow[] = [];
  for (const page of pages) {
    for (const k of page.searchKeywordsCounts ?? []) {
      if (!k.searchKeyword) continue;
      const value = k.insightsValue?.value;
      const threshold = k.insightsValue?.threshold;
      if (value !== undefined) rows.push({ keyword: k.searchKeyword, count: Number(value) || 0, below: false });
      else if (threshold !== undefined) rows.push({ keyword: k.searchKeyword, count: Number(threshold) || 0, below: true });
    }
  }
  return rows.sort((a, b) => b.count - a.count || Number(a.below) - Number(b.below) || a.keyword.localeCompare(b.keyword));
}

// ─── Opening hours ──────────────────────────────────────────────────────────

export type DayMode = "closed" | "24h" | "open";
export interface TimeRange { open: string; close: string }
export interface DayHours { day: DayOfWeek; mode: DayMode; ranges: TimeRange[] }

const minutes = (t?: GTimeOfDay) => (t?.hours ?? 0) * 60 + (t?.minutes ?? 0);
const hhmm = (t?: GTimeOfDay) => `${String(t?.hours ?? 0).padStart(2, "0")}:${String(t?.minutes ?? 0).padStart(2, "0")}`;
const nextDay = (d: DayOfWeek): DayOfWeek => DAYS[(DAYS.indexOf(d) + 1) % 7];

export function periodsToWeek(periods: GTimePeriod[] = []): DayHours[] {
  const week: DayHours[] = DAYS.map((day) => ({ day, mode: "closed", ranges: [] }));
  for (const p of periods) {
    const entry = week.find((w) => w.day === p.openDay);
    if (!entry || entry.mode === "24h") continue;
    const open = minutes(p.openTime);
    const close = minutes(p.closeTime);
    const allDay =
      open === 0 &&
      ((p.closeDay === p.openDay && close >= 24 * 60) || (p.closeDay === nextDay(p.openDay) && close === 0) || (p.closeDay !== p.openDay && p.closeDay !== nextDay(p.openDay)));
    if (allDay) {
      entry.mode = "24h";
      entry.ranges = [];
      continue;
    }
    entry.mode = "open";
    entry.ranges.push({ open: hhmm(p.openTime), close: close >= 24 * 60 ? "24:00" : hhmm(p.closeTime) });
  }
  for (const w of week) w.ranges.sort((a, b) => a.open.localeCompare(b.open));
  return week;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toTime = (s: string): GTimeOfDay => {
  if (s === "24:00") return { hours: 24, minutes: 0 };
  const [h, m] = s.split(":").map(Number);
  return { hours: h, minutes: m };
};

/** Back to Google's periods. A closing time at or before the opening time runs past midnight into the next day. */
export function weekToPeriods(week: DayHours[]): GTimePeriod[] {
  const periods: GTimePeriod[] = [];
  for (const w of week) {
    if (!DAYS.includes(w.day)) throw new GbpInputError("Unknown day in opening hours.");
    if (w.mode === "closed") continue;
    if (w.mode === "24h") {
      periods.push({ openDay: w.day, openTime: { hours: 0, minutes: 0 }, closeDay: w.day, closeTime: { hours: 24, minutes: 0 } });
      continue;
    }
    if (!w.ranges.length) throw new GbpInputError(`${DAY_LABEL[w.day]}: add opening and closing times, or mark the day closed.`);
    if (w.ranges.length > 3) throw new GbpInputError(`${DAY_LABEL[w.day]}: at most three time ranges a day.`);
    for (const r of w.ranges) {
      const close = r.close === "00:00" ? "24:00" : r.close;
      if (!TIME_RE.test(r.open) || !(TIME_RE.test(close) || close === "24:00")) throw new GbpInputError(`${DAY_LABEL[w.day]}: times must look like 09:00.`);
      if (r.open === close) throw new GbpInputError(`${DAY_LABEL[w.day]}: opening and closing times are the same.`);
      const overnight = close !== "24:00" && close < r.open;
      periods.push({ openDay: w.day, openTime: toTime(r.open), closeDay: overnight ? nextDay(w.day) : w.day, closeTime: toTime(close) });
    }
  }
  return periods;
}

const fmt12 = (s: string) => {
  if (s === "24:00") return "midnight";
  const [h, m] = s.split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
};

export function describeDay(d: DayHours): string {
  if (d.mode === "closed") return "Closed";
  if (d.mode === "24h") return "Open 24 hours";
  return d.ranges.map((r) => `${fmt12(r.open)} – ${fmt12(r.close)}`).join(", ");
}

/** "Open 24 hours, every day" when all days match, otherwise null (the page lists each day). */
export function describeWeekShort(week: DayHours[]): string | null {
  const texts = week.map(describeDay);
  if (texts.every((t) => t === texts[0])) return `${texts[0]}, every day`;
  return null;
}

// ─── Listing edits ──────────────────────────────────────────────────────────

export const LIMITS = { title: 100, description: 750, postSummary: 1500, eventTitle: 58, reply: 4096, offerTerms: 5000, coupon: 58 } as const;

export interface InfoInput {
  title: string;
  description: string;
  primaryPhone: string;
  additionalPhones: string[];
  websiteUri: string;
  week: DayHours[];
}

export function infoFromLocation(loc: GLocation): InfoInput {
  return {
    title: loc.title ?? "",
    description: loc.profile?.description ?? "",
    primaryPhone: loc.phoneNumbers?.primaryPhone ?? "",
    additionalPhones: loc.phoneNumbers?.additionalPhones ?? [],
    websiteUri: loc.websiteUri ?? "",
    week: periodsToWeek(loc.regularHours?.periods),
  };
}

/** Accepts the ways people write Indian numbers: "98120 03001", "+91-98120-03001", "0130 222 3333". */
export function cleanPhone(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (!/^\+?[\d\s\-().]+$/.test(s)) throw new GbpInputError(`"${raw}" is not a phone number.`);
  const digits = s.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 13) throw new GbpInputError(`"${raw}" does not have the right number of digits.`);
  return s.replace(/\s+/g, " ");
}

/** The same Indian number written as "+91 98120 03001", "098120 03001" or "9812003001" compares equal. */
export function phoneKey(p?: string): string {
  let d = (p ?? "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

const samePeriods = (a: GTimePeriod[] = [], b: GTimePeriod[] = []) => {
  const key = (p: GTimePeriod) => `${p.openDay} ${minutes(p.openTime)} ${p.closeDay} ${minutes(p.closeTime)}`;
  const ka = a.map(key).sort().join("|");
  const kb = b.map(key).sort().join("|");
  return ka === kb;
};

/** Only what changed goes to Google, so an untouched field is never re-submitted (and never re-reviewed). */
export function buildLocationPatch(current: GLocation, input: InfoInput): { body: Partial<GLocation>; mask: string[] } {
  const body: Partial<GLocation> = {};
  const mask: string[] = [];

  const title = input.title.trim().replace(/\s+/g, " ");
  if (!title) throw new GbpInputError("The business name cannot be empty.");
  if (title.length > LIMITS.title) throw new GbpInputError(`The business name can be at most ${LIMITS.title} characters.`);
  if (title !== (current.title ?? "")) { body.title = title; mask.push("title"); }

  const description = input.description.trim();
  if (description.length > LIMITS.description) throw new GbpInputError(`The description can be at most ${LIMITS.description} characters (it is ${description.length}).`);
  if (/https?:\/\//i.test(description)) throw new GbpInputError("Google does not allow links in the description. Put the website in the Website field.");
  if (description !== (current.profile?.description ?? "").trim()) { body.profile = { description }; mask.push("profile.description"); }

  const primaryPhone = cleanPhone(input.primaryPhone);
  const additionalPhones = input.additionalPhones.map(cleanPhone).filter(Boolean);
  if (additionalPhones.length > 2) throw new GbpInputError("Google allows at most two extra phone numbers.");
  if (!primaryPhone && additionalPhones.length) throw new GbpInputError("Add a main phone number before extra ones.");
  const curPhones = current.phoneNumbers ?? {};
  const norm = phoneKey;
  const phonesChanged =
    norm(primaryPhone) !== norm(curPhones.primaryPhone) ||
    additionalPhones.map(norm).join(",") !== (curPhones.additionalPhones ?? []).map(norm).join(",");
  if (phonesChanged) { body.phoneNumbers = { primaryPhone, additionalPhones }; mask.push("phoneNumbers"); }

  const websiteUri = input.websiteUri.trim();
  if (websiteUri && !isHttpUrl(websiteUri)) throw new GbpInputError("The website must be a full address starting with https://");
  if (websiteUri !== (current.websiteUri ?? "")) { body.websiteUri = websiteUri; mask.push("websiteUri"); }

  const periods = weekToPeriods(input.week);
  if (!samePeriods(periods, current.regularHours?.periods)) { body.regularHours = { periods }; mask.push("regularHours"); }

  return { body, mask };
}

/** The fields this page edits, by the names Google's masks use, with the words the owner sees. */
export const MANAGED_FIELDS: Array<{ path: string; label: string }> = [
  { path: "title", label: "Business name" },
  { path: "profile", label: "Description" },
  { path: "phoneNumbers", label: "Phone numbers" },
  { path: "websiteUri", label: "Website" },
  { path: "regularHours", label: "Opening hours" },
];
export const MANAGED_READ_MASK = "name,title,phoneNumbers,websiteUri,regularHours,profile";

/** Splits a Google field mask ("regularHours.periods,categories") into the fields this page manages and the rest. */
export function splitMask(mask?: string): { managed: Array<{ path: string; label: string }>; other: string[] } {
  const parts = (mask ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const managed = MANAGED_FIELDS.filter((f) => parts.some((p) => p === f.path || p.startsWith(`${f.path}.`)));
  const other = parts.filter((p) => !MANAGED_FIELDS.some((f) => p === f.path || p.startsWith(`${f.path}.`)));
  return { managed, other: [...new Set(other.map((p) => p.split(".")[0]))] };
}

/** The patch that sets the chosen managed fields to the values in `source` (Google's version or the owner's). */
export function patchFromSource(source: GLocation, paths: string[]): { body: Partial<GLocation>; mask: string[] } {
  const body: Partial<GLocation> = {};
  const mask: string[] = [];
  for (const path of paths) {
    switch (path) {
      case "title": body.title = source.title ?? ""; mask.push("title"); break;
      case "profile": body.profile = { description: source.profile?.description ?? "" }; mask.push("profile.description"); break;
      case "phoneNumbers": body.phoneNumbers = { primaryPhone: source.phoneNumbers?.primaryPhone ?? "", additionalPhones: source.phoneNumbers?.additionalPhones ?? [] }; mask.push("phoneNumbers"); break;
      case "websiteUri": body.websiteUri = source.websiteUri ?? ""; mask.push("websiteUri"); break;
      case "regularHours": body.regularHours = { periods: source.regularHours?.periods ?? [] }; mask.push("regularHours"); break;
    }
  }
  return { body, mask };
}

/** How a managed field reads on the page, for showing Google's version beside the owner's. */
export function fieldText(loc: GLocation, path: string): string {
  switch (path) {
    case "title": return loc.title ?? "";
    case "profile": return loc.profile?.description ?? "";
    case "phoneNumbers": return [loc.phoneNumbers?.primaryPhone, ...(loc.phoneNumbers?.additionalPhones ?? [])].filter(Boolean).join(", ");
    case "websiteUri": return loc.websiteUri ?? "";
    case "regularHours": {
      const week = periodsToWeek(loc.regularHours?.periods);
      return describeWeekShort(week) ?? week.map((d) => `${DAY_LABEL[d.day].slice(0, 3)}: ${describeDay(d)}`).join("; ");
    }
    default: return "";
  }
}

export function formatAddress(loc: GLocation): string {
  const a = loc.storefrontAddress;
  if (!a) return "";
  return [...(a.addressLines ?? []), a.sublocality, a.locality, a.administrativeArea, a.postalCode].filter(Boolean).join(", ");
}

// ─── Review replies ─────────────────────────────────────────────────────────

export function cleanReply(text: string): string {
  const reply = text.replace(/\r\n/g, "\n").trim();
  if (!reply) throw new GbpInputError("Write a reply first.");
  if (bytes(reply) > LIMITS.reply) throw new GbpInputError("That reply is too long for Google. Shorten it.");
  return reply;
}

export const needsReply = (r: GReview) => !r.reviewReply?.comment;

export const REPLY_STATE_LABEL: Partial<Record<ReplyState, { text: string; tone: "warn" | "neutral" | "positive" }>> = {
  PENDING: { text: "Reply waiting for Google's check", tone: "neutral" },
  REJECTED: { text: "Reply rejected by Google", tone: "warn" },
};

export const policyText = (v?: string) =>
  v && v !== "POLICY_VIOLATION_UNSPECIFIED" ? v.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "";

// ─── Posts ──────────────────────────────────────────────────────────────────

export const CTA_OPTIONS: Array<{ value: CtaType | "NONE"; label: string }> = [
  { value: "NONE", label: "No button" },
  { value: "CALL", label: "Call now" },
  { value: "LEARN_MORE", label: "Learn more" },
  { value: "BOOK", label: "Book" },
  { value: "SIGN_UP", label: "Sign up" },
  { value: "ORDER", label: "Order online" },
  { value: "SHOP", label: "Buy" },
];

export const POST_STATE_LABEL: Partial<Record<PostState, { text: string; tone: "positive" | "neutral" | "warn" | "brand" }>> = {
  LIVE: { text: "Live", tone: "positive" },
  PROCESSING: { text: "Being checked", tone: "neutral" },
  SCHEDULED: { text: "Scheduled", tone: "brand" },
  RECURRING: { text: "Repeating", tone: "brand" },
  REJECTED: { text: "Rejected", tone: "warn" },
};

export const POST_TOPIC_LABEL: Record<PostTopic, string> = { STANDARD: "Update", OFFER: "Offer", EVENT: "Event" };

export interface PostInput {
  topic: PostTopic;
  summary: string;
  cta: CtaType | "NONE";
  ctaUrl: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  couponCode: string;
  redeemUrl: string;
  terms: string;
  imageUrl: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function buildLocalPost(input: PostInput): GLocalPost {
  if (!["STANDARD", "OFFER", "EVENT"].includes(input.topic)) throw new GbpInputError("Choose a post type.");
  const summary = input.summary.trim();
  if (input.topic === "STANDARD" && !summary) throw new GbpInputError("Write the text of the post.");
  if (summary.length > LIMITS.postSummary) throw new GbpInputError(`Post text can be at most ${LIMITS.postSummary} characters (it is ${summary.length}).`);

  const post: GLocalPost = { languageCode: "en", topicType: input.topic };
  if (summary) post.summary = summary;

  if (input.topic !== "STANDARD") {
    const title = input.title.trim();
    if (!title) throw new GbpInputError(input.topic === "OFFER" ? "Give the offer a title." : "Give the event a title.");
    if (title.length > LIMITS.eventTitle) throw new GbpInputError(`The title can be at most ${LIMITS.eventTitle} characters.`);
    if (!ISO_DATE.test(input.startDate) || !ISO_DATE.test(input.endDate)) throw new GbpInputError("Choose a start date and an end date.");
    if (input.endDate < input.startDate) throw new GbpInputError("The end date is before the start date.");
    const startTime = input.startTime || "00:00";
    const endTime = input.endTime || "23:59";
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) throw new GbpInputError("Times must look like 09:00.");
    if (input.startDate === input.endDate && endTime <= startTime) throw new GbpInputError("The end time must be after the start time.");
    post.event = { title, schedule: { startDate: isoToGDate(input.startDate), startTime: toTime(startTime), endDate: isoToGDate(input.endDate), endTime: toTime(endTime) } };
  }

  if (input.topic === "OFFER") {
    const offer: NonNullable<GLocalPost["offer"]> = {};
    const coupon = input.couponCode.trim();
    const redeem = input.redeemUrl.trim();
    const terms = input.terms.trim();
    if (coupon.length > LIMITS.coupon) throw new GbpInputError(`The coupon code can be at most ${LIMITS.coupon} characters.`);
    if (redeem && !isHttpUrl(redeem)) throw new GbpInputError("The redeem link must be a full address starting with https://");
    if (terms.length > LIMITS.offerTerms) throw new GbpInputError("The terms are too long.");
    if (coupon) offer.couponCode = coupon;
    if (redeem) offer.redeemOnlineUrl = redeem;
    if (terms) offer.termsConditions = terms;
    if (Object.keys(offer).length) post.offer = offer;
  } else if (input.cta !== "NONE") {
    // Google ignores buttons on offers, so they are only sent for updates and events.
    if (!CTA_OPTIONS.some((o) => o.value === input.cta)) throw new GbpInputError("Choose a button.");
    if (input.cta === "CALL") {
      post.callToAction = { actionType: "CALL" };
    } else {
      const url = input.ctaUrl.trim();
      if (!isHttpUrl(url)) throw new GbpInputError("The button needs a link starting with https://");
      post.callToAction = { actionType: input.cta, url };
    }
  }

  const image = input.imageUrl.trim();
  if (image) {
    if (!isHttpUrl(image, true)) throw new GbpInputError("The photo link must start with https://");
    post.media = [{ mediaFormat: "PHOTO", sourceUrl: image }];
  }
  return post;
}

// ─── Photos ─────────────────────────────────────────────────────────────────

export const PHOTO_CATEGORIES: Array<{ value: MediaCategory; label: string; hint: string }> = [
  { value: "AT_WORK", label: "At work", hint: "Rigs and crews on site" },
  { value: "EXTERIOR", label: "Outside", hint: "Office or yard from outside" },
  { value: "INTERIOR", label: "Inside", hint: "Office or store inside" },
  { value: "PRODUCT", label: "Products", hint: "Pipes, pumps, material" },
  { value: "TEAMS", label: "Team", hint: "The people" },
  { value: "COVER", label: "Cover photo", hint: "The main photo on the listing" },
  { value: "PROFILE", label: "Logo", hint: "Square logo" },
  { value: "ADDITIONAL", label: "Other", hint: "Anything else" },
];

export const categoryLabel = (c?: string) =>
  PHOTO_CATEGORIES.find((p) => p.value === c)?.label ?? (c === "LOGO" ? "Logo" : c ? c.toLowerCase().replace(/_/g, " ") : "Photo");

export const isPhotoCategory = (c: unknown): c is MediaCategory => PHOTO_CATEGORIES.some((p) => p.value === c);

/** Google's photo rules for listing photos (cover and logo are exempt from the minimums). */
export const PHOTO_RULES = { minEdge: 250, minBytes: 10 * 1024, maxBytes: 5 * 1024 * 1024 } as const;
