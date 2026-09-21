"use server";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { completeReset, type ResetResult } from "@/lib/password-reset";

export async function resetPasswordAction(input: { token: string; next: string; confirm: string }): Promise<ResetResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const limit = await checkRateLimit(`pwreset-use:${ip}`, { windowMs: 15 * 60 * 1000, maxRequests: 10 });
  if (!limit.allowed) return { ok: false, error: "Too many attempts. Wait 15 minutes and try again." };
  return completeReset(input.token, input.next ?? "", input.confirm ?? "");
}
