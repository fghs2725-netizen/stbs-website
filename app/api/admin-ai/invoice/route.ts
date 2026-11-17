import { NextResponse } from "next/server";
import { refuse } from "@/lib/admin-ai/guard";
import { DraftError, makeInvoiceDraft } from "@/lib/admin-ai/make-drafts";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Vercel turns away request bodies over 4.5 MB, so the limit is said plainly before that. */
const MAX_BYTES = 4 * 1024 * 1024;

/** Reads a purchase order PDF into an invoice DRAFT. Nothing is issued, numbered or sent. */
export async function POST(request: Request) {
  const refused = await refuse();
  if (refused) return refused;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Choose the PO's PDF first." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That PDF is over 4 MB. Please use a smaller copy." }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return NextResponse.json({ error: "That file is not a PDF." }, { status: 400 });
  try {
    return NextResponse.json(await makeInvoiceDraft(bytes));
  } catch (error) {
    if (error instanceof DraftError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("ADMIN_AI_INVOICE_FAILURE", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The draft could not be made. Please try again." }, { status: 500 });
  }
}
