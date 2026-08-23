import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getQuotation } from "@/lib/quotation-management";
import { generateQuotationPdf } from "@/lib/quotation-pdf";
import { deploymentContext } from "@/lib/deployment-info";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const started = Date.now();
  let stage = "ROUTE_ENTRY";
  try {
    const emit = (event: string, extra: Record<string, unknown> = {}) => console.log(`PDF_DIAG_${event}`, JSON.stringify({ stage, durationMs: Date.now() - started, ...extra }));
    stage = "AUTH";
    let session;
    try {
      session = await auth();
    } catch (error) {
      console.error("PDF_AUTH_ERROR", JSON.stringify({ errorName: error instanceof Error ? error.name : "UnknownError", ...deploymentContext() }));
      return Response.json({ error: "PDF authentication failed" }, { status: 500 });
    }
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    stage = "PARAMS";
    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    stage = "QUOTATION_FETCH";
    const quotation = await getQuotation(id);
    emit("QUOTATION_FETCH_SUCCESS", { found: Boolean(quotation) });
    if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    stage = "PDF_GENERATION";
    const pdf = await generateQuotationPdf(quotation, new URL(request.url).origin, emit);
    stage = "RESPONSE_SUCCESS";
    emit("RESPONSE_SUCCESS", { pdfBytes: pdf.length, ...deploymentContext() });
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${quotation.quotationReference.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    let errorName = "UnknownError";
    let errorMessage = "Unknown PDF error";
    let errorCode = "UNKNOWN_ERROR";
    if (error instanceof Error) {
      try { errorName = String(error.name).slice(0, 80); } catch { /* keep safe default */ }
      try { errorMessage = String(error.message).slice(0, 180); } catch { /* keep safe default */ }
      try { errorCode = error.cause instanceof Error ? String(error.cause.message).slice(0, 80) : errorMessage.slice(0, 80); } catch { /* keep safe defaults */ }
    } else {
      try { errorMessage = String(error).slice(0, 180); errorCode = errorMessage.slice(0, 80); } catch { /* keep safe defaults */ }
    }
    const generationStage = error instanceof Error ? (error as Error & { stage?: string }).stage : undefined;
    console.error("PDF_FAILURE", JSON.stringify({ stage: generationStage || stage, errorName, safeErrorCode: errorCode, durationMs: Date.now() - started, ...deploymentContext() }));
    const detailed = process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production";
    return NextResponse.json(detailed
      ? { error: `PDF generation failed at stage: ${generationStage || stage}`, stage: generationStage || stage }
      : { error: "PDF generation failed. Please try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const quotation = await request.json();
    if (!quotation?.client?.companyName || !quotation?.serviceType || !quotation?.subject || !Array.isArray(quotation.items) || !quotation.items.some((item: any) => item?.description && item?.unit && Number(item.quantity) > 0 && Number(item.rate) >= 0)) {
      return NextResponse.json({ error: "Complete the quotation before generating a PDF." }, { status: 400 });
    }
    const pdf = await generateQuotationPdf(quotation, new URL(request.url).origin);
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=quotation.pdf", "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error instanceof Error && /^PDF_PAGE_COUNT_\d+$/.test(error.message) ? error.message.replace("PDF_PAGE_COUNT_", "") : "generation";
    console.error("QUOTATION_PDF_FAILED", JSON.stringify({ code, ...deploymentContext() }));
    return NextResponse.json({ error: code === "generation" ? "PDF generation failed." : `PDF generation failed: expected 4 pages but generated ${code} pages.` }, { status: 500 });
  }
}
