import { NextResponse } from "next/server";
import { z } from "zod";
import { company } from "@/lib/company";
import { PRIMARY_WEBSITE_PHONE, WEBSITE_PHONES } from "@/lib/website/business-contact";
import { buildKnowledge, buildSystemPrompt, postProcess, selectRelevant, type Knowledge } from "@/lib/assistant/knowledge";
import { complete, providersFromEnv } from "@/lib/assistant/providers";
import { MAX_HISTORY, MAX_MESSAGE_CHARS, type ChatFailure, type ChatReply } from "@/lib/assistant/shared";
import { applyRateLimitHeaders, checkRateLimit } from "@/lib/rate-limit";
import { PROJECTS, type ProjectCase } from "@/lib/website/projects-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Website chat assistant. Public endpoint, so: size and shape checks, per-visitor and daily caps, and
 * the AI only ever sees the conversation (names and phone numbers go through the enquiry form, never here).
 * Nothing is stored: a chat that turns into an enquiry is saved by /api/quote with the visitor's questions.
 */

const MAX_BODY_BYTES = 12_000;
const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS * 3) }))
    .min(1)
    .max(40),
});

let cache: { at: number; kb: Knowledge } | null = null;
async function knowledge(): Promise<Knowledge> {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return cache.kb;
  // Loaded lazily and allowed to fail: if the database is unreachable the assistant still answers from the built-in facts.
  const [projects, config] = await Promise.all([
    import("@/lib/website-projects").then((m) => m.getPublishedProjects()).catch((): ProjectCase[] | null => null),
    import("@/lib/website/public-config").then((m) => m.getPublicSiteConfig()).catch(() => null),
  ]);
  const s = config?.settings;
  const phones = [s?.phone, s?.phone2].filter((p): p is string => Boolean(p));
  const kb = buildKnowledge({
    projects: projects?.length ? projects : PROJECTS,
    contact: {
      phones: phones.length ? phones : WEBSITE_PHONES,
      whatsapp: s?.whatsapp || s?.phone || PRIMARY_WEBSITE_PHONE,
      email: s?.email || company.email,
    },
  });
  cache = { at: Date.now(), kb };
  return kb;
}

const fail = (error: string, status: number, fallback = false) =>
  NextResponse.json<ChatFailure>({ ok: false, error, ...(fallback ? { fallback } : {}) }, { status });

export async function POST(req: Request) {
  const mock = process.env.NODE_ENV !== "production" && process.env.ASSISTANT_MOCK === "1";
  const providers = providersFromEnv();
  if (!providers.length && !mock) return fail("The assistant is not available right now.", 503, true);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const perVisitor = await checkRateLimit(`chat:${ip}`, { windowMs: 10 * 60 * 1000, maxRequests: 25 });
  if (!perVisitor.allowed) return applyRateLimitHeaders(fail("You've sent a lot of messages. Please WhatsApp or call us and we'll help straight away.", 429, true), perVisitor);
  const perDay = await checkRateLimit(`chat-day:${ip}`, { windowMs: 24 * 60 * 60 * 1000, maxRequests: 80 });
  const site = await checkRateLimit(`chat-site:${day}`, { windowMs: 24 * 60 * 60 * 1000, maxRequests: Number(process.env.ASSISTANT_DAILY_LIMIT) || 600 });
  if (!perDay.allowed || !site.allowed) return fail("The assistant has reached today's limit. Please WhatsApp or call us.", 429, true);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return fail("Message too long.", 413);
  let parsed: z.infer<typeof bodySchema>;
  try {
    const r = bodySchema.safeParse(JSON.parse(raw));
    if (!r.success) return fail("Invalid request.", 400);
    parsed = r.data;
  } catch {
    return fail("Invalid request.", 400);
  }
  const history = parsed.messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content.slice(0, m.role === "user" ? MAX_MESSAGE_CHARS : 1200) }));
  if (history[history.length - 1].role !== "user") return fail("Invalid request.", 400);

  const kb = await knowledge();
  // The facts are picked from the latest question plus the one before it, so follow-ups ("aur Kundli mein?") still match.
  const query = history.filter((m) => m.role === "user").slice(-2).map((m) => m.content).join(" ");

  let answer: string | null;
  if (mock) {
    const facts = selectRelevant(kb, query, 2).map((e) => e.text).join(" ");
    answer = /quote|price|visit|rate|kharcha/i.test(query) ? `(Test reply) We quote every job in writing after seeing the site.\n[[LEAD_FORM]]` : `(Test reply) ${facts}`;
  } else {
    const result = await complete(providers, [{ role: "system", content: buildSystemPrompt(kb, query) }, ...history]);
    answer = result?.text ?? null;
  }
  if (!answer) return fail("The assistant could not answer just now. Please WhatsApp or call us.", 503, true);

  const { text, action } = postProcess(answer);
  return NextResponse.json<ChatReply>({ ok: true, reply: text, action });
}
