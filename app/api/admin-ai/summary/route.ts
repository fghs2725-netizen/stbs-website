import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dailySummary } from "@/lib/admin-ai/summary";

export const runtime = "nodejs";
export const maxDuration = 60;

// The summary works without an AI key too (it then shows the plain facts), so this checks the owner only.
async function owner() {
  const session = await auth();
  return session?.user && (session.user as { role?: string }).role === "SUPER_ADMIN";
}

async function reply(refresh: boolean) {
  if (!(await owner())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await dailySummary({ refresh }), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("ADMIN_AI_SUMMARY_FAILURE", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Today's summary could not be made. Please try again." }, { status: 500 });
  }
}

/** Today's summary, made once a day and kept. */
export const GET = () => reply(false);
/** Makes today's summary again from the latest figures. */
export const POST = () => reply(true);
