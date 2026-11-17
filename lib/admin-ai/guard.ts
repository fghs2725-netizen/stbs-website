import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assistantEnabled } from "@/lib/assistant/providers";

/** The AI reads the business's figures, so only the owner's account may use it. Returns a reply to send when refused. */
export async function refuse(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "SUPER_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!assistantEnabled()) return NextResponse.json({ error: "The AI is not switched on yet. Add GROQ_API_KEY (and GEMINI_API_KEY as backup) in Vercel, then redeploy." }, { status: 503 });
  return null;
}
