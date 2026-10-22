/**
 * The Google Business connection and API layer against a fake Google and an in-memory database:
 * picking the listing after connecting, refreshing tokens, the exact URLs and bodies sent, and
 * how Google's errors reach the page. No network and no real database.
 *
 *   npx tsx scripts/test-google-business-api.ts
 */
import assert from "node:assert/strict";

process.env.GOOGLE_BUSINESS_CLIENT_ID = "cid.apps.googleusercontent.com";
process.env.GOOGLE_BUSINESS_CLIENT_SECRET = "csecret";
process.env.AUTH_SECRET = "test-auth-secret";

// ─── In-memory stand-in for the one Prisma model used ───────────────────────
type Row = Record<string, unknown> & { id: string };
let row: Row | null = null;
const table = {
  findUnique: async () => (row ? { ...row } : null),
  upsert: async ({ create, update }: { create: Row; update: Partial<Row> }) => { row = row ? { ...row, ...update } : { connectedAt: new Date(), ...create }; return row; },
  update: async ({ data }: { data: Partial<Row> }) => { if (!row) throw Object.assign(new Error("not found"), { code: "P2025" }); row = { ...row, ...data }; return row; },
  delete: async () => { row = null; },
};
(globalThis as unknown as { prisma: unknown }).prisma = { googleBusinessConnection: table };

// ─── Fake Google ────────────────────────────────────────────────────────────
interface Seen { method: string; url: URL; auth: string | null; body: string }
let seen: Seen[] = [];
let accountsReply: { status: number; body: unknown } = { status: 200, body: { accounts: [{ name: "accounts/111", accountName: "Rajesh Saini", type: "PERSONAL" }] } };
let tokenCalls = 0;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers);
  const body = typeof init?.body === "string" ? init.body : "";
  seen.push({ method, url, auth: headers.get("authorization"), body });
  const path = url.pathname;

  if (url.host === "oauth2.googleapis.com" && path === "/token") {
    tokenCalls++;
    const form = new URLSearchParams(body);
    if (form.get("refresh_token") === "dead") return json(400, { error: "invalid_grant", error_description: "Token has been expired or revoked." });
    return json(200, { access_token: `fresh-${tokenCalls}`, expires_in: 3599, token_type: "Bearer" });
  }
  if (url.host === "oauth2.googleapis.com" && path === "/revoke") return json(200, {});
  if (url.host === "mybusinessaccountmanagement.googleapis.com" && path === "/v1/accounts") return json(accountsReply.status, accountsReply.body);
  if (url.host === "mybusinessbusinessinformation.googleapis.com") {
    if (path === "/v1/accounts/111/locations") return json(200, { locations: [{ name: "locations/222", title: "Saini Tubewell Boring Service", storefrontAddress: { addressLines: ["12, New market"], locality: "Sonipat", postalCode: "131021" } }] });
    if (path === "/v1/locations/222" && method === "GET") return json(200, { name: "locations/222", title: "Saini Tubewell Boring Service", websiteUri: "https://www.stbs.in/" });
    if (path === "/v1/locations/222" && method === "PATCH") return json(200, { name: "locations/222", ...JSON.parse(body) });
    if (path === "/v1/locations/222:getGoogleUpdated") return json(200, { location: { name: "locations/222", websiteUri: "http://stbs.in" }, diffMask: "websiteUri" });
  }
  if (url.host === "mybusiness.googleapis.com") {
    if (path === "/v4/accounts/111/locations/222/reviews" && method === "GET") return json(200, { reviews: [{ name: "accounts/111/locations/222/reviews/r1", starRating: "FIVE", comment: "Good work" }], averageRating: 4.8, totalReviewCount: 31 });
    if (path === "/v4/accounts/111/locations/222/reviews/r1/reply" && method === "PUT") return json(200, { comment: JSON.parse(body).comment, reviewReplyState: "PENDING" });
    if (path === "/v4/accounts/111/locations/222/reviews/r1/reply" && method === "DELETE") return new Response("", { status: 200 });
    if (path === "/v4/accounts/111/locations/222/localPosts" && method === "POST") return json(200, { name: "accounts/111/locations/222/localPosts/p1", state: "PROCESSING", ...JSON.parse(body) });
    if (path === "/v4/accounts/111/locations/222/media" && method === "POST") return json(200, { name: "accounts/111/locations/222/media/m1", ...JSON.parse(body) });
  }
  if (url.host === "businessprofileperformance.googleapis.com") {
    if (path === "/v1/locations/222:fetchMultiDailyMetricsTimeSeries") {
      return json(200, { multiDailyMetricTimeSeries: [{ dailyMetricTimeSeries: [{ dailyMetric: "CALL_CLICKS", timeSeries: { datedValues: [{ date: { year: 2026, month: 10, day: 1 }, value: "4" }] } }] }] });
    }
    if (path === "/v1/locations/222/searchkeywords/impressions/monthly") return json(200, { searchKeywordsCounts: [{ searchKeyword: "borewell", insightsValue: { value: "50" } }] });
    // A switched-off API, to check the error path end to end.
    if (path === "/v1/locations/999:fetchMultiDailyMetricsTimeSeries") {
      return json(403, { error: { code: 403, status: "PERMISSION_DENIED", message: "Business Profile Performance API has not been used in project 5 before or it is disabled.", details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "SERVICE_DISABLED", metadata: { service: "businessprofileperformance.googleapis.com", activationUrl: "https://console.developers.google.com/apis/api/businessprofileperformance.googleapis.com/overview?project=5" } }] } });
    }
  }
  return json(404, { error: { code: 404, message: `fake Google has no ${method} ${path}` } });
}) as typeof fetch;

let passed = 0;
async function check(label: string, fn: () => Promise<void>) {
  seen = [];
  await fn();
  passed++;
  console.log(`  ok  ${label}`);
}

async function main() {
  const conn = await import("../lib/google-business/connection");
  const api = await import("../lib/google-business/api");
  const { openToken } = await import("../lib/google-business/crypto");
  const { GbpError } = await import("../lib/google-business/errors");

  await check("nothing connected yet", async () => {
    assert.deepEqual(await conn.getGbpState(), { kind: "not-connected" });
  });

  await check("connecting stores sealed tokens and the account email", async () => {
    const idPayload = Buffer.from(JSON.stringify({ email: "stbs2025@gmail.com" })).toString("base64url");
    await conn.saveConnection({ access_token: "first-access", refresh_token: "first-refresh", expires_in: 3599, scope: "https://www.googleapis.com/auth/business.manage openid", id_token: `h.${idPayload}.s` });
    assert.equal(row?.email, "stbs2025@gmail.com");
    assert.ok(String(row?.refreshToken).startsWith("v1:"));
    assert.equal(openToken(String(row?.refreshToken)), "first-refresh");
    assert.equal(row?.locationName, null);
    assert.ok(conn.hasManageScope(String(row?.scope)));
    assert.ok(!conn.hasManageScope("openid email"));
  });

  await check("a single listing is picked automatically after connecting", async () => {
    const state = await conn.getGbpState();
    assert.equal(state.kind, "ready");
    if (state.kind !== "ready") return;
    assert.equal(state.parent, "accounts/111/locations/222");
    assert.equal(state.locationTitle, "Saini Tubewell Boring Service");
    assert.equal(row?.locationName, "locations/222");
    // The still-valid access token from connecting was used: no refresh.
    assert.equal(tokenCalls, 0);
    assert.ok(seen.every((s) => s.auth === "Bearer first-access"));
    const listCall = seen.find((s) => s.url.pathname === "/v1/accounts/111/locations")!;
    assert.equal(listCall.url.searchParams.get("readMask"), "name,title,storefrontAddress,metadata");
  });

  await check("once chosen, the page state is one database read and no Google call", async () => {
    const state = await conn.getGbpState();
    assert.equal(state.kind, "ready");
    assert.equal(seen.length, 0);
  });

  await check("an expiring access token is refreshed once and saved", async () => {
    row = { ...row!, expiresAt: new Date(Date.now() + 30_000) };
    const loc = await api.getLocation("locations/222");
    assert.equal(loc.title, "Saini Tubewell Boring Service");
    assert.equal(tokenCalls, 1);
    const refresh = new URLSearchParams(seen[0].body);
    assert.equal(refresh.get("grant_type"), "refresh_token");
    assert.equal(refresh.get("refresh_token"), "first-refresh");
    assert.equal(seen[1].auth, "Bearer fresh-1");
    assert.match(seen[1].url.searchParams.get("readMask") ?? "", /regularHours/);
    assert.equal(openToken(String(row?.accessToken)), "fresh-1");
    assert.ok((row?.expiresAt as Date).getTime() > Date.now() + 3_000_000);
  });

  await check("editing the listing sends PATCH with the field mask", async () => {
    await api.patchLocation("locations/222", { websiteUri: "https://www.stbs.in/contact" }, ["websiteUri"]);
    const call = seen.find((s) => s.method === "PATCH")!;
    assert.equal(call.url.searchParams.get("updateMask"), "websiteUri");
    assert.deepEqual(JSON.parse(call.body), { websiteUri: "https://www.stbs.in/contact" });
    const g = await api.getGoogleUpdated("locations/222");
    assert.equal(g.diffMask, "websiteUri");
  });

  await check("reviews: list, reply and delete reply hit the v4 paths", async () => {
    const page = await api.listReviews("accounts/111/locations/222", { orderBy: "rating" });
    assert.equal(page.totalReviewCount, 31);
    assert.equal(seen[0].url.searchParams.get("pageSize"), "50");
    assert.equal(seen[0].url.searchParams.get("orderBy"), "rating");
    const reply = await api.putReply("accounts/111/locations/222/reviews/r1", "Thank you!");
    assert.equal(reply.reviewReplyState, "PENDING");
    assert.deepEqual(JSON.parse(seen[1].body), { comment: "Thank you!" });
    await api.deleteReply("accounts/111/locations/222/reviews/r1");
    assert.equal(seen[2].method, "DELETE");
  });

  await check("posts and photos send what Google expects", async () => {
    const post = await api.createPost("accounts/111/locations/222", { languageCode: "en", topicType: "STANDARD", summary: "Hi" });
    assert.equal(post.state, "PROCESSING");
    await api.createMedia("accounts/111/locations/222", "https://x.public.blob.vercel-storage.com/a.jpg", "AT_WORK");
    assert.deepEqual(JSON.parse(seen[1].body), { mediaFormat: "PHOTO", locationAssociation: { category: "AT_WORK" }, sourceUrl: "https://x.public.blob.vercel-storage.com/a.jpg" });
  });

  await check("performance queries repeat each metric and spell the date range", async () => {
    await api.fetchDailyMetrics("locations/222", { year: 2026, month: 9, day: 22 }, { year: 2026, month: 10, day: 19 });
    const q = seen[0].url.searchParams;
    assert.equal(q.getAll("dailyMetrics").length, 7);
    assert.ok(q.getAll("dailyMetrics").includes("CALL_CLICKS"));
    assert.equal(q.get("dailyRange.start_date.year"), "2026");
    assert.equal(q.get("dailyRange.start_date.month"), "9");
    assert.equal(q.get("dailyRange.start_date.day"), "22");
    assert.equal(q.get("dailyRange.end_date.day"), "19");
    const kw = await api.fetchSearchKeywords("locations/222", { year: 2026, month: 7 }, { year: 2026, month: 9 });
    assert.equal(kw[0].searchKeywordsCounts?.[0].searchKeyword, "borewell");
    const k = seen[1].url.searchParams;
    assert.equal(k.get("monthlyRange.start_month.month"), "7");
    assert.equal(k.get("monthlyRange.end_month.month"), "9");
    assert.equal(k.get("monthlyRange.start_month.day"), null);
  });

  await check("a switched-off API arrives as a GbpError with the enable link", async () => {
    await assert.rejects(api.fetchDailyMetrics("locations/999", { year: 2026, month: 1, day: 1 }, { year: 2026, month: 1, day: 2 }), (e: unknown) => {
      assert.ok(e instanceof GbpError);
      assert.equal(e.kind, "api-disabled");
      assert.match(e.extra.activationUrl ?? "", /project=5/);
      return true;
    });
  });

  await check("before Google approves the project, the page says so", async () => {
    await conn.clearLocationChoice();
    accountsReply = { status: 429, body: { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for quota metric 'Requests' and limit 'Requests per minute' of service 'mybusinessaccountmanagement.googleapis.com' for consumer 'project_number:5'.", details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "RATE_LIMIT_EXCEEDED", metadata: { quota_limit_value: "0" } }] } } };
    const state = await conn.getGbpState();
    assert.equal(state.kind, "error");
    if (state.kind === "error") {
      assert.equal(state.error.kind, "not-approved");
      assert.equal(state.email, "stbs2025@gmail.com");
    }
  });

  await check("several listings ask the owner to choose", async () => {
    accountsReply = { status: 200, body: { accounts: [{ name: "accounts/111", accountName: "Rajesh Saini" }, { name: "accounts/333", accountName: "Group" }] } };
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/v1/accounts/333/locations") return json(200, { locations: [{ name: "locations/444", title: "Saini Water Solution" }, { name: "locations/222", title: "Saini Tubewell Boring Service" }] });
      return realFetch(input, init);
    }) as typeof fetch;
    try {
      const state = await conn.getGbpState();
      assert.equal(state.kind, "pick-location");
      if (state.kind === "pick-location") {
        // The same listing seen through two accounts is offered once.
        assert.deepEqual(state.choices.map((c) => c.locationName), ["locations/222", "locations/444"]);
        assert.equal(state.choices[0].address, "12, New market, Sonipat, 131021");
      }
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  await check("a revoked sign-in asks to connect again", async () => {
    const { sealToken } = await import("../lib/google-business/crypto");
    row = { ...row!, refreshToken: sealToken("dead"), expiresAt: new Date(0) };
    await assert.rejects(api.getLocation("locations/222"), (e: unknown) => e instanceof GbpError && e.kind === "reauth");
    row = { ...row!, refreshToken: "v1:garbage" };
    await assert.rejects(api.getLocation("locations/222"), (e: unknown) => e instanceof GbpError && e.kind === "reauth" && /server secret/.test(e.message));
  });

  await check("disconnecting revokes at Google and forgets the row", async () => {
    const { sealToken } = await import("../lib/google-business/crypto");
    row = { ...row!, refreshToken: sealToken("to-revoke") };
    await conn.disconnect();
    assert.equal(row, null);
    const revoke = seen.find((s) => s.url.pathname === "/revoke")!;
    assert.equal(new URLSearchParams(revoke.body).get("token"), "to-revoke");
    assert.deepEqual(await conn.getGbpState(), { kind: "not-connected" });
  });

  await check("a missing table is recognised", async () => {
    assert.ok(conn.isMissingTable({ code: "P2021" }));
    assert.ok(conn.isMissingTable(new Error('relation "GoogleBusinessConnection" does not exist')));
    assert.ok(!conn.isMissingTable(new Error("timeout")));
  });

  console.log(`\n${passed} Google Business API checks passed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
