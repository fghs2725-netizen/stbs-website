import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Seals the Google tokens before they reach the database, so a database export alone cannot be used
 * to act on the listing. The key is derived from AUTH_SECRET; if that secret ever changes the stored
 * tokens can no longer be opened and the page asks the owner to connect again.
 */

const PREFIX = "v1:";

function key(secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET): Buffer {
  if (!secret) throw new Error("AUTH_SECRET is not configured.");
  return createHash("sha256").update(`${secret}:google-business-tokens`).digest();
}

export function sealToken(plain: string, secret?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** Returns null when the value cannot be opened (wrong key, damaged, or not sealed by this code). */
export function openToken(sealed: string, secret?: string): string | null {
  if (!sealed.startsWith(PREFIX)) return null;
  try {
    const raw = Buffer.from(sealed.slice(PREFIX.length), "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(secret), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
