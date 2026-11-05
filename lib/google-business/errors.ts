/**
 * Turns Google's error replies into one plain message and a kind the page can act on.
 * Pure: no network, so scripts/test-google-business.ts can feed it recorded replies.
 */

export type GbpErrorKind =
  | "not-approved" // the Cloud project has no Business Profile API quota yet (access request pending)
  | "api-disabled" // one of the APIs is not switched on in the Cloud project
  | "reauth" // sign-in expired, revoked, or lacks the manage permission
  | "permission" // the Google account does not manage this listing
  | "not-found"
  | "invalid" // Google rejected what was sent; message says why
  | "rate-limit"
  | "unavailable"; // network failure or Google error, try again later

export class GbpError extends Error {
  constructor(
    public kind: GbpErrorKind,
    message: string,
    public extra: { status?: number; activationUrl?: string; service?: string; detail?: string } = {},
  ) {
    super(message);
    this.name = "GbpError";
  }
}

/** A mistake in what the owner typed: shown on the form, never logged as a failure. */
export class GbpInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GbpInputError";
  }
}

interface GoogleErrorDetail {
  "@type"?: string;
  reason?: string;
  metadata?: Record<string, string>;
  fieldViolations?: Array<{ field?: string; description?: string }>;
}
interface GoogleErrorBody {
  error?: { code?: number; message?: string; status?: string; details?: GoogleErrorDetail[] } | string;
  error_description?: string;
}

const SERVICE_NAMES: Record<string, string> = {
  "mybusinessaccountmanagement.googleapis.com": "My Business Account Management API",
  "mybusinessbusinessinformation.googleapis.com": "My Business Business Information API",
  "businessprofileperformance.googleapis.com": "Business Profile Performance API",
  "mybusiness.googleapis.com": "Google My Business API",
};

export function describeGoogleError(status: number, body: unknown): GbpError {
  const b = (body && typeof body === "object" ? body : {}) as GoogleErrorBody;

  // OAuth token endpoint shape: { error: "invalid_grant", error_description: "..." }
  if (typeof b.error === "string") {
    if (b.error === "invalid_grant" || b.error === "unauthorized_client") {
      return new GbpError("reauth", "The Google sign-in has expired or was removed. Connect again.", { status, detail: b.error_description });
    }
    if (b.error === "invalid_client") {
      return new GbpError("invalid", "Google did not accept the OAuth client ID or secret. Check GOOGLE_BUSINESS_CLIENT_ID and GOOGLE_BUSINESS_CLIENT_SECRET.", { status });
    }
    return new GbpError("unavailable", `Google sign-in failed (${b.error}).`, { status, detail: b.error_description });
  }

  const err = b.error ?? {};
  const details = err.details ?? [];
  const info = details.find((d) => d["@type"]?.endsWith("google.rpc.ErrorInfo"));
  const reason = info?.reason ?? "";
  const meta = info?.metadata ?? {};
  const googleMessage = (err.message ?? "").trim();

  if (status === 401) {
    return new GbpError("reauth", "The Google sign-in has expired. Connect again.", { status, detail: googleMessage });
  }

  if (reason === "SERVICE_DISABLED" || /has not been used in project|is disabled/i.test(googleMessage)) {
    const service = meta.service ?? googleMessage.match(/([a-z]+\.googleapis\.com)/)?.[1] ?? "";
    const name = SERVICE_NAMES[service] ?? (service || "a required Google API");
    return new GbpError("api-disabled", `The ${name} is switched off in your Google Cloud project. Enable it, wait a few minutes, then reload.`, {
      status,
      service,
      activationUrl: meta.activationUrl ?? (service ? `https://console.cloud.google.com/apis/library/${service}` : undefined),
    });
  }

  if (status === 429 || err.status === "RESOURCE_EXHAUSTED") {
    const limit = meta.quota_limit_value ?? googleMessage.match(/limit[^0-9]{0,30}(\d+)/i)?.[1];
    if (limit === "0") {
      return new GbpError(
        "not-approved",
        "Google has not approved Business Profile API access for your Cloud project yet. Approval usually takes up to 14 days after you apply; until then Google allows 0 requests.",
        { status, detail: googleMessage },
      );
    }
    return new GbpError("rate-limit", "Google is limiting requests right now. Wait a minute and try again.", { status, detail: googleMessage });
  }

  if (status === 403) {
    if (reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT" || /insufficient authentication scopes/i.test(googleMessage)) {
      return new GbpError("reauth", "The Google sign-in does not include permission to manage the listing. Connect again and allow it.", { status });
    }
    return new GbpError(
      "permission",
      "Google refused access. The connected Google account must be an owner or manager of the Business Profile.",
      { status, detail: googleMessage },
    );
  }

  if (status === 404) {
    return new GbpError("not-found", "Google could not find that item. It may already have been removed.", { status, detail: googleMessage });
  }

  if (status === 400 || status === 409 || status === 412) {
    const violations = details
      .flatMap((d) => d.fieldViolations ?? [])
      .map((v) => [v.field, v.description].filter(Boolean).join(": "))
      .filter(Boolean);
    const why = violations.length ? violations.join("; ") : googleMessage;
    return new GbpError("invalid", why ? `Google did not accept that: ${why}` : "Google did not accept that change.", { status, detail: googleMessage });
  }

  return new GbpError("unavailable", "Google's servers did not answer properly. Try again in a few minutes.", { status, detail: googleMessage });
}

/** One line for the page. Unexpected errors are reported plainly; the server log keeps the detail. */
export function errorMessage(e: unknown): string {
  if (e instanceof GbpError || e instanceof GbpInputError) return e.message;
  return "Something went wrong talking to Google. Check your connection and try again.";
}
