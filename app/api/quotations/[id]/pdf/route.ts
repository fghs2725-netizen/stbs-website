import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getQuotation } from "@/lib/quotation-management";
import { generateQuotationPdf } from "@/lib/quotation-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const started = Date.now();
  const session = await auth();
  console.log("PDF_DIAG_AUTH", JSON.stringify({ authenticated: Boolean(session?.user), method: "GET" }));
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let stage = "route-start";
  const emit = (event: string, extra: Record<string, unknown> = {}) => console.log(`PDF_DIAG_${event}`, JSON.stringify({ stage, durationMs: Date.now() - started, ...extra }));
  try {
    emit("ROUTE_START", { method: "GET" });
    stage = "quotation-fetch-start";
    emit("QUOTATION_FETCH_START");
    const quotation = await getQuotation((await params).id);
    stage = "quotation-fetch-success";
    emit("QUOTATION_FETCH_SUCCESS", { found: Boolean(quotation) });
    if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const pdf = await generateQuotationPdf(quotation, new URL(request.url).origin, emit);
    stage = "response-success";
    emit("RESPONSE_SUCCESS", { pdfBytes: pdf.length });
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${quotation.quotationReference.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    const value = error instanceof Error ? error : new Error("Unknown PDF error");
    const generationStage = (value as Error & { stage?: string }).stage;
    console.error("PDF_DIAG_FAILURE", JSON.stringify({ stage: generationStage || stage, errorName: value.name, errorMessage: value.message.slice(0, 180), errorCode: value.cause instanceof Error ? value.cause.message.slice(0, 80) : value.message.slice(0, 80), durationMs: Date.now() - started }));
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
