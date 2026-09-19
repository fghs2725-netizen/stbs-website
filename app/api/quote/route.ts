import { NextResponse } from "next/server";
import { company } from "@/lib/company";
import { emailService } from "@/lib/email/email-service";
import { processQuote, type QuoteSender } from "@/lib/quote-request";
import { applyRateLimitHeaders, checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 10_000;

// Public endpoint: everything a visitor supplies is validated (lib/quote-request), bots are dropped
// by a honeypot, and each IP is limited. Delivery uses the existing email service, which also logs
// every message (EmailLog), so a request is retained even if the provider is down or unconfigured.
const send: QuoteSender = async (mail) => {
  try {
    const r = await emailService.sendDirect({ to: mail.to, subject: mail.subject, htmlBody: mail.htmlBody, textBody: mail.textBody, metadata: mail.metadata });
    return { success: r.success, error: r.error };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "send failed" };
  }
};

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const limit = await checkRateLimit(`quote:${ip}`, { windowMs: 15 * 60 * 1000, maxRequests: 5 });
  if (!limit.allowed) {
    return applyRateLimitHeaders(NextResponse.json({ ok: false, error: "Too many requests. Please try again in a few minutes or call us." }, { status: 429 }), limit);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const recipient = process.env.QUOTE_TO_EMAIL?.trim() || company.email;
  const result = await processQuote(body, send, recipient);
  if (result.ok) return applyRateLimitHeaders(NextResponse.json({ ok: true }), limit);
  return applyRateLimitHeaders(NextResponse.json({ ok: false, error: result.error, fields: result.fields }, { status: result.status }), limit);
}
