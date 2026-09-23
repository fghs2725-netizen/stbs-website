"use server";
import { cookies, headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { authenticationOptions, CHALLENGE_COOKIE, relyingPartyFrom } from "@/lib/passkeys";

/**
 * Starts a Face ID sign-in: a one-time challenge for the phone to sign. The answer goes to the "passkey"
 * provider in auth.ts, which finds the challenge again through this cookie.
 */
export async function passkeyLoginOptionsAction() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const limit = await checkRateLimit(`passkey-options:${ip}`, { windowMs: 15 * 60 * 1000, maxRequests: 20 });
  if (!limit.allowed) return { ok: false as const, error: "Too many attempts. Wait a few minutes and try again." };

  const { options, challengeId } = await authenticationOptions(relyingPartyFrom(h));
  (await cookies()).set(CHALLENGE_COOKIE, challengeId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 300 });
  return { ok: true as const, options };
}
