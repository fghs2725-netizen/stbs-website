import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ArtworkError, artworkPrompt, generateArtwork } from "@/lib/status/artwork";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Makes the picture behind a WhatsApp status story. Each call is billed to the owner's OpenAI account. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "SUPER_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Pictures are not switched on yet. Add OPENAI_API_KEY in Vercel, then redeploy." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { occasionId?: unknown; hint?: unknown } | null;
  const prompt = artworkPrompt(typeof body?.occasionId === "string" ? body.occasionId : "", typeof body?.hint === "string" ? body.hint : "");
  if (!prompt) return NextResponse.json({ error: "Say what the picture should show." }, { status: 400 });

  try {
    const image = await generateArtwork(prompt, { apiKey, model: process.env.STATUS_IMAGE_MODEL, signal: AbortSignal.timeout(55_000) });
    return new Response(image as BodyInit, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ArtworkError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("STATUS_ARTWORK_FAILURE", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The picture could not be made. Please try again." }, { status: 500 });
  }
}
