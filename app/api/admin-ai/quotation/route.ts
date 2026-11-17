import { NextResponse } from "next/server";
import { refuse } from "@/lib/admin-ai/guard";
import { DraftError, makeQuotationDraft } from "@/lib/admin-ai/make-drafts";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Turns pasted requirements into a quotation DRAFT. Nothing is finalised or sent. */
export async function POST(request: Request) {
  const refused = await refuse();
  if (refused) return refused;
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  try {
    return NextResponse.json(await makeQuotationDraft(typeof body?.text === "string" ? body.text : ""));
  } catch (error) {
    if (error instanceof DraftError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("ADMIN_AI_QUOTATION_FAILURE", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The draft could not be made. Please try again." }, { status: 500 });
  }
}
