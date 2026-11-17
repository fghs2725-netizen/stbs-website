import { NextResponse } from "next/server";
import { answer, type ChatTurn } from "@/lib/admin-ai/chat";
import { refuse } from "@/lib/admin-ai/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

/** One question to the business assistant. It can read figures; it cannot change anything. */
export async function POST(request: Request) {
  const refused = await refuse();
  if (refused) return refused;
  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
  const turns = (Array.isArray(body?.messages) ? body.messages : []) as ChatTurn[];
  if (!turns.some((t) => t?.role === "user" && typeof t.content === "string" && t.content.trim())) return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  const reply = await answer(turns);
  if (!reply) return NextResponse.json({ error: "The AI is not answering right now (today's free allowance may be used up). Please try again later." }, { status: 503 });
  return NextResponse.json({ reply: reply.text, provider: reply.provider });
}
