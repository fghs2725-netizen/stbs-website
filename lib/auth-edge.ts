/**
 * Lightweight Edge-safe session verification for middleware.
 *
 * Replicates Auth.js JWT decode (JWE A256CBC-HS512) using only
 * `jose` and `@panva/hkdf` — avoids pulling in the
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
 * Find and reconstruct a session token from cookies, supporting Auth.js chunking.
 *
 * Auth.js SessionStore stores cookies whose name STARTS WITH the session cookie
 * prefix. If the JWT exceeds ~3936 bytes, it is split into chunks with suffixes
 * `.0`, `.1`, etc. This function gathers all matching cookies, sorts by suffix,
 * and concatenates.
 */
function findSessionToken(
  cookies: Record<string, string>,
  secure: boolean,
): { token: string | null; cookieName: string | null } {
  const prefix = secure ? SECURE_SESSION_COOKIE : SESSION_COOKIE;

  const matching: Array<{ key: string; suffix: number; value: string }> = [];

  for (const [key, value] of Object.entries(cookies)) {
    if (key === prefix || key.startsWith(prefix + ".")) {
      // Extract suffix number: 0 for exact match, parse number for chunks
      const suffix = key === prefix ? 0 : parseInt(key.slice(prefix.length + 1), 10);
      if (!isNaN(suffix) && value) {
        matching.push({ key, suffix, value });
      }
    }
  }

  if (matching.length === 0) return { token: null, cookieName: null };

  matching.sort((a, b) => a.suffix - b.suffix);
  const token = matching.map((m) => m.value).join("");
  const cookieName = matching[0].key.replace(/\.\d+$/, "");
  return { token, cookieName };
}

/**
 * Decode the Auth.js session cookie. Returns the session payload or null.
 * This function is Edge-safe — no Node.js APIs, no heavy dependencies.
 */
export async function getSession(
  cookieHeader: string | null,
  secret: string,
): Promise<Session | null> {
  console.log("[Auth Edge Debug] getSession called");
  console.log("[Auth Edge Debug] Cookie header present: " + (cookieHeader !== null && cookieHeader !== ""));

  const cookies = parseCookies(cookieHeader);
  const hasSecret = !!secret;
  console.log("[Auth Edge Debug] AUTH_SECRET present: " + hasSecret);
  if (hasSecret) console.log("[Auth Edge Debug] AUTH_SECRET length: " + secret.length);

  // List all cookie names (safe — just names, no values)
  const allNames = Object.keys(cookies);
  const sessionLikeCookies = allNames.filter((n) => n.includes("authjs.session"));
  console.log("[Auth Edge Debug] Total cookies: " + allNames.length);
  console.log("[Auth Edge Debug] authjs.session* cookies found: " + sessionLikeCookies.length);
  if (sessionLikeCookies.length > 0) {
    console.log("[Auth Edge Debug] authjs.session* cookie names: " + JSON.stringify(sessionLikeCookies));
  }

  // Try secure cookie first (production HTTPS), fall back to non-secure
  const secureResult = findSessionToken(cookies, true);
  const nonSecureResult = secureResult.token ? null : findSessionToken(cookies, false);
  const result = secureResult.token ? secureResult : nonSecureResult;

  console.log("[Auth Edge Debug] __Secure-authjs.session-token (base or chunked) present: " + (!!secureResult.token));
  console.log("[Auth Edge Debug] authjs.session-token (base or chunked) present: " + (!!(nonSecureResult?.token)));

  if (!result || !result.token) {
    console.log("[Auth Edge Debug] Selected cookie name: NONE");
    console.log("[Auth Edge Debug] Token present: false");
    console.log("[Auth Edge Debug] jwtDecrypt: SKIPPED — no token");
    return null;
  }

  const cookieName = result.cookieName!;
  console.log("[Auth Edge Debug] Selected cookie name: " + cookieName);
  console.log("[Auth Edge Debug] Token present: true");
  console.log("[Auth Edge Debug] Token length (chars): " + result.token.length);
  console.log("[Auth Edge Debug] Cookie chunked: " + (result.token.length > 0 && !cookies[cookieName] ? "YES" : "NO"));

  const salt = cookieName;
  console.log("[Auth Edge Debug] Salt used: " + salt);

  const secrets = [secret];

  try {
    const { payload } = await jwtDecrypt(
      result.token,
      async ({ kid, enc }) => {
        for (const s of secrets) {
          const key = await deriveKey(s, salt);
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

    console.log("[Auth Edge Debug] jwtDecrypt: SUCCESS");
    const p = payload as Record<string, unknown>;
    console.log("[Auth Edge Debug] decoded id present: " + (!!(p as any)?.sub));
    console.log("[Auth Edge Debug] decoded email present: " + (!!(p as any)?.email));
    console.log("[Auth Edge Debug] decoded role: " + ((p as any)?.role || "NONE"));
    const session: Session = {
      user: {
        id: String(p.sub ?? p.id ?? ""),
        name: (p.name as string) ?? null,
        email: String(p.email ?? ""),
        image: (p.picture as string) ?? null,
        role: String(p.role ?? ""),
      },
      expires: (p.exp as string) ?? undefined,
    };
    console.log("[Auth Edge Debug] getSession returning: SESSION");
    return session;
  } catch (e) {
    console.log("[Auth Edge Debug] jwtDecrypt: FAILED");
    console.log("[Auth Edge Debug] exception name: " + ((e as Error).name || "unknown"));
    console.log("[Auth Edge Debug] exception message: " + ((e as Error).message || "no message"));
    return null;
  }
}
