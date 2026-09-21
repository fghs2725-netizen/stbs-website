import { createHash, randomBytes } from "node:crypto";

/**
 * The pure parts of "forgot password": token handling, timing rules, and the email text. Nothing here
 * touches the database or the network, so the rules that matter can be tested exactly.
 *
 * The design in one paragraph: a reset link carries a random 256-bit token. Only its SHA-256 is stored, so
 * a leaked database row cannot be turned back into a working link. The token is single-use, expires, and is
 * deleted when the password changes by any route. The link goes to a recovery address fixed on the server,
 * never to an address typed into the form, and the page answers identically whether or not the account
 * exists, so it cannot be used to find out who has one.
 */

export const RESET_TTL_MS = 30 * 60 * 1000;
/**
 * Minimum gap between two reset emails for the same account. It is enforced from the database (the token's
 * own timestamps), because the request rate limiter is in-memory per serverless instance and cannot be relied
 * on to stop someone flooding the owner's inbox.
 */
export const RESET_COOLDOWN_MS = 5 * 60 * 1000;

/** VerificationToken.identifier for an account's reset token. The prefix keeps it apart from other uses of the table. */
export const resetIdentifier = (userId: string) => `pwreset:${userId}`;

/** 32 random bytes as base64url: 43 characters, unguessable. */
export const newRawToken = () => randomBytes(32).toString("base64url");
export const looksLikeToken = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

export const tokenExpiry = (now = Date.now()) => new Date(now + RESET_TTL_MS);
export const isExpired = (expires: Date, now = Date.now()) => expires.getTime() <= now;
/** The row has no created-at column, so issue time is derived: created = expires - TTL. */
export const issuedRecently = (expires: Date, now = Date.now()) => expires.getTime() - RESET_TTL_MS > now - RESET_COOLDOWN_MS;

/** Accepts one plausible email address, or null. Anything else means "recovery is not configured". */
export function parseRecoveryAddress(value: string | undefined | null): string | null {
  const v = (value ?? "").trim();
  if (!v || v.length > 254 || /[\s,;<>]/.test(v)) return null;
  return /^[^@]+@[^@]+\.[^@]{2,}$/.test(v) ? v : null;
}

/** The identifier typed on the forgot page: trimmed, lower-cased, bounded. Empty means invalid. */
export const normalizeIdentifier = (raw: unknown) => (typeof raw === "string" ? raw.trim().toLowerCase().slice(0, 254) : "");

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function resetEmail({ link, account, requestedAt }: { link: string; account: string; requestedAt: string }) {
  const minutes = RESET_TTL_MS / 60000;
  const subject = "Reset your STBS admin password";
  const text = [
    "Someone asked to reset the password for the STBS admin account:",
    account,
    "",
    `Use this link within ${minutes} minutes to choose a new password:`,
    link,
    "",
    `Requested ${requestedAt}.`,
    "If that was not you, ignore this email. Nothing has changed and the link stops working by itself.",
    "The link works once. Do not forward it.",
  ].join("\n");
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1d1d1f;line-height:1.5">
  <h2 style="font-weight:600;margin:0 0 12px">Reset your admin password</h2>
  <p>Someone asked to reset the password for the STBS admin account <strong>${escapeHtml(account)}</strong>.</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0066cc;color:#fff;text-decoration:none;padding:12px 22px;border-radius:980px;font-weight:500">Choose a new password</a></p>
  <p style="color:#6e6e73;font-size:14px">The link works once and expires in ${minutes} minutes. Requested ${escapeHtml(requestedAt)}.</p>
  <p style="color:#6e6e73;font-size:14px">If that was not you, ignore this email. Nothing has changed, and the link stops working by itself.</p>
</div>`;
  return { subject, text, html };
}
