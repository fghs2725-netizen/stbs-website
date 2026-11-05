import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { GOOGLE_REVOKE_URL, GOOGLE_TOKEN_URL, GBP_MANAGE_SCOPE, gbpConfig, missingConfig } from "./config";
import { openToken, sealToken } from "./crypto";
import { GbpError, describeGoogleError } from "./errors";

/**
 * The one connected Google account: stored tokens, refreshing the short-lived access token, and
 * working out what the page should show (set up, connect, pick a listing, or the listing itself).
 */

const ROW_ID = "default";

export interface TokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  token_type?: string;
}

/** The table is added by migration 20261022_google_business; until it is applied the page says so instead of failing. */
export function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  return code === "P2021" || code === "P2022" || /does not exist/i.test(String((e as Error)?.message ?? ""));
}

async function postForm(url: string, params: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    cache: "no-store",
  });
}

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const config = gbpConfig();
  if (!config) throw new GbpError("invalid", "The Google sign-in keys are not set on the server.");
  const res = await postForm(GOOGLE_TOKEN_URL, {
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw describeGoogleError(res.status, body);
  return body as TokenResponse;
}

/** The email in Google's ID token. It came straight from Google's token endpoint over TLS, so it is read without re-verifying. */
export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8")) as { email?: string };
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export const hasManageScope = (scope?: string) => (scope ?? "").split(/\s+/).includes(GBP_MANAGE_SCOPE);

export async function saveConnection(tokens: TokenResponse & { refresh_token: string }) {
  const data = {
    email: emailFromIdToken(tokens.id_token),
    refreshToken: sealToken(tokens.refresh_token),
    accessToken: sealToken(tokens.access_token),
    expiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
    scope: tokens.scope ?? null,
    // A new sign-in may be a different Google account, so the listing is chosen again.
    accountName: null,
    locationName: null,
    locationTitle: null,
    connectedAt: new Date(),
  };
  await prisma.googleBusinessConnection.upsert({ where: { id: ROW_ID }, create: { id: ROW_ID, ...data }, update: data });
}

export async function getConnectionRow() {
  return prisma.googleBusinessConnection.findUnique({ where: { id: ROW_ID } });
}

export async function saveLocationChoice(accountName: string, locationName: string, locationTitle: string | null) {
  await prisma.googleBusinessConnection.update({ where: { id: ROW_ID }, data: { accountName, locationName, locationTitle } });
}

export async function clearLocationChoice() {
  await prisma.googleBusinessConnection.update({ where: { id: ROW_ID }, data: { accountName: null, locationName: null, locationTitle: null } });
}

/** Revokes the grant at Google (best effort) and forgets it here. */
export async function disconnect() {
  const row = await getConnectionRow();
  if (!row) return;
  const token = openToken(row.refreshToken);
  if (token) {
    try {
      await postForm(GOOGLE_REVOKE_URL, { token });
    } catch (e) {
      console.warn("[google-business] revoke failed:", e instanceof Error ? e.message : e);
    }
  }
  await prisma.googleBusinessConnection.delete({ where: { id: ROW_ID } });
}

/** A valid access token, refreshed when it has under a minute left. Memoised per request so a page refreshes at most once. */
export const getAccessToken = cache(async (): Promise<string> => {
  const config = gbpConfig();
  if (!config) throw new GbpError("invalid", "The Google sign-in keys are not set on the server.");
  const row = await getConnectionRow();
  if (!row) throw new GbpError("reauth", "No Google account is connected.");

  if (row.accessToken && row.expiresAt && row.expiresAt.getTime() - Date.now() > 60_000) {
    const access = openToken(row.accessToken);
    if (access) return access;
  }

  const refresh = openToken(row.refreshToken);
  if (!refresh) throw new GbpError("reauth", "The saved Google sign-in can no longer be read (the server secret changed). Connect again.");

  let res: Response;
  try {
    res = await postForm(GOOGLE_TOKEN_URL, { client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refresh, grant_type: "refresh_token" });
  } catch {
    throw new GbpError("unavailable", "Could not reach Google. Check the internet connection and try again.");
  }
  const body = (await res.json().catch(() => ({}))) as Partial<TokenResponse>;
  if (!res.ok || !body.access_token) throw describeGoogleError(res.status, body);

  await prisma.googleBusinessConnection.update({
    where: { id: ROW_ID },
    data: {
      accessToken: sealToken(body.access_token),
      expiresAt: new Date(Date.now() + (body.expires_in ?? 3600) * 1000),
      // Google may rotate the refresh token; keep the newest.
      ...(body.refresh_token ? { refreshToken: sealToken(body.refresh_token) } : {}),
    },
  });
  return body.access_token;
});

// ─── What the page should show ──────────────────────────────────────────────

export interface LocationChoice { accountName: string; accountLabel: string; locationName: string; title: string; address: string }

export type GbpState =
  | { kind: "not-configured"; missing: string[] }
  | { kind: "no-table" }
  | { kind: "not-connected" }
  | { kind: "error"; email: string | null; error: { kind: string; message: string; activationUrl?: string } }
  | { kind: "pick-location"; email: string | null; choices: LocationChoice[] }
  | { kind: "ready"; email: string | null; accountName: string; locationName: string; locationTitle: string; parent: string; connectedAt: Date };

/**
 * Memoised per request. When the listing is already chosen this is one database read; Google is
 * only asked (for the list of listings) right after connecting.
 */
export const getGbpState = cache(async (): Promise<GbpState> => {
  const missing = missingConfig();
  if (missing.length) return { kind: "not-configured", missing };

  let row;
  try {
    row = await getConnectionRow();
  } catch (e) {
    if (isMissingTable(e)) return { kind: "no-table" };
    throw e;
  }
  if (!row) return { kind: "not-connected" };

  if (row.accountName && row.locationName) {
    return {
      kind: "ready",
      email: row.email,
      accountName: row.accountName,
      locationName: row.locationName,
      locationTitle: row.locationTitle ?? "Your listing",
      parent: `${row.accountName}/${row.locationName}`,
      connectedAt: row.connectedAt,
    };
  }

  try {
    // Imported here so the API module (which imports this one) does not form a load-time cycle.
    const { listAllLocations } = await import("./api");
    const choices = await listAllLocations();
    if (choices.length === 1) {
      const only = choices[0];
      await saveLocationChoice(only.accountName, only.locationName, only.title);
      return { kind: "ready", email: row.email, accountName: only.accountName, locationName: only.locationName, locationTitle: only.title, parent: `${only.accountName}/${only.locationName}`, connectedAt: row.connectedAt };
    }
    if (!choices.length) {
      return {
        kind: "error",
        email: row.email,
        error: { kind: "permission", message: `No Business Profile was found for ${row.email ?? "this Google account"}. Connect with the Google account that owns or manages the listing.` },
      };
    }
    return { kind: "pick-location", email: row.email, choices };
  } catch (e) {
    if (e instanceof GbpError) {
      return { kind: "error", email: row.email, error: { kind: e.kind, message: e.message, activationUrl: e.extra.activationUrl } };
    }
    console.error("[google-business] could not list listings:", e);
    return { kind: "error", email: row.email, error: { kind: "unavailable", message: "Could not reach Google. Try again in a few minutes." } };
  }
});
