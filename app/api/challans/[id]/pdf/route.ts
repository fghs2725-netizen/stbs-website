import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getChallan } from "@/lib/challan-management";
import { challanFilename, generateChallanPdf } from "@/lib/challan-pdf";
import { deploymentContext } from "@/lib/deployment-info";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const started = Date.now();
  let stage = "ROUTE_ENTRY";
  try {
    const emit = (event: string, extra: Record<string, unknown> = {}) =>
      console.log(`CHALLAN_PDF_${event}`, JSON.stringify({ stage, durationMs: Date.now() - started, ...extra }));

    stage = "AUTH";
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    stage = "FETCH";
    const { id } = await context.params;
    const challan = id ? await getChallan(id) : null;
    if (!challan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // A draft can be printed too; it says "Draft" where the number goes.
    stage = "PDF_GENERATION";
    const pdf = await generateChallanPdf(challan, new URL(request.url).origin, emit);

    stage = "RESPONSE_SUCCESS";
    emit("RESPONSE_SUCCESS", { pdfBytes: pdf.length, ...deploymentContext() });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${challanFilename(challan)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const name = error instanceof Error ? String(error.name).slice(0, 80) : "UnknownError";
    const code = error instanceof Error ? String(error.message).slice(0, 120) : "UNKNOWN_ERROR";
    console.error("CHALLAN_PDF_FAILURE", JSON.stringify({ stage, name, code, durationMs: Date.now() - started, ...deploymentContext() }));
    return NextResponse.json({ error: "Delivery challan PDF generation failed", stage }, { status: 500 });
  }
}
