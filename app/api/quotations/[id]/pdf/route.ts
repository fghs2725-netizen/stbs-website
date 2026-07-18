import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getQuotation } from "@/lib/quotation-management";
import { generateQuotationPdf } from "@/lib/quotation-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  console.log("PDF_DIAG_AUTH", JSON.stringify({ authenticated: Boolean(session?.user), method: "GET" }));
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const quotation = await getQuotation((await params).id);
    console.log("PDF_DIAG_DATA", JSON.stringify({ found: Boolean(quotation), method: "GET" }));
    if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const pdf = await generateQuotationPdf(quotation, new URL(request.url).origin);
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${quotation.quotationReference.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error instanceof Error && /^PDF_PAGE_COUNT_\d+$/.test(error.message) ? error.message.replace("PDF_PAGE_COUNT_", "") : "generation";
    console.error("QUOTATION_PDF_FAILED", JSON.stringify({ code }));
    return NextResponse.json({ error: code === "generation" ? "PDF generation failed." : `PDF generation failed: expected 4 pages but generated ${code} pages.` }, { status: 500 });
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
