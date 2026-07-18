import { createHmac, timingSafeEqual } from "node:crypto";

type RenderClaims = { id: string; exp: number };

function secret() {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("PDF_RENDER_SECRET_MISSING");
  return value;
}

function encode(value: string) { return Buffer.from(value).toString("base64url"); }
function signature(payload: string) { return encode(createHmac("sha256", secret()).update(payload).digest("base64url")); }

export function createQuotationRenderToken(id: string, now = Date.now()) {
  const payload = encode(JSON.stringify({ id, exp: Math.floor(now / 1000) + 120 } satisfies RenderClaims));
  return `${payload}.${signature(payload)}`;
}

export function verifyQuotationRenderToken(token: string | null | undefined, expectedId: string, now = Date.now()) {
  if (!token) return false;
  const [payload, provided] = token.split(".");
  if (!payload || !provided) return false;
  const expected = signature(payload);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as RenderClaims;
    return claims.id === expectedId && Number.isSafeInteger(claims.exp) && claims.exp >= Math.floor(now / 1000);
  } catch { return false; }
}
