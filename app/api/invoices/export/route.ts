import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildInvoiceExport } from "@/lib/invoice-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every invoice as an Excel workbook: the Analytics page's Download button. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const file = await buildInvoiceExport();
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="STBS-Invoices-${stamp}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("INVOICE_EXPORT_FAILURE", error instanceof Error ? error.message.slice(0, 160) : "UNKNOWN");
    return NextResponse.json({ error: "The invoice export failed. Please try again." }, { status: 500 });
  }
}
