import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getQuotation } from "@/lib/quotation-management";
import { generateQuotationPdf } from "@/lib/quotation-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const started = Date.now();
  let stage = "ROUTE_ENTRY";
  try {
    console.log("PDF_DIAG_ROUTE_ENTRY", JSON.stringify({ method: "GET" }));
    const emit = (event: string, extra: Record<string, unknown> = {}) => console.log(`PDF_DIAG_${event}`, JSON.stringify({ stage, durationMs: Date.now() - started, ...extra }));
    stage = "AUTH";
    console.log("PDF_DIAG_BEFORE_AUTH");
    let session;
    try {
      session = await auth();
      console.log("PDF_DIAG_AFTER_AUTH", { authenticated: Boolean(session?.user) });
    } catch (error) {
      console.error("PDF_DIAG_AUTH_FAILURE", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return Response.json({ error: "PDF authentication failed" }, { status: 500 });
    }
    console.log("PDF_DIAG_AUTH", JSON.stringify({ authenticated: Boolean(session?.user), method: "GET" }));
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    stage = "ROUTE_START";
    console.log("PDF_DIAG_ROUTE_START", JSON.stringify({ stage, durationMs: Date.now() - started, method: "GET" }));
    stage = "PARAMS";
    emit("PARAMS_START");
    const { id } = await context.params;
    emit("PARAMS_SUCCESS", { idPresent: Boolean(id) });
    if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    stage = "QUOTATION_FETCH";
    emit("QUOTATION_FETCH_START");
    const quotation = await getQuotation(id);
    stage = "QUOTATION_FETCH_SUCCESS";
    emit("QUOTATION_FETCH_SUCCESS", { found: Boolean(quotation) });
    if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    stage = "PDF_GENERATION";
    const pdf = await generateQuotationPdf(quotation, new URL(request.url).origin, emit);
    stage = "RESPONSE_SUCCESS";
    emit("RESPONSE_SUCCESS", { pdfBytes: pdf.length });
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${quotation.quotationReference.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    let errorName = "UnknownError";
    let errorMessage = "Unknown PDF error";
    let errorCode = "UNKNOWN_ERROR";
    if (error instanceof Error) {
      try { errorName = String(error.name).slice(0, 80); } catch { /* keep safe default */ }
      try { errorMessage = String(error.message).slice(0, 180); } catch { /* keep safe default */ }
      try { errorCode = error.cause instanceof Error ? String(error.cause.message).slice(0, 80) : errorMessage.slice(0, 80); } catch { /* keep safe default */ }
    } else {
      try { errorMessage = String(error).slice(0, 180); errorCode = errorMessage.slice(0, 80); } catch { /* keep safe defaults */ }
    }
    const generationStage = error instanceof Error ? (error as Error & { stage?: string }).stage : undefined;
    console.error("PDF_DIAG_FAILURE", { stage: generationStage || stage, errorName, errorMessage, errorCode, durationMs: Date.now() - started });
    const detailed = process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production";
    return NextResponse.json({ error: detailed ? `PDF generation failed at stage: ${generationStage || stage}` : "PDF generation failed. Please try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  console.log("PDF_DIAG_AUTH", JSON.stringify({ authenticated: Boolean(session?.user), method: "POST" }));
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const quotation = await request.json();
    if (!quotation?.client?.companyName || !quotation?.serviceType || !quotation?.subject || !Array.isArray(quotation?.items) || !quotation.items.some((item: any) => item?.description && item?.unit && Number(item.quantity) > 0 && Number(item.rate) >= 0)) {
      return NextResponse.json({ error: "Complete the quotation before generating a PDF." }, { status: 400 });
    }
    const pdf = await generateQuotationPdf(quotation, new URL(request.url).origin);
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=quotation.pdf", "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error instanceof Error && /^PDF_PAGE_COUNT_\d+$/.test(error.message) ? error.message.replace("PDF_PAGE_COUNT_", "") : "generation";
    console.error("QUOTATION_PDF_FAILED", JSON.stringify({ code }));
    return NextResponse.json({ error: code === "generation" ? "PDF generation failed." : `PDF generation failed: expected 4 pages but generated ${code} pages.` }, { status: 500 });
  }
}
