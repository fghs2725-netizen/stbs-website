import { createHash } from "node:crypto";

/**
 * A short, non-reversible tag for "the password this account has right now", taken from the stored hash.
 *
 * Login sessions here are stateless tokens, so nothing on the server can cancel one. Stamping each token
 * with this tag, and comparing it to the account's current tag on every read, makes a password change end
 * every session issued before it, on every device, without a new database column: the hash changes, so
 * the tag changes. It is derived from the hash, never the password, and the token is encrypted.
 */
export const passwordFingerprint = (passwordHash: string) => createHash("sha256").update(passwordHash).digest("hex").slice(0, 24);
