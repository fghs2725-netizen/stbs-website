"use server";
import { after } from "next/server";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { issueReset, resetByEmailAvailable } from "@/lib/password-reset";
import { normalizeIdentifier } from "@/lib/password-reset-core";

/**
 * "sent" is the answer whether or not the account exists, and the work happens after the response, so the
 * page cannot be used to learn who has an account, either by what it says or by how long it takes.
 * "unavailable" reports the site's own setup (no mail service or recovery address), never anything about an account.
 */
export type ForgotState = "sent" | "unavailable" | "invalid" | "limited";

export async function requestResetAction(identifier: string): Promise<ForgotState> {
  if (!resetByEmailAvailable()) return "unavailable";
  const id = normalizeIdentifier(identifier);
  if (!id) return "invalid";

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const limit = await checkRateLimit(`pwreset-ip:${ip}`, { windowMs: 15 * 60 * 1000, maxRequests: 5 });
  if (!limit.allowed) return "limited";

  after(() => issueReset(id).catch((e) => console.error("[Auth] Password reset failed:", e)));
  return "sent";
}
