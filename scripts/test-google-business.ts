import assert from "node:assert/strict";
import { buildAuthUrl, missingConfig, redirectUriFor } from "../lib/google-business/config";
import { openToken, sealToken } from "../lib/google-business/crypto";
import { GbpInputError, describeGoogleError } from "../lib/google-business/errors";
import { cleanDraft, replyPrompt } from "../lib/google-business/ai-reply";
import {
  addDays, belongsTo, bucketWeekly, buildLocalPost, buildLocationPatch, changePct, cleanPhone, cleanReply, describeDay, describeWeekShort,
  fieldText, infoFromLocation, lastWholeMonths, metricRanges, parseDailyMetrics, parseKeywords, patchFromSource, periodsToWeek, sliceSeries,
  splitMask, summariseMetrics, weekToPeriods,
  type DayHours, type GLocation, type GTimePeriod, type PostInput,
} from "../lib/google-business/model";

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${label}`);
}
const throwsInput = (fn: () => unknown, re: RegExp) => assert.throws(fn, (e: unknown) => e instanceof GbpInputError && re.test(e.message));

// ─── Errors ─────────────────────────────────────────────────────────────────

check("quota of 0 means API access is not approved yet", () => {
  const e = describeGoogleError(429, {
    error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for quota metric 'Requests' and limit 'Requests per minute' of service 'mybusinessaccountmanagement.googleapis.com'", details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "RATE_LIMIT_EXCEEDED", metadata: { quota_limit_value: "0" } }] },
  });
  assert.equal(e.kind, "not-approved");
  assert.match(e.message, /14 days/);
});

check("a real rate limit is not mistaken for missing approval", () => {
  const e = describeGoogleError(429, { error: { status: "RESOURCE_EXHAUSTED", message: "Quota exceeded", details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", metadata: { quota_limit_value: "300" } }] } });
  assert.equal(e.kind, "rate-limit");
});

check("a switched-off API names itself and links to enable it", () => {
  const e = describeGoogleError(403, {
    error: { code: 403, status: "PERMISSION_DENIED", message: "Business Profile Performance API has not been used in project 123 before or it is disabled.", details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "SERVICE_DISABLED", metadata: { service: "businessprofileperformance.googleapis.com", activationUrl: "https://console.developers.google.com/apis/api/businessprofileperformance.googleapis.com/overview?project=123" } }] },
  });
  assert.equal(e.kind, "api-disabled");
  assert.match(e.message, /Business Profile Performance API/);
  assert.match(e.extra.activationUrl ?? "", /project=123/);
});

check("sign-in problems ask to connect again", () => {
  assert.equal(describeGoogleError(401, { error: { message: "Request had invalid authentication credentials." } }).kind, "reauth");
  assert.equal(describeGoogleError(400, { error: "invalid_grant", error_description: "Token has been expired or revoked." }).kind, "reauth");
  assert.equal(describeGoogleError(403, { error: { message: "Request had insufficient authentication scopes.", details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] } }).kind, "reauth");
});

check("other 403s say the account must manage the listing", () => {
  const e = describeGoogleError(403, { error: { message: "The caller does not have permission", status: "PERMISSION_DENIED" } });
  assert.equal(e.kind, "permission");
  assert.match(e.message, /owner or manager/);
});

check("a rejected change carries Google's field reasons", () => {
  const e = describeGoogleError(400, { error: { message: "Request contains an invalid argument.", details: [{ "@type": "type.googleapis.com/google.rpc.BadRequest", fieldViolations: [{ field: "phone_numbers.primary_phone", description: "Invalid phone number" }] }] } });
  assert.equal(e.kind, "invalid");
  assert.match(e.message, /phone_numbers\.primary_phone: Invalid phone number/);
});

check("server errors and junk bodies become a plain try-again", () => {
  assert.equal(describeGoogleError(503, "<html>").kind, "unavailable");
  assert.equal(describeGoogleError(500, null).kind, "unavailable");
});

// ─── Config and tokens ──────────────────────────────────────────────────────

check("config reports what is missing", () => {
  assert.deepEqual(missingConfig({}), ["GOOGLE_BUSINESS_CLIENT_ID", "GOOGLE_BUSINESS_CLIENT_SECRET"]);
  assert.deepEqual(missingConfig({ GOOGLE_BUSINESS_CLIENT_ID: "a", GOOGLE_BUSINESS_CLIENT_SECRET: " " }), ["GOOGLE_BUSINESS_CLIENT_SECRET"]);
});

check("consent URL asks for offline access with the manage scope", () => {
  const cfg = { clientId: "cid.apps.googleusercontent.com", clientSecret: "s" };
  const uri = redirectUriFor("https://www.stbs.in/", cfg);
  assert.equal(uri, "https://www.stbs.in/api/google-business/callback");
  assert.equal(redirectUriFor("https://preview.vercel.app", { ...cfg, redirectUri: "https://www.stbs.in/x" }), "https://www.stbs.in/x");
  const u = new URL(buildAuthUrl(cfg, uri, "st8"));
  assert.equal(u.searchParams.get("access_type"), "offline");
  assert.equal(u.searchParams.get("prompt"), "consent");
  assert.equal(u.searchParams.get("state"), "st8");
  assert.match(u.searchParams.get("scope") ?? "", /auth\/business\.manage/);
});

check("tokens are sealed and only open with the same secret", () => {
  const sealed = sealToken("1//refresh-token", "secret-a");
  assert.ok(sealed.startsWith("v1:"));
  assert.ok(!sealed.includes("refresh"));
  assert.equal(openToken(sealed, "secret-a"), "1//refresh-token");
  assert.equal(openToken(sealed, "secret-b"), null);
  assert.equal(openToken("plain-text", "secret-a"), null);
  assert.equal(openToken(sealed.slice(0, -4) + "AAAA", "secret-a"), null);
  assert.notEqual(sealToken("x", "s"), sealToken("x", "s")); // fresh IV each time
});

// ─── Opening hours ──────────────────────────────────────────────────────────

const allDay = (day: GTimePeriod["openDay"]): GTimePeriod => ({ openDay: day, openTime: {}, closeDay: day, closeTime: { hours: 24 } });

check("Google's 24-hour periods read as open 24 hours", () => {
  const week = periodsToWeek(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((d) => allDay(d as GTimePeriod["openDay"])));
  assert.ok(week.every((d) => d.mode === "24h"));
  assert.equal(describeWeekShort(week), "Open 24 hours, every day");
});

check("midnight-to-midnight-next-day is also 24 hours", () => {
  const week = periodsToWeek([{ openDay: "MONDAY", openTime: {}, closeDay: "TUESDAY", closeTime: {} }]);
  assert.equal(week[0].mode, "24h");
  assert.equal(week[1].mode, "closed");
});

check("split and overnight hours survive a round trip", () => {
  const periods: GTimePeriod[] = [
    { openDay: "MONDAY", openTime: { hours: 9 }, closeDay: "MONDAY", closeTime: { hours: 13 } },
    { openDay: "MONDAY", openTime: { hours: 14, minutes: 30 }, closeDay: "MONDAY", closeTime: { hours: 19 } },
    { openDay: "SATURDAY", openTime: { hours: 20 }, closeDay: "SUNDAY", closeTime: { hours: 2 } },
  ];
  const week = periodsToWeek(periods);
  assert.deepEqual(week[0], { day: "MONDAY", mode: "open", ranges: [{ open: "09:00", close: "13:00" }, { open: "14:30", close: "19:00" }] });
  assert.equal(describeDay(week[0]), "9 am – 1 pm, 2:30 pm – 7 pm");
  assert.equal(week[5].ranges[0].close, "02:00");
  const back = weekToPeriods(week);
  assert.deepEqual(back[2], { openDay: "SATURDAY", openTime: { hours: 20, minutes: 0 }, closeDay: "SUNDAY", closeTime: { hours: 2, minutes: 0 } });
  assert.equal(back.length, 3);
});

check("24h writes 00:00 to 24:00 and a 00:00 close means midnight", () => {
  const week: DayHours[] = periodsToWeek([]).map((d) => ({ ...d }));
  week[0] = { day: "MONDAY", mode: "24h", ranges: [] };
  week[1] = { day: "TUESDAY", mode: "open", ranges: [{ open: "18:00", close: "00:00" }] };
  const p = weekToPeriods(week);
  assert.deepEqual(p[0], { openDay: "MONDAY", openTime: { hours: 0, minutes: 0 }, closeDay: "MONDAY", closeTime: { hours: 24, minutes: 0 } });
  assert.deepEqual(p[1].closeTime, { hours: 24, minutes: 0 });
  assert.equal(p[1].closeDay, "TUESDAY");
});

check("bad hours are refused with the day named", () => {
  const base = periodsToWeek([]);
  throwsInput(() => weekToPeriods(base.map((d, i) => (i === 2 ? { ...d, mode: "open" as const, ranges: [] } : d))), /Wednesday/);
  throwsInput(() => weekToPeriods(base.map((d, i) => (i === 0 ? { ...d, mode: "open" as const, ranges: [{ open: "9:00", close: "18:00" }] } : d))), /Monday: times/);
  throwsInput(() => weekToPeriods(base.map((d, i) => (i === 0 ? { ...d, mode: "open" as const, ranges: [{ open: "09:00", close: "09:00" }] } : d))), /same/);
});

// ─── Listing edits ──────────────────────────────────────────────────────────

const listing: GLocation = {
  name: "locations/42",
  title: "Saini Tubewell Boring Service",
  profile: { description: "Borewell drilling since 1992." },
  phoneNumbers: { primaryPhone: "098120 03001", additionalPhones: ["087081 28632"] },
  websiteUri: "https://www.stbs.in/",
  regularHours: { periods: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((d) => allDay(d as GTimePeriod["openDay"])) },
};

check("an untouched form sends nothing", () => {
  assert.deepEqual(buildLocationPatch(listing, infoFromLocation(listing)), { body: {}, mask: [] });
});

check("only changed fields go in the mask", () => {
  const input = { ...infoFromLocation(listing), description: "Borewells, tubewells and rainwater harvesting since 1992.", primaryPhone: "+91 98120 03001" };
  const { body, mask } = buildLocationPatch(listing, input);
  // The phone is the same number written differently, so it is not re-sent.
  assert.deepEqual(mask, ["profile.description"]);
  assert.deepEqual(body, { profile: { description: "Borewells, tubewells and rainwater harvesting since 1992." } });
});

check("changing hours and phones sends both whole", () => {
  const input = infoFromLocation(listing);
  input.week[6] = { day: "SUNDAY", mode: "closed", ranges: [] };
  input.additionalPhones = ["87081 28632", "79888 14808"];
  const { body, mask } = buildLocationPatch(listing, input);
  assert.deepEqual(mask, ["phoneNumbers", "regularHours"]);
  assert.equal(body.regularHours?.periods?.length, 6);
  assert.deepEqual(body.phoneNumbers?.additionalPhones, ["87081 28632", "79888 14808"]);
});

check("listing rules are enforced before Google sees them", () => {
  const base = infoFromLocation(listing);
  throwsInput(() => buildLocationPatch(listing, { ...base, title: "  " }), /cannot be empty/);
  throwsInput(() => buildLocationPatch(listing, { ...base, description: "x".repeat(751) }), /750/);
  throwsInput(() => buildLocationPatch(listing, { ...base, description: "Visit https://stbs.in" }), /links/);
  throwsInput(() => buildLocationPatch(listing, { ...base, additionalPhones: ["1111111111", "2222222222", "3333333333"] }), /two extra/);
  throwsInput(() => buildLocationPatch(listing, { ...base, websiteUri: "stbs.in" }), /https/);
  throwsInput(() => cleanPhone("call me"), /not a phone/);
  throwsInput(() => cleanPhone("123"), /digits/);
});

check("Google's changed fields split into ours and the rest", () => {
  const s = splitMask("regularHours.periods,categories.primaryCategory,profile.description");
  assert.deepEqual(s.managed.map((f) => f.path), ["profile", "regularHours"]);
  assert.deepEqual(s.other, ["categories"]);
  assert.deepEqual(splitMask(undefined), { managed: [], other: [] });
});

check("accepting or keeping builds a patch of exactly those fields", () => {
  const { body, mask } = patchFromSource(listing, ["websiteUri", "profile"]);
  assert.deepEqual(mask, ["websiteUri", "profile.description"]);
  assert.deepEqual(body, { websiteUri: "https://www.stbs.in/", profile: { description: "Borewell drilling since 1992." } });
  assert.equal(fieldText(listing, "regularHours"), "Open 24 hours, every day");
  assert.equal(fieldText(listing, "phoneNumbers"), "098120 03001, 087081 28632");
});

// ─── Replies, names and posts ───────────────────────────────────────────────

check("replies are trimmed and limited by bytes, not letters", () => {
  assert.equal(cleanReply("  Thank you!\r\n "), "Thank you!");
  throwsInput(() => cleanReply("   "), /Write a reply/);
  assert.ok(cleanReply("धन्यवाद".repeat(190))); // 21 bytes each, 3990 bytes
  throwsInput(() => cleanReply("धन्यवाद".repeat(200)), /too long/);
});

check("names from the browser must belong to the connected listing", () => {
  const parent = "accounts/1/locations/2";
  assert.ok(belongsTo("accounts/1/locations/2/reviews/AbC-12_x", parent, "reviews"));
  assert.ok(!belongsTo("accounts/9/locations/2/reviews/x", parent, "reviews"));
  assert.ok(!belongsTo("accounts/1/locations/2/reviews/x/../../../media/y", parent, "reviews"));
  assert.ok(!belongsTo("accounts/1/locations/2/localPosts/x", parent, "reviews"));
  assert.ok(!belongsTo(42, parent, "media"));
});

const post = (patch: Partial<PostInput>): PostInput => ({
  topic: "STANDARD", summary: "New 500 ft borewell finished in Kundli.", cta: "NONE", ctaUrl: "", title: "", startDate: "", endDate: "", startTime: "", endTime: "", couponCode: "", redeemUrl: "", terms: "", imageUrl: "", ...patch,
});

check("an update post with a call button has no link", () => {
  assert.deepEqual(buildLocalPost(post({ cta: "CALL", ctaUrl: "https://ignored" })), {
    languageCode: "en", topicType: "STANDARD", summary: "New 500 ft borewell finished in Kundli.", callToAction: { actionType: "CALL" },
  });
});

check("link buttons need a link; photos need https", () => {
  throwsInput(() => buildLocalPost(post({ cta: "LEARN_MORE", ctaUrl: "" })), /link/);
  assert.equal(buildLocalPost(post({ cta: "LEARN_MORE", ctaUrl: "https://www.stbs.in/services" })).callToAction?.url, "https://www.stbs.in/services");
  throwsInput(() => buildLocalPost(post({ imageUrl: "http://x/y.jpg" })), /https/);
  assert.deepEqual(buildLocalPost(post({ imageUrl: "https://a.public.blob.vercel-storage.com/p.jpg" })).media, [{ mediaFormat: "PHOTO", sourceUrl: "https://a.public.blob.vercel-storage.com/p.jpg" }]);
  throwsInput(() => buildLocalPost(post({ summary: "" })), /text/);
  throwsInput(() => buildLocalPost(post({ summary: "x".repeat(1501) })), /1500/);
});

check("an offer carries dates and coupon but no button", () => {
  const p = buildLocalPost(post({ topic: "OFFER", summary: "", title: "Free water test", startDate: "2026-11-01", endDate: "2026-11-30", cta: "CALL", couponCode: "WATER", terms: "New borewells only" }));
  assert.equal(p.callToAction, undefined);
  assert.equal(p.summary, undefined);
  assert.deepEqual(p.event, { title: "Free water test", schedule: { startDate: { year: 2026, month: 11, day: 1 }, startTime: { hours: 0, minutes: 0 }, endDate: { year: 2026, month: 11, day: 30 }, endTime: { hours: 23, minutes: 59 } } });
  assert.deepEqual(p.offer, { couponCode: "WATER", termsConditions: "New borewells only" });
});

check("events check their dates and times", () => {
  throwsInput(() => buildLocalPost(post({ topic: "EVENT", title: "Site visit", startDate: "2026-11-05", endDate: "2026-11-04" })), /before/);
  throwsInput(() => buildLocalPost(post({ topic: "EVENT", title: "", startDate: "2026-11-05", endDate: "2026-11-05" })), /title/);
  throwsInput(() => buildLocalPost(post({ topic: "EVENT", title: "Site visit", startDate: "2026-11-05", endDate: "2026-11-05", startTime: "15:00", endTime: "10:00" })), /after/);
  const ok = buildLocalPost(post({ topic: "EVENT", title: "Site visit", startDate: "2026-11-05", endDate: "2026-11-05", startTime: "10:00", endTime: "15:30" }));
  assert.deepEqual(ok.event?.schedule?.endTime, { hours: 15, minutes: 30 });
});

// ─── Metrics ────────────────────────────────────────────────────────────────

check("date ranges stop short of today and compare like for like", () => {
  const r = metricRanges("2026-10-22", 28);
  assert.deepEqual(r, { start: "2026-09-22", end: "2026-10-19", prevStart: "2026-08-25", prevEnd: "2026-09-21" });
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.deepEqual(lastWholeMonths("2026-10-22", 3), { start: { year: 2026, month: 7 }, end: { year: 2026, month: 9 } });
  assert.deepEqual(lastWholeMonths("2026-01-05", 3), { start: { year: 2025, month: 10 }, end: { year: 2025, month: 12 } });
});

check("daily metrics fill gaps with zero and add up", () => {
  const resp = {
    multiDailyMetricTimeSeries: [{
      dailyMetricTimeSeries: [
        { dailyMetric: "CALL_CLICKS", timeSeries: { datedValues: [{ date: { year: 2026, month: 10, day: 1 }, value: "3" }, { date: { year: 2026, month: 10, day: 2 } }, { date: { year: 2026, month: 10, day: 4 }, value: "5" }] } },
        { dailyMetric: "BUSINESS_IMPRESSIONS_MOBILE_MAPS", timeSeries: { datedValues: [{ date: { year: 2026, month: 10, day: 3 }, value: "40" }] } },
        { dailyMetric: "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", timeSeries: { datedValues: [{ date: { year: 2026, month: 10, day: 3 }, value: "10" }] } },
        { dailyMetric: "BUSINESS_FOOD_ORDERS", timeSeries: { datedValues: [{ date: { year: 2026, month: 10, day: 3 }, value: "99" }] } },
      ],
    }],
  };
  const series = parseDailyMetrics(resp, "2026-10-01", "2026-10-04");
  assert.deepEqual(series.days, ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  assert.deepEqual(series.values.CALL_CLICKS, [3, 0, 0, 5]);
  const s = summariseMetrics(series);
  assert.equal(s.totals.views, 50);
  assert.equal(s.totals.mapsViews, 40);
  assert.equal(s.totals.mobileViews, 40);
  assert.equal(s.totals.desktopViews, 10);
  assert.equal(s.totals.actions, 8);
  const [prev, cur] = [summariseMetrics(sliceSeries(series, 0, 2)), summariseMetrics(sliceSeries(series, 2))];
  assert.equal(prev.totals.calls, 3);
  assert.equal(cur.totals.calls, 5);
  assert.equal(changePct(cur.totals.calls, prev.totals.calls), 67);
  assert.equal(changePct(5, 0), null);
});

check("ninety days fold into weeks", () => {
  const days = Array.from({ length: 10 }, (_, i) => addDays("2026-10-01", i));
  assert.deepEqual(bucketWeekly(days, [1, 1, 1, 1, 1, 1, 1, 2, 2, 2]), [
    { start: "2026-10-01", end: "2026-10-07", value: 7 },
    { start: "2026-10-08", end: "2026-10-10", value: 6 },
  ]);
});

check("search terms sort by count, exact before 'fewer than'", () => {
  const rows = parseKeywords([{ searchKeywordsCounts: [
    { searchKeyword: "borewell near me", insightsValue: { value: "120" } },
    { searchKeyword: "tubewell sonipat", insightsValue: { threshold: "15" } },
    { searchKeyword: "borewell drilling", insightsValue: { value: "15" } },
    { searchKeyword: "", insightsValue: { value: "999" } },
  ] }]);
  assert.deepEqual(rows.map((r) => r.keyword), ["borewell near me", "borewell drilling", "tubewell sonipat"]);
  assert.equal(rows[2].below, true);
});

// ─── AI drafts ──────────────────────────────────────────────────────────────

check("the AI prompt carries the review but no reviewer name, and drafts are cleaned", () => {
  const msgs = replyPrompt({ stars: 2, comment: "Late by two days." });
  assert.equal(msgs.length, 2);
  assert.match(msgs[0].content, /apologise once/);
  assert.match(msgs[1].content, /Star rating: 2 of 5\nReview: Late by two days\./);
  assert.match(replyPrompt({ stars: 5, comment: "" })[1].content, /no text/);
  assert.equal(cleanDraft('"Reply: Thank you for trusting us."'), "Thank you for trusting us.");
});

console.log(`\n${passed} Google Business checks passed.`);
