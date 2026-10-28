/**
 * Settings and fixed addresses for Admin -> Google Business. See docs/google-business.md for setup.
 *
 * Env:
 *   GOOGLE_BUSINESS_CLIENT_ID      OAuth client ID (Google Cloud -> APIs & Services -> Credentials, "Web application")
 *   GOOGLE_BUSINESS_CLIENT_SECRET  that client's secret
 *   GOOGLE_BUSINESS_REDIRECT_URI   optional; defaults to <this site's origin>/api/google-business/callback
 */

export const GBP_SCOPES = ["https://www.googleapis.com/auth/business.manage", "openid", "email"] as const;
export const GBP_MANAGE_SCOPE = GBP_SCOPES[0];

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export const API = {
  accounts: "https://mybusinessaccountmanagement.googleapis.com/v1",
  info: "https://mybusinessbusinessinformation.googleapis.com/v1",
  /** Reviews, posts and photos still live on the v4 API. */
  v4: "https://mybusiness.googleapis.com/v4",
  performance: "https://businessprofileperformance.googleapis.com/v1",
} as const;

/** Where the owner goes for each setup step. */
export const HELP_LINKS = {
  accessForm: "https://support.google.com/business/contact/api_default",
  apiOverview: "https://developers.google.com/my-business/content/prereqs",
  credentials: "https://console.cloud.google.com/apis/credentials",
  consentScreen: "https://console.cloud.google.com/auth/overview",
  businessProfile: "https://business.google.com/",
  enable: {
    "Account Management API": "https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com",
    "Business Information API": "https://console.cloud.google.com/apis/library/mybusinessbusinessinformation.googleapis.com",
    "Business Profile Performance API": "https://console.cloud.google.com/apis/library/businessprofileperformance.googleapis.com",
    "Google My Business API (reviews, posts, photos)": "https://console.cloud.google.com/apis/library/mybusiness.googleapis.com",
  },
} as const;

export const CALLBACK_PATH = "/api/google-business/callback";
export const STATE_COOKIE = "gbp_oauth_state";

type Env = Record<string, string | undefined>;

export interface GbpConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export function missingConfig(env: Env = process.env): string[] {
  return ["GOOGLE_BUSINESS_CLIENT_ID", "GOOGLE_BUSINESS_CLIENT_SECRET"].filter((k) => !env[k]?.trim());
}

export function gbpConfig(env: Env = process.env): GbpConfig | null {
  if (missingConfig(env).length) return null;
  return {
    clientId: env.GOOGLE_BUSINESS_CLIENT_ID!.trim(),
    clientSecret: env.GOOGLE_BUSINESS_CLIENT_SECRET!.trim(),
    redirectUri: env.GOOGLE_BUSINESS_REDIRECT_URI?.trim() || undefined,
  };
}

/** The redirect URI must match one registered on the OAuth client exactly, so it is built the same way in both routes. */
export function redirectUriFor(origin: string, config: GbpConfig): string {
  return config.redirectUri || `${origin.replace(/\/+$/, "")}${CALLBACK_PATH}`;
}

export function buildAuthUrl(config: GbpConfig, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GBP_SCOPES.join(" "),
    // offline + consent: Google only hands out a refresh token when asked like this.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/** Messages for the ?error= codes the callback redirects with. */
export const CALLBACK_NOTICES: Record<string, string> = {
  denied: "Google sign-in was cancelled, so nothing was connected.",
  state: "That sign-in link had expired. Press Connect again.",
  scope: "Google was connected without permission to manage the listing. Press Connect again and leave “See, edit, create and delete your Google business listings” ticked.",
  "no-refresh": "Google did not give a lasting sign-in. Remove this app from your Google account's third-party access page, then connect again.",
  exchange: "Google refused the sign-in. Check that the redirect URI on the OAuth client matches the one shown below, then try again.",
  "not-configured": "The Google sign-in keys are not set on the server yet.",
  "no-table": "The database table for this page is missing. Apply the migration first.",
};
