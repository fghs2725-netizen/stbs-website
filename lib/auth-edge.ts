/**
 * Lightweight Edge-safe session verification for middleware.
 *
 * Replicates Auth.js JWT decode (JWE A256CBC-HS512) using only
 * `jose/jwt/decrypt` and `@panva/hkdf` — avoids pulling in the
 * full @auth/core / preact / oauth4webapi dependency tree.
 */
import { jwtDecrypt, calculateJwkThumbprint, base64url } from "jose";
import { hkdf } from "@panva/hkdf";

const ALG = "dir";
const ENC = "A256CBC-HS512";
const SESSION_COOKIE = "authjs.session-token";
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

export interface Session {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  expires?: string;
}

async function deriveKey(secret: string, salt: string): Promise<Uint8Array> {
  return hkdf("sha256", secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);
}

function parseCookies(header: string | null): Record<string, string> {
  const map: Record<string, string> = {};
  if (!header) return map;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) map[key] = val;
  }
  return map;
}

/**
 * Decode the Auth.js session cookie. Returns the session payload or null.
 * This function is Edge-safe — no Node.js APIs, no heavy dependencies.
 */
export async function getSession(
  cookieHeader: string | null,
  secret: string,
): Promise<Session | null> {
  const cookies = parseCookies(cookieHeader);

  console.log("[Auth Edge Debug] getSession called");

  const secureToken = cookies[SECURE_SESSION_COOKIE];
  const nonSecureToken = cookies[SESSION_COOKIE];
  const token = secureToken ?? nonSecureToken;

  console.log("[Auth Edge Debug] Cookie header present: " + (cookieHeader !== null && cookieHeader !== ""));
  console.log("[Auth Edge Debug] authjs.session-token present: " + (nonSecureToken !== undefined));
  console.log("[Auth Edge Debug] __Secure-authjs.session-token present: " + (secureToken !== undefined));

  if (!token) {
    console.log("[Auth Edge Debug] Selected cookie name: NONE — no session token found");
    return null;
  }

  const actualCookieName = secureToken !== undefined ? SECURE_SESSION_COOKIE : SESSION_COOKIE;
  console.log("[Auth Edge Debug] Selected cookie name: " + actualCookieName);
  console.log("[Auth Edge Debug] Session token present: true");

  const secrets = [secret];

  try {
    const { payload } = await jwtDecrypt(
      token,
      async ({ kid, enc }) => {
        for (const s of secrets) {
          const key = await deriveKey(s, actualCookieName);
          if (kid === undefined) return key;
          const thumbprint = await calculateJwkThumbprint(
            { kty: "oct", k: base64url.encode(key) },
            `sha${key.byteLength << 3}` as "sha256" | "sha384" | "sha512",
          );
          if (kid === thumbprint) return key;
        }
        throw new Error("no matching decryption secret");
      },
      {
        clockTolerance: 15,
        keyManagementAlgorithms: [ALG],
        contentEncryptionAlgorithms: [ENC, "A256GCM"],
      },
    );

    console.log("[Auth Edge Debug] JWE decrypt: SUCCESS");
    return payload as Session;
  } catch (e) {
    console.log("[Auth Edge Debug] JWE decrypt: FAILED");
    console.log("[Auth Edge Debug] Decrypt exception name: " + ((e as Error).name || "unknown"));
    console.log("[Auth Edge Debug] Decrypt exception message: " + ((e as Error).message || "no message"));
    return null;
  }
}
