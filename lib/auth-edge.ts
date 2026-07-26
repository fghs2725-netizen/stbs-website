/**
 * Lightweight Edge-safe session verification for middleware.
 *
 * Replicates Auth.js JWT decode (JWE A256CBC-HS512) using only
 * `jose/jwt/decrypt` and `@panva/hkdf` — avoids pulling in the
 * full @auth/core / preact / oauth4webapi dependency tree.
 */
import { jwtDecrypt } from "jose/jwt/decrypt";
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
  const token =
    cookies[SECURE_SESSION_COOKIE] ?? cookies[SESSION_COOKIE];
  if (!token) return null;

  const secrets = [secret];

  try {
    const { payload } = await jwtDecrypt(
      token,
      async ({ kid }) => {
        for (const s of secrets) {
          const key = await deriveKey(s, SESSION_COOKIE);
          if (kid === undefined) return key;
          // If kid is set, we still return the derived key since Auth.js
          // doesn't always set kid in the header for middleware tokens
          return key;
        }
        throw new Error("no matching decryption secret");
      },
      {
        clockTolerance: 15,
        keyManagementAlgorithms: [ALG],
        contentEncryptionAlgorithms: [ENC, "A256GCM"],
      },
    );

    return payload as Session;
  } catch {
    return null;
  }
}
