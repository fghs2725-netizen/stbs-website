import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getInvoice, getInvoiceConfig } from "@/lib/invoice-management";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { invoiceFilename } from "@/lib/invoice-filename";
import { deploymentContext } from "@/lib/deployment-info";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const started = Date.now();
  let stage = "ROUTE_ENTRY";
  try {
    const emit = (event: string, extra: Record<string, unknown> = {}) =>
      console.log(`INVOICE_PDF_${event}`, JSON.stringify({ stage, durationMs: Date.now() - started, ...extra }));

    stage = "AUTH";
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    stage = "PARAMS";
    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    stage = "INVOICE_FETCH";
    const invoice = await getInvoice(id);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // A draft has no number and is not a tax document yet; issuing it is what makes it one.
    if (!invoice.number) return NextResponse.json({ error: "Issue the invoice before downloading it" }, { status: 409 });

    stage = "PDF_GENERATION";
    const { settings } = await getInvoiceConfig();
    const pdf = await generateInvoicePdf(invoice, settings, new URL(request.url).origin, emit);

    stage = "RESPONSE_SUCCESS";
    emit("RESPONSE_SUCCESS", { pdfBytes: pdf.length, ...deploymentContext() });
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoiceFilename(invoice)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const name = error instanceof Error ? String(error.name).slice(0, 80) : "UnknownError";
    const code = error instanceof Error ? String(error.message).slice(0, 120) : "UNKNOWN_ERROR";
    console.error("INVOICE_PDF_FAILURE", JSON.stringify({ stage, name, code, durationMs: Date.now() - started, ...deploymentContext() }));
    return NextResponse.json({ error: "Invoice PDF generation failed", stage }, { status: 500 });
  }
}
