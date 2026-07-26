/**
 * Portal authentication — Edge-safe HMAC token functions only.
 *
 * This file is imported by middleware.ts (Edge Runtime).
 * It contains ZERO Node-only dependencies (no Prisma, no bcrypt).
 * Use Web Crypto API exclusively.
 */

const encoder = new TextEncoder();

function getSecret(): string {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET is not configured.');
  return value;
}

function base64urlEncode(input: string | ArrayBuffer): string {
  if (typeof input === 'string') {
    return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  const bytes = new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

async function hmacSign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64urlEncode(signature);
}

async function hmacVerify(data: string, expected: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const sigBytes = Uint8Array.from(atob(expected.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
}

export interface PortalClaims {
  clientId: string;
  email: string;
  companyName: string | null;
  exp: number;
}

export async function createPortalToken(clientId: string, email: string, companyName: string | null, now = Date.now()): Promise<string> {
  const payload = base64urlEncode(JSON.stringify({
    clientId,
    email,
    companyName,
    exp: Math.floor(now / 1000) + 60 * 60 * 24 * 7,
  } satisfies PortalClaims));
  const sig = await hmacSign(payload);
  return `${payload}.${sig}`;
}

export async function verifyPortalToken(token: string | null | undefined, now = Date.now()): Promise<PortalClaims | null> {
  if (!token) return null;
  const [payload, provided] = token.split('.');
  if (!payload || !provided) return null;

  const valid = await hmacVerify(payload, provided);
  if (!valid) return null;

  try {
    const claims = JSON.parse(base64urlDecode(payload)) as PortalClaims;
    if (!claims.clientId || !claims.email || !Number.isSafeInteger(claims.exp) || claims.exp < Math.floor(now / 1000)) return null;
    return claims;
  } catch { return null; }
}
